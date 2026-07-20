import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  createMvpBlueGreenReleaseUnit,
  transitionMvpBlueGreenRelease,
  type MvpBlueGreenBranchPlan,
  type MvpBlueGreenReleaseUnit,
} from "./blueGreen"

export interface MvpBlueGreenCreatedBranch {
  readonly projectId: string
  readonly parentBranchId: string
  readonly branchId: string
  readonly branchName: string
  readonly databaseName: string
  readonly targetFingerprint: string
  readonly createdAt: string
  readonly parentLsn: string | null
  readonly region: string
  readonly pooledEndpointReady: boolean
}

export interface MvpBlueGreenWindowReceipt {
  readonly start: string
  readonly end: string
  readonly logicalSlots: 24
  readonly sourceArtifacts: 24
  readonly checksum: string
  readonly status: "CREATED" | "DUPLICATE"
}

export type MvpBlueGreenCandidateDraft = Omit<
  MvpBlueGreenReleaseUnit,
  "schemaVersion" | "state" | "applicationCommit" | "projectId" | "parentBranchId" | "branchId" | "branchName" | "databaseName" | "readerRole" | "targetFingerprint" | "previewDeploymentId" | "previewDeploymentCommit" | "receiptChecksums" | "releaseChecksum"
>

export interface MvpBlueGreenPipelinePorts {
  readonly infrastructure: {
    createBranch(plan: MvpBlueGreenBranchPlan): Promise<MvpBlueGreenCreatedBranch>
  }
  readonly build: {
    ingest(branch: MvpBlueGreenCreatedBranch, window: { readonly start: string; readonly end: string }): Promise<MvpBlueGreenWindowReceipt>
    materialize(branch: MvpBlueGreenCreatedBranch, window: { readonly start: string; readonly end: string }): Promise<MvpBlueGreenCandidateDraft>
  }
  readonly freeze: {
    disablePublisher(branch: MvpBlueGreenCreatedBranch): Promise<{ readonly writesDisabled: true; readonly checksum: string }>
    verifyReader(branch: MvpBlueGreenCreatedBranch): Promise<{ readonly role: "mvp_serving_reader"; readonly pooledSsl: true; readonly readOnlyTransaction: true; readonly checksum: string }>
  }
  readonly certification: {
    certify(unit: MvpBlueGreenReleaseUnit, windows: readonly MvpBlueGreenWindowReceipt[]): Promise<{ readonly passed: true; readonly checksum: string }>
  }
  readonly preview: {
    deploy(unit: MvpBlueGreenReleaseUnit): Promise<{ readonly deploymentId: string; readonly commit: string; readonly checksum: string }>
    smoke(unit: MvpBlueGreenReleaseUnit, deploymentId: string): Promise<{ readonly health: string; readonly dashboard: string; readonly scanner: string; readonly trade: string; readonly replay: string }>
  }
  readonly receipts: {
    persist(unit: MvpBlueGreenReleaseUnit): Promise<void>
  }
}

function requireChecksum(value: string, code: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(code)
}

