import type {
  StandardArtifactMetadata,
} from "@/core/artifact-standardization"

export const DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION = 2

export const DEPLOYABLE_SNAPSHOT_FRESHNESS = [
  "current",
  "stale",
  "missing",
] as const

export type DeployableSnapshotFreshness =
  typeof DEPLOYABLE_SNAPSHOT_FRESHNESS[number]

export const DEPLOYABLE_SNAPSHOT_COVERAGE = [
  "full",
  "partial",
  "unavailable",
] as const

export type DeployableSnapshotCoverage =
  typeof DEPLOYABLE_SNAPSHOT_COVERAGE[number]

export const DEPLOYABLE_COVERAGE_TYPES = [
  "OHLCV",
  "funding",
  "open_interest",
  "liquidation",
  "ETF",
  "exchange_flow",
  "exchange_reserve",
  "exchange_reserve_delta",
  "reserve_intelligence",
  "treasury",
  "market_drivers",
] as const

export type DeployableCoverageType = typeof DEPLOYABLE_COVERAGE_TYPES[number]

export const DEPLOYABLE_COVERAGE_SURFACES = [
  "Dashboard",
  "Markets",
  "Research",
  "Replay",
  "Historical Intelligence",
] as const

export type DeployableCoverageSurface =
  typeof DEPLOYABLE_COVERAGE_SURFACES[number]

export type DeployableSnapshotMetadata = StandardArtifactMetadata

export interface DeployableSnapshot<TData> {
  schemaVersion: typeof DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION
  snapshotId: string
  metadata: DeployableSnapshotMetadata
  data: TData
}

export interface DeployableCoverageEntry {
  surface: DeployableCoverageSurface
  type: DeployableCoverageType
  freshness: DeployableSnapshotFreshness
  coverage: DeployableSnapshotCoverage
  artifact: string | null
  reason?: string
}

export interface DeployableCoverageIndex {
  schemaVersion: typeof DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION
  generatedAt: string
  entries: DeployableCoverageEntry[]
}

export interface DeployableFundingRecord {
  symbol: string
  fundingRate: number
  observedAt: string
  source: string
}

export interface DeployableOpenInterestRecord {
  symbol: string
  changePercent: number
  observedAt: string
  source: string
}
