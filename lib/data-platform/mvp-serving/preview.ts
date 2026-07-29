import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { MvpConsumerProjectionSource } from "@/lib/data-platform/consumer-projections"
import type { MvpProjectionKind } from "@/lib/data-platform/evidence-platform"
import type { InactiveServingCandidateReview } from "./inactiveStaging"
import type { RolledBackCandidateRetryBinding } from "./cutoverControl"

export const MVP8V_APPROVED_CANDIDATE_ID = "mvp8i-candidate:fa295d3b749fd45d8c5172c5b5568463a4e645f9a0312d2d7945c4840753dc57" as const
export const MVP8V_APPROVED_CANDIDATE_CHECKSUM = "fa295d3b749fd45d8c5172c5b5568463a4e645f9a0312d2d7945c4840753dc57" as const
export const MVP8V_APPROVED_MEMBER_SET_CHECKSUM = "021b8ad9ea4710060dd5ab380174ade2a54ac1e57fa5a229affe6807e62a527e" as const
export const MVP8V_APPROVED_WATERMARK_CHECKSUM = "a4eb426c1f92f2584962f8f3d6d61ae65abaec1aaa44bab152e12c7c43f1838a" as const
export const MVP8V_PRODUCTION_TARGET_ID = "neon:soft-cell-16396854/br-royal-block-aop70mzq/neondb" as const
export const MVP8Z2_CANDIDATE_TARGET_ID = "neon:soft-cell-16396854/br-flat-grass-ao9rtnyr/neondb" as const
export const MVP_GREEN_PREVIEW_CANDIDATE_TARGET_ID = "neon:soft-cell-16396854/br-muddy-unit-ao3o6iid/mvp_release_20260721_9c177d6309" as const

type MvpServingPreviewTargetId = typeof MVP8V_PRODUCTION_TARGET_ID | typeof MVP_GREEN_PREVIEW_CANDIDATE_TARGET_ID

export interface MvpServingPreviewCandidateConfig {
  readonly candidateId: typeof MVP8V_APPROVED_CANDIDATE_ID
  readonly candidateChecksum: typeof MVP8V_APPROVED_CANDIDATE_CHECKSUM
  readonly memberSetChecksum: typeof MVP8V_APPROVED_MEMBER_SET_CHECKSUM
  readonly commonWatermarkChecksum: typeof MVP8V_APPROVED_WATERMARK_CHECKSUM
  readonly targetId: MvpServingPreviewTargetId
  readonly branchId: "br-royal-block-aop70mzq" | "br-muddy-unit-ao3o6iid"
  readonly reviewMode: "PRODUCTION_INACTIVE" | "SEPARATE_CANDIDATE_DB"
  readonly retry?: Readonly<{ approvalId: string; binding: RolledBackCandidateRetryBinding }>
}

