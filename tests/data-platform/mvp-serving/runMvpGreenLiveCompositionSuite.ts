import assert from "node:assert/strict"
import {
  assertMvpGreenStageReceiptSanitized,
  createMvpBlueGreenBranchPlan,
  createMvpGreenCertificationPlan,
  createMvpGreenOperationApproval,
  createMvpGreenReleaseDatabaseName,
  createMvpGreenReleaseIdentity,
  createMvpGreenStageReceipt,
  LiveMvpNeonGreenInfrastructureAdapter,
  MVP_GREEN_PRODUCTION_BRANCH_ID,
  MVP_GREEN_PRODUCTION_DATABASE,
  MVP_GREEN_PRODUCTION_PROJECT_ID,
  runMvpBlueGreenCertificationOnlyPipeline,
  type MvpBlueGreenCertificationOnlyPorts,
  type MvpGreenOperationKind,
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

type Branch = {
  id: string
  project_id: string
  name: string
  parent_id: string | null
  parent_lsn?: string | null
  current_state: string
  created_at: string
  updated_at: string
  region_id?: string | null
}
type Database = { branch_id: string; name: string; owner_name: string; created_at: string }

class FakeNeonTransport implements MvpNeonTransport {
  readonly branches = new Map<string, Branch>()
  readonly databases = new Map<string, Database[]>()
  calls: { method: string; path: string; body: unknown }[] = []
  branchResponseLost = false
  databaseResponseLost = false
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
    if (input.method === "POST" && input.path === `/projects/${MVP_GREEN_PRODUCTION_PROJECT_ID}/branches`) {
      const branchInput = input.body?.branch as { name: string; parent_id: string }
      const branch: Branch = {
        id: "br-green-certified-123",
        project_id: MVP_GREEN_PRODUCTION_PROJECT_ID,
        name: branchInput.name,
        parent_id: branchInput.parent_id,
        parent_lsn: parentBasis.lsn,
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
      if (this.branchResponseLost) throw new Error("NETWORK_RESPONSE_LOST")
      return { status: 201, body: { branch } }
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
  const adapter = new LiveMvpNeonGreenInfrastructureAdapter({
    transport,
    parentStateReader: { inspect: async () => parentBasis },
  })
  return { transport, adapter }
}

function approval(operation: MvpGreenOperationKind, identity: MvpGreenReleaseIdentity, parent: MvpGreenParentState) {
  return createMvpGreenOperationApproval({
    approved: true,
    operation,
    releaseChecksum: identity.releaseChecksum,
    projectId: identity.projectId,
    parentBranchId: identity.parentBranchId,
    expectedParentState: parent.stateChecksum,
    targetBranchName: identity.branchName,
    targetDatabaseName: operation === "NEON_BRANCH_CREATE" ? null : identity.databaseName,
    invocationId: `invocation-${operation.toLowerCase()}`,
    actorId: "jay-local-operator",
    issuedAt: NOW,
    expiresAt: EXPIRES,
  })
}

{
  const { transport, adapter } = adapterFixture()
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
  assert.deepEqual(branch.inheritedDatabases.map((database) => database.databaseName), [MVP_GREEN_PRODUCTION_DATABASE])
  const database = await adapter.createReleaseDatabase({
    release,
    branch,
    ownerName: "mvp_green_migration_owner",
    approval: approval("GREEN_DATABASE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })
  assert.equal(database.creationStatus, "CREATED")
  assert.equal(database.databaseName, release.databaseName)
  assert.equal((await adapter.createReleaseDatabase({
    release,
    branch,
    ownerName: "mvp_green_migration_owner",
    approval: approval("GREEN_DATABASE_CREATE", release, parent),
    parentState: parent,
    at: NOW,
  })).creationStatus, "RECONCILED")
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
  transport.databaseResponseLost = true
  const database = await adapter.createReleaseDatabase({
    release,
    branch,
    ownerName: "mvp_green_migration_owner",
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
    targetBranchName: release.branchName,
    targetDatabaseName: null,
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
  let state = parentBasis
  const transport = new FakeNeonTransport()
  const adapter = new LiveMvpNeonGreenInfrastructureAdapter({
    transport,
    parentStateReader: { inspect: async () => state },
  })
  const parent = await adapter.resolveParentState()
  state = { ...state, lsn: "0/2BE2900" }
  await assert.rejects(
    () => adapter.createChildBranch({
      release,
      approval: approval("NEON_BRANCH_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /PARENT_STATE_CHANGED/,
  )
  assert.equal(transport.calls.filter((call) => call.method === "POST").length, 0)
}

{
  const { transport, adapter } = adapterFixture()
  transport.authFailure = true
  await assert.rejects(() => adapter.inspectProject(MVP_GREEN_PRODUCTION_PROJECT_ID), /NEON_AUTHENTICATION_FAILURE/)
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
  const branch = await adapter.createChildBranch({
    release,
    approval: approval("NEON_BRANCH_CREATE", release, parent),
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
      branch,
      ownerName: "mvp_green_migration_owner",
      approval: approval("GREEN_DATABASE_CREATE", release, parent),
      parentState: parent,
      at: NOW,
    }),
    /RELEASE_DATABASE_NAME_CONFLICT/,
  )
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
  approvalBoundaries: "PASS",
  parentStateFencing: "PASS",
  branchReadbackReconciliation: "PASS",
  databaseReadbackReconciliation: "PASS",
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
