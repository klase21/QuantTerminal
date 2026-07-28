import assert from "node:assert/strict"

import {
  MVP_GREEN_MIGRATION_CREDENTIAL_STORE_SCOPE,
  MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION,
  MVP_GREEN_MIGRATION_GRANT_EXECUTOR_ROLE,
  MVP_GREEN_MIGRATION_ROLE_MEMBERSHIP_OPERATION,
  MVP_GREEN_MIGRATION_ROLE_MEMBERSHIP_REVOKE_OPERATION,
  assertMvpGreenGrantExecutorTarget,
  assertMvpGreenMigrationMembershipGranted,
  createMvpGreenGrantExecutorTargetChecksum,
  createMvpGreenMigrationMembershipGrantSql,
  createMvpGreenMigrationMembershipRevokeSql,
  createMvpGreenMigrationMembershipTopology,
  discoverMvpGreenServingMigrationPlan,
  executeMvpGreenSetRoleServingMigrations,
  TargetBoundWindowsUserScopeDpapiCredentialStore,
  verifyMvpGreenServingMigrationPlan,
  verifyMvpGreenTargetBoundDpapiEnvelope,
  type MvpGreenDpapiEnvelopeStore,
  type MvpGreenDpapiProtector,
  type MvpGreenTargetBoundDpapiEnvelope,
  type MvpGreenMigrationSql,
} from "@/lib/data-platform/mvp-release/greenMigrationExecution"
import { MVP_SERVING_MIGRATION_ORDER } from "@/lib/data-platform/mvp-serving/migrationOrder"

const ownerRole = "mvp_green_migration_owner" as const
const loginRole = "mvp_green_migration_login_9c177d6309" as const
const target = Object.freeze({ projectId: "soft-cell-16396854", branchId: "br-green-migration-123", databaseName: "mvp_release_20260721_9c177d6309", executorRole: MVP_GREEN_MIGRATION_GRANT_EXECUTOR_ROLE, ownerRole })
const observed = Object.freeze({ projectId: target.projectId, branchId: target.branchId, databaseName: target.databaseName, currentUser: target.executorRole, currentRole: target.executorRole, transactionReadOnly: "off" as const })

class FakeDpapi implements MvpGreenDpapiProtector {
  readonly scope = MVP_GREEN_MIGRATION_CREDENTIAL_STORE_SCOPE
  readonly calls: Array<{ readonly operation: "protect" | "unprotect"; readonly entropy: string }> = []
  async protect(plaintext: Uint8Array, entropy: Uint8Array): Promise<Uint8Array> { this.calls.push({ operation: "protect", entropy: Buffer.from(entropy).toString("utf8") }); return Buffer.from(plaintext).reverse() }
  async unprotect(ciphertext: Uint8Array, entropy: Uint8Array): Promise<Uint8Array> { this.calls.push({ operation: "unprotect", entropy: Buffer.from(entropy).toString("utf8") }); return Buffer.from(ciphertext).reverse() }
}

class FakeEnvelopes implements MvpGreenDpapiEnvelopeStore {
  value: MvpGreenTargetBoundDpapiEnvelope | null = null
  async readEnvelope(): Promise<MvpGreenTargetBoundDpapiEnvelope | null> { return this.value }
  async writeEnvelope(_path: string, value: MvpGreenTargetBoundDpapiEnvelope): Promise<void> { this.value = value }
}

class FakeMigrationSql implements MvpGreenMigrationSql {
  readonly statements: string[] = []
  readonly ledger = new Map<string, string>()
  role = ""
  async transaction<T>(work: (sql: MvpGreenMigrationSql) => Promise<T>): Promise<T> { return work(this) }
  async unsafe<T extends Record<string, unknown> = Record<string, unknown>>(query: string, parameters: readonly unknown[] = []): Promise<readonly T[]> {
    this.statements.push(query)
    if (query.startsWith("SET LOCAL ROLE")) { this.role = ownerRole; return [] }
    if (query.startsWith("SELECT session_user,current_user,current_database()")) return [{ session_user: loginRole, current_user: this.role, database_name: target.databaseName, branch_id: target.branchId } as unknown as T]
    if (query.startsWith("SELECT migration_id,migration_filename,migration_checksum")) return []
    if (query.startsWith("SELECT migration_checksum")) { const checksum = this.ledger.get(String(parameters[0])); return checksum ? [{ migration_checksum: checksum } as unknown as T] : [] }
    if (query.startsWith("INSERT INTO serving_control.migration_ledger")) { this.ledger.set(String(parameters[0]), String(parameters[2])); return [] }
    return []
  }
}

