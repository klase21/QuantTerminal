import type { EvidenceValidity } from "@/core/evidence-validity"
import type { ContradictionAnalysis } from "@/core/contradiction"
import type { HistoricalInterval } from "@/types/historical"

export type HistoricalAnalogTrendRegime = "uptrend" | "downtrend" | "sideways" | "unknown"
export type HistoricalAnalogHorizon = "1h" | "4h" | "24h" | "7d"
export type HistoricalAnalogDominantOutcome = "up" | "down" | "mixed" | "unavailable"

export interface HistoricalAnalogFeatureVector {
  return1h: number | null
  return4h: number | null
  return24h: number | null
  volumeZScore: number | null
  realizedVolatility24h: number | null
  distanceSma20: number | null
  distanceSma50: number | null
  fundingRate: number | null
  openInterestChange24h: number | null
}

export interface HistoricalMarketStateV2 {
  id: string
  source: string
  symbol: string
  interval: HistoricalInterval
  timestamp: number
  close: number
  trendRegime: HistoricalAnalogTrendRegime
  features: HistoricalAnalogFeatureVector
}

export interface HistoricalStateEnrichmentPoint {
  timestamp: number
  fundingRate?: number | null
  openInterest?: number | null
}

export interface HistoricalAnalogOutcome {
  stateId: string
  symbol: string
  timestamp: number
  returns: Record<HistoricalAnalogHorizon, number | null>
}

export interface HistoricalAnalogCase {
  state: HistoricalMarketStateV2
  outcome: HistoricalAnalogOutcome
  similarity: number
  comparableFeatures: number
}

export interface HistoricalAnalogHorizonStats {
  caseCount: number
  averageReturn: number | null
  winRate: number | null
  bestCase: {
    stateId: string
    timestamp: number
    return: number
  } | null
  worstCase: {
    stateId: string
    timestamp: number
    return: number
  } | null
}

export interface HistoricalAnalogStatistics {
  totalCases: number
  byHorizon: Record<HistoricalAnalogHorizon, HistoricalAnalogHorizonStats>
  dominantOutcome: HistoricalAnalogDominantOutcome
}

export interface HistoricalStateDatasetV2 {
  source: string
  symbol: string
  interval: HistoricalInterval
  states: HistoricalMarketStateV2[]
  outcomes: HistoricalAnalogOutcome[]
}

export interface HistoricalAnalogCachePayloadV2 {
  source: string
  symbol: string
  interval: HistoricalInterval
  currentState: HistoricalMarketStateV2
  cases: HistoricalAnalogCase[]
  statistics: HistoricalAnalogStatistics
  search: {
    candidateCount: number
    minimumComparableFeatures: number
    exclusionWindowMs: number
  }
  validity?: EvidenceValidity
  contradiction?: ContradictionAnalysis
}
