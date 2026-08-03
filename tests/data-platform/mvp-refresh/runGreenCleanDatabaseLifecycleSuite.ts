import assert from "node:assert/strict"

import {
  deriveGreenCleanAdminConnectionString,
  greenCleanDatabaseSpecifications,
  reconcileGreenCleanDatabaseSet,
  type GreenCleanAdminVerification,
  type GreenCleanDatabaseInspection,
  type GreenCleanDatabaseLifecyclePort,
  type GreenCleanDatabaseSpecification,
} from "@/lib/data-platform/mvp-refresh/greenCleanDatabaseLifecycle"
import { inspectGreenCleanRebuildSafety } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"

const id = "lifecycle01"
const prefix = `quantterminal_green_clean_${id}`
const safety = inspectGreenCleanRebuildSafety({
  MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
  MVP_GREEN_CLEAN_REBUILD_ID: id,
  MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: `${prefix}_backfill`,
  MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: `${prefix}_d4`,
  MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: `${prefix}_refresh`,
  MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: `${prefix}_serving`,
})
assert(safety.databaseSet)
const specifications = greenCleanDatabaseSpecifications(safety.databaseSet)

class FakeAdminPort implements GreenCleanDatabaseLifecyclePort {
  readonly inspections = new Map<string, GreenCleanDatabaseInspection>()
  readonly createCalls: string[] = []
  shutdownCalls = 0
  admin: GreenCleanAdminVerification = {
    database: "postgres",
    role: "qt_d2_owner",
    postgresMajor16: true,
    readWrite: true,
    canCreateDatabase: true,
  }
  ownerRolesValid = true

  constructor(state: "ABSENT" | "EMPTY" | "RECONCILED" = "ABSENT") {
    for (const specification of specifications) {
      this.inspections.set(specification.databaseName, state === "ABSENT"
        ? { exists: false, ownerRole: null, state }
        : { exists: true, ownerRole: specification.ownerRole, state })
    }
  }

  async verifyAdmin(): Promise<GreenCleanAdminVerification> {
    return this.admin
  }

  async verifyOwnerRoles(): Promise<boolean> {
    return this.ownerRolesValid
  }

  async inspectDatabase(specification: GreenCleanDatabaseSpecification): Promise<GreenCleanDatabaseInspection> {
    return this.inspections.get(specification.databaseName)!
  }

  async createDatabase(specification: GreenCleanDatabaseSpecification): Promise<void> {
    this.createCalls.push(specification.databaseName)
    this.inspections.set(specification.databaseName, {
      exists: true,
      ownerRole: specification.ownerRole,
      state: "EMPTY",
    })
  }

  redactedIdentity(specification: GreenCleanDatabaseSpecification) {
    return Object.freeze({
      database: specification.database,
      binding: specification.binding,
      host: "127.0.0.1",
      port: "55432",
      databaseName: specification.databaseName,
      ownerRole: specification.ownerRole,
    })
  }

  async shutdown(): Promise<void> {
    this.shutdownCalls += 1
  }
}

