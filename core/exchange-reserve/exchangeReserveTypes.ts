export const EXCHANGE_RESERVE_SCHEMA_VERSION = 1

export const EXCHANGE_RESERVE_QUALITIES = [
  "verified",
  "degraded",
  "unavailable",
  "unknown",
] as const

export type ExchangeReserveQuality =
  typeof EXCHANGE_RESERVE_QUALITIES[number]

export interface ExchangeReserveSnapshot {
  schemaVersion: typeof EXCHANGE_RESERVE_SCHEMA_VERSION
  snapshotId: string
  exchange: "binance"
  walletAddress: string
  network: string
  asset: string
  balance: number
  balanceUsd: number
  updateTime: string
  source: string
  quality: ExchangeReserveQuality
  generatedAt: string
  metadata?: Record<string, unknown>
}

export interface ExchangeReserveSourceFile {
  schemaVersion: typeof EXCHANGE_RESERVE_SCHEMA_VERSION
  source: string
  snapshots: Array<{
    exchange: "binance"
    walletAddress: string
    network: string
    asset: string
    balance: number
    balanceUsd: number
    updateTime: string
    quality: ExchangeReserveQuality
    metadata?: Record<string, unknown>
  }>
}

export interface ExchangeReserveArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  snapshot: ExchangeReserveSnapshot
}

export interface DeployableExchangeReserveRecord {
  exchange: "binance"
  walletAddress: string
  network: string
  asset: string
  balance: number
  balanceUsd: number
  updateTime: string
  quality: ExchangeReserveQuality
}

function segment(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
  if (!normalized) throw new Error("Exchange Reserve identity segment is invalid.")
  return normalized
}

export function exchangeReserveSnapshotId(input: {
  exchange: "binance"
  walletAddress: string
  network: string
  asset: string
  updateTime: string
}) {
  const timestamp = new Date(input.updateTime)
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("Exchange Reserve updateTime is invalid.")
  }
  return [
    "exchange-reserve",
    input.exchange,
    segment(input.network),
    segment(input.walletAddress),
    segment(input.asset),
    timestamp.toISOString().replace(/[:.]/g, "-"),
  ].join(":")
}
