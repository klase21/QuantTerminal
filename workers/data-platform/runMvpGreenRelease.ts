import { readFile } from "node:fs/promises"

import {
  assertMvpGreenFrozenReleaseIdentity,
  assertMvpGreenOperationApproval,
  assertMvpGreenOperationApprovalIntegrity,
  createMvpGreenCertificationPlan,
  createMvpGreenReleaseIdentity,
  FetchMvpNeonTransport,
  LiveMvpNeonGreenInfrastructureAdapter,
  MvpGreenInfrastructureError,
  MVP_GREEN_MIGRATION_OWNER_ROLE,
  MVP_GREEN_PRODUCTION_BRANCH_ID,
  MVP_GREEN_PRODUCTION_DATABASE,
  MVP_GREEN_PRODUCTION_PROJECT_ID,
  PostgresMvpGreenParentStateReader,
  type MvpGreenBranchInspection,
  type MvpGreenOperationApproval,
  type MvpGreenReleaseIdentity,
} from "@/lib/data-platform/mvp-release"

type Command =
  | "plan"
  | "preflight"
  | "preflight-role"
  | "create-branch"
  | "create-owner-role"
  | "preflight-database"
  | "create-database"

const COMMANDS: readonly Command[] = Object.freeze([
  "plan",
  "preflight",
  "preflight-role",
  "create-branch",
  "create-owner-role",
  "preflight-database",
  "create-database",
])

