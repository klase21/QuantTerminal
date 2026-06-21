import {
  DECISION_BRIEF_CURRENT_VIEWS,
  DECISION_BRIEF_SCHEMA_VERSION,
  type DecisionBrief,
} from "./decisionBriefTypes"
import {
  EVIDENCE_COVERAGE_STATUSES,
  EVIDENCE_FRESHNESS_STATUSES,
} from "@/core/evidence-validity"

function strings(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && Boolean(item.trim()))
}

export function isDecisionBrief(value: unknown): value is DecisionBrief {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const candidate = value as Partial<DecisionBrief>
  return (
    candidate.schemaVersion === DECISION_BRIEF_SCHEMA_VERSION
    && typeof candidate.decisionBriefId === "string"
    && Boolean(candidate.decisionBriefId.trim())
    && typeof candidate.investigationThesisId === "string"
    && Boolean(candidate.investigationThesisId.trim())
    && typeof candidate.generatedAt === "string"
    && Number.isFinite(Date.parse(candidate.generatedAt))
    && DECISION_BRIEF_CURRENT_VIEWS.includes(candidate.currentView as DecisionBrief["currentView"])
    && EVIDENCE_FRESHNESS_STATUSES.includes(candidate.freshnessStatus as DecisionBrief["freshnessStatus"])
    && EVIDENCE_COVERAGE_STATUSES.includes(candidate.coverageStatus as DecisionBrief["coverageStatus"])
    && Number.isInteger(candidate.supportingEvidenceCount)
    && (candidate.supportingEvidenceCount ?? -1) >= 0
    && Number.isInteger(candidate.contradictingEvidenceCount)
    && (candidate.contradictingEvidenceCount ?? -1) >= 0
    && strings(candidate.keySupportingFactors)
    && strings(candidate.keyContradictingFactors)
    && Array.isArray(candidate.requiredNextValidation)
    && candidate.requiredNextValidation.every((item) => typeof item === "string" && Boolean(item.trim()))
    && Array.isArray(candidate.sourceArtifactIds)
    && candidate.sourceArtifactIds.every((item) => typeof item === "string" && Boolean(item.trim()))
  )
}
