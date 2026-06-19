import type { HistoricalCacheIdentity } from "@/core/historical-intelligence/cache/cacheTypes"
import type { HistoricalInterval } from "@/types/historical"

export const HISTORICAL_STATE_DATASET_SCHEMA_VERSION = "1"
export const HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION = "1"

export interface HistoricalAnalogCacheCoordinates {
  symbol: string
  interval: HistoricalInterval
}

export interface HistoricalStateDatasetCacheCoordinates extends HistoricalAnalogCacheCoordinates {
  source: string
}

export interface HistoricalStateDatasetCacheMetadata extends Record<string, unknown> {
  sourceFile: string
  inputRows: number
  stateCount: number
  outcomeCount: number
  firstTimestamp: number | null
  lastTimestamp: number | null
}

export interface HistoricalAnalogCacheMetadata extends Record<string, unknown> {
  stateDatasetSchemaVersion: string
  currentStateId: string
  candidateCount: number
  analogCount: number
}

export function historicalStateDatasetCacheIdentity(
  coordinates: HistoricalStateDatasetCacheCoordinates,
): HistoricalCacheIdentity {
  return {
    namespace: "historical-intelligence",
    datasetId: "market-state-dataset-v2",
    partition: {
      source: coordinates.source.trim().toLowerCase(),
      symbol: coordinates.symbol.trim().toUpperCase(),
      interval: coordinates.interval,
    },
  }
}

export function historicalAnalogCacheIdentity(
  coordinates: HistoricalAnalogCacheCoordinates,
): HistoricalCacheIdentity {
  return {
    namespace: "historical-intelligence",
    datasetId: "historical-analog-v2",
    partition: {
      symbol: coordinates.symbol.trim().toUpperCase(),
      interval: coordinates.interval,
    },
  }
}
