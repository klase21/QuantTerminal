import assert from "node:assert/strict"

import {
  GREEN_CLEAN_ROLE_PROBE_BINDING,
  GREEN_CLEAN_ROLE_PROBE_VERSION,
  createGreenCleanRoleProbePlan,
  executeGreenCleanRoleProbeWithPort,
  inspectGreenCleanRoleProbeSafety,
  type GreenCleanRoleProbeConfiguration,
  type GreenCleanRoleProbePort,
} from "@/lib/data-platform/mvp-refresh/greenCleanRoleProbe"
import {
  createGreenCleanPrivilegeMatrix,
} from "@/lib/data-platform/mvp-refresh/greenCleanPrivilegeMatrix"
import type {
  GreenCleanPrivilegeQueryPort,
  GreenCleanPrivilegeTransactionContext,
  GreenCleanPrivilegeTransactionPort,
} from "@/lib/data-platform/mvp-refresh/greenCleanPrivilegeClosure"
import { requireGreenCleanRebuildDatabaseSet } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"

const databaseSet = requireGreenCleanRebuildDatabaseSet({
  MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
  MVP_GREEN_CLEAN_REBUILD_ID: "roleprobe01",
  MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: "quantterminal_green_clean_roleprobe01_backfill",
  MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: "quantterminal_green_clean_roleprobe01_d4",
  MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: "quantterminal_green_clean_roleprobe01_refresh",
  MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: "quantterminal_green_clean_roleprobe01_serving",
})!
const probeDatabase = "quantterminal_green_clean_role_probe_unit0001"
const configuration: GreenCleanRoleProbeConfiguration = Object.freeze({
  adminConnectionString: "postgresql://qt_d2_owner:not-a-secret@127.0.0.1:5432/postgres",
  binding: GREEN_CLEAN_ROLE_PROBE_BINDING,
  expectedPort: "5432",
  probeDatabaseName: probeDatabase,
  databaseSet,
  forbiddenDatabaseNames: Object.freeze([
    "neondb",
    "mvp_release_20260721_9c177d6309",
  ]),
})
const canonicalMatrix = createGreenCleanPrivilegeMatrix(databaseSet)

class FakeRoleProbePort implements GreenCleanRoleProbePort {
  readonly calls: string[] = []

  constructor(
    private readonly options: {
      readonly databaseExists?: boolean
      readonly excessivePublisherExposureInsert?: boolean
      readonly initializationFailure?: boolean
    } = {},
  ) {}

  async verifyAdmin() {
    this.calls.push("verifyAdmin")
    return {
      database: "postgres",
      role: "qt_d2_owner",
      postgresMajor16: true,
      readWrite: true,
      canCreateDatabase: true,
    }
  }

  async databaseExists(databaseName: string): Promise<boolean> {
    this.calls.push(`databaseExists:${databaseName}`)
    return this.options.databaseExists === true
  }

  async createDatabase(databaseName: string, ownerRole: string): Promise<void> {
    this.calls.push(`createDatabase:${databaseName}:${ownerRole}`)
  }

  async initializeProbe(databaseName: string, statements: readonly string[]): Promise<void> {
    this.calls.push(`initializeProbe:${databaseName}:${statements.length}`)
    if (this.options.initializationFailure) throw new Error("GREEN_CLEAN_ROLE_PROBE_SETUP_FAILED")
  }

  queryPort(databaseName: string): GreenCleanPrivilegeQueryPort {
    assert.equal(databaseName, probeDatabase)
    return { query: (statement, parameters = []) => this.query(statement, parameters) }
  }

  transactionPort(databaseName: string): GreenCleanPrivilegeTransactionPort {
    assert.equal(databaseName, probeDatabase)
    return {
      query: (statement, parameters = []) => this.query(statement, parameters),
      transaction: async <T>(work: (transaction: GreenCleanPrivilegeTransactionContext) => Promise<T>): Promise<T> => work({
        query: async <R extends Record<string, unknown>>(statement: string): Promise<readonly R[]> => {
          this.calls.push(`denial:${statement}`)
          if (statement.startsWith("SET LOCAL ROLE ")) return []
          return []
        },
        savepoint: async <R>(savepointWork: (savepoint: GreenCleanPrivilegeQueryPort) => Promise<R>): Promise<R> =>
          savepointWork({
            query: async <Q extends Record<string, unknown>>(statement: string): Promise<readonly Q[]> => {
              this.calls.push(`denial:${statement}`)
              const error = new Error("permission denied") as Error & { code: string }
              error.code = "42501"
              throw error
            },
          }),
      }),
    }
  }

