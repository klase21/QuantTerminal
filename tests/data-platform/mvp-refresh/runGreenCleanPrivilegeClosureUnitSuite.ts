import assert from "node:assert/strict"

import {
  GREEN_CLEAN_PRIVILEGE_CLOSURE_VERSION,
  greenCleanPrivilegeClosurePasses,
  inspectGreenCleanPrivilegeClosure,
  type GreenCleanExpectedDenialProbe,
  type GreenCleanPrivilegeMatrixLike,
  type GreenCleanPrivilegeOwnershipLike,
  type GreenCleanPrivilegeQueryPort,
  type GreenCleanPrivilegeTransactionContext,
  type GreenCleanPrivilegeTransactionPort,
} from "@/lib/data-platform/mvp-refresh/greenCleanPrivilegeClosure"
import { createGreenCleanPrivilegeMatrix } from "@/lib/data-platform/mvp-refresh/greenCleanPrivilegeMatrix"
import { requireGreenCleanRebuildDatabaseSet } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"

const database = "quantterminal_green_clean_privilege_probe01"
const owner = "mvp_green_migration_owner"
const publisher = "mvp_serving_publisher"
const bootstrap = "qt_d2_owner"

const matrix: GreenCleanPrivilegeMatrixLike = Object.freeze({
  roles: Object.freeze([
    { roleName: bootstrap, login: true, inherit: true, bypassRls: false, createDatabase: true, createRole: true, superuser: true, setRoleTargets: [owner] },
    { roleName: owner, login: false, inherit: false, bypassRls: false, createDatabase: false, createRole: false, superuser: false },
    { roleName: publisher, login: true, inherit: true, bypassRls: false, createDatabase: false, createRole: false, superuser: false, connectDatabases: [database] },
  ]),
  memberships: Object.freeze([
    { memberRole: bootstrap, grantedRole: owner, grantorRole: bootstrap, adminOption: true, inheritOption: false, setOption: true },
  ]),
  ownerships: Object.freeze<GreenCleanPrivilegeOwnershipLike[]>([
    { databaseName: database, objectKind: "DATABASE", ownerRole: owner },
    { databaseName: database, objectKind: "SCHEMA", schema: "serving", ownerRole: owner },
    { databaseName: database, objectKind: "TABLE", schema: "serving", object: "serving_corpus", ownerRole: owner },
    { databaseName: database, objectKind: "SEQUENCE", schema: "serving", object: "serving_sequence", ownerRole: owner },
    { databaseName: database, objectKind: "FUNCTION", schema: "serving", object: "serving.verify_candidate(text)", ownerRole: owner },
  ]),
  operations: Object.freeze([
    operation("connect", "DATABASE", "", database, "CONNECT", publisher, null, publisher, "ALLOW"),
    operation("schema-usage", "SCHEMA", "serving", "serving", "USAGE", publisher, null, publisher, "ALLOW"),
    operation("table-select", "TABLE", "serving", "serving.serving_corpus", "SELECT", publisher, null, publisher, "ALLOW"),
    operation("table-insert-denied", "TABLE", "serving", "serving.serving_corpus", "INSERT", publisher, null, publisher, "DENY"),
    operation("sequence-usage", "SEQUENCE", "serving", "serving_sequence", "USAGE", publisher, null, publisher, "ALLOW"),
    operation("function-execute", "FUNCTION", "serving", "serving.verify_candidate(text)", "EXECUTE", publisher, null, publisher, "ALLOW"),
    operation("owner-set-role", "ROLE", "", owner, "SET_ROLE", bootstrap, owner, owner, "ALLOW"),
    operation("publisher-role-management-denied", "ROLE", "", publisher, "MANAGE_ROLE", publisher, null, publisher, "DENY"),
  ]),
})

