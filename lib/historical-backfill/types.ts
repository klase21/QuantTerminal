import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { HistoricalDatasetResolutionMetadata } from "@/lib/persistence/repository/types"

export const HISTORICAL_BACKFILL_SOURCE = "binance-vision" as const
export const HISTORICAL_BACKFILL_SYMBOL = "BTCUSDT" as const
export const HISTORICAL_BACKFILL_INTERVAL = "5m" as const
export const HISTORICAL_BACKFILL_DATASET = "futures-um-klines" as const
export const HISTORICAL_BACKFILL_SCHEMA_VERSION = 1 as const
export const HISTORICAL_BACKFILL_START = "2026-06-15T00:00:00.000Z" as const
export const HISTORICAL_BACKFILL_END = "2026-06-22T00:00:00.000Z" as const

export interface HistoricalCandle extends HistoricalDatasetResolutionMetadata {
  readonly providerTier: "CANONICAL"
  readonly canonical: true
  readonly verified: true
  readonly confidence: 1
  readonly recordId: string
  readonly sourceId: typeof HISTORICAL_BACKFILL_SOURCE
  readonly dataset: typeof HISTORICAL_BACKFILL_DATASET
  readonly symbol: typeof HISTORICAL_BACKFILL_SYMBOL
  readonly interval: typeof HISTORICAL_BACKFILL_INTERVAL
  readonly sourceOpenTime: string
  readonly sourceCloseTime: string
  readonly openTime: string
  readonly closeTime: string
  readonly open: number
  readonly high: number
  readonly low: number
  readonly close: number
  readonly volume: number
  readonly quoteVolume: number
  readonly tradeCount: number
  readonly takerBuyVolume: number
  readonly takerBuyQuoteVolume: number
}

export interface HistoricalBackfillValidation {
  readonly valid: boolean
  readonly duplicateCount: number
  readonly missingIntervalCount: number
  readonly errors: readonly string[]
}

export type HistoricalBackfillStatus = "SUCCESS" | "DUPLICATE" | "UNAVAILABLE" | "VALIDATION_ERROR" | "PERSISTENCE_ERROR"

export interface HistoricalBackfillResult {
  readonly status: HistoricalBackfillStatus
  readonly rangeStart: typeof HISTORICAL_BACKFILL_START
  readonly rangeEnd: typeof HISTORICAL_BACKFILL_END
  readonly totalCandles: number
  readonly persistedCount: number
  readonly duplicateWriteCount: number
  readonly validation: HistoricalBackfillValidation
  readonly errors: readonly string[]
}

export interface HistoricalBackfillOptions {
  readonly repository: PersistenceRepository
  readonly recordedAt: string
  readonly fetchImpl?: typeof fetch
}

export type HistoricalArchiveKind = "DAILY" | "MONTHLY"

export interface HistoricalArchivePlan {
  readonly kind: HistoricalArchiveKind
  readonly period: string
  readonly rangeStart: string
  readonly rangeEnd: string
  readonly url: string
}

export interface HistoricalBackfillProgress {
  readonly archiveIndex: number
  readonly archiveCount: number
  readonly archive: HistoricalArchivePlan
  readonly totalCandles: number
  readonly persistedCount: number
  readonly duplicateWriteCount: number
  readonly missingIntervalCount: number
}

export interface FullHistoricalBackfillOptions {
  readonly repository: PersistenceRepository
  readonly recordedAt: string
  readonly fetchImpl?: typeof fetch
  readonly onProgress?: (progress: HistoricalBackfillProgress) => void
}

export interface FullHistoricalBackfillResult {
  readonly status: HistoricalBackfillStatus
  readonly rangeStart: string
  readonly rangeEnd: string
  readonly firstTimestamp: string | null
  readonly lastTimestamp: string | null
  readonly archiveCount: number
  readonly completedArchiveCount: number
  readonly totalCandles: number
  readonly persistedCount: number
  readonly duplicateWriteCount: number
  readonly sourceDuplicateCount: number
  readonly missingIntervalCount: number
  readonly errors: readonly string[]
}
