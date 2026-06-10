import type { InformationSourceProvider } from "./informationSourceTypes"

export type ReliabilityEvidenceType = "source_reputation" | "historical_accuracy" | "corroboration" | "consistency"

export interface ReliabilityEvidence {
  type: ReliabilityEvidenceType
  value: number
  note: string
  supportingItemIds?: string[]
}

export interface InformationReliabilityProfile {
  provider: InformationSourceProvider
  sourceReputation: number
  historicalAccuracy: number
  corroborationRequirement: "none" | "recommended" | "required"
  consistencyRequirement: "low" | "medium" | "high"
  notes: string[]
}

export interface InformationReliabilityAssessmentContract {
  itemId: string
  provider: InformationSourceProvider
  evidence: ReliabilityEvidence[]
  expectedInputsFromFutureAdapters: [
    "source identity",
    "publication timestamp",
    "source URL or provider id",
    "corroborating item ids",
    "historical accuracy metadata",
  ]
}

export const reliabilityFrameworkPrinciples = [
  "Official or market-priced sources start with higher reputation but still require context.",
  "Social sources can be early but need corroboration before becoming a high-confidence signal.",
  "Historical accuracy should be learned over time, not hardcoded as permanent truth.",
  "Consistency means the item does not contradict known event facts or its own source history.",
] as const

