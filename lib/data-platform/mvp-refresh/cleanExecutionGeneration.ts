import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { CleanGenerationInputManifest } from "./executionGenerationQuarantine"
import { createCertifiedLiveResumePlan, type CertifiedLiveResumePlan, type CleanExecutionGenerationContext } from "./liveResumeCoordinator"

export const CLEAN_EXECUTION_GENERATION_VERSION = "mvp-clean-execution-generation/1.0.0" as const

export function createCleanExecutionGenerationContext(input: {
  readonly manifest: CleanGenerationInputManifest
  readonly predecessorQuarantineReceiptId: string
  readonly sourceCommitSha: string
  readonly operatorConfirmationIdentity: string
  readonly ordinal?: number
}): CleanExecutionGenerationContext {
  const ordinal = input.ordinal ?? 1
  if (!Number.isInteger(ordinal) || ordinal < 1) throw new Error("CLEAN_GENERATION_ORDINAL_INVALID")
  if (!/^mre_[0-9a-f]{64}$/.test(input.predecessorQuarantineReceiptId)) throw new Error("CLEAN_GENERATION_QUARANTINE_RECEIPT_INVALID")
  if (!/^[0-9a-f]{7,40}$/.test(input.sourceCommitSha)) throw new Error("CLEAN_GENERATION_SOURCE_COMMIT_INVALID")
  if (!/^[A-Za-z0-9._:@/-]{3,128}$/.test(input.operatorConfirmationIdentity)) throw new Error("CLEAN_GENERATION_OPERATOR_INVALID")
  const basis = Object.freeze({ version: CLEAN_EXECUTION_GENERATION_VERSION, certifiedPlanContext: input.manifest.certifiedPlanContext, targetInterval: input.manifest.targetInterval, ordinal, sourceCommitSha: input.sourceCommitSha, predecessorRunId: input.manifest.sourceGenerationId, predecessorQuarantineReceiptId: input.predecessorQuarantineReceiptId, inputManifestChecksum: input.manifest.checksum })
  return Object.freeze({ version: CLEAN_EXECUTION_GENERATION_VERSION, executionGenerationId: `mceg_${canonicalChecksum(basis)}`, ordinal, predecessorRunId: input.manifest.sourceGenerationId, predecessorQuarantineReceiptId: input.predecessorQuarantineReceiptId, inputManifestChecksum: input.manifest.checksum, sourceCommitSha: input.sourceCommitSha, operatorConfirmationIdentity: input.operatorConfirmationIdentity })
}

export function createCleanCertifiedLiveResumePlan(input: { readonly predecessorPlan: CertifiedLiveResumePlan; readonly context: CleanExecutionGenerationContext }): CertifiedLiveResumePlan {
  if (input.predecessorPlan.executionGeneration) throw new Error("CLEAN_GENERATION_PREDECESSOR_PLAN_INVALID")
  return createCertifiedLiveResumePlan({ intervalStart: input.predecessorPlan.intervalStart, intervalEnd: input.predecessorPlan.intervalEnd, slots: input.predecessorPlan.slots, executionGeneration: input.context })
}

export function verifyCleanGenerationManifest(manifest: CleanGenerationInputManifest): void {
  const { checksum, ...basis } = manifest
  if (canonicalChecksum(basis) !== checksum) throw new Error("CLEAN_GENERATION_MANIFEST_CHECKSUM_INVALID")
  if (manifest.logicalSlotIds.length !== 24 || new Set(manifest.logicalSlotIds).size !== 24) throw new Error("CLEAN_GENERATION_LOGICAL_SLOT_SET_INVALID")
  if (manifest.freshLineagePolicy !== "FRESH_RETRIEVAL_CANDIDATE_FACT_DOWNSTREAM_WATERMARK_REPLAY_MANIFEST") throw new Error("CLEAN_GENERATION_FRESH_LINEAGE_POLICY_INVALID")
  for (const payload of manifest.reusableRawPayloadBytes) if (!/^raw_[0-9a-f]{64}$/.test(payload.identity) || !/^[0-9a-f]{64}$/.test(payload.checksum)) throw new Error("CLEAN_GENERATION_REUSABLE_PAYLOAD_INVALID")
}
