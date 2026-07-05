import type { PersistenceRepository } from "@/lib/persistence/repository"

export const RECENT_GAP_SYNC_DATASETS = [
  "HISTORICAL_MARKET",
  "HISTORICAL_OPEN_INTEREST",
  "HISTORICAL_FUNDING",
  "HISTORICAL_AGG_TRADE",
  "HISTORICAL_LIQUIDATION",
] as const

export type RecentGapSyncDataset = typeof RECENT_GAP_SYNC_DATASETS[number]
export type RecentGapSyncResolution = "5m" | "8h_event" | "tick"
export type RecentGapSyncCoverageMode = "time_series" | "event" | "event_stream" | "time_series_experimental"
export type RecentGapSyncProviderStrategy =
  | "BINANCE_VISION_ARCHIVE"
  | "BINANCE_OFFICIAL_REST_RECENT_GAP"
  | "BINANCE_VISION_THEN_EXPLICIT_EXPERIMENTAL"

export interface RecentGapSyncPlanInput {
  readonly symbol: string
  readonly targetEndTime: string
  readonly latestObservedAt: Readonly<Partial<Record<RecentGapSyncDataset, string | null>>>
  readonly datasets?: readonly RecentGapSyncDataset[]
}

export interface RecentGapSyncJobPlan {
  readonly jobId: string
  readonly dataset: RecentGapSyncDataset
  readonly symbol: string
  readonly latestObservedAt: string | null
  readonly targetEndTime: string
  readonly resolution: RecentGapSyncResolution
  readonly coverageMode: RecentGapSyncCoverageMode
  readonly missingWindowStart: string | null
  readonly missingWindowEnd: string
  readonly estimatedMissingRecords: number | null
  readonly syncPriority: number
  readonly providerStrategy: RecentGapSyncProviderStrategy
  readonly affectedUtcDays: readonly string[]
  readonly executionSupported: boolean
  readonly executionBlocker: string | null
}

export interface RecentGapSyncPlan {
  readonly planId: string
  readonly symbol: string
  readonly targetEndTime: string
  readonly jobs: readonly RecentGapSyncJobPlan[]
  readonly affectedUtcDays: readonly string[]
}

export type RecentGapSyncPlanResult =
  | { readonly status: "SUCCESS"; readonly value: RecentGapSyncPlan }
  | { readonly status: "VALIDATION_ERROR"; readonly errors: readonly string[] }

export interface RecentGapSyncExecutionOptions extends RecentGapSyncPlanInput {
  readonly dryRun: boolean
  readonly repository?: PersistenceRepository
  readonly recordedAt?: string
  readonly fetchImpl?: typeof fetch
  readonly maxUtcDaysPerDataset?: number
  readonly includeExperimentalLiquidation?: boolean
  readonly coinalyzeInternalEnabled?: boolean
  readonly coinalyzeRequestKey?: string
}

export interface RecentGapSyncJobResult {
  readonly jobId: string
  readonly dataset: RecentGapSyncDataset
  readonly status: "PLANNED" | "SUCCESS" | "DUPLICATE" | "SKIPPED" | "UNSUPPORTED" | "FAILED"
  readonly attemptedUtcDays: readonly string[]
  readonly projectionRefreshDays: readonly string[]
  readonly recordsWritten: number
  readonly duplicateRecords: number
  readonly errors: readonly string[]
}

export interface RecentGapSyncResult {
  readonly status: "DRY_RUN" | "SUCCESS" | "PARTIAL" | "VALIDATION_ERROR"
  readonly dryRun: boolean
  readonly plan: RecentGapSyncPlan | null
  readonly jobs: readonly RecentGapSyncJobResult[]
  readonly affectedUtcDays: readonly string[]
  readonly projectionRefreshDays: readonly string[]
  readonly errors: readonly string[]
}
