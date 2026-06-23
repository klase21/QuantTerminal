export const STANDARD_ARTIFACT_SCHEMA_VERSION = 1

export const ARTIFACT_STORAGE_CLASSES = [
  "deployable_snapshot",
  "durable_artifact",
  "raw_source",
  "temporary_cache",
] as const

export type ArtifactStorageClass = typeof ARTIFACT_STORAGE_CLASSES[number]

export const STANDARD_ARTIFACT_TYPES = [
  "market_driver",
  "etf",
  "funding",
  "open_interest",
  "liquidation",
  "exchange_flow",
  "treasury",
  "coverage_index",
] as const

export type StandardArtifactType = typeof STANDARD_ARTIFACT_TYPES[number]

export const STANDARD_ARTIFACT_WARNING_BYTES = 128 * 1024
export const STANDARD_ARTIFACT_HARD_LIMIT_BYTES = 512 * 1024

export interface StandardArtifactScope {
  kind: "global" | "multi_symbol" | "symbol" | "asset"
  symbols?: string[]
  assets?: string[]
  exchange?: string
}

export interface StandardArtifactMetadata {
  artifactType: StandardArtifactType
  scope: StandardArtifactScope
  timeframe: string | null
  partitionKey: string
  generatedAt: string
  sourceHash: string
  recordCount: number
  payloadSizeBytes: number
  freshness: "current" | "stale" | "missing"
  coverage: "full" | "partial" | "unavailable"
  storageClass: ArtifactStorageClass
  source: string
  observedAt: string | null
  reason?: string
}

export interface StandardArtifactIndexEntry {
  artifactType: StandardArtifactType
  partitionKey: string
  path: string
  generatedAt: string
  freshness: StandardArtifactMetadata["freshness"]
  payloadSizeBytes: number
  recordCount: number
  sourceHash: string
}

export interface StandardArtifactIndex {
  schemaVersion: typeof STANDARD_ARTIFACT_SCHEMA_VERSION
  generatedAt: string
  entries: StandardArtifactIndexEntry[]
}
