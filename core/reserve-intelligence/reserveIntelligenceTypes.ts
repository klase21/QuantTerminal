export const RESERVE_INTELLIGENCE_SCHEMA_VERSION = 1

export const RESERVE_ASSET_CLASSIFICATIONS = [
  "hard_asset",
  "stablecoin",
  "exchange_asset",
  "smart_contract_asset",
  "other",
] as const

export type ReserveAssetClassification =
  typeof RESERVE_ASSET_CLASSIFICATIONS[number]

export const RESERVE_OBSERVATION_TYPES = [
  "reserve_increase",
  "reserve_decrease",
  "reserve_no_change",
  "stablecoin_accumulation",
  "stablecoin_decline",
  "stablecoin_no_change",
  "delta_unavailable",
] as const

export type ReserveObservationType =
  typeof RESERVE_OBSERVATION_TYPES[number]

export const RESERVE_INTELLIGENCE_QUALITIES = [
  "verified",
  "partial",
  "unavailable",
] as const

export type ReserveIntelligenceQuality =
  typeof RESERVE_INTELLIGENCE_QUALITIES[number]

export const RESERVE_TREND_HORIZONS = [
  "1d",
  "7d",
  "30d",
] as const

export type ReserveTrendHorizon = typeof RESERVE_TREND_HORIZONS[number]

export interface ReserveTrendObservation {
  horizon: ReserveTrendHorizon
  status: "available" | "unavailable"
  previousObservedAt: string | null
  quantityChange: number | null
  absoluteChange: number | null
  percentageChange: number | null
  balanceUsdChange: number | null
  reason: string | null
}

export interface ReserveIntelligenceObservation {
  schemaVersion: typeof RESERVE_INTELLIGENCE_SCHEMA_VERSION
  observationId: string
  exchange: "binance"
  asset: string
  classification: ReserveAssetClassification
  observationType: ReserveObservationType
  currentBalance: number
  currentBalanceUsd: number
  currentObservedAt: string
  previousObservedAt: string | null
  quantityChange: number | null
  absoluteChange: number | null
  percentageChange: number | null
  balanceUsdChange: number | null
  trends: ReserveTrendObservation[]
  source: string
  quality: ReserveIntelligenceQuality
  generatedAt: string
  reason: string | null
}

export interface ReserveIntelligenceArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  observation: ReserveIntelligenceObservation
}

export interface DeployableReserveIntelligenceObservation {
  exchange: "binance"
  asset: string
  classification: ReserveAssetClassification
  observationType: ReserveObservationType
  currentBalance: number
  currentBalanceUsd: number
  currentObservedAt: string
  previousObservedAt: string | null
  quantityChange: number | null
  absoluteChange: number | null
  percentageChange: number | null
  balanceUsdChange: number | null
  trendAvailability: {
    oneDay: boolean
    sevenDay: boolean
    thirtyDay: boolean
  }
  quality: ReserveIntelligenceQuality
  reason: string | null
}

function segment(value: string) {
  const normalized = value.trim().toUpperCase()
  if (!normalized) throw new Error("Reserve Intelligence asset segment is invalid.")
  return normalized.replace(/[^A-Z0-9]+/g, "-")
}

export function reserveIntelligenceObservationId(input: {
  exchange: "binance"
  asset: string
  observedAt: string
}) {
  const timestamp = new Date(input.observedAt)
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("Reserve Intelligence observedAt is invalid.")
  }
  return [
    "reserve-intelligence",
    input.exchange,
    segment(input.asset),
    timestamp.toISOString().replace(/[:.]/g, "-"),
  ].join(":")
}
