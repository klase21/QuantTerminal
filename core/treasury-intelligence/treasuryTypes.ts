export const TREASURY_SNAPSHOT_SCHEMA_VERSION = 1

export const TREASURY_QUALITIES = [
  "verified",
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
  timestamp: string
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
    timestamp: string
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
  timestamp: string
}) {
  const timestamp = new Date(input.timestamp)
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("Treasury snapshot timestamp is invalid.")
  }
  const holder = input.holder.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
  if (!holder) throw new Error("Treasury holder is invalid.")
  return [
    "treasury-snapshot",
    holder,
    input.asset.trim().toUpperCase(),
    timestamp.toISOString().replace(/[:.]/g, "-"),
  ].join(":")
}
