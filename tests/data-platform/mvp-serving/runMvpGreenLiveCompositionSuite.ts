import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import {
  assertMvpGreenStageReceiptSanitized,
  assertMvpGreenFrozenReleaseIdentity,
  assertMvpGreenOperationApprovalIntegrity,
  compareMvpPostgresLsns,
  createMvpBlueGreenBranchPlan,
  createMvpGreenCertificationPlan,
  createMvpGreenOperationApproval,
  createMvpGreenReleaseDatabaseName,
  createMvpGreenReleaseIdentity,
  createMvpGreenStageReceipt,
  LiveMvpNeonGreenInfrastructureAdapter,
  MvpGreenInfrastructureError,
  MVP_GREEN_APPROVAL_SCHEMA_VERSION,
  MVP_GREEN_FROZEN_BRANCH_NAME,
  MVP_GREEN_FROZEN_DATABASE_NAME,
  MVP_GREEN_FROZEN_RELEASE_APPLICATION_COMMIT,
  MVP_GREEN_FROZEN_RELEASE_CHECKSUM,
  MVP_GREEN_MIGRATION_OWNER_ROLE,
  MVP_GREEN_PRODUCTION_BRANCH_ID,
  MVP_GREEN_PRODUCTION_DATABASE,
  MVP_GREEN_PRODUCTION_PROJECT_ID,
  runMvpBlueGreenCertificationOnlyPipeline,
  type MvpBlueGreenCertificationOnlyPorts,
  type MvpGreenOperationKind,
  type MvpGreenOperationApproval,
  type MvpGreenParentState,
  type MvpGreenReleaseIdentity,
  type MvpNeonTransport,
  type MvpNeonTransportResponse,
} from "@/lib/data-platform/mvp-release"

const START = "2026-07-16T00:00:00.000Z"
const END = "2026-07-21T00:00:00.000Z"
const COMMIT = "f".repeat(40)
const NOW = "2026-07-23T00:00:00.000Z"
const EXPIRES = "2026-07-23T01:00:00.000Z"
const GREEN_BRANCH_ID = "br-green-certified-123"