function operation(
  testId: string,
  objectKind: "DATABASE" | "SCHEMA" | "TABLE" | "SEQUENCE" | "FUNCTION" | "ROLE",
  schema: string,
  object: string,
  requiredPrivilege: string,
  sessionRole: string,
  setRole: string | null,
  expectedRole: string,
  expected: "ALLOW" | "DENY",
) {
  return Object.freeze({
    testId,
    database,
    sessionRole,
    setRole,
    schema: schema || null,
    object,
    objectKind,
    operation: requiredPrivilege,
    requiredPrivilege,
    expected,
    expectedRole,
  })
}

class FakeCatalogPort implements GreenCleanPrivilegeQueryPort {
  readonly statements: string[] = []
  constructor(private readonly overrides: Readonly<Record<string, boolean>> = {}) {}
  async query<T extends Record<string, unknown>>(statement: string, parameters: readonly unknown[] = []): Promise<readonly T[]> {
    this.statements.push(statement)
    if (statement.includes("FROM pg_roles WHERE")) {
      return [
        { role_name: bootstrap, login: true, inherit: true, bypass_rls: false, create_database: true, create_role: true, superuser: true },
        { role_name: owner, login: false, inherit: false, bypass_rls: false, create_database: false, create_role: false, superuser: false },
        { role_name: publisher, login: true, inherit: true, bypass_rls: false, create_database: false, create_role: false, superuser: false },
      ] as unknown as T[]
    }
    if (statement.includes("FROM pg_auth_members")) {
      return [{
        member_role: bootstrap,
        granted_role: owner,
        grantor_role: bootstrap,
        admin_option: true,
        inherit_option: false,
        set_option: true,
      }] as unknown as T[]
    }
    if (statement.includes("owner_role")) return [{ owner_role: owner }] as unknown as T[]
    if (statement.includes("rolsuper OR r.rolcreaterole")) return [{ allowed: false }] as unknown as T[]
    if (statement.includes("pg_has_role")) return [{ allowed: true }] as unknown as T[]
    if (statement.includes("has_")) {
      const key = `${String(parameters[0])}:${String(parameters[1])}:${String(parameters[2])}`
      const defaultAllowed = String(parameters[2]) !== "INSERT"
      return [{ allowed: this.overrides[key] ?? defaultAllowed }] as unknown as T[]
    }
    throw new Error(`UNEXPECTED_FAKE_QUERY:${statement}`)
  }
}

class FakeDenialPort extends FakeCatalogPort implements GreenCleanPrivilegeTransactionPort {
  readonly transactionStatements: string[] = []
  constructor(private readonly denyStatement: boolean) { super() }
  async transaction<T>(work: (transaction: GreenCleanPrivilegeTransactionContext) => Promise<T>): Promise<T> {
    return work({
      query: async <R extends Record<string, unknown>>(statement: string): Promise<readonly R[]> => {
        this.transactionStatements.push(statement)
        return []
      },
      savepoint: async <R>(savepointWork: (savepoint: GreenCleanPrivilegeQueryPort) => Promise<R>): Promise<R> =>
        savepointWork({
          query: async <Q extends Record<string, unknown>>(statement: string): Promise<readonly Q[]> => {
            this.transactionStatements.push(statement)
            if (this.denyStatement && statement.startsWith("DELETE FROM")) {
              const error = new Error("permission denied") as Error & { code: string }
              error.code = "42501"
              throw error
            }
            return []
          },
        }),
    })
  }
}

const denialProbe: GreenCleanExpectedDenialProbe = Object.freeze({
  testId: "publisher-delete-denied",
  database,
  role: publisher,
  statement: "DELETE FROM serving.serving_corpus",
  expectedSqlStates: Object.freeze(["42501"]),
})