function flag(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

function hasFlag(name: string): boolean {
  const exact = `--${name}`
  const prefix = `${exact}=`
  return process.argv.some((value) => value === exact || value.startsWith(prefix))
}

function requiredFlag(name: string): string {
  const value = flag(name)?.trim()
  if (!value) throw new Error(`MVP_GREEN_FLAG_REQUIRED:${name}`)
  return value
}

function releaseIdentity() {
  const mode = requiredFlag("mode")
  if (mode !== "GREEN_CERTIFICATION_ONLY") throw new Error("MVP_GREEN_CERTIFICATION_ONLY_BOUNDARY_VIOLATION")
  const plan = createMvpGreenCertificationPlan({
    projectId: MVP_GREEN_PRODUCTION_PROJECT_ID,
    parentBranchId: MVP_GREEN_PRODUCTION_BRANCH_ID,
    applicationCommit: requiredFlag("application-commit"),
    currentWatermark: requiredFlag("parent-watermark"),
    governedThrough: requiredFlag("governed-through"),
  })
  const release = createMvpGreenReleaseIdentity(plan)
  assertMvpGreenFrozenReleaseIdentity(release)
  return Object.freeze({ plan, release })
}

async function approvalFromFile(
  expectedOperation: MvpGreenOperationApproval["operation"],
  at: string,
): Promise<MvpGreenOperationApproval> {
  const path = requiredFlag("approval-file")
  const approval = JSON.parse(await readFile(path, "utf8")) as MvpGreenOperationApproval
  assertMvpGreenOperationApprovalIntegrity({ approval, operation: expectedOperation, at })
  return Object.freeze({ ...approval })
}

function liveAdapter(requiresParentState = true) {
  return new LiveMvpNeonGreenInfrastructureAdapter({
    transport: new FetchMvpNeonTransport({ apiToken: process.env.NEON_API_KEY }),
    parentStateReader: requiresParentState
      ? new PostgresMvpGreenParentStateReader({
        connectionString: process.env.MVP_GREEN_PARENT_POSTGRES_URL,
        expectedRole: "mvp_serving_reader",
      })
      : {
        inspect: async () => {
          throw new Error("MVP_GREEN_PARENT_STATE_NOT_AVAILABLE_IN_NEON_ONLY_PREFLIGHT")
        },
      },
  })
}

function sanitizedPlan() {
  const { plan, release } = releaseIdentity()
  return Object.freeze({
    command: "plan",
    mode: "GREEN_CERTIFICATION_ONLY",
    projectId: plan.projectId,
    parentBranchId: plan.parentBranchId,
    parentDatabase: MVP_GREEN_PRODUCTION_DATABASE,
    branchName: release.branchName,
    databaseName: release.databaseName,
    releaseApplicationCommit: plan.applicationCommit,
    releaseToolingCommit: process.env.RELEASE_TOOLING_COMMIT?.trim() || "UNAVAILABLE",
    parentWatermark: plan.currentWatermark,
    governedThrough: plan.governedThrough,
    releaseChecksum: release.releaseChecksum,
    preview: "NOT_APPLICABLE",
    productionMutation: false,
  })
}

function assertGreenBranchPreflight(input: {
  readonly branch: MvpGreenBranchInspection
  readonly release: MvpGreenReleaseIdentity
  readonly branchId: string
  readonly approvedParentLsn: string
}): void {
  if (
    input.branch.branchId !== input.branchId
    || input.branch.branchName !== input.release.branchName
    || input.branch.parentBranchId !== input.release.parentBranchId
    || input.branch.parentLsn !== input.approvedParentLsn
    || input.branch.state !== "ready"
  ) {
    throw new Error("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
  }
}

async function greenPreflight(
  command: "preflight-role" | "preflight-database",
  release: MvpGreenReleaseIdentity,
) {
  const branchId = requiredFlag("green-branch-id")
  const approvedParentLsn = requiredFlag("approved-parent-lsn")
  const adapter = liveAdapter(false)
  const branch = await adapter.inspectBranch(release.projectId, branchId)
  assertGreenBranchPreflight({ branch, release, branchId, approvedParentLsn })
  const databases = await adapter.listInheritedDatabases(release.projectId, branchId)
  if (!databases.some((database) => database.databaseName === MVP_GREEN_PRODUCTION_DATABASE)) {
    throw new Error("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
  }
  const roles = await adapter.listRoles(release.projectId, branchId)
  const endpoints = await adapter.inspectEndpointPrerequisite(release.projectId, branchId)
  const ownerMatches = roles.filter((role) => role.roleName === MVP_GREEN_MIGRATION_OWNER_ROLE)
  const databaseMatches = databases.filter((database) => database.databaseName === release.databaseName)
  if (ownerMatches.length > 1) throw new Error("ROLE_IDENTITY_UNVERIFIED")
  if (databaseMatches.length > 1) throw new Error("RELEASE_DATABASE_IDENTITY_UNVERIFIED")
  const owner = ownerMatches.length === 1
    ? await adapter.inspectRole(release.projectId, branchId, MVP_GREEN_MIGRATION_OWNER_ROLE)
    : null
  if (
    ownerMatches.length === 1
    && (
      !owner
      || owner.branchId !== branchId
      || owner.roleName !== MVP_GREEN_MIGRATION_OWNER_ROLE
      || owner.protected !== false
    )
  ) {
    throw new Error("OWNER_ROLE_CONTRACT_MISMATCH")
  }
  if (command === "preflight-database") {
    if (ownerMatches.length !== 1) throw new Error("OWNER_ROLE_MISSING")
    if (databaseMatches.length === 1 && databaseMatches[0]!.ownerName !== MVP_GREEN_MIGRATION_OWNER_ROLE) {
      throw new Error("OWNER_ROLE_CONTRACT_MISMATCH")
    }
  }
  return Object.freeze({
    command,
    result: command === "preflight-role" ? "GREEN_ROLE_PREFLIGHT_PASS" : "GREEN_DATABASE_PREFLIGHT_PASS",
    projectId: release.projectId,
    branchId,
    branchName: branch.branchName,
    parentBranchId: branch.parentBranchId,
    approvedParentLsn,
    region: branch.region,
    branchState: branch.state,
    inheritedNeondb: true,
    ownerRole: MVP_GREEN_MIGRATION_OWNER_ROLE,
    ownerRoleStatus: ownerMatches.length === 1 ? "PRESENT" : "ABSENT",
    targetDatabase: release.databaseName,
    targetDatabaseStatus: databaseMatches.length === 1 ? "PRESENT" : "ABSENT",
    endpointCount: endpoints.endpointCount,
    readWriteEndpointCount: endpoints.readWriteEndpointCount,
    readOnlyEndpointCount: endpoints.readOnlyEndpointCount,
    endpointPrerequisite: endpoints.prerequisite,
    releaseApplicationCommit: release.applicationCommit,
    releaseChecksum: release.releaseChecksum,
    mutationCalls: 0,
    preview: "NOT_APPLICABLE",
  })
}

async function main() {
  const command = process.argv[2] as Command | undefined
  if (!command || !COMMANDS.includes(command)) {
    throw new Error("Usage: runMvpGreenRelease.ts <plan|preflight|preflight-role|create-branch|create-owner-role|preflight-database|create-database> --mode=GREEN_CERTIFICATION_ONLY --application-commit=<frozen-release-sha> --parent-watermark=<iso> --governed-through=<iso> [--green-branch-id=<id> --approved-parent-lsn=<lsn>] [--approval-file=<path>]")
  }
  if (command === "plan") {
    console.log(JSON.stringify(sanitizedPlan(), null, 2))
    return
  }
  if (command === "preflight") {
    const { release } = releaseIdentity()
    const adapter = liveAdapter()
    const parentState = await adapter.resolveParentState()
    const databases = await adapter.listInheritedDatabases(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID)
    if (!databases.some((database) => database.databaseName === MVP_GREEN_PRODUCTION_DATABASE)) {
      throw new Error("PARENT_BRANCH_IDENTITY_MISMATCH")
    }
    console.log(JSON.stringify({
      command,
      result: "PARENT_PREFLIGHT_PASS",
      projectId: release.projectId,
      parentBranchId: release.parentBranchId,
      parentDatabase: release.parentDatabase,
      parentStateChecksum: parentState.stateChecksum,
      parentLsn: parentState.lsn,
      inspectedAt: parentState.inspectedAt,
      databaseCount: databases.length,
      branchName: release.branchName,
      databaseName: release.databaseName,
      releaseApplicationCommit: release.applicationCommit,
      releaseChecksum: release.releaseChecksum,
      preview: "NOT_APPLICABLE",
      mutationCalls: 0,
    }, null, 2))
    return
  }
  if (command === "preflight-role" || command === "preflight-database") {
    const { release } = releaseIdentity()
    console.log(JSON.stringify(await greenPreflight(command, release), null, 2))
    return
  }
  if (command === "create-database" && hasFlag("owner-role")) {
    throw new Error("MVP_GREEN_UNCHECKED_OWNER_ROLE_FORBIDDEN")
  }
  const approvalAt = new Date().toISOString()
  const expectedOperation = command === "create-branch"
    ? "NEON_BRANCH_CREATE"
    : command === "create-owner-role"
      ? "GREEN_OWNER_ROLE_CREATE"
      : "GREEN_DATABASE_CREATE"
  const approval = await approvalFromFile(expectedOperation, approvalAt)
  const { release } = releaseIdentity()
  assertMvpGreenOperationApproval({ approval, operation: expectedOperation, release, at: approvalAt })
  const adapter = liveAdapter()
  const parentState = await adapter.resolveParentState()
  const databases = await adapter.listInheritedDatabases(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID)
  if (!databases.some((database) => database.databaseName === MVP_GREEN_PRODUCTION_DATABASE)) {
    throw new Error("PARENT_BRANCH_IDENTITY_MISMATCH")
  }
  if (command === "create-branch") {
    const branch = await adapter.createChildBranch({ release, approval, parentState, at: new Date().toISOString() })
    console.log(JSON.stringify({
      command,
      result: branch.status,
      projectId: branch.projectId,
      parentBranchId: branch.parentBranchId,
      parentStateChecksum: branch.parentStateChecksum,
      approvedParentLsn: approval.expectedParentLsn,
      runtimeParentLsn: parentState.lsn,
      approvalInvocationId: approval.invocationId,
      approvalActorId: approval.actorId,
      approvalChecksum: approval.approvalChecksum,
      branchId: branch.branchId,
      branchName: branch.branchName,
      region: branch.region,
      createdAt: branch.createdAt,
      branchState: branch.branchState,
      inheritedDatabaseCount: branch.inheritedDatabases.length,
      fingerprint: branch.fingerprint,
      preview: "NOT_APPLICABLE",
    }, null, 2))
    return
  }
  if (command === "create-owner-role") {
    const role = await adapter.createMigrationOwnerRole({
      release,
      approval,
      parentState,
      at: new Date().toISOString(),
    })
    console.log(JSON.stringify({
      command,
      result: role.creationStatus,
      projectId: role.projectId,
      branchId: role.branchId,
      branchName: approval.targetBranchName,
      roleName: role.roleName,
      protected: role.protected,
      endpointPrerequisite: role.endpointPrerequisite,
      endpointCount: role.endpointCount,
      readWriteEndpointCount: role.readWriteEndpointCount,
      roleNoLogin: role.roleNoLogin,
      providerHttpStatus: role.providerHttpStatus,
      providerErrorCode: role.providerErrorCode,
      providerRequestId: role.providerRequestId,
      operationIds: role.operationIds,
      operationPollingResult: role.operationPollingResult,
      deterministicReadbackResult: role.deterministicReadbackResult,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      fingerprint: role.fingerprint,
      releaseChecksum: role.releaseChecksum,
      approvalInvocationId: approval.invocationId,
      approvalActorId: approval.actorId,
      approvalChecksum: approval.approvalChecksum,
      preview: "NOT_APPLICABLE",
    }, null, 2))
    return
  }
  const database = await adapter.createReleaseDatabase({
    release,
    approval,
    parentState,
    at: new Date().toISOString(),
  })
  console.log(JSON.stringify({
    command,
    result: database.creationStatus,
    projectId: database.projectId,
    branchId: database.branchId,
    branchName: approval.targetBranchName,
    databaseName: database.databaseName,
    ownerRole: database.ownerName,
    fingerprint: database.fingerprint,
    releaseChecksum: database.releaseChecksum,
    approvalInvocationId: approval.invocationId,
    approvalActorId: approval.actorId,
    approvalChecksum: approval.approvalChecksum,
    preview: "NOT_APPLICABLE",
  }, null, 2))
}

void main().catch((error: unknown) => {
  if (error instanceof MvpGreenInfrastructureError) {
    process.stderr.write(JSON.stringify({
      result: error.code,
      providerHttpStatus: error.evidence?.httpStatus ?? null,
      providerErrorCode: error.evidence?.providerErrorCode ?? null,
      providerMessage: error.evidence?.providerMessage ?? null,
      providerRequestId: error.evidence?.providerRequestId ?? null,
      operationIds: error.evidence?.operationIds ?? [],
      retryAfterMs: error.evidence?.retryAfterMs ?? null,
      requestPath: error.evidence?.requestPath ?? null,
      operationKind: error.evidence?.operationKind ?? null,
      responseReceived: error.evidence?.responseReceived ?? null,
      timedOut: error.evidence?.timedOut ?? null,
    }, null, 2))
  } else {
    const safeCode = error instanceof Error && /^MVP_GREEN_[A-Z0-9_:-]+$/.test(error.message)
      ? error.message
      : "MVP_GREEN_RELEASE_COMMAND_FAILED"
    process.stderr.write(safeCode)
  }
  process.exitCode = 1
})
