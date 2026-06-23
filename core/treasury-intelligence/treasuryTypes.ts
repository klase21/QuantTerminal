export const TREASURY_SNAPSHOT_SCHEMA_VERSION = 2

export const TREASURY_QUALITIES = [
  "verified",
  "partial",
  "degraded",
  "unavailable",
  "unknown",
] as const

export type TreasuryQuality = typeof TREASURY_QUALITIES[number]

export interface TreasurySnapshot {
  schemaVersion: typeof TREASURY_SNAPSHOT_SCHEMA_VERSION
  snapshotId: string
  holder: string
  holderType: string
  asset: string
  holdings: number
  holdingsValueUsd: number | null
  changeAmount: number | null
  changePercent: number | null
  timestamp: string | null
  source: string
  quality: TreasuryQuality
  generatedAt: string
  metadata?: Record<string, unknown>
}

export interface TreasurySourceFile {
  schemaVersion: typeof TREASURY_SNAPSHOT_SCHEMA_VERSION
  source: string
  snapshots: Array<{
    holder: string
    holderType?: string
    asset: string
    holdings: number
    holdingsValueUsd?: number | null
    changeAmount?: number | null
    changePercent?: number | null
    timestamp: string | null
    quality: TreasuryQuality
    metadata?: Record<string, unknown>
  }>
}

export interface TreasuryArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  snapshot: TreasurySnapshot
}

export function treasurySnapshotId(input: {
  holder: string
  asset: string
  timestamp: string | null
}) {
  const holder = input.holder.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
  if (!holder) throw new Error("Treasury holder is invalid.")
  const timestamp = input.timestamp === null
    ? "unknown-observation-time"
    : new Date(input.timestamp).toISOString().replace(/[:.]/g, "-")
  return [
    "treasury-snapshot",
    holder,
    input.asset.trim().toUpperCase(),
    timestamp,
  ].join(":")
}
