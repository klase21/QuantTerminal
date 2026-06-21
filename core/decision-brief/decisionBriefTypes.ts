import type {
  EvidenceCoverageStatus,
  EvidenceFreshnessStatus,
  EvidenceValidity,
} from "@/core/evidence-validity"
import type { ContradictionAnalysis } from "@/core/contradiction"

export const DECISION_BRIEF_SCHEMA_VERSION = 1

export const DECISION_BRIEF_CURRENT_VIEWS = [
  "undetermined",
  "bullish_lean",
  "bearish_lean",
  "mixed",
  "insufficient_evidence",
] as const

export type DecisionBriefCurrentView = typeof DECISION_BRIEF_CURRENT_VIEWS[number]

export interface DecisionBrief {
  schemaVersion: typeof DECISION_BRIEF_SCHEMA_VERSION
  decisionBriefId: string
  investigationThesisId: string
  generatedAt: string
  currentView: DecisionBriefCurrentView
  freshnessStatus: EvidenceFreshnessStatus
  coverageStatus: EvidenceCoverageStatus
  supportingEvidenceCount: number
  contradictingEvidenceCount: number
  keySupportingFactors: string[]
  keyContradictingFactors: string[]
  requiredNextValidation: string[]
  sourceArtifactIds: string[]
}

export interface DecisionBriefEvidenceSource {
  artifactId: string
  validity: EvidenceValidity
  contradiction?: ContradictionAnalysis
}