async function main() {
  const structuralMatrix: GreenCleanPrivilegeMatrixLike = createGreenCleanPrivilegeMatrix(requireGreenCleanRebuildDatabaseSet({
    MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
    MVP_GREEN_CLEAN_REBUILD_ID: "privilege01",
    MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: "quantterminal_green_clean_privilege01_backfill",
    MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: "quantterminal_green_clean_privilege01_d4",
    MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: "quantterminal_green_clean_privilege01_refresh",
    MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: "quantterminal_green_clean_privilege01_serving",
  })!)
  assert(structuralMatrix.roles.length > 0)
  assert(structuralMatrix.operations.length > 0)

  const catalog = new FakeCatalogPort()
  const denial = new FakeDenialPort(true)
  const pass = await inspectGreenCleanPrivilegeClosure(
    matrix,
    { [database]: catalog },
    { denialProbes: [denialProbe], denialPorts: { [database]: denial } },
  )
  assert.equal(pass.version, GREEN_CLEAN_PRIVILEGE_CLOSURE_VERSION)
  assert.equal(pass.status, "PASS")
  assert.equal(pass.rolesInspected, 3)
  assert.equal(pass.operationsInspected, 8)
  assert.equal(pass.denialTestsExecuted, 1)
  assert(Object.values(pass.counters).every((value) => value === 0))
  for (const requiredFunction of [
    "pg_has_role",
    "has_database_privilege",
    "has_schema_privilege",
    "has_table_privilege",
    "has_sequence_privilege",
    "has_function_privilege",
  ]) assert(catalog.statements.some((statement) => statement.includes(requiredFunction)), `${requiredFunction} was not used`)
  assert.deepEqual(denial.transactionStatements, [
    `SET LOCAL ROLE "${publisher}"`,
    "DELETE FROM serving.serving_corpus",
  ])

  const missingSelect = new FakeCatalogPort({ [`${publisher}:serving.serving_corpus:SELECT`]: false })
  const failed = await inspectGreenCleanPrivilegeClosure(matrix, { [database]: missingSelect })
  assert.equal(failed.status, "FAIL")
  assert.equal(failed.counters.missingTablePrivileges, 1)
  assert.equal(greenCleanPrivilegeClosurePasses({ ...failed, status: "PASS" }), false)
  assert.equal(failed.counters.expectedDenialFailures, 0)

  const forbiddenSuccess = new FakeDenialPort(false)
  const failedDenial = await inspectGreenCleanPrivilegeClosure(
    matrix,
    { [database]: new FakeCatalogPort() },
    { denialProbes: [denialProbe], denialPorts: { [database]: forbiddenSuccess } },
  )
  assert.equal(failedDenial.status, "FAIL")
  assert.equal(failedDenial.counters.expectedDenialFailures, 1)
  assert.equal(failedDenial.failures.at(-1)?.detail, "FORBIDDEN_OPERATION_SUCCEEDED")

  const missingDenialCoverage = await inspectGreenCleanPrivilegeClosure(
    matrix,
    { [database]: new FakeCatalogPort() },
    { requireDenialProbeForEachDeniedOperation: true },
  )
  assert.equal(missingDenialCoverage.status, "FAIL")
  assert.equal(missingDenialCoverage.counters.expectedDenialFailures, 2)
  assert(missingDenialCoverage.failures.every((failure) =>
    failure.classification !== "expectedDenialFailures" || failure.detail === "EXPECTED_DENIAL_PROBE_MISSING"))

  const unsafeProbe = await inspectGreenCleanPrivilegeClosure(
    matrix,
    { [database]: new FakeCatalogPort() },
    {
      denialProbes: [{ ...denialProbe, statement: "DROP DATABASE forbidden" }],
      denialPorts: { [database]: new FakeDenialPort(true) },
    },
  )
  assert.equal(unsafeProbe.status, "FAIL")
  assert.equal(unsafeProbe.counters.expectedDenialFailures, 1)
  assert.match(unsafeProbe.failures.at(-1)?.detail ?? "", /NON_TRANSACTIONAL_OPERATION_FORBIDDEN/)

  console.log(JSON.stringify({
    status: "PASS",
    catalogFunctions: 6,
    exactMemberships: true,
    exactOwnership: true,
    expectedDenialsRollbackOnly: true,
  }))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "GREEN_CLEAN_PRIVILEGE_CLOSURE_UNIT_SUITE_FAILED")
  process.exitCode = 1
})
