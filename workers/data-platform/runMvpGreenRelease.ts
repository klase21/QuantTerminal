import { readFile } from "node:fs/promises"

import {
  createMvpGreenCertificationPlan,
  createMvpGreenReleaseIdentity,
  FetchMvpNeonTransport,
  LiveMvpNeonGreenInfrastructureAdapter,
  MVP_GREEN_PRODUCTION_BRANCH_ID,
  MVP_GREEN_PRODUCTION_DATABASE,
  MVP_GREEN_PRODUCTION_PROJECT_ID,
  PostgresMvpGreenParentStateReader,
  type MvpGreenOperationApproval,
} from "@/lib/data-platform/mvp-release"

type Command = "plan" | "preflight" | "create-branch" | "create-database"

function flag(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length)
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
  return Object.freeze({ plan, release: createMvpGreenReleaseIdentity(plan) })
}

async function approvalFromFile(expectedOperation: MvpGreenOperationApproval["operation"]): Promise<MvpGreenOperationApproval> {
  const path = requiredFlag("approval-file")
  const approval = JSON.parse(await readFile(path, "utf8")) as MvpGreenOperationApproval
  if (approval.operation !== expectedOperation) throw new Error("APPROVAL_REQUIRED")
  return approval
}

function liveAdapter() {
  return new LiveMvpNeonGreenInfrastructureAdapter({
    transport: new FetchMvpNeonTransport({ apiToken: process.env.NEON_API_KEY }),
    parentStateReader: new PostgresMvpGreenParentStateReader({
      connectionString: process.env.MVP_GREEN_PARENT_POSTGRES_URL,
      expectedRole: "mvp_serving_reader",
    }),
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
    applicationCommit: plan.applicationCommit,
    parentWatermark: plan.currentWatermark,
    governedThrough: plan.governedThrough,
    releaseChecksum: release.releaseChecksum,
    preview: "NOT_APPLICABLE",
    productionMutation: false,
  })
}

async function main() {
  const command = process.argv[2] as Command | undefined
  if (!command || !["plan", "preflight", "create-branch", "create-database"].includes(command)) {
    throw new Error("Usage: runMvpGreenRelease.ts <plan|preflight|create-branch|create-database> --mode=GREEN_CERTIFICATION_ONLY --application-commit=<sha> --parent-watermark=<iso> --governed-through=<iso> [--approval-file=<path>]")
  }
  if (command === "plan") {
    console.log(JSON.stringify(sanitizedPlan(), null, 2))
    return
  }
  const { release } = releaseIdentity()
  const adapter = liveAdapter()
  const parentState = await adapter.resolveParentState()
  const databases = await adapter.listInheritedDatabases(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID)
  if (!databases.some((database) => database.databaseName === MVP_GREEN_PRODUCTION_DATABASE)) {
    throw new Error("PARENT_BRANCH_IDENTITY_MISMATCH")
  }
  if (command === "preflight") {
    console.log(JSON.stringify({
      command,
      result: "PARENT_PREFLIGHT_PASS",
      projectId: release.projectId,
      parentBranchId: release.parentBranchId,
      parentDatabase: release.parentDatabase,
      parentStateChecksum: parentState.stateChecksum,
      inspectedAt: parentState.inspectedAt,
      databaseCount: databases.length,
      branchName: release.branchName,
      databaseName: release.databaseName,
      preview: "NOT_APPLICABLE",
      mutationCalls: 0,
    }, null, 2))
    return
  }
  if (command === "create-branch") {
    const approval = await approvalFromFile("NEON_BRANCH_CREATE")
    const branch = await adapter.createChildBranch({ release, approval, parentState, at: new Date().toISOString() })
    console.log(JSON.stringify({
      command,
      result: branch.status,
      projectId: branch.projectId,
      parentBranchId: branch.parentBranchId,
      parentStateChecksum: branch.parentStateChecksum,
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
  const approval = await approvalFromFile("GREEN_DATABASE_CREATE")
  const branch = await adapter.readBackCreatedBranch(release, parentState)
  if (!branch) throw new Error("BRANCH_IDENTITY_UNVERIFIED")
  const database = await adapter.createReleaseDatabase({
    release,
    branch,
    ownerName: requiredFlag("owner-role"),
    approval,
    parentState,
    at: new Date().toISOString(),
  })
  console.log(JSON.stringify({
    command,
    result: database.creationStatus,
    projectId: database.projectId,
    branchId: database.branchId,
    databaseName: database.databaseName,
    ownerRole: database.ownerName,
    fingerprint: database.fingerprint,
    releaseChecksum: database.releaseChecksum,
    preview: "NOT_APPLICABLE",
  }, null, 2))
}

void main().catch((error: unknown) => {
  process.stderr.write(error instanceof Error ? error.message : "MVP_GREEN_RELEASE_COMMAND_FAILED")
  process.exitCode = 1
})
