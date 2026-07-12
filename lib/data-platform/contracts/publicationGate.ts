import type { QualityResult, QualitySeverity } from "./dataQuality"

export type PipelineStage = "FETCHED" | "RAW_ARCHIVED" | "STRUCTURALLY_VALIDATED" | "QUALITY_EVALUATED" | "NORMALIZED" | "CANONICALLY_COMMITTED" | "COVERAGE_CERTIFIED" | "CONSISTENCY_CERTIFIED" | "PROJECTION_BUILT" | "EVIDENCE_REFRESHED" | "PUBLISHED"
export type PublicationDecision = "PUBLISH" | "PUBLISH_PARTIAL" | "QUARANTINE" | "REJECT" | "HOLD_FOR_REVIEW"

export interface PublicationGateInput {
  checksumConflict: boolean
  qualityResults: readonly QualityResult[]
  consistencyMatched: boolean
  providerExperimental: boolean
  experimentalPublicationAllowed: boolean
  projectionWatermarkCurrent: boolean
  missingNoncriticalMetadata: boolean
  partialPublicationAllowed: boolean
}

const isCriticalFailure = (severity: QualitySeverity, result: string) => severity === "CRITICAL" && result === "FAIL"

export function evaluatePublicationGate(input: PublicationGateInput): PublicationDecision {
  if (input.checksumConflict) return "QUARANTINE"
  if (input.qualityResults.some((result) => isCriticalFailure(result.severity, result.result))) return "REJECT"
  if (input.qualityResults.some((result) => result.mandatory && result.result === "NOT_EVALUATED")) return "HOLD_FOR_REVIEW"
  if (!input.consistencyMatched || !input.projectionWatermarkCurrent) return "HOLD_FOR_REVIEW"
  if (input.providerExperimental && !input.experimentalPublicationAllowed) return "HOLD_FOR_REVIEW"
  if (input.missingNoncriticalMetadata) return input.partialPublicationAllowed ? "PUBLISH_PARTIAL" : "HOLD_FOR_REVIEW"
  return "PUBLISH"
}
