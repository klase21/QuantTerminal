import { createHash } from "node:crypto"

import {
  HISTORICAL_BACKFILL_DATASET,
  HISTORICAL_BACKFILL_INTERVAL,
  HISTORICAL_BACKFILL_SCHEMA_VERSION,
  HISTORICAL_BACKFILL_SOURCE,
  HISTORICAL_BACKFILL_SYMBOL,
  type HistoricalCandle,
} from "@/lib/historical-backfill/types"

export function createHistoricalCandleId(openTime: string): string {
  return [
    "historical-market-v1",
    HISTORICAL_BACKFILL_SOURCE,
    HISTORICAL_BACKFILL_DATASET,
    HISTORICAL_BACKFILL_SYMBOL,
    HISTORICAL_BACKFILL_INTERVAL,
    encodeURIComponent(openTime),
  ].join(":")
}

export function createHistoricalCandleChecksum(candle: HistoricalCandle): string {
  return createHash("sha256").update(JSON.stringify({
    providerTier: candle.providerTier,
    canonical: candle.canonical,
    verified: candle.verified,
    confidence: candle.confidence,
    resolution: candle.resolution,
    coverageMode: candle.coverageMode,
    expectedCadenceMinutes: candle.expectedCadenceMinutes,
    expectedCadenceHours: candle.expectedCadenceHours,
    expectedDailyRecords: candle.expectedDailyRecords,
    variableDailyRecords: candle.variableDailyRecords,
    schemaVersion: HISTORICAL_BACKFILL_SCHEMA_VERSION,
    sourceId: candle.sourceId,
    dataset: candle.dataset,
    symbol: candle.symbol,
    interval: candle.interval,
    sourceOpenTime: candle.sourceOpenTime,
    sourceCloseTime: candle.sourceCloseTime,
    openTime: candle.openTime,
    closeTime: candle.closeTime,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    quoteVolume: candle.quoteVolume,
    tradeCount: candle.tradeCount,
    takerBuyVolume: candle.takerBuyVolume,
    takerBuyQuoteVolume: candle.takerBuyQuoteVolume,
  })).digest("hex")
}
