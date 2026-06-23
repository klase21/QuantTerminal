export const EXCHANGE_FLOW_SCHEMA_VERSION = 2

export const EXCHANGE_FLOW_SOURCE_QUALITIES = [
  "verified",
  "degraded",
  "unavailable",
  "unknown",
] as const

export type ExchangeFlowSourceQuality =
  typeof EXCHANGE_FLOW_SOURCE_QUALITIES[number]

export const EXCHANGE_FLOW_SCOPES = [
  "exchange_level",
  "asset_level",
] as const

export type ExchangeFlowScope = typeof EXCHANGE_FLOW_SCOPES[number]

interface ExchangeFlowSnapshotBase {
  schemaVersion: typeof EXCHANGE_FLOW_SCHEMA_VERSION
  snapshotId: string
  scope: ExchangeFlowScope
  exchange: string
  timestamp: string
  source: string
  sourceQuality: ExchangeFlowSourceQuality
  generatedAt: string
  metadata?: Record<string, unknown>
}

export interface ExchangeLevelFlowSnapshot extends ExchangeFlowSnapshotBase {
  scope: "exchange_level"
  totalAssetsUsd: number
  netFlow24hUsd: number
}

export interface AssetLevelFlowSnapshot extends ExchangeFlowSnapshotBase {
  scope: "asset_level"
  asset: string
  holdings: number
  inflow: number
  outflow: number
  netFlow: number
}

export type ExchangeFlowSnapshot =
  | ExchangeLevelFlowSnapshot
  | AssetLevelFlowSnapshot

type ExchangeFlowSourceSnapshot =
  | Omit<ExchangeLevelFlowSnapshot, "schemaVersion" | "snapshotId" | "source" | "generatedAt">
  | Omit<AssetLevelFlowSnapshot, "schemaVersion" | "snapshotId" | "source" | "generatedAt">

export interface ExchangeFlowSourceFile {
  schemaVersion: typeof EXCHANGE_FLOW_SCHEMA_VERSION
  source: string
  snapshots: ExchangeFlowSourceSnapshot[]
}

export interface ExchangeFlowArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  snapshot: ExchangeFlowSnapshot
}

export function exchangeFlowSnapshotId(input: {
  scope: ExchangeFlowScope
  exchange: string
  asset?: string
  timestamp: string
}) {
  const timestamp = new Date(input.timestamp)
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("Exchange Flow timestamp is invalid.")
  }
  const identity = input.scope === "asset_level"
    ? input.asset?.trim().toUpperCase()
    : "ALL"
  if (!identity) throw new Error("Asset-level Exchange Flow requires an asset.")
  return [
    "exchange-flow",
    input.scope,
    input.exchange.trim().toLowerCase(),
    identity,
    timestamp.toISOString().replace(/[:.]/g, "-"),
  ].join(":")
}
