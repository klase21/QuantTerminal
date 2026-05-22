import type { NarrativeValidationItem } from "@/core/narrative/narrativeTypes"

export type SignalQualityGrade = "A" | "B" | "C" | "D"
export type SignalReliability = "HIGH" | "MEDIUM" | "LOW"
export type FalsePositiveRisk = "LOW" | "MEDIUM" | "HIGH"
export type SignalTrustLabel = "HIGH_TRUST" | "WATCH" | "LOW_QUALITY"

export interface SignalQualityBreakdown {
  liquidity: number
  validation: number
  breadth: number
  regimeFit: number
  dataQuality: number
  premiumConfirmation: number
  noisePenalty: number
}

export interface SignalQualityItem {
  id: string
  narrative: string
  qualityScore: number
  grade: SignalQualityGrade
  reliability: SignalReliability
  trustLabel: SignalTrustLabel
  falsePositiveRisk: FalsePositiveRisk
  validationStatus: NarrativeValidationItem["status"] | "ROTATION_ONLY"
  newsBuzz: number
  liquidityHeat: number
  reasons: string[]
  penalties: string[]
  recommendation: "PROMOTE" | "WATCH" | "SUPPRESS"
  breakdown: SignalQualityBreakdown
  cooldownGroup: string
  operatorAction: string
}

export interface SignalQualityReport {
  generatedAt: string
  overallScore: number
  reliability: SignalReliability
  falsePositiveRisk: FalsePositiveRisk
  promoted: SignalQualityItem[]
  watch: SignalQualityItem[]
  suppressed: SignalQualityItem[]
  noiseSuppressed: number
  topPenalties: string[]
  notes: string[]
}
