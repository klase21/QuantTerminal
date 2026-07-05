import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { StorageJsonValue } from "@/lib/persistence/types"
import {
  HISTORICAL_BACKFILL_DATASET,
  HISTORICAL_BACKFILL_INTERVAL,
  HISTORICAL_BACKFILL_SCHEMA_VERSION,
  HISTORICAL_BACKFILL_SOURCE,
  HISTORICAL_BACKFILL_SYMBOL,
  type HistoricalCandle,
} from "@/lib/historical-backfill/types"
import { createHistoricalCandleChecksum } from "@/lib/historical-backfill/identity"
import { getHistoricalDatasetResolutionMetadata } from "@/lib/historical-backfill/datasetMetadata"

const MARKET_RESOLUTION = getHistoricalDatasetResolutionMetadata("HISTORICAL_MARKET")

export async function persistHistoricalCandles(
  repository: PersistenceRepository,
  candles: readonly HistoricalCandle[],
  recordedAt: string,
): Promise<{ readonly persistedCount: number; readonly duplicateCount: number; readonly errors: readonly string[] }> {
  let persistedCount = 0
  let duplicateCount = 0
  const errors: string[] = []
  for (const candle of candles) {
    const result = await repository.saveHistoricalMarketRecord({
      recordId: candle.recordId,
      sourceId: HISTORICAL_BACKFILL_SOURCE,
      dataset: HISTORICAL_BACKFILL_DATASET,
      symbol: HISTORICAL_BACKFILL_SYMBOL,
      interval: HISTORICAL_BACKFILL_INTERVAL,
      observedAt: candle.openTime,
      schemaVersion: HISTORICAL_BACKFILL_SCHEMA_VERSION,
      recordedAt,
      payload: candle as unknown as StorageJsonValue,
      checksum: createHistoricalCandleChecksum(candle),
      providerTier: candle.providerTier,
      canonical: candle.canonical,
      verified: candle.verified,
      confidence: candle.confidence,
      ...MARKET_RESOLUTION,
    })
    if (result.status === "SUCCESS") persistedCount += 1
    else if (result.status === "DUPLICATE") duplicateCount += 1
    else errors.push(`${candle.recordId}: ${result.status}`)
  }
  return Object.freeze({ persistedCount, duplicateCount, errors: Object.freeze(errors) })
}