export function resolveMvpServingPreviewCandidate(environment: Readonly<Record<string, string | undefined>> = process.env): MvpServingPreviewCandidateConfig | null {
  const mode = environment.MVP_SERVING_PREVIEW_CANDIDATE_MODE
  if (!mode) return null
  if (!['EXPLICIT_INACTIVE_CANDIDATE', 'EXPLICIT_CANDIDATE_DB_REVIEW'].includes(mode) || environment.VERCEL_ENV !== "preview" || environment.NODE_ENV === "production" && environment.VERCEL_ENV !== "preview") throw new Error("SERVING_PREVIEW_ENVIRONMENT_INVALID")
  const values = {
    candidateId: environment.MVP_SERVING_PREVIEW_CANDIDATE_ID,
    candidateChecksum: environment.MVP_SERVING_PREVIEW_CANDIDATE_CHECKSUM,
    memberSetChecksum: environment.MVP_SERVING_PREVIEW_MEMBER_SET_CHECKSUM,
    commonWatermarkChecksum: environment.MVP_SERVING_PREVIEW_COMMON_WATERMARK_CHECKSUM,
    targetId: environment.MVP_SERVING_PREVIEW_TARGET_ID,
  }
  if (Object.values(values).some((value) => !value || /[*,]/.test(value))) throw new Error("SERVING_PREVIEW_BINDING_INVALID")
  const separateCandidateDb = mode === "EXPLICIT_CANDIDATE_DB_REVIEW"
  const expectedTargetId: MvpServingPreviewTargetId = separateCandidateDb ? MVP_GREEN_PREVIEW_CANDIDATE_TARGET_ID : MVP8V_PRODUCTION_TARGET_ID
  if (values.candidateId !== MVP8V_APPROVED_CANDIDATE_ID || values.candidateChecksum !== MVP8V_APPROVED_CANDIDATE_CHECKSUM || values.memberSetChecksum !== MVP8V_APPROVED_MEMBER_SET_CHECKSUM || values.commonWatermarkChecksum !== MVP8V_APPROVED_WATERMARK_CHECKSUM || values.targetId !== expectedTargetId) throw new Error("SERVING_PREVIEW_BINDING_MISMATCH")
  const target = Object.freeze({
    candidateId: MVP8V_APPROVED_CANDIDATE_ID,
    candidateChecksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM,
    memberSetChecksum: MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
    commonWatermarkChecksum: MVP8V_APPROVED_WATERMARK_CHECKSUM,
    targetId: expectedTargetId,
    branchId: separateCandidateDb ? "br-muddy-unit-ao3o6iid" as const : "br-royal-block-aop70mzq" as const,
    reviewMode: separateCandidateDb ? "SEPARATE_CANDIDATE_DB" as const : "PRODUCTION_INACTIVE" as const,
  })
  const approvalId = environment.MVP_SERVING_PREVIEW_RETRY_APPROVAL_ID
  if (!approvalId) return target
  if (separateCandidateDb) throw new Error("SERVING_PREVIEW_CANDIDATE_DB_RETRY_FORBIDDEN")
  const retryValues = {
    priorActivationEventId: environment.MVP_SERVING_PREVIEW_PRIOR_ACTIVATION_EVENT_ID,
    priorRollbackEventId: environment.MVP_SERVING_PREVIEW_PRIOR_ROLLBACK_EVENT_ID,
    currentRollbackExposureId: environment.MVP_SERVING_PREVIEW_CURRENT_ROLLBACK_EXPOSURE_ID,
    rollbackCorpusId: environment.MVP_SERVING_PREVIEW_ROLLBACK_CORPUS_ID,
    rollbackCorpusChecksum: environment.MVP_SERVING_PREVIEW_ROLLBACK_CORPUS_CHECKSUM,
    rollbackDeploymentId: environment.MVP_SERVING_PREVIEW_ROLLBACK_DEPLOYMENT_ID,
    rollbackPinChecksum: environment.MVP_SERVING_PREVIEW_ROLLBACK_PIN_CHECKSUM,
  }
  if (!/^mvp8s-approval:[0-9a-f]{64}$/.test(approvalId) || Object.values(retryValues).some((value) => !value || /[*,]/.test(value))) throw new Error("SERVING_PREVIEW_RETRY_BINDING_INVALID")
  return Object.freeze({ ...target, retry: Object.freeze({ approvalId, binding: Object.freeze(retryValues as RolledBackCandidateRetryBinding) }) })
}

export function verifyMvpServingPreviewCandidate(review: InactiveServingCandidateReview, config: MvpServingPreviewCandidateConfig): void {
  if (review.candidateId !== config.candidateId || review.servingChecksum !== config.candidateChecksum || review.memberSetChecksum !== config.memberSetChecksum || review.commonWatermarkChecksum !== config.commonWatermarkChecksum) throw new Error("SERVING_PREVIEW_CANDIDATE_CHECKSUM_MISMATCH")
  const expectedExposureCount = config.retry ? 1 : 0
  if (review.counts.projections !== 62 || review.counts.evidenceSummaries !== 6 || review.counts.replaySnapshots !== 6 || review.counts.members !== 74 || review.lifecycle !== "WITHHELD" || review.exposure !== "INTERNAL_ONLY" || review.exposureCount !== expectedExposureCount) throw new Error("SERVING_PREVIEW_CANDIDATE_STATE_INVALID")
}

export function createMvpServingPreviewProjectionSource(review: InactiveServingCandidateReview): MvpConsumerProjectionSource {
  const latest = (kind: MvpProjectionKind, subjectId: string) => review.projections.filter((value) => value.projectionKind === kind && value.subjectId === subjectId).sort((a, b) => b.eventTimeEnd.localeCompare(a.eventTimeEnd))[0] ?? null
  return Object.freeze({
    latest: (kind: MvpProjectionKind, subjectId: string) => Promise.resolve(latest(kind, subjectId)),
    byVersion: (id: string) => Promise.resolve(review.projections.find((value) => value.projectionVersionId === id) ?? null),
    list: (input: { readonly kind?: MvpProjectionKind; readonly subjectId?: string; readonly start?: string; readonly end?: string; readonly limit: number; readonly offset?: number }) => Promise.resolve(Object.freeze(review.projections.filter((value) => (!input.kind || value.projectionKind === input.kind) && (!input.subjectId || value.subjectId === input.subjectId) && (!input.start || value.eventTimeStart >= input.start) && (!input.end || value.eventTimeEnd <= input.end)).slice(input.offset ?? 0, (input.offset ?? 0) + input.limit))),
    exposure: () => Promise.resolve(null),
  })
}

export function mvpServingPreviewReadAuthorizationId(config: MvpServingPreviewCandidateConfig): string {
  return `mvp8v-preview-read:${canonicalChecksum(config)}`
}