async function main() {
const plan = createMvpBlueGreenBranchPlan({
  projectId: MVP_GREEN_PRODUCTION_PROJECT_ID,
  parentBranchId: MVP_GREEN_PRODUCTION_BRANCH_ID,
  databaseName: "mvp_release_seed",
  applicationCommit: COMMIT,
  currentWatermark: START,
  governedThrough: END,
})
const release = createMvpGreenReleaseIdentity(plan)
const certifiedPlan = createMvpGreenCertificationPlan({
  projectId: MVP_GREEN_PRODUCTION_PROJECT_ID,
  parentBranchId: MVP_GREEN_PRODUCTION_BRANCH_ID,
  applicationCommit: COMMIT,
  currentWatermark: START,
  governedThrough: END,
})

assert.match(release.branchName, /^mvp-release-2026-07-21-[0-9a-f]{12}$/)
assert.match(release.databaseName, /^mvp_release_20260721_[0-9a-f]{10}$/)
assert.equal(release.databaseName, createMvpGreenReleaseDatabaseName(plan))
assert.notEqual(release.databaseName, MVP_GREEN_PRODUCTION_DATABASE)
assert.equal(createMvpGreenReleaseIdentity(plan).releaseChecksum, release.releaseChecksum)
assert.equal(certifiedPlan.databaseName, createMvpGreenReleaseDatabaseName(certifiedPlan))
assert.notEqual(
  createMvpGreenReleaseIdentity(createMvpBlueGreenBranchPlan({ ...plan, governedThrough: "2026-07-22T00:00:00.000Z" })).databaseName,
  release.databaseName,
)
assert.throws(
  () => createMvpGreenReleaseIdentity(createMvpBlueGreenBranchPlan({
    ...plan,
    currentWatermark: "2026-07-16T00:00:00Z",
  })),
  /MVP_BLUE_GREEN_CURRENT_WATERMARK_INVALID/,
)
assert.equal(compareMvpPostgresLsns("0/100", "0/100"), 0)
assert.equal(compareMvpPostgresLsns("0/120", "0/100"), 1)
assert.equal(compareMvpPostgresLsns("0/FF", "0/100"), -1)
assert.equal(compareMvpPostgresLsns("1/0", "0/FFFFFFFF"), 1)
assert.throws(() => compareMvpPostgresLsns("not-an-lsn", "0/100"), /PARENT_STATE_UNRESOLVED/)
assert.throws(() => compareMvpPostgresLsns("0/100", "0\/0001"), /APPROVED_PARENT_LSN_INVALID/)
assert.throws(() => compareMvpPostgresLsns("0/100", "a/1"), /APPROVED_PARENT_LSN_INVALID/)
assert.throws(() => compareMvpPostgresLsns("0/100", "00/1"), /APPROVED_PARENT_LSN_INVALID/)
assert.throws(() => compareMvpPostgresLsns("0/100", "100000000/0"), /APPROVED_PARENT_LSN_INVALID/)
assert.throws(() => compareMvpPostgresLsns("0/100", "0/100000000"), /APPROVED_PARENT_LSN_INVALID/)
assert.equal(MVP_GREEN_APPROVAL_SCHEMA_VERSION, "mvp-green-infrastructure-approval/1.3.0")

const frozenPlan = createMvpGreenCertificationPlan({
  projectId: MVP_GREEN_PRODUCTION_PROJECT_ID,
  parentBranchId: MVP_GREEN_PRODUCTION_BRANCH_ID,
  applicationCommit: MVP_GREEN_FROZEN_RELEASE_APPLICATION_COMMIT,
  currentWatermark: START,
  governedThrough: END,
})
const frozenRelease = createMvpGreenReleaseIdentity(frozenPlan)
assert.doesNotThrow(() => assertMvpGreenFrozenReleaseIdentity(frozenRelease))
assert.equal(frozenRelease.branchName, MVP_GREEN_FROZEN_BRANCH_NAME)
assert.equal(frozenRelease.databaseName, MVP_GREEN_FROZEN_DATABASE_NAME)
assert.equal(frozenRelease.releaseChecksum, MVP_GREEN_FROZEN_RELEASE_CHECKSUM)
const futureToolingHead = "b".repeat(40)
assert.notEqual(futureToolingHead, frozenRelease.applicationCommit)
assert.deepEqual(createMvpGreenReleaseIdentity(frozenPlan), frozenRelease)

type Branch = {
  id: string
  project_id: string
  name: string
  parent_id: string | null
  parent_lsn?: string | null
  current_state: string
  created_at?: string
  updated_at?: string
  region_id?: string | null
}
type Database = { branch_id: string; name: string; owner_name: string; created_at?: string }
type Role = {
  branch_id: string
  name: string
  protected: boolean
  created_at?: string
  updated_at?: string
  password?: string
}
type Endpoint = {
  id: string
  project_id: string
  branch_id: string
  type: "read_write" | "read_only"
  current_state: string
  pooler_mode?: string
  disabled?: boolean
  created_at: string
  updated_at: string
}
type Operation = {
  id: string
  project_id: string
  branch_id: string
  endpoint_id: string | null
  action: string
  status: string
  failures_count: number
  created_at: string
  updated_at: string
}

class FakeNeonTransport implements MvpNeonTransport {
  readonly branches = new Map<string, Branch>()
  readonly databases = new Map<string, Database[]>()
  readonly roles = new Map<string, Role[]>()
  readonly endpoints = new Map<string, Endpoint[]>()
  readonly operations = new Map<string, Operation>()
  calls: { method: string; path: string; body: unknown }[] = []
  branchResponseLost = false
  roleResponseLost = false
  rolePostStatus = 201
  rolePostCreatesRole = true
  rolePostErrorBody: unknown = null
  rolePostThrowBefore: MvpGreenInfrastructureError | null = null
  rolePostThrowAfter: MvpGreenInfrastructureError | null = null
  rolePostMalformed = false
  operationLookupStatus = 200
  operationStates: string[] = ["finished"]
  operationGetCount = 0
  databaseResponseLost = false
  onBranchLookup: (() => void) | null = null
  authFailure = false
  projectId: string = MVP_GREEN_PRODUCTION_PROJECT_ID
  projectRegion: string | undefined = "aws-ap-southeast-1"

  constructor() {
    this.branches.set(MVP_GREEN_PRODUCTION_BRANCH_ID, {
      id: MVP_GREEN_PRODUCTION_BRANCH_ID,
      project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
      name: "mvp-inactive-staging",
      parent_id: null,
      parent_lsn: null,
      current_state: "ready",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: NOW,
      region_id: "aws-ap-southeast-1",
    })
    this.databases.set(MVP_GREEN_PRODUCTION_BRANCH_ID, [{
      branch_id: MVP_GREEN_PRODUCTION_BRANCH_ID,
      name: MVP_GREEN_PRODUCTION_DATABASE,
      owner_name: "owner",
      created_at: "2026-07-01T00:00:00.000Z",
    }])
    this.roles.set(MVP_GREEN_PRODUCTION_BRANCH_ID, [
      {
        branch_id: MVP_GREEN_PRODUCTION_BRANCH_ID,
        name: "mvp_serving_reader",
        protected: false,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ])
  }

  async request(input: { method: "GET" | "POST"; path: string; body?: Readonly<Record<string, unknown>> }): Promise<MvpNeonTransportResponse> {
    this.calls.push({ method: input.method, path: input.path, body: input.body ?? null })
    if (this.authFailure) return { status: 401, body: { error: "redacted" } }
    if (input.method === "GET" && input.path === `/projects/${MVP_GREEN_PRODUCTION_PROJECT_ID}`) {
      return { status: 200, body: { project: { id: this.projectId, region_id: this.projectRegion } } }
    }
    const branchDetail = input.path.match(/^\/projects\/[^/]+\/branches\/(br-[^/?]+)$/)
    if (input.method === "GET" && branchDetail) {
      const branch = this.branches.get(branchDetail[1]!)
      return branch ? { status: 200, body: { branch } } : { status: 404, body: {} }
    }
    if (input.method === "GET" && input.path.includes("/branches?search=")) {
      this.onBranchLookup?.()
      return { status: 200, body: { branches: [...this.branches.values()] } }
    }
    const databaseList = input.path.match(/^\/projects\/[^/]+\/branches\/(br-[^/]+)\/databases$/)
    if (input.method === "GET" && databaseList) {
      return { status: 200, body: { databases: this.databases.get(databaseList[1]!) ?? [] } }
    }
    const databaseDetail = input.path.match(/^\/projects\/[^/]+\/branches\/(br-[^/]+)\/databases\/([^/]+)$/)
    if (input.method === "GET" && databaseDetail) {
      const database = (this.databases.get(databaseDetail[1]!) ?? []).find((value) => value.name === databaseDetail[2])
      return database ? { status: 200, body: { database } } : { status: 404, body: {} }
    }
    const roleList = input.path.match(/^\/projects\/[^/]+\/branches\/(br-[^/]+)\/roles$/)
    if (input.method === "GET" && roleList) {
      return { status: 200, body: { roles: this.roles.get(roleList[1]!) ?? [] } }
    }
    const roleDetail = input.path.match(/^\/projects\/[^/]+\/branches\/(br-[^/]+)\/roles\/([^/]+)$/)
    if (input.method === "GET" && roleDetail) {
      const role = (this.roles.get(roleDetail[1]!) ?? []).find((value) => value.name === roleDetail[2])
      return role ? { status: 200, body: { role } } : { status: 404, body: {} }
    }
    const endpointList = input.path.match(/^\/projects\/[^/]+\/branches\/(br-[^/]+)\/endpoints$/)
    if (input.method === "GET" && endpointList) {
      return { status: 200, body: { endpoints: this.endpoints.get(endpointList[1]!) ?? [] } }
    }
    const endpointDetail = input.path.match(/^\/projects\/[^/]+\/endpoints\/(ep-[^/]+)$/)
    if (input.method === "GET" && endpointDetail) {
      const endpoint = [...this.endpoints.values()].flat().find((value) => value.id === endpointDetail[1])
      return endpoint ? { status: 200, body: { endpoint } } : { status: 404, body: {} }
    }
    const operationDetail = input.path.match(/^\/projects\/[^/]+\/operations\/([0-9a-f-]{36})$/)
    if (input.method === "GET" && operationDetail) {
      const operation = this.operations.get(operationDetail[1]!)
      if (operation) {
        this.operationGetCount += 1
        operation.status = this.operationStates.shift() ?? operation.status
      }
      if (this.operationLookupStatus !== 200) {
        return { status: this.operationLookupStatus, body: { code: "operation_lookup_failed" } }
      }
      return operation ? { status: 200, body: { operation } } : { status: 404, body: {} }
    }
    if (input.method === "POST" && input.path === `/projects/${MVP_GREEN_PRODUCTION_PROJECT_ID}/branches`) {
      const branchInput = input.body?.branch as { name: string; parent_id: string; parent_lsn: string }
      const branch: Branch = {
        id: GREEN_BRANCH_ID,
        project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
        name: branchInput.name,
        parent_id: branchInput.parent_id,
        parent_lsn: branchInput.parent_lsn,
        current_state: "ready",
        created_at: NOW,
        updated_at: NOW,
        region_id: "aws-ap-southeast-1",
      }
      this.branches.set(branch.id, branch)
      this.databases.set(branch.id, [{
        branch_id: branch.id,
        name: MVP_GREEN_PRODUCTION_DATABASE,
        owner_name: "owner",
        created_at: NOW,
      }])
      this.roles.set(branch.id, (this.roles.get(MVP_GREEN_PRODUCTION_BRANCH_ID) ?? []).map((role) => ({
        ...role,
        branch_id: branch.id,
      })))
      this.endpoints.set(branch.id, [{
        id: "ep-green-certified-123",
        project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
        branch_id: branch.id,
        type: "read_write",
        current_state: "idle",
        pooler_mode: "transaction",
        created_at: NOW,
        updated_at: NOW,
      }])
      if (this.branchResponseLost) throw new Error("NETWORK_RESPONSE_LOST")
      return { status: 201, body: { branch } }
    }
    if (input.method === "POST" && roleList) {
      if (this.rolePostThrowBefore) throw this.rolePostThrowBefore
      const roleInput = input.body?.role as { name: string; no_login: boolean }
      const role: Role = {
        branch_id: roleList[1]!,
        name: roleInput.name,
        protected: false,
        created_at: NOW,
        updated_at: NOW,
        password: "must-never-escape",
      }
      if (this.rolePostCreatesRole) {
        this.roles.set(role.branch_id, [...(this.roles.get(role.branch_id) ?? []), role])
      }
      if (this.rolePostThrowAfter) throw this.rolePostThrowAfter
      if (this.roleResponseLost) throw new Error("NETWORK_RESPONSE_LOST_WITH_SECRET:must-never-escape")
      const operation: Operation = {
        id: "11111111-1111-4111-8111-111111111111",
        project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
        branch_id: role.branch_id,
        endpoint_id: this.endpoints.get(role.branch_id)?.[0]?.id ?? null,
        action: "apply_config",
        status: this.operationStates[0] ?? "finished",
        failures_count: 0,
        created_at: NOW,
        updated_at: NOW,
      }
      this.operations.set(operation.id, operation)
      return {
        status: this.rolePostStatus,
        body: this.rolePostErrorBody ?? { role, operations: [operation] },
        headers: { "x-request-id": "req-green-role-123", "retry-after": "2" },
        malformedBody: this.rolePostMalformed,
      }
    }
    if (input.method === "POST" && databaseList) {
      const databaseInput = input.body?.database as { name: string; owner_name: string }
      const database: Database = {
        branch_id: databaseList[1]!,
        name: databaseInput.name,
        owner_name: databaseInput.owner_name,
        created_at: NOW,
      }
      this.databases.set(database.branch_id, [...(this.databases.get(database.branch_id) ?? []), database])
      if (this.databaseResponseLost) throw new Error("NETWORK_RESPONSE_LOST")
      return { status: 201, body: { database } }
    }
    return { status: 404, body: {} }
  }
}

const parentBasis = {
  projectId: MVP_GREEN_PRODUCTION_PROJECT_ID,
  branchId: MVP_GREEN_PRODUCTION_BRANCH_ID,
  databaseName: MVP_GREEN_PRODUCTION_DATABASE,
  lsn: "0/2BE2898",
  readOnlyTransaction: true as const,
  inspectedAt: NOW,
}

function adapterFixture() {
  const transport = new FakeNeonTransport()
  let parentStateInspections = 0
  const adapter = new LiveMvpNeonGreenInfrastructureAdapter({
    transport,
    operationPolling: { maxAttempts: 4, delayMs: 0, sleep: async () => undefined },
    parentStateReader: { inspect: async () => {
      parentStateInspections += 1
      return parentBasis
    } },
  })
  return { transport, adapter, parentStateInspections: () => parentStateInspections }
}

function approval(
  operation: MvpGreenOperationKind,
  identity: MvpGreenReleaseIdentity,
  parent: MvpGreenParentState,
  targets: Partial<Pick<
    MvpGreenOperationApproval,
    "targetGreenBranchId" | "targetDatabaseName" | "targetRoleName" | "targetOwnerRole"
  >> = {},
) {
  const targetsGreenResource = operation !== "NEON_BRANCH_CREATE"
  return createMvpGreenOperationApproval({
    approved: true,
    operation,
    releaseChecksum: identity.releaseChecksum,
    projectId: identity.projectId,
    parentBranchId: identity.parentBranchId,
    expectedParentState: parent.stateChecksum,
    expectedParentLsn: parent.lsn,
    targetBranchName: identity.branchName,
    targetGreenBranchId: targets.targetGreenBranchId ?? (targetsGreenResource ? GREEN_BRANCH_ID : null),
    targetDatabaseName: targets.targetDatabaseName ?? (
      operation === "GREEN_DATABASE_CREATE" || operation === "GREEN_ACQUISITION_START"
      ? identity.databaseName
      : null
    ),
    targetRoleName: targets.targetRoleName ?? (
      operation === "GREEN_OWNER_ROLE_CREATE" ? MVP_GREEN_MIGRATION_OWNER_ROLE : null
    ),
    targetRoleNoLogin: operation === "GREEN_OWNER_ROLE_CREATE" ? true : null,
    targetOwnerRole: targets.targetOwnerRole ?? (
      operation === "GREEN_DATABASE_CREATE" ? MVP_GREEN_MIGRATION_OWNER_ROLE : null
    ),
    invocationId: `invocation-${operation.toLowerCase()}`,
    actorId: "jay-local-operator",
    issuedAt: NOW,
    expiresAt: EXPIRES,
  })
}

async function preparedRoleFixture() {
  const fixture = adapterFixture()
  const parent = await fixture.adapter.resolveParentState()
  await fixture.adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  return { ...fixture, parent }
}

{
  const { adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  const branchApproval = approval("NEON_BRANCH_CREATE", release, parent)
  const roleApproval = approval("GREEN_OWNER_ROLE_CREATE", release, parent)
  const databaseApproval = approval("GREEN_DATABASE_CREATE", release, parent)
  const acquisitionApproval = approval("GREEN_ACQUISITION_START", release, parent)
  assert.deepEqual(
    [
      branchApproval.targetGreenBranchId,
      branchApproval.targetDatabaseName,
      branchApproval.targetRoleName,
      branchApproval.targetOwnerRole,
    ],
    [null, null, null, null],
  )
  assert.deepEqual(
    [
      roleApproval.targetGreenBranchId,
      roleApproval.targetDatabaseName,
      roleApproval.targetRoleName,
      roleApproval.targetRoleNoLogin,
      roleApproval.targetOwnerRole,
    ],
    [GREEN_BRANCH_ID, null, MVP_GREEN_MIGRATION_OWNER_ROLE, true, null],
  )
  assert.deepEqual(
    [
      databaseApproval.targetGreenBranchId,
      databaseApproval.targetDatabaseName,
      databaseApproval.targetRoleName,
      databaseApproval.targetRoleNoLogin,
      databaseApproval.targetOwnerRole,
    ],
    [GREEN_BRANCH_ID, release.databaseName, null, null, MVP_GREEN_MIGRATION_OWNER_ROLE],
  )
  assert.deepEqual(
    [
      acquisitionApproval.targetGreenBranchId,
      acquisitionApproval.targetDatabaseName,
      acquisitionApproval.targetRoleName,
      acquisitionApproval.targetRoleNoLogin,
      acquisitionApproval.targetOwnerRole,
    ],
    [GREEN_BRANCH_ID, release.databaseName, null, null, null],
  )
  assert.deepEqual(
    Object.keys(roleApproval).sort(),
    [
      "actorId",
      "approvalChecksum",
      "expectedParentLsn",
      "expectedParentState",
      "expiresAt",
      "invocationId",
      "issuedAt",
      "operation",
      "parentBranchId",
      "projectId",
      "releaseChecksum",
      "schemaVersion",
      "targetBranchName",
      "targetDatabaseName",
      "targetGreenBranchId",
      "targetOwnerRole",
      "targetRoleName",
      "targetRoleNoLogin",
    ],
  )
  const otherBranchApproval = approval("GREEN_OWNER_ROLE_CREATE", release, parent, {
    targetGreenBranchId: "br-other-green-certified",
  })
  assert.notEqual(otherBranchApproval.approvalChecksum, roleApproval.approvalChecksum)
  assert.throws(
    () => assertMvpGreenOperationApprovalIntegrity({
      approval: { ...roleApproval, targetGreenBranchId: "br-other-green-certified" },
      operation: "GREEN_OWNER_ROLE_CREATE",
      at: NOW,
    }),
    /APPROVAL_REQUIRED/,
  )
  assert.throws(
    () => assertMvpGreenOperationApprovalIntegrity({
      approval: { ...databaseApproval, targetOwnerRole: "neondb_owner" },
      operation: "GREEN_DATABASE_CREATE",
      at: NOW,
    }),
    /APPROVAL_REQUIRED/,
  )
  assert.throws(
    () => assertMvpGreenOperationApprovalIntegrity({
      approval: { ...roleApproval, targetRoleName: "neondb_owner" },
      operation: "GREEN_OWNER_ROLE_CREATE",
      at: NOW,
    }),
    /APPROVAL_REQUIRED/,
  )
  assert.throws(
    () => assertMvpGreenOperationApprovalIntegrity({
      approval: { ...roleApproval, targetRoleNoLogin: false },
      operation: "GREEN_OWNER_ROLE_CREATE",
      at: NOW,
    }),
    /APPROVAL_REQUIRED/,
  )
  const { targetRoleNoLogin: _missingNoLogin, ...missingNoLogin } = roleApproval
  assert.throws(
    () => assertMvpGreenOperationApprovalIntegrity({
      approval: missingNoLogin as MvpGreenOperationApproval,
      operation: "GREEN_OWNER_ROLE_CREATE",
      at: NOW,
    }),
    /APPROVAL_REQUIRED/,
  )
  assert.throws(
    () => assertMvpGreenOperationApprovalIntegrity({
      approval: {
        ...roleApproval,
        schemaVersion: "mvp-green-infrastructure-approval/1.2.0",
      } as unknown as MvpGreenOperationApproval,
      operation: "GREEN_OWNER_ROLE_CREATE",
      at: NOW,
    }),
    /APPROVAL_REQUIRED/,
  )
  const {
    schemaVersion: _schemaVersion,
    approvalChecksum: _approvalChecksum,
    targetGreenBranchId: _targetGreenBranchId,
    targetRoleName: _targetRoleName,
    targetRoleNoLogin: _targetRoleNoLogin,
    targetOwnerRole: _targetOwnerRole,
    ...legacyBasis
  } = databaseApproval
  assert.throws(
    () => assertMvpGreenOperationApprovalIntegrity({
      approval: {
        schemaVersion: "mvp-green-infrastructure-approval/1.1.0",
        ...legacyBasis,
        approvalChecksum: databaseApproval.approvalChecksum,
      } as unknown as MvpGreenOperationApproval,
      operation: "GREEN_DATABASE_CREATE",
      at: NOW,
    }),
    /APPROVAL_REQUIRED/,
  )
  const {
    schemaVersion: _roleSchema,
    approvalChecksum: _roleChecksum,
    ...roleBasis
  } = roleApproval
  assert.throws(
    () => createMvpGreenOperationApproval({
      approved: true,
      ...roleBasis,
      targetDatabaseName: release.databaseName,
    }),
    /APPROVAL_REQUIRED/,
  )
  const {
    schemaVersion: _databaseSchema,
    approvalChecksum: _databaseChecksum,
    ...databaseBasis
  } = databaseApproval
  assert.throws(
    () => createMvpGreenOperationApproval({
      approved: true,
      ...databaseBasis,
      targetOwnerRole: null,
    }),
    /OWNER_ROLE_REQUIRED/,
  )
}

{
  const { transport, adapter, parentStateInspections } = adapterFixture()
  const parent = await adapter.resolveParentState()
  assert.equal(parent.readOnlyTransaction, true)
  assert.equal(parent.lsn, "0/2BE2898")
  await assert.rejects(
    () => adapter.createChildBranch({ release, approval: null, parentState: parent, at: NOW }),
    /APPROVAL_REQUIRED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
  const branch = await adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(branch.status, "CREATED")
  assert.equal(branch.parentBranchId, MVP_GREEN_PRODUCTION_BRANCH_ID)
  assert.equal(branch.parentLsn, parent.lsn)
  assert.equal(parentStateInspections(), 1)
  const branchPost = transport.calls.find((call) => call.method === "POST" && call.path.endsWith("/branches"))
  assert.equal((branchPost?.body as { branch?: { parent_lsn?: string } }).branch?.parent_lsn, parent.lsn)
  assert.deepEqual(branch.inheritedDatabases.map((database) => database.databaseName), [MVP_GREEN_PRODUCTION_DATABASE])
  const reconciledBranch = await adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(reconciledBranch.status, "RECONCILED")
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/branches")).length, 1)
  const role = await adapter.createMigrationOwnerRole({
    release,
    approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(role.creationStatus, "CREATED")
  assert.equal(role.roleName, MVP_GREEN_MIGRATION_OWNER_ROLE)
  assert.equal(JSON.stringify(role).includes("must-never-escape"), false)
  assert.equal((await adapter.createMigrationOwnerRole({
    release,
    approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })).creationStatus, "RECONCILED")
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 1)
  const database = await adapter.createReleaseDatabase({
    release,
    approval: approval("GREEN_DATABASE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(database.creationStatus, "CREATED")
  assert.equal(database.databaseName, release.databaseName)
  const rolePost = transport.calls.find((call) => call.method === "POST" && call.path.endsWith("/roles"))
  assert.equal(rolePost?.path, `/projects/${MVP_GREEN_PRODUCTION_PROJECT_ID}/branches/${GREEN_BRANCH_ID}/roles`)
  assert.equal((rolePost?.body as { role?: { name?: string } }).role?.name, MVP_GREEN_MIGRATION_OWNER_ROLE)
  assert.equal((rolePost?.body as { role?: { no_login?: boolean } }).role?.no_login, true)
  const databasePost = transport.calls.find((call) => call.method === "POST" && call.path.endsWith("/databases"))
  assert.equal(databasePost?.path, `/projects/${MVP_GREEN_PRODUCTION_PROJECT_ID}/branches/${GREEN_BRANCH_ID}/databases`)
  assert.equal(
    (databasePost?.body as { database?: { name?: string; owner_name?: string } }).database?.name,
    release.databaseName,
  )
  assert.equal(
    (databasePost?.body as { database?: { name?: string; owner_name?: string } }).database?.owner_name,
    MVP_GREEN_MIGRATION_OWNER_ROLE,
  )
  assert.equal((await adapter.createReleaseDatabase({
    release,
    approval: approval("GREEN_DATABASE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })).creationStatus, "RECONCILED")
}

{
  const { transport, adapter } = adapterFixture()
  const branch = transport.branches.get(MVP_GREEN_PRODUCTION_BRANCH_ID)!
  branch.created_at = "2026-07-18T08:29:29Z"
  branch.updated_at = "2026-07-23T23:57:45+09:00"
  branch.region_id = undefined
  const normalized = await adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID)
  assert.equal(normalized.createdAt, "2026-07-18T08:29:29.000Z")
  assert.equal(normalized.updatedAt, "2026-07-23T14:57:45.000Z")
  branch.created_at = "2026-07-18T08:29:29.000Z"
  assert.equal(
    (await adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID)).createdAt,
    "2026-07-18T08:29:29.000Z",
  )
  branch.created_at = "not-a-timestamp"
  await assert.rejects(
    () => adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID),
    /PARENT_BRANCH_IDENTITY_MISMATCH/,
  )
  branch.created_at = undefined
  await assert.rejects(
    () => adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID),
    /PARENT_BRANCH_IDENTITY_MISMATCH/,
  )
}

{
  const { transport, adapter } = adapterFixture()
  const database = transport.databases.get(MVP_GREEN_PRODUCTION_BRANCH_ID)![0]!
  database.created_at = "2026-07-15T12:47:49Z"
  const inspected = await adapter.listInheritedDatabases(
    MVP_GREEN_PRODUCTION_PROJECT_ID,
    MVP_GREEN_PRODUCTION_BRANCH_ID,
  )
  assert.equal(inspected[0]?.createdAt, "2026-07-15T12:47:49.000Z")
  database.created_at = undefined
  await assert.rejects(
    () => adapter.listInheritedDatabases(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID),
    /RELEASE_DATABASE_IDENTITY_UNVERIFIED/,
  )
}

{
  const { transport, adapter } = adapterFixture()
  assert.equal(
    (await adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID)).region,
    "aws-ap-southeast-1",
  )
  transport.branches.get(MVP_GREEN_PRODUCTION_BRANCH_ID)!.region_id = undefined
  assert.equal(
    (await adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID)).region,
    "aws-ap-southeast-1",
  )
  transport.branches.get(MVP_GREEN_PRODUCTION_BRANCH_ID)!.region_id = ""
  assert.equal(
    (await adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID)).region,
    "aws-ap-southeast-1",
  )
  transport.branches.get(MVP_GREEN_PRODUCTION_BRANCH_ID)!.region_id = "aws-us-east-1"
  await assert.rejects(
    () => adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID),
    /PARENT_BRANCH_IDENTITY_MISMATCH/,
  )
}

{
  const { transport, adapter } = adapterFixture()
  transport.projectRegion = undefined
  await assert.rejects(
    () => adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID),
    /PROJECT_IDENTITY_MISMATCH/,
  )
  transport.projectRegion = "aws-ap-southeast-1"
  transport.projectId = "wrong-project"
  await assert.rejects(
    () => adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID),
    /PROJECT_IDENTITY_MISMATCH/,
  )
}

{
  const { transport, adapter } = adapterFixture()
  transport.branches.get(MVP_GREEN_PRODUCTION_BRANCH_ID)!.id = "br-wrong-identity"
  await assert.rejects(
    () => adapter.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID),
    /PARENT_BRANCH_IDENTITY_MISMATCH/,
  )
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  const databases = await adapter.listInheritedDatabases(
    MVP_GREEN_PRODUCTION_PROJECT_ID,
    MVP_GREEN_PRODUCTION_BRANCH_ID,
  )
  assert.equal(parent.readOnlyTransaction, true)
  assert.equal(parent.databaseName, MVP_GREEN_PRODUCTION_DATABASE)
  assert.equal(databases.some((database) => database.databaseName === MVP_GREEN_PRODUCTION_DATABASE), true)
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  transport.branchResponseLost = true
  const branch = await adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(branch.status, "CREATED")
  assert.equal(branch.parentLsn, parent.lsn)
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/branches")).length, 1)
  transport.roleResponseLost = true
  const role = await adapter.createMigrationOwnerRole({
    release,
    approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(role.creationStatus, "RECONCILED")
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 1)
  transport.databaseResponseLost = true
  const database = await adapter.createReleaseDatabase({
    release,
    approval: approval("GREEN_DATABASE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(database.creationStatus, "CREATED")
}

{
  const { adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  const stale = createMvpGreenOperationApproval({
    approved: true,
    operation: "NEON_BRANCH_CREATE",
    releaseChecksum: release.releaseChecksum,
    projectId: release.projectId,
    parentBranchId: release.parentBranchId,
    expectedParentState: parent.stateChecksum,
    expectedParentLsn: parent.lsn,
    targetBranchName: release.branchName,
    targetGreenBranchId: null,
    targetDatabaseName: null,
    targetRoleName: null,
    targetRoleNoLogin: null,
    targetOwnerRole: null,
    invocationId: "stale",
    actorId: "jay-local-operator",
    issuedAt: "2026-07-22T00:00:00.000Z",
    expiresAt: "2026-07-22T01:00:00.000Z",
  })
  await assert.rejects(
    () => adapter.createChildBranch({ release, approval: stale, parentState: parent, at: NOW }),
    /APPROVAL_STALE/,
  )
  const acquisitionApproval = approval("GREEN_ACQUISITION_START", release, parent)
  await assert.rejects(
    () => adapter.createChildBranch({ release, approval: acquisitionApproval, parentState: parent, at: NOW }),
    /APPROVAL_REQUIRED/,
  )
}

{
  let state = { ...parentBasis, lsn: "0/100" }
  let parentStateInspections = 0
  const transport = new FakeNeonTransport()
  const adapter = new LiveMvpNeonGreenInfrastructureAdapter({
    transport,
    parentStateReader: { inspect: async () => {
      parentStateInspections += 1
      return state
    } },
  })
  const approvedParent = await adapter.resolveParentState()
  state = { ...state, lsn: "0/120" }
  const runtimeParent = await adapter.resolveParentState()
  const branch = await adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, approvedParent),
    parentState: runtimeParent,
    at: NOW,
  })
  assert.equal(branch.status, "CREATED")
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/branches")).length, 1)
  assert.equal(branch.parentLsn, "0/100")
  assert.equal(parentStateInspections, 2)
  const branchPost = transport.calls.find((call) => call.method === "POST" && call.path.endsWith("/branches"))
  assert.equal((branchPost?.body as { branch?: { parent_lsn?: string } }).branch?.parent_lsn, "0/100")
  await adapter.createMigrationOwnerRole({
    release,
    approval: approval("GREEN_OWNER_ROLE_CREATE", release, approvedParent),
    parentState: runtimeParent,
    at: NOW,
  })
  const database = await adapter.createReleaseDatabase({
    release,
    approval: approval("GREEN_DATABASE_CREATE", release, approvedParent),
    parentState: runtimeParent,
    at: NOW,
  })
  assert.equal(database.creationStatus, "CREATED")
}

{
  let state = { ...parentBasis, lsn: "0/120" }
  const transport = new FakeNeonTransport()
  const adapter = new LiveMvpNeonGreenInfrastructureAdapter({
    transport,
    parentStateReader: { inspect: async () => state },
  })
  const approvedParent = await adapter.resolveParentState()
  state = { ...state, lsn: "0/100" }
  const runtimeParent = await adapter.resolveParentState()
  await assert.rejects(
    () => adapter.createChildBranch({
      release,
      approval: approval("NEON_BRANCH_CREATE", release, approvedParent),
      parentState: runtimeParent,
      at: NOW,
    }),
    /APPROVED_PARENT_LSN_AHEAD_OF_CURRENT/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  await assert.rejects(
    () => adapter.createChildBranch({
      release,
      approval: approval("NEON_BRANCH_CREATE", release, parent),
      parentState: { ...parent, lsn: "0/2BE2999" },
      at: NOW,
    }),
    /PARENT_STATE_UNRESOLVED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  transport.branches.set(GREEN_BRANCH_ID, {
    id: GREEN_BRANCH_ID,
    project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
    name: release.branchName,
    parent_id: MVP_GREEN_PRODUCTION_BRANCH_ID,
    parent_lsn: parent.lsn,
    current_state: "initializing",
    created_at: NOW,
    updated_at: NOW,
    region_id: "aws-ap-southeast-1",
  })
  transport.databases.set(GREEN_BRANCH_ID, [{
    branch_id: GREEN_BRANCH_ID,
    name: MVP_GREEN_PRODUCTION_DATABASE,
    owner_name: "owner",
    created_at: NOW,
  }])
  await assert.rejects(
    () => adapter.createChildBranch({
      release,
      approval: approval("NEON_BRANCH_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /BRANCH_IDENTITY_UNVERIFIED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  for (const branchId of ["br-green-duplicate-a", "br-green-duplicate-b"]) {
    transport.branches.set(branchId, {
      id: branchId,
      project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
      name: release.branchName,
      parent_id: MVP_GREEN_PRODUCTION_BRANCH_ID,
      parent_lsn: parent.lsn,
      current_state: "ready",
      created_at: NOW,
      updated_at: NOW,
      region_id: "aws-ap-southeast-1",
    })
  }
  await assert.rejects(
    () => adapter.createChildBranch({
      release,
      approval: approval("NEON_BRANCH_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /BRANCH_IDENTITY_UNVERIFIED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  const mutableApproval = { ...approval("NEON_BRANCH_CREATE", release, parent) }
  transport.onBranchLookup = () => {
    ;(mutableApproval as { expectedParentLsn: string }).expectedParentLsn = "0/2BE2899"
  }
  const branch = await adapter.createChildBranch({
    release,
    approval: mutableApproval,
    parentState: parent,
    at: NOW,
  })
  assert.equal(branch.parentLsn, parent.lsn)
  const branchPost = transport.calls.find((call) => call.method === "POST" && call.path.endsWith("/branches"))
  assert.equal((branchPost?.body as { branch?: { parent_lsn?: string } }).branch?.parent_lsn, parent.lsn)
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  const valid = approval("NEON_BRANCH_CREATE", release, parent)
  assert.equal(Object.prototype.hasOwnProperty.call(valid, "expectedParentLsn"), true)
  assert.equal(Object.prototype.hasOwnProperty.call(valid, "approved"), false)
  assert.match(JSON.stringify(valid), new RegExp(valid.expectedParentLsn.replace("/", "\\/")))
  const alteredLsn = { ...valid, expectedParentLsn: "0/2BE2899" }
  await assert.rejects(
    () => adapter.createChildBranch({ release, approval: alteredLsn, parentState: parent, at: NOW }),
    /APPROVAL_REQUIRED/,
  )
  const invalidLsn = { ...valid, expectedParentLsn: "0/nothex" }
  await assert.rejects(
    () => adapter.createChildBranch({ release, approval: invalidLsn, parentState: parent, at: NOW }),
    /APPROVED_PARENT_LSN_INVALID/,
  )
  const wrongParent = { ...valid, parentBranchId: "br-wrong-parent" }
  await assert.rejects(
    () => adapter.createChildBranch({ release, approval: wrongParent, parentState: parent, at: NOW }),
    /APPROVAL_REQUIRED/,
  )
  const nonNullTargetDatabase = { ...valid, targetDatabaseName: release.databaseName }
  await assert.rejects(
    () => adapter.createChildBranch({ release, approval: nonNullTargetDatabase, parentState: parent, at: NOW }),
    /APPROVAL_REQUIRED/,
  )
  const { expectedParentLsn: _expectedParentLsn, ...missingLsn } = valid
  await assert.rejects(
    () => adapter.createChildBranch({
      release,
      approval: missingLsn as typeof valid,
      parentState: parent,
      at: NOW,
    }),
    /APPROVAL_REQUIRED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  transport.authFailure = true
  await assert.rejects(() => adapter.inspectProject(MVP_GREEN_PRODUCTION_PROJECT_ID), /NEON_AUTHENTICATION_FAILURE/)
  await assert.rejects(
    () => adapter.listRoles(MVP_GREEN_PRODUCTION_PROJECT_ID, GREEN_BRANCH_ID),
    /NEON_AUTHENTICATION_FAILURE/,
  )
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  await adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  const roleApproval = approval("GREEN_OWNER_ROLE_CREATE", release, parent)
  assert.equal(await adapter.readBackCreatedRole(release, roleApproval), null)
  transport.roles.set(GREEN_BRANCH_ID, [
    {
      branch_id: GREEN_BRANCH_ID,
      name: MVP_GREEN_MIGRATION_OWNER_ROLE,
      protected: false,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      branch_id: GREEN_BRANCH_ID,
      name: MVP_GREEN_MIGRATION_OWNER_ROLE,
      protected: false,
      created_at: NOW,
      updated_at: NOW,
    },
  ])
  await assert.rejects(
    () => adapter.readBackCreatedRole(release, roleApproval),
    /ROLE_IDENTITY_UNVERIFIED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  await adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  transport.roles.set(GREEN_BRANCH_ID, [{
    branch_id: GREEN_BRANCH_ID,
    name: MVP_GREEN_MIGRATION_OWNER_ROLE,
    protected: true,
    created_at: NOW,
    updated_at: NOW,
  }])
  await assert.rejects(
    () => adapter.createMigrationOwnerRole({
      release,
      approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /ROLE_IDENTITY_UNVERIFIED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  await assert.rejects(
    () => adapter.createMigrationOwnerRole({
      release,
      approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent, {
        targetGreenBranchId: "br-wrong-green-identity",
      }),
      parentState: parent,
      at: NOW,
    }),
    /TARGET_GREEN_BRANCH_IDENTITY_MISMATCH/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
  const validRoleApproval = approval("GREEN_OWNER_ROLE_CREATE", release, parent)
  const {
    schemaVersion: _schemaVersion,
    approvalChecksum: _approvalChecksum,
    ...validRoleBasis
  } = validRoleApproval
  assert.throws(
    () => createMvpGreenOperationApproval({
      approved: true,
      ...validRoleBasis,
      targetRoleName: "neondb_owner",
    }),
    /OWNER_ROLE_CONTRACT_MISMATCH/,
  )
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  await adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  await assert.rejects(
    () => adapter.createReleaseDatabase({
      release,
      approval: approval("GREEN_DATABASE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /OWNER_ROLE_MISSING/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/databases")).length, 0)
  for (const protectedBranchId of [
    MVP_GREEN_PRODUCTION_BRANCH_ID,
    "br-royal-block-aop70mzq",
    "br-odd-leaf-ao61pbg4",
  ]) {
    const validDatabaseApproval = approval("GREEN_DATABASE_CREATE", release, parent)
    const {
      schemaVersion: _schemaVersion,
      approvalChecksum: _approvalChecksum,
      ...validDatabaseBasis
    } = validDatabaseApproval
    assert.throws(
      () => createMvpGreenOperationApproval({
        approved: true,
        ...validDatabaseBasis,
        targetGreenBranchId: protectedBranchId,
      }),
      /TARGET_GREEN_BRANCH_IDENTITY_MISMATCH/,
    )
  }
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  transport.branches.set("br-green-conflict-123", {
    id: "br-green-conflict-123",
    project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
    name: release.branchName,
    parent_id: "br-wrong-parent",
    parent_lsn: parent.lsn,
    current_state: "ready",
    created_at: NOW,
    updated_at: NOW,
    region_id: "aws-ap-southeast-1",
  })
  await assert.rejects(
    () => adapter.createChildBranch({
      release,
      approval: approval("NEON_BRANCH_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /BRANCH_IDENTITY_UNVERIFIED/,
  )
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  transport.branches.set("br-green-wrong-lsn-123", {
    id: "br-green-wrong-lsn-123",
    project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
    name: release.branchName,
    parent_id: MVP_GREEN_PRODUCTION_BRANCH_ID,
    parent_lsn: "0/2BE2899",
    current_state: "ready",
    created_at: NOW,
    updated_at: NOW,
    region_id: "aws-ap-southeast-1",
  })
  await assert.rejects(
    () => adapter.createChildBranch({
      release,
      approval: approval("NEON_BRANCH_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /BRANCH_IDENTITY_UNVERIFIED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  const parent = await adapter.resolveParentState()
  const branch = await adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  await adapter.createMigrationOwnerRole({
    release,
    approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  transport.databases.set(branch.branchId, [
    ...branch.inheritedDatabases.map((database) => ({
      branch_id: database.branchId,
      name: database.databaseName,
      owner_name: database.ownerName,
      created_at: database.createdAt,
    })),
    { branch_id: branch.branchId, name: release.databaseName, owner_name: "wrong_owner", created_at: NOW },
  ])
  await assert.rejects(
    () => adapter.createReleaseDatabase({
      release,
      approval: approval("GREEN_DATABASE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /OWNER_ROLE_CONTRACT_MISMATCH/,
  )
}

{
  const { transport, adapter, parent } = await preparedRoleFixture()
  const inventory = await adapter.inspectEndpointPrerequisite(MVP_GREEN_PRODUCTION_PROJECT_ID, GREEN_BRANCH_ID)
  assert.equal(inventory.prerequisite, "READ_WRITE_ENDPOINT_PRESENT")
  assert.equal(inventory.endpointCount, 1)
  transport.endpoints.set(GREEN_BRANCH_ID, [])
  assert.equal(
    (await adapter.inspectEndpointPrerequisite(MVP_GREEN_PRODUCTION_PROJECT_ID, GREEN_BRANCH_ID)).prerequisite,
    "NO_ENDPOINT",
  )
  await assert.rejects(
    () => adapter.createMigrationOwnerRole({
      release,
      approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /NEON_ENDPOINT_REQUIRED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 0)
  transport.endpoints.set(GREEN_BRANCH_ID, [{
    id: "ep-green-read-only-123",
    project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
    branch_id: GREEN_BRANCH_ID,
    type: "read_only",
    current_state: "idle",
    created_at: NOW,
    updated_at: NOW,
  }])
  assert.equal(
    (await adapter.inspectEndpointPrerequisite(MVP_GREEN_PRODUCTION_PROJECT_ID, GREEN_BRANCH_ID)).prerequisite,
    "READ_ONLY_ONLY",
  )
}

{
  const statusCases = [
    [400, "NEON_BAD_REQUEST"],
    [401, "NEON_AUTHENTICATION_FAILURE"],
    [403, "NEON_AUTHENTICATION_FAILURE"],
    [409, "NEON_CONFLICT"],
    [422, "NEON_BAD_REQUEST"],
    [423, "NEON_RESOURCE_LOCKED"],
    [429, "NEON_RATE_LIMIT"],
    [500, "NEON_PROVIDER_TRANSIENT_FAILURE"],
  ] as const
  for (const [status, code] of statusCases) {
    const { transport, adapter, parent } = await preparedRoleFixture()
    transport.rolePostStatus = status
    transport.rolePostCreatesRole = false
    transport.rolePostErrorBody = {
      code: `provider_${status}`,
      message: "password=must-never-escape authorization=Bearer-secret token=hidden",
    }
    let caught: unknown = null
    try {
      await adapter.createMigrationOwnerRole({
        release,
        approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
        parentState: parent,
        at: NOW,
      })
    } catch (error) {
      caught = error
    }
    assert.equal(caught instanceof MvpGreenInfrastructureError, true)
    assert.equal((caught as MvpGreenInfrastructureError).code, code)
    assert.equal((caught as MvpGreenInfrastructureError).evidence?.httpStatus, status)
    assert.equal((caught as MvpGreenInfrastructureError).evidence?.providerRequestId, "req-green-role-123")
    if (status === 429) assert.equal((caught as MvpGreenInfrastructureError).evidence?.retryAfterMs, 2_000)
    assert.equal(JSON.stringify((caught as MvpGreenInfrastructureError).evidence).includes("must-never-escape"), false)
    assert.equal(JSON.stringify((caught as MvpGreenInfrastructureError).evidence).includes("Bearer-secret"), false)
    assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 1)
  }
}

{
  for (const status of [409, 500]) {
    const { transport, adapter, parent } = await preparedRoleFixture()
    transport.rolePostStatus = status
    transport.rolePostErrorBody = { code: `provider_${status}`, message: "safe failure" }
    const reconciled = await adapter.createMigrationOwnerRole({
      release,
      approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    })
    assert.equal(reconciled.creationStatus, "RECONCILED")
    assert.equal(reconciled.providerHttpStatus, status)
    assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 1)
  }
}

{
  const { transport, adapter, parent } = await preparedRoleFixture()
  transport.rolePostMalformed = true
  transport.rolePostCreatesRole = false
  await assert.rejects(
    () => adapter.createMigrationOwnerRole({
      release,
      approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /NEON_MALFORMED_RESPONSE/,
  )
}

{
  const { transport, adapter, parent } = await preparedRoleFixture()
  transport.operationStates = ["running", "finished"]
  const role = await adapter.createMigrationOwnerRole({
    release,
    approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(role.operationPollingResult, "PASS")
  assert.equal(role.operationIds.length, 1)
  assert.equal(transport.operationGetCount, 2)
  assert.equal(role.roleNoLogin, true)
  const rolePost = transport.calls.find((call) => call.method === "POST" && call.path.endsWith("/roles"))
  assert.deepEqual(rolePost?.body, {
    role: { name: MVP_GREEN_MIGRATION_OWNER_ROLE, no_login: true },
  })
}

{
  const { transport, adapter, parent } = await preparedRoleFixture()
  transport.operationLookupStatus = 500
  transport.rolePostCreatesRole = false
  await assert.rejects(
    () => adapter.createMigrationOwnerRole({
      release,
      approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /NEON_PROVIDER_TRANSIENT_FAILURE/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 1)
}

{
  const { transport, adapter, parent } = await preparedRoleFixture()
  transport.rolePostCreatesRole = false
  transport.operationStates = ["error"]
  await assert.rejects(
    () => adapter.createMigrationOwnerRole({
      release,
      approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /NEON_OPERATION_FAILED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 1)
}

{
  const { transport, adapter, parent } = await preparedRoleFixture()
  transport.operationStates = ["running", "running", "running", "running"]
  const reconciled = await adapter.createMigrationOwnerRole({
    release,
    approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(reconciled.creationStatus, "RECONCILED")
  assert.equal(transport.operationGetCount, 4)
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 1)
}

{
  const { transport, adapter, parent } = await preparedRoleFixture()
  transport.rolePostThrowAfter = new MvpGreenInfrastructureError("NEON_REQUEST_TIMEOUT", {
    httpStatus: null,
    providerErrorCode: null,
    providerMessage: null,
    providerRequestId: null,
    operationIds: Object.freeze([]),
    retryAfterMs: null,
    requestPath: `/projects/${MVP_GREEN_PRODUCTION_PROJECT_ID}/branches/${GREEN_BRANCH_ID}/roles`,
    operationKind: "GREEN_OWNER_ROLE_CREATE",
    responseReceived: false,
    timedOut: true,
  })
  const reconciled = await adapter.createMigrationOwnerRole({
    release,
    approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(reconciled.creationStatus, "RECONCILED")
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 1)
}

{
  const { transport, adapter, parent } = await preparedRoleFixture()
  transport.rolePostThrowBefore = new MvpGreenInfrastructureError("NEON_REQUEST_TIMEOUT", {
    httpStatus: null,
    providerErrorCode: null,
    providerMessage: null,
    providerRequestId: null,
    operationIds: Object.freeze([]),
    retryAfterMs: null,
    requestPath: `/projects/${MVP_GREEN_PRODUCTION_PROJECT_ID}/branches/${GREEN_BRANCH_ID}/roles`,
    operationKind: "GREEN_OWNER_ROLE_CREATE",
    responseReceived: false,
    timedOut: true,
  })
  await assert.rejects(
    () => adapter.createMigrationOwnerRole({
      release,
      approval: approval("GREEN_OWNER_ROLE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /NEON_REQUEST_TIMEOUT/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST" && call.path.endsWith("/roles")).length, 1)
}

{
  const runnerSource = readFileSync("workers/data-platform/runMvpGreenRelease.ts", "utf8")
  const mutationFlow = runnerSource.slice(runnerSource.indexOf("const approvalAt = new Date().toISOString()"))
  const approvalRead = mutationFlow.indexOf("await approvalFromFile")
  const releaseDerivation = mutationFlow.indexOf("const { release } = releaseIdentity()")
  const approvalBinding = mutationFlow.indexOf("assertMvpGreenOperationApproval")
  const parentResolution = mutationFlow.indexOf("await adapter.resolveParentState()")
  assert.equal(approvalRead >= 0 && approvalRead < releaseDerivation, true)
  assert.equal(releaseDerivation < approvalBinding && approvalBinding < parentResolution, true)
  assert.equal((mutationFlow.match(/await adapter\.resolveParentState\(\)/g) ?? []).length, 1)
  assert.equal(runnerSource.includes('requiredFlag("owner-role")'), false)
  assert.equal(runnerSource.includes("MVP_GREEN_UNCHECKED_OWNER_ROLE_FORBIDDEN"), true)
  assert.equal(runnerSource.includes('"preflight-role"'), true)
  assert.equal(runnerSource.includes('"create-owner-role"'), true)
  assert.equal(runnerSource.includes('"preflight-database"'), true)
  const createChildBranchSource = LiveMvpNeonGreenInfrastructureAdapter.prototype.createChildBranch.toString()
  assert.equal(createChildBranchSource.includes("this.resolveParentState"), false)
  const createRoleSource = LiveMvpNeonGreenInfrastructureAdapter.prototype.createMigrationOwnerRole.toString()
  assert.equal(createRoleSource.includes("this.resolveParentState"), false)
  const createDatabaseSource = LiveMvpNeonGreenInfrastructureAdapter.prototype.createReleaseDatabase.toString()
  assert.equal(createDatabaseSource.includes("input.ownerName"), false)
  assert.equal(createDatabaseSource.includes("approval.targetGreenBranchId"), true)
  assert.equal(createDatabaseSource.includes("approval.targetOwnerRole"), true)
  for (const ownerArguments of [
    ["--owner-role=neondb_owner"],
    ["--owner-role", "neondb_owner"],
  ]) {
    const cli = spawnSync(process.execPath, [
      "node_modules/tsx/dist/cli.mjs",
      "workers/data-platform/runMvpGreenRelease.ts",
      "create-database",
      ...ownerArguments,
    ], { cwd: process.cwd(), encoding: "utf8" })
    assert.notEqual(cli.status, 0)
    assert.match(cli.stderr, /MVP_GREEN_UNCHECKED_OWNER_ROLE_FORBIDDEN/)
  }
}

const blockedReceipt = createMvpGreenStageReceipt({
  outcomes: {
    parentInspection: { state: "PASS", code: "PARENT_PREFLIGHT_PASS" },
    sourceBoundary: { state: "PASS", code: "SOURCE_BOUNDARY_PASS" },
    branchCreation: { state: "BLOCKED", code: "APPROVAL_REQUIRED" },
  },
})
assert.deepEqual(
  blockedReceipt.results.map((result) => [result.stage, result.state]),
  [
    ["parentInspection", "PASS"],
    ["sourceBoundary", "PASS"],
    ["branchCreation", "BLOCKED"],
    ["databaseCreation", "NOT_RUN"],
    ["migrations", "NOT_RUN"],
    ["jobInitialization", "NOT_RUN"],
    ["acquisition", "NOT_RUN"],
    ["corpusConstruction", "NOT_RUN"],
    ["freeze", "NOT_RUN"],
    ["certification", "NOT_RUN"],
    ["readerVerification", "NOT_RUN"],
    ["preview", "NOT_APPLICABLE"],
  ],
)
assert.doesNotThrow(() => assertMvpGreenStageReceiptSanitized(blockedReceipt))

{
  const order: string[] = []
  const checksum = (value: string) => value.repeat(64).slice(0, 64)
  const certificationPlan = createMvpBlueGreenBranchPlan({
    projectId: MVP_GREEN_PRODUCTION_PROJECT_ID,
    parentBranchId: MVP_GREEN_PRODUCTION_BRANCH_ID,
    databaseName: release.databaseName,
    applicationCommit: COMMIT,
    currentWatermark: "2026-07-20T00:00:00.000Z",
    governedThrough: END,
  })
  const replayProjectionIds = Object.fromEntries(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"].map((symbol) => [symbol, `projection:${symbol}`])) as Record<"BTCUSDT" | "ETHUSDT" | "SOLUSDT" | "BNBUSDT" | "XRPUSDT" | "DOGEUSDT", string>
  const ports: MvpBlueGreenCertificationOnlyPorts = {
    infrastructure: { createBranch: async () => {
      order.push("branch")
      return {
        projectId: certificationPlan.projectId,
        parentBranchId: certificationPlan.parentBranchId,
        branchId: "br-green-certified-123",
        branchName: certificationPlan.branchName,
        databaseName: certificationPlan.databaseName,
        targetFingerprint: `neon:${certificationPlan.projectId}/br-green-certified-123/${certificationPlan.databaseName}`,
        createdAt: NOW,
        parentLsn: "0/2BE2898",
        region: "aws-ap-southeast-1",
        pooledEndpointReady: true,
      }
    } },
    build: {
      ingest: async (_branch, window) => {
        order.push("ingest")
        return { ...window, logicalSlots: 24, sourceArtifacts: 24, checksum: checksum("1"), status: "CREATED" }
      },
      materialize: async () => {
        order.push("materialize")
        return {
          candidateId: `mvp8i-candidate:${checksum("2")}`,
          candidateChecksum: checksum("2"),
          memberSetChecksum: checksum("3"),
          commonWatermarkChecksum: checksum("4"),
          governedThrough: END,
          counts: { projections: 62, evidence: 6, replay: 6, members: 74, manifests: 1 },
          replayProjectionIds,
        }
      },
    },
    freeze: {
      disablePublisher: async () => { order.push("disable"); return { writesDisabled: true, checksum: checksum("5") } },
      verifyReader: async () => { order.push("reader"); return { role: "mvp_serving_reader", pooledSsl: true, readOnlyTransaction: true, checksum: checksum("6") } },
    },
    certification: { certify: async () => { order.push("certify"); return { passed: true, checksum: checksum("7") } } },
    receipts: { persist: async () => { order.push("receipt") } },
  }
  const result = await runMvpBlueGreenCertificationOnlyPipeline({
    mode: "GREEN_CERTIFICATION_ONLY",
    plan: certificationPlan,
    ports,
  })
  assert.equal(result.release.state, "CERTIFIED")
  assert.equal(result.preview, "NOT_APPLICABLE")
  assert.deepEqual(order, ["branch", "ingest", "materialize", "disable", "reader", "certify", "receipt"])
}

console.log(JSON.stringify({
  status: "PASS",
  deterministicBranch: release.branchName,
  deterministicDatabase: release.databaseName,
  approvalSchema: MVP_GREEN_APPROVAL_SCHEMA_VERSION,
  approvalBoundaries: "PASS",
  greenBranchIdBinding: "PASS",
  targetRoleBinding: "PASS",
  databaseOwnerBinding: "PASS",
  approvedParentLsnBinding: "PASS",
  numericLsnOrdering: "PASS",
  forwardWalAdvancement: "PASS",
  createCommandStateResolutions: 1,
  postUsesApprovedParentLsn: "PASS",
  branchReadbackReconciliation: "PASS",
  roleReadbackReconciliation: "PASS",
  providerErrorPreservation: "PASS",
  httpStatusClassification: "PASS",
  endpointPrerequisite: "PASS",
  noLoginChecksumBinding: "PASS",
  rolePostNoLogin: true,
  operationPolling: "PASS",
  pollingBounded: true,
  secondAutomaticRolePost: 0,
  roleSecretRedaction: "PASS",
  databaseReadbackReconciliation: "PASS",
  frozenReleaseIdentity: "PASS",
  receiptSemantics: "PASS",
  certificationOnly: "PASS",
  previewCalls: 0,
  productionCalls: 0,
  rollbackCalls: 0,
  neonMutationCalls: 0,
}, null, 2))
}

void main().catch((error: unknown) => {
  process.stderr.write(error instanceof Error ? error.stack ?? error.message : "MVP_GREEN_LIVE_COMPOSITION_SUITE_FAILED")
  process.exitCode = 1
})