async function main(): Promise<void> {
  assert.deepEqual(
    specifications.map((value) => [value.database, value.binding, value.ownerRole]),
    [
      ["BACKFILL", "D2_D3_INTEGRATED", "qt_d2_backfill_owner"],
      ["D4", "D4_ISOLATED", "qt_d2_owner"],
      ["REFRESH", "MVP_REFRESH_ISOLATED", "qt_d2_owner"],
      ["SERVING", "MVP_SERVING_ISOLATED", "mvp_green_migration_owner"],
    ],
  )
  assert.equal(new Set(specifications.map((value) => value.databaseName)).size, 4)

  const secret = "unit-only-do-not-print"
  const syntheticUrl = (role: string, host: string, includePassword = true): string => {
    const url = new URL(`postgresql://${role}@${host}:55432/quantterminal_d4_isolated`)
    if (includePassword) Reflect.set(url, "password", secret)
    return url.toString()
  }
  const derived = new URL(deriveGreenCleanAdminConnectionString(
    syntheticUrl("qt_d2_owner", "127.0.0.1"),
    "D4_ISOLATED_POSTGRES_URL",
  ))
  assert.equal(derived.pathname, "/postgres")
  assert.equal(decodeURIComponent(derived.username), "qt_d2_owner")
  assert.equal(decodeURIComponent(derived.password), secret)
  assert.throws(
    () => deriveGreenCleanAdminConnectionString(syntheticUrl("qt_d2_owner", "remote.example"), "D4_ISOLATED_POSTGRES_URL"),
    /GREEN_CLEAN_ADMIN_SOURCE_NOT_LOOPBACK/,
  )
  assert.throws(
    () => deriveGreenCleanAdminConnectionString(syntheticUrl("qt_d2_owner", "127.0.0.1", false), "D4_ISOLATED_POSTGRES_URL"),
    /GREEN_CLEAN_ADMIN_SOURCE_PASSWORD_REQUIRED/,
  )
  assert.throws(
    () => deriveGreenCleanAdminConnectionString(syntheticUrl("wrong", "127.0.0.1"), "D4_ISOLATED_POSTGRES_URL"),
    /GREEN_CLEAN_ADMIN_SOURCE_ROLE_INVALID/,
  )

  const absent = new FakeAdminPort()
  const created = await reconcileGreenCleanDatabaseSet(absent, safety.databaseSet!)
  assert.equal(created.createdCount, 4)
  assert.deepEqual(absent.createCalls, specifications.map((value) => value.databaseName))
  assert.equal(created.identities.every((value) => value.host === "127.0.0.1" && value.port === "55432"), true)
  assert.equal(JSON.stringify(created).includes(secret), false)
  assert.equal(JSON.stringify(created).includes("postgresql://"), false)

  const exactEmpty = new FakeAdminPort("EMPTY")
  const emptyResult = await reconcileGreenCleanDatabaseSet(exactEmpty, safety.databaseSet!)
  assert.equal(emptyResult.createdCount, 0)
  assert.equal(exactEmpty.createCalls.length, 0)
  assert.equal(Object.values(emptyResult.outcomes).every((value) => value === "EMPTY"), true)

  const reconciled = new FakeAdminPort("RECONCILED")
  const reconciledResult = await reconcileGreenCleanDatabaseSet(reconciled, safety.databaseSet!)
  assert.equal(reconciledResult.createdCount, 0)
  assert.equal(Object.values(reconciledResult.outcomes).every((value) => value === "RECONCILED"), true)

  const wrongOwner = new FakeAdminPort()
  wrongOwner.inspections.set(specifications[1]!.databaseName, { exists: true, ownerRole: "wrong_owner", state: "CONFLICT" })
  await assert.rejects(() => reconcileGreenCleanDatabaseSet(wrongOwner, safety.databaseSet!), /GREEN_CLEAN_DATABASE_CONFLICT:D4/)
  assert.equal(wrongOwner.createCalls.length, 0)

  const nonEmptyConflict = new FakeAdminPort()
  nonEmptyConflict.inspections.set(specifications[3]!.databaseName, {
    exists: true,
    ownerRole: specifications[3]!.ownerRole,
    state: "CONFLICT",
  })
  await assert.rejects(() => reconcileGreenCleanDatabaseSet(nonEmptyConflict, safety.databaseSet!), /GREEN_CLEAN_DATABASE_CONFLICT:SERVING/)
  assert.equal(nonEmptyConflict.createCalls.length, 0)

  const missingOwnerRole = new FakeAdminPort()
  missingOwnerRole.ownerRolesValid = false
  await assert.rejects(() => reconcileGreenCleanDatabaseSet(missingOwnerRole, safety.databaseSet!), /GREEN_CLEAN_DATABASE_OWNER_ROLE_CLOSURE_FAILED/)
  assert.equal(missingOwnerRole.createCalls.length, 0)

  const wrongAdmin = new FakeAdminPort()
  wrongAdmin.admin = { ...wrongAdmin.admin, canCreateDatabase: false }
  await assert.rejects(() => reconcileGreenCleanDatabaseSet(wrongAdmin, safety.databaseSet!), /GREEN_CLEAN_ADMIN_IDENTITY_UNPROVEN/)
  assert.equal(wrongAdmin.createCalls.length, 0)

  console.log(JSON.stringify({
    status: "PASS",
    suite: "green-clean-database-lifecycle",
    realDatabaseMutations: 0,
    canonicalGlobalRolesOnly: true,
    preflightBeforeCreate: true,
    noDropTruncateReset: true,
    secretsPrinted: false,
  }))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "GREEN_CLEAN_DATABASE_LIFECYCLE_TEST_FAILED")
  process.exitCode = 1
})