  async releaseProbeConnection(databaseName: string): Promise<void> {
    this.calls.push(`release:${databaseName}`)
  }

  async dropDatabase(databaseName: string): Promise<void> {
    this.calls.push(`drop:${databaseName}`)
  }

  async shutdown(): Promise<void> {
    this.calls.push("shutdown")
  }

  private async query<T extends Record<string, unknown>>(
    statement: string,
    parameters: readonly unknown[],
  ): Promise<readonly T[]> {
    this.calls.push(`query:${statement.split(/\s+/).slice(0, 3).join(" ")}`)
    if (statement.includes("FROM pg_roles WHERE")) {
      return [
        { role_name: "mvp_green_migration_owner", login: false, inherit: true, bypass_rls: false, create_database: false, create_role: false, superuser: false },
        { role_name: "mvp_serving_publisher", login: true, inherit: true, bypass_rls: false, create_database: false, create_role: false, superuser: false },
        { role_name: "mvp_serving_reader", login: true, inherit: true, bypass_rls: false, create_database: false, create_role: false, superuser: false },
      ] as unknown as T[]
    }
    if (statement.includes("FROM pg_auth_members")) return []
    if (statement.includes("owner_role")) return [{ owner_role: "mvp_green_migration_owner" }] as unknown as T[]
    if (statement.includes("rolsuper OR r.rolcreaterole")) return [{ allowed: false }] as unknown as T[]
    if (statement.includes("pg_has_role")) return [{ allowed: true }] as unknown as T[]
    if (statement.includes("has_database_privilege")) return [{ allowed: true }] as unknown as T[]
    if (statement.includes("has_schema_privilege") || statement.includes("has_table_privilege")) {
      const role = String(parameters[0])
      const object = String(parameters[1])
      const privilege = String(parameters[2])
      let allowed = false
      if (role === "mvp_green_migration_owner") allowed = true
      if (role === "mvp_serving_publisher") {
        allowed = object === "serving" && privilege === "USAGE"
          || ["serving.serving_corpus", "serving.serving_candidate_manifest"].includes(object)
            && ["SELECT", "INSERT"].includes(privilege)
          || object === "serving.serving_exposure" && privilege === "SELECT"
      }
      if (role === "mvp_serving_reader") {
        allowed = ["serving", "serving_control"].includes(object) && privilege === "USAGE"
          || [
            "serving.serving_corpus",
            "serving.serving_candidate_manifest",
            "serving.serving_exposure",
            "serving.serving_publication_event",
            "serving_control.cutover_event",
          ].includes(object) && privilege === "SELECT"
      }
      if (
        this.options.excessivePublisherExposureInsert
        && role === "mvp_serving_publisher"
        && object === "serving.serving_exposure"
        && privilege === "INSERT"
      ) allowed = true
      return [{ allowed }] as unknown as T[]
    }
    throw new Error(`UNEXPECTED_ROLE_PROBE_QUERY:${statement}`)
  }
}

