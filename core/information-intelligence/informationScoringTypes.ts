export type InformationScoreBand = "very_low" | "low" | "medium" | "high" | "very_high"

export interface ReliabilityScore {
  value: number
  band: InformationScoreBand
  sourceReputation: number
  historicalAccuracy: number
  corroboration: number
  consistency: number
  rationale: string
}

export interface AttentionScore {
  value: number
  band: InformationScoreBand
  velocity: number
  mentions: number
  spread: number
  crossPlatformPresence: number
  rationale: string
}

export interface NarrativeScore {
  value: number
  band: InformationScoreBand
  narrativeStage: "emerging" | "growing" | "dominant" | "declining" | "dead"
  coherence: number
  persistence: number
  contradictionLevel: number
  rationale: string
}

export interface ImpactScore {
  value: number
  band: InformationScoreBand
  priceImpact: number
  volumeImpact: number
  volatilityImpact: number
  sentimentImpact: number
  rationale: string
}

export interface NoveltyScore {
  value: number
  band: InformationScoreBand
  noveltyState: "new" | "known" | "recycled" | "saturated"
  firstSeenDistance: number
  uniqueness: number
  repetitionPenalty: number
  rationale: string
}

export interface CompositeIntelligenceScore {
  value: number
  band: InformationScoreBand
  reliability: ReliabilityScore
  attention: AttentionScore
  narrative: NarrativeScore
  impact: ImpactScore
  novelty: NoveltyScore
  weights: {
    reliability: number
    attention: number
    narrative: number
    impact: number
    novelty: number
  }
  interpretation: string
}

export const defaultInformationScoreWeights = {
  reliability: 0.24,
  attention: 0.18,
  narrative: 0.2,
  impact: 0.24,
  novelty: 0.14,
} as const

export function informationScoreBand(value: number): InformationScoreBand {
  if (value >= 85) return "very_high"
  if (value >= 70) return "high"
  if (value >= 50) return "medium"
  if (value >= 30) return "low"
  return "very_low"
}

