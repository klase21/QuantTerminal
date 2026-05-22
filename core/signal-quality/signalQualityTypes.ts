import type { NarrativeValidationItem } from "@/core/narrative/narrativeTypes"

export type SignalQualityGrade = "A" | "B" | "C" | "D"
export type SignalReliability = "HIGH" | "MEDIUM" | "LOW"
export type FalsePositiveRisk = "LOW" | "MEDIUM" | "HIGH"

export interface SignalQualityItem {
  id: string
  narrative: string
  qualityScore: number
  grade: SignalQualityGrade
  reliability: SignalReliability
  falsePositiveRisk: FalsePositiveRisk
  validationStatus: NarrativeValidationItem["status"] | "ROTATION_ONLY"
  newsBuzz: number
  liquidityHeat: number
  reasons: string[]
  penalties: string[]
  recommendation: "PROMOTE" | "WATCH" | "SUPPRESS"
}

export interface SignalQualityReport {
  generatedAt: string
  overallScore: number
  reliability: SignalReliability
  falsePositiveRisk: FalsePositiveRisk
  promoted: SignalQualityItem[]
  watch: SignalQualityItem[]
  suppressed: SignalQualityItem[]
  notes: string[]
}
