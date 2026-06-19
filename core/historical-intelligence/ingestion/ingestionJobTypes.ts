import type { HistoricalCacheIdentity, HistoricalCacheSource } from "../cache/cacheTypes"

export type HistoricalIngestionJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "partial"
  | "failed"
  | "cancelled"

export type HistoricalIngestionJobKind =
  | "source_ingestion"
  | "normalization"
  | "snapshot_generation"
  | "outcome_generation"
  | "cache_generation"

export interface HistoricalIngestionWindow {
  start: string
  end: string
  interval?: string
}

export interface HistoricalIngestionTarget {
  cache: HistoricalCacheIdentity
  schemaVersion: string
}

export interface HistoricalIngestionProgress {
  completed: number
  total?: number
  unit?: "rows" | "files" | "windows" | "records"
  message?: string
}

export interface HistoricalIngestionJob {
  id: string
  kind: HistoricalIngestionJobKind
  source: HistoricalCacheSource
  target: HistoricalIngestionTarget
  status: HistoricalIngestionJobStatus
  dimensions?: Record<string, string | number | boolean>
  window?: HistoricalIngestionWindow
  options?: Record<string, unknown>
  progress?: HistoricalIngestionProgress
  attempt: number
  maxAttempts?: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  updatedAt: string
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

export interface HistoricalIngestionJobDefinition {
  kind: HistoricalIngestionJobKind
  source: HistoricalCacheSource
  target: HistoricalIngestionTarget
  dimensions?: Record<string, string | number | boolean>
  window?: HistoricalIngestionWindow
  options?: Record<string, unknown>
  maxAttempts?: number
}
