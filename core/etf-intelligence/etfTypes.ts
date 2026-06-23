export const ETF_SNAPSHOT_SCHEMA_VERSION = 1

export const ETF_QUALITIES = [
  "verified",
  "degraded",
  "unavailable",
  "unknown",
] as const

export type EtfQuality = typeof ETF_QUALITIES[number]

export interface EtfSnapshot {
  schemaVersion: typeof ETF_SNAPSHOT_SCHEMA_VERSION
  snapshotId: string
  asset: string
  timestamp: string
  netInflowUsd: number | null
  inflowUsd: number | null
  outflowUsd: number | null
  holdings: number | null
  holdingsValueUsd: number | null
  source: string
  quality: EtfQuality
  generatedAt: string
  metadata?: Record<string, unknown>
}

export interface EtfSourceFile {
  schemaVersion: typeof ETF_SNAPSHOT_SCHEMA_VERSION
  source: string
  snapshots: Array<{
    asset: string
    timestamp: string
    netInflowUsd?: number | null
    inflowUsd?: number | null
    outflowUsd?: number | null
    holdings?: number | null
    holdingsValueUsd?: number | null
    quality: EtfQuality
    metadata?: Record<string, unknown>
  }>
}

export interface EtfArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  snapshot: EtfSnapshot
}

export function etfSnapshotId(input: { asset: string; timestamp: string }) {
  const timestamp = new Date(input.timestamp)
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("ETF snapshot timestamp is invalid.")
  }
  const asset = input.asset.trim().toUpperCase()
  if (!asset) throw new Error("ETF asset is invalid.")
  return [
    "etf-snapshot",
    asset,
    timestamp.toISOString().replace(/[:.]/g, "-"),
  ].join(":")
}
