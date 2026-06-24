export const HISTORICAL_SNAPSHOT_SCHEMA_VERSION = 1

export const HISTORICAL_SNAPSHOT_DATASETS = [
  "exchange-reserve",
] as const

export type HistoricalSnapshotDataset =
  typeof HISTORICAL_SNAPSHOT_DATASETS[number]

export const HISTORICAL_RETENTION_HEALTH = [
  "healthy",
  "insufficient_history",
  "missing",
  "invalid",
] as const

export type HistoricalRetentionHealth =
  typeof HISTORICAL_RETENTION_HEALTH[number]

export interface HistoricalSnapshotEnvelope<TData> {
  schemaVersion: typeof HISTORICAL_SNAPSHOT_SCHEMA_VERSION
  dataset: HistoricalSnapshotDataset
  snapshotId: string
  observedAt: string
  generatedAt: string
  retainedAt: string
  sourcePath: string
  data: TData
}

export interface HistoricalSnapshotSummary {
  dataset: HistoricalSnapshotDataset
  snapshotId: string
  observedAt: string
  generatedAt: string
  retainedAt: string
  path: string
  recordCount: number | null
}

export interface HistoricalSnapshotResolution<TData> {
  dataset: HistoricalSnapshotDataset
  latest: HistoricalSnapshotEnvelope<TData> | null
  previous: HistoricalSnapshotEnvelope<TData> | null
  oldest: HistoricalSnapshotEnvelope<TData> | null
  snapshots: Array<HistoricalSnapshotEnvelope<TData>>
}