export async function runMvpBlueGreenReleasePipeline(input: {
  readonly plan: MvpBlueGreenBranchPlan
  readonly ports: MvpBlueGreenPipelinePorts
}): Promise<{ readonly release: MvpBlueGreenReleaseUnit; readonly windows: readonly MvpBlueGreenWindowReceipt[]; readonly pipelineChecksum: string }> {
  const branch = await input.ports.infrastructure.createBranch(input.plan)
  if (branch.projectId !== input.plan.projectId || branch.parentBranchId !== input.plan.parentBranchId || branch.branchName !== input.plan.branchName || branch.databaseName !== input.plan.databaseName || branch.branchId === input.plan.parentBranchId || branch.targetFingerprint !== `neon:${branch.projectId}/${branch.branchId}/${branch.databaseName}` || !branch.pooledEndpointReady) throw new Error("MVP_BLUE_GREEN_CREATED_BRANCH_INVALID")

  const windowReceipts: MvpBlueGreenWindowReceipt[] = []
  for (const window of input.plan.incrementalWindows) {
    const receipt = await input.ports.build.ingest(branch, window)
    if (receipt.start !== window.start || receipt.end !== window.end || receipt.logicalSlots !== 24 || receipt.sourceArtifacts !== 24) throw new Error("MVP_BLUE_GREEN_WINDOW_RECEIPT_INVALID")
    requireChecksum(receipt.checksum, "MVP_BLUE_GREEN_WINDOW_CHECKSUM_INVALID")
    windowReceipts.push(Object.freeze(receipt))
  }

  const latest = input.plan.incrementalWindows.at(-1)
  if (!latest) throw new Error("MVP_BLUE_GREEN_MATERIALIZATION_WINDOW_MISSING")
  const candidate = await input.ports.build.materialize(branch, latest)
  if (candidate.governedThrough !== input.plan.governedThrough) throw new Error("MVP_BLUE_GREEN_CANDIDATE_WATERMARK_MISMATCH")

  const disabled = await input.ports.freeze.disablePublisher(branch)
  const reader = await input.ports.freeze.verifyReader(branch)
  if (!disabled.writesDisabled || reader.role !== "mvp_serving_reader" || !reader.pooledSsl || !reader.readOnlyTransaction) throw new Error("MVP_BLUE_GREEN_FREEZE_INVALID")
  requireChecksum(disabled.checksum, "MVP_BLUE_GREEN_FREEZE_CHECKSUM_INVALID")
  requireChecksum(reader.checksum, "MVP_BLUE_GREEN_READER_CHECKSUM_INVALID")

  let release = createMvpBlueGreenReleaseUnit({
    state: "FROZEN",
    applicationCommit: input.plan.applicationCommit,
    projectId: branch.projectId,
    parentBranchId: branch.parentBranchId,
    branchId: branch.branchId,
    branchName: branch.branchName,
    databaseName: branch.databaseName,
    readerRole: reader.role,
    targetFingerprint: branch.targetFingerprint,
    ...candidate,
    previewDeploymentId: null,
    previewDeploymentCommit: null,
    receiptChecksums: { health: null, dashboard: null, scanner: null, trade: null, replay: null },
  })
  const certified = await input.ports.certification.certify(release, Object.freeze(windowReceipts))
  if (!certified.passed) throw new Error("MVP_BLUE_GREEN_CERTIFICATION_FAILED")
  requireChecksum(certified.checksum, "MVP_BLUE_GREEN_CERTIFICATION_CHECKSUM_INVALID")
  release = createMvpBlueGreenReleaseUnit({ ...release, state: transitionMvpBlueGreenRelease(release.state, "CERTIFIED") })

  const deployment = await input.ports.preview.deploy(release)
  if (!deployment.deploymentId || deployment.commit !== release.applicationCommit) throw new Error("MVP_BLUE_GREEN_PREVIEW_DEPLOYMENT_INVALID")
  requireChecksum(deployment.checksum, "MVP_BLUE_GREEN_PREVIEW_DEPLOYMENT_CHECKSUM_INVALID")
  const smoke = await input.ports.preview.smoke(release, deployment.deploymentId)
  for (const checksum of Object.values(smoke)) requireChecksum(checksum, "MVP_BLUE_GREEN_PREVIEW_SMOKE_CHECKSUM_INVALID")
  release = createMvpBlueGreenReleaseUnit({ ...release, state: transitionMvpBlueGreenRelease(release.state, "PREVIEW_VERIFIED"), previewDeploymentId: deployment.deploymentId, previewDeploymentCommit: deployment.commit, receiptChecksums: smoke })
  release = createMvpBlueGreenReleaseUnit({ ...release, state: transitionMvpBlueGreenRelease(release.state, "PROMOTION_READY") })
  await input.ports.receipts.persist(release)

  const pipelineChecksum = canonicalChecksum({ planChecksum: input.plan.planChecksum, branch, windowReceipts, disabled, reader, certified, deployment, releaseChecksum: release.releaseChecksum })
  return Object.freeze({ release, windows: Object.freeze(windowReceipts), pipelineChecksum })
}