async function main() {
  assert.equal(MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION, "mvp-green-migration-execution/1.0.0")
  assert.equal(MVP_GREEN_MIGRATION_ROLE_MEMBERSHIP_OPERATION, "GREEN_MIGRATION_ROLE_MEMBERSHIP_GRANT")
  assert.equal(MVP_GREEN_MIGRATION_ROLE_MEMBERSHIP_REVOKE_OPERATION, "GREEN_MIGRATION_ROLE_MEMBERSHIP_REVOKE")
  const protector = new FakeDpapi(); const envelopes = new FakeEnvelopes()
  const credentials = new TargetBoundWindowsUserScopeDpapiCredentialStore(protector, envelopes)
  const credentialTargetChecksum = "c".repeat(64)
  const credentialEnvelope = await credentials.put({
    path: "C:\\isolated-test\\credential.dpapi.json",
    credentialId: loginRole,
    targetChecksum: credentialTargetChecksum,
    projectId: target.projectId,
    branchId: target.branchId,
    databaseName: target.databaseName,
    roleName: loginRole,
    releaseChecksum: "d".repeat(64),
    creationInvocationId: "test-invocation",
    createdAt: "2026-07-28T00:00:00.000Z",
    secret: "real-process-injected-secret",
    allowWrite: true,
  })
  assert.equal(JSON.stringify(credentialEnvelope).includes("real-process-injected-secret"), false)
  assert.doesNotThrow(() => verifyMvpGreenTargetBoundDpapiEnvelope(credentialEnvelope, credentialTargetChecksum))
  assert.equal(await credentials.get("C:\\isolated-test\\credential.dpapi.json", loginRole, credentialTargetChecksum), "real-process-injected-secret")
  assert.deepEqual(protector.calls.map((call) => call.operation), ["protect", "unprotect"])
  await assert.rejects(credentials.get("C:\\isolated-test\\credential.dpapi.json", loginRole, "e".repeat(64)), /MVP_GREEN_DPAPI_ENVELOPE_INVALID/)
  assert.throws(() => new TargetBoundWindowsUserScopeDpapiCredentialStore({ scope: "MACHINE" as never, protect: protector.protect.bind(protector), unprotect: protector.unprotect.bind(protector) }, envelopes), /MVP_GREEN_DPAPI_CURRENT_USER_REQUIRED/)
  assert.doesNotThrow(() => assertMvpGreenGrantExecutorTarget(target, observed))
  assert.throws(() => assertMvpGreenGrantExecutorTarget({ ...target, executorRole: target.ownerRole } as unknown as typeof target, observed), /MVP_GREEN_GRANT_EXECUTOR_TARGET_INVALID/)
  assert.throws(() => assertMvpGreenGrantExecutorTarget(target, { ...observed, transactionReadOnly: "on" }), /MVP_GREEN_GRANT_EXECUTOR_TARGET_MISMATCH/)
  assert.notEqual(createMvpGreenGrantExecutorTargetChecksum(target), createMvpGreenGrantExecutorTargetChecksum({ ...target, databaseName: "mvp_release_other" }))
  const topology = createMvpGreenMigrationMembershipTopology()
  assert.equal(createMvpGreenMigrationMembershipGrantSql(topology), `ALTER ROLE "${loginRole}" NOINHERIT; GRANT "${ownerRole}" TO "${loginRole}" WITH INHERIT FALSE, SET TRUE, ADMIN FALSE`)
  assert.equal(createMvpGreenMigrationMembershipRevokeSql(topology), `REVOKE "${ownerRole}" FROM "${loginRole}"`)
  const membership = { memberRole: loginRole, ownerRole, member: true, adminOption: false, inheritOption: false, setRole: true, login: true, loginInherit: false } as const
  assert.doesNotThrow(() => assertMvpGreenMigrationMembershipGranted(topology, membership))
  assert.throws(() => assertMvpGreenMigrationMembershipGranted(topology, { ...membership, setRole: false }), /MVP_GREEN_MIGRATION_ROLE_MEMBERSHIP_REQUIRED/)
  const plan = await discoverMvpGreenServingMigrationPlan()
  assert.equal(plan.migrations.map((migration) => migration.filename).join(","), MVP_SERVING_MIGRATION_ORDER.join(",")); assert.doesNotThrow(() => verifyMvpGreenServingMigrationPlan(plan)); assert.throws(() => verifyMvpGreenServingMigrationPlan({ ...plan, planChecksum: "0".repeat(64) }), /MVP_GREEN_MIGRATION_PLAN_CHECKSUM_MISMATCH/)
  const sql = new FakeMigrationSql()
  const execution = Object.freeze({ target, topology, observedTarget: observed, membership, executionIdentity: { sessionUser: loginRole, currentUser: loginRole }, plan, appliedBy: loginRole })
  const first = await executeMvpGreenSetRoleServingMigrations(sql, execution); assert.equal(first.every((result) => result.status === "APPLIED"), true); assert.equal(sql.statements[0], `SET LOCAL ROLE "${ownerRole}"`); assert.match(sql.statements[1]!, /SELECT session_user,current_user,current_database\(\)/)
  const second = await executeMvpGreenSetRoleServingMigrations(sql, execution); assert.equal(second.every((result) => result.status === "SKIPPED"), true)
  await assert.rejects(executeMvpGreenSetRoleServingMigrations(new FakeMigrationSql(), { ...execution, membership: { ...execution.membership, member: false } }), /MVP_GREEN_MIGRATION_ROLE_MEMBERSHIP_REQUIRED/)
  console.log("MVP GREEN MIGRATION EXECUTION SUITE: PASS")
}

main().catch((error: unknown) => { const message = error instanceof Error ? error.message : String(error); process.stderr.write(`${message.replace(/postgres(?:ql)?:\/\/[^@]+@/gi, "postgres://<redacted>@")}\n`); process.exitCode = 1 })
