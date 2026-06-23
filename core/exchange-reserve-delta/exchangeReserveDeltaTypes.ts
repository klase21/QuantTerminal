export const EXCHANGE_RESERVE_DELTA_SCHEMA_VERSION = 1

export const EXCHANGE_RESERVE_DELTA_STATUSES = [
  "available",
  "unavailable",
] as const

export type ExchangeReserveDeltaStatus =
  typeof EXCHANGE_RESERVE_DELTA_STATUSES[number]

export interface ExchangeReserveDelta {
  schemaVersion: typeof EXCHANGE_RESERVE_DELTA_SCHEMA_VERSION
  deltaId: string
  exchange: "binance"
  asset: string
  currentBalance: number
  currentBalanceUsd: number
  currentObservedAt: string
  previousBalance: number | null
  previousBalanceUsd: number | null
  previousObservedAt: string | null
  balanceDelta: number | null
  balanceDeltaPct: number | null
  balanceUsdDelta: number | null
  status: ExchangeReserveDeltaStatus
  reason: string | null
  source: string
  generatedAt: string
}

export interface ExchangeReserveDeltaArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  delta: ExchangeReserveDelta
}

export interface DeployableExchangeReserveDelta {
  exchange: "binance"
  asset: string
  currentBalance: number
  currentBalanceUsd: number
  currentObservedAt: string
  previousBalance: number | null
  previousBalanceUsd: number | null
  previousObservedAt: string | null
  balanceDelta: number | null
  balanceDeltaPct: number | null
  balanceUsdDelta: number | null
  status: ExchangeReserveDeltaStatus
  reason: string | null
}

export function exchangeReserveDeltaId(input: {
  exchange: "binance"
  asset: string
  currentObservedAt: string
}) {
  const timestamp = new Date(input.currentObservedAt)
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("Exchange Reserve Delta currentObservedAt is invalid.")
  }
  const asset = input.asset.trim().toUpperCase()
  if (!asset) throw new Error("Exchange Reserve Delta asset is invalid.")
  return [
    "exchange-reserve-delta",
    input.exchange,
    asset,
    timestamp.toISOString().replace(/[:.]/g, "-"),
  ].join(":")
}