async function main() {
  const identity = inspectGreenCleanRoleProbeSafety(configuration)
  assert.deepEqual(identity, {
    binding: GREEN_CLEAN_ROLE_PROBE_BINDING,
    host: "127.0.0.1",
    port: "5432",
    databaseName: probeDatabase,
    adminDatabase: "postgres",
    adminRole: "qt_d2_owner",
  })
  assert(!JSON.stringify(identity).includes("not-a-secret"))

  for (const [label, value, classification] of [
    ["remote", { ...configuration, adminConnectionString: "postgresql://qt_d2_owner:not-a-secret@remote.invalid:5432/postgres" }, "GREEN_CLEAN_ROLE_PROBE_ADMIN_NOT_LOOPBACK"],
    ["wrong-role", { ...configuration, adminConnectionString: "postgresql://postgres:not-a-secret@127.0.0.1:5432/postgres" }, "GREEN_CLEAN_ROLE_PROBE_ADMIN_ROLE_INVALID"],
    ["missing-password", { ...configuration, adminConnectionString: "postgresql://qt_d2_owner@127.0.0.1:5432/postgres" }, "GREEN_CLEAN_ROLE_PROBE_ADMIN_PASSWORD_REQUIRED"],
    ["wrong-admin-db", { ...configuration, adminConnectionString: "postgresql://qt_d2_owner:not-a-secret@127.0.0.1:5432/template1" }, "GREEN_CLEAN_ROLE_PROBE_ADMIN_DATABASE_INVALID"],
    ["wrong-port", { ...configuration, expectedPort: "5544" }, "GREEN_CLEAN_ROLE_PROBE_ADMIN_PORT_MISMATCH"],
    ["not-probe-name", { ...configuration, probeDatabaseName: "neondb" }, "GREEN_CLEAN_ROLE_PROBE_DATABASE_NAME_INVALID"],
  ] as const) {
    assert.throws(() => inspectGreenCleanRoleProbeSafety(value), new RegExp(classification), label)
  }
  const protectedDatabaseSet = Object.freeze({ ...databaseSet, servingDatabase: probeDatabase })
  assert.throws(
    () => inspectGreenCleanRoleProbeSafety({ ...configuration, databaseSet: protectedDatabaseSet }),
    /GREEN_CLEAN_ROLE_PROBE_DATABASE_PROTECTED/,
  )

  const plan = createGreenCleanRoleProbePlan(configuration, canonicalMatrix)
  assert.equal(plan.databaseName, probeDatabase)
  assert.equal(plan.ownerRole, "mvp_green_migration_owner")
  assert(plan.setupStatements.every((statement) => !/\bGRANT\s+ALL\b/i.test(statement)))
  assert(plan.setupStatements.some((statement) => statement === "SET ROLE \"mvp_green_migration_owner\""))
  assert(plan.setupStatements.some((statement) => statement.includes("GRANT SELECT, INSERT ON TABLE serving.serving_corpus")))
  assert(!plan.setupStatements.some((statement) => /GRANT .*\b(?:UPDATE|DELETE|TRUNCATE)\b/i.test(statement)))
  const denied = plan.matrix.operations.filter((operation) => operation.expected === "DENY")
  assert.equal(plan.denialProbes.length, denied.length)
  assert.deepEqual(
    new Set(plan.denialProbes.map((probe) => probe.testId)),
    new Set(denied.map((operation) => operation.testId)),
  )

  const passPort = new FakeRoleProbePort()
  const pass = await executeGreenCleanRoleProbeWithPort(configuration, canonicalMatrix, passPort)
  assert.equal(pass.version, GREEN_CLEAN_ROLE_PROBE_VERSION)
  assert.equal(pass.status, "PASS")
  assert.equal(pass.closure?.status, "PASS")
  assert.equal(pass.created, true)
  assert.equal(pass.dropped, true)
  assert.equal(pass.retainedForDiagnosis, false)
  assert(passPort.calls.indexOf(`createDatabase:${probeDatabase}:mvp_green_migration_owner`)
    > passPort.calls.indexOf(`databaseExists:${probeDatabase}`))
  assert(passPort.calls.indexOf(`drop:${probeDatabase}`) > passPort.calls.indexOf(`release:${probeDatabase}`))

  const excessivePort = new FakeRoleProbePort({ excessivePublisherExposureInsert: true })
  const excessive = await executeGreenCleanRoleProbeWithPort(configuration, canonicalMatrix, excessivePort)
  assert.equal(excessive.status, "FAIL")
  assert.equal(excessive.closure?.counters.excessivePrivileges, 1)
  assert.equal(excessive.dropped, false)
  assert.equal(excessive.retainedForDiagnosis, true)
  assert(!excessivePort.calls.includes(`drop:${probeDatabase}`))

  const collisionPort = new FakeRoleProbePort({ databaseExists: true })
  const collision = await executeGreenCleanRoleProbeWithPort(configuration, canonicalMatrix, collisionPort)
  assert.equal(collision.status, "FAIL")
  assert.equal(collision.failure, "GREEN_CLEAN_ROLE_PROBE_DATABASE_COLLISION")
  assert.equal(collision.created, false)
  assert.equal(collision.dropped, false)
  assert(!collisionPort.calls.some((call) => call.startsWith("createDatabase:")))

  const setupFailurePort = new FakeRoleProbePort({ initializationFailure: true })
  const setupFailure = await executeGreenCleanRoleProbeWithPort(configuration, canonicalMatrix, setupFailurePort)
  assert.equal(setupFailure.status, "FAIL")
  assert.equal(setupFailure.failure, "GREEN_CLEAN_ROLE_PROBE_SETUP_FAILED")
  assert.equal(setupFailure.created, true)
  assert.equal(setupFailure.retainedForDiagnosis, true)
  assert(!setupFailurePort.calls.includes(`drop:${probeDatabase}`))

  console.log(JSON.stringify({
    status: "PASS",
    localTargetSafety: true,
    protectedTargetRejection: true,
    catalogClosure: true,
    rollbackDenials: plan.denialProbes.length,
    dropOnlyAfterPass: true,
  }))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "GREEN_CLEAN_ROLE_PROBE_UNIT_SUITE_FAILED")
  process.exitCode = 1
})
