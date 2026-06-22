export const EXCHANGE_FLOW_SCHEMA_VERSION = 1

export const EXCHANGE_FLOW_SOURCE_QUALITIES = [
  "verified",
  "degraded",
  "unavailable",
  "unknown",
] as const

export type ExchangeFlowSourceQuality =
  typeof EXCHANGE_FLOW_SOURCE_QUALITIES[number]

export interface ExchangeFlowSnapshot {
  schemaVersion: typeof EXCHANGE_FLOW_SCHEMA_VERSION
  snapshotId: string
  exchange: string
  asset: string
  holdings: number
  inflow: number
  outflow: number
  netFlow: number
  timestamp: string
  source: string
  sourceQuality: ExchangeFlowSourceQuality
  generatedAt: string
  metadata?: Record<string, unknown>
}

export interface ExchangeFlowSourceFile {
  schemaVersion: typeof EXCHANGE_FLOW_SCHEMA_VERSION
  source: string
  snapshots: Array<{
    exchange: string
    asset: string
    holdings: number
    inflow: number
    outflow: number
    netFlow?: number
    timestamp: string
    sourceQuality: ExchangeFlowSourceQuality
    metadata?: Record<string, unknown>
  }>
}

export interface ExchangeFlowArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  snapshot: ExchangeFlowSnapshot
}

export function exchangeFlowSnapshotId(input: {
  exchange: string
  asset: string
  timestamp: string
}) {
  const timestamp = new Date(input.timestamp)
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("Exchange Flow timestamp is invalid.")
  }
  return [
    "exchange-flow",
    input.exchange.trim().toLowerCase(),
    input.asset.trim().toUpperCase(),
    timestamp.toISOString().replace(/[:.]/g, "-"),
  ].join(":")
}
