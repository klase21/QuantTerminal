import {
  CANONICAL_MARKET_DATA_SCHEMA_VERSIONS,
  canonicalMarketDataCacheIdentity,
  type CanonicalMarketDataCacheCoordinates,
  type CanonicalMarketDataCacheMetadata,
} from "@/core/historical-intelligence/market-data/marketDataCache"
import type {
  CanonicalFundingPoint,
  CanonicalLiquidationEvent,
  CanonicalMarketDataPayload,
  CanonicalOhlcvCandle,
  CanonicalOpenInterestPoint,
  CanonicalOrderbookSnapshot,
} from "@/core/historical-intelligence/market-data/canonicalMarketDataTypes"
import { consumeHistoricalCache } from "@/lib/historical-intelligence/cache/cacheFirst"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function validPayload<TRecord>(
  value: unknown,
  coordinates: CanonicalMarketDataCacheCoordinates,
  validRecord: (record: unknown) => record is TRecord,
): value is CanonicalMarketDataPayload<TRecord> {
  if (!isRecord(value) || !Array.isArray(value.records)) return false
  return (
    value.dataset === coordinates.dataset
    && value.exchange === coordinates.exchange
    && value.symbol === coordinates.symbol.trim().toUpperCase()
    && (coordinates.interval === undefined || value.interval === coordinates.interval)
    && value.records.every(validRecord)
  )
}

function finiteFields(record: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => Number.isFinite(record[field]))
}

function validOhlcvRecord(value: unknown): value is CanonicalOhlcvCandle {
  return isRecord(value)
    && typeof value.exchange === "string"
    && typeof value.symbol === "string"
    && typeof value.interval === "string"
    && typeof value.source === "string"
    && typeof value.downloadedAt === "string"
    && finiteFields(value, ["openTime", "closeTime", "open", "high", "low", "close", "volume"])
    && Number(value.high) >= Number(value.low)
}

function validFundingRecord(value: unknown): value is CanonicalFundingPoint {
  return isRecord(value)
    && typeof value.exchange === "string"
    && typeof value.symbol === "string"
    && typeof value.source === "string"
    && finiteFields(value, ["fundingTime", "fundingRate"])
    && (value.markPrice === null || Number.isFinite(value.markPrice))
}

function validOpenInterestRecord(value: unknown): value is CanonicalOpenInterestPoint {
  return isRecord(value)
    && typeof value.exchange === "string"
    && typeof value.symbol === "string"
    && typeof value.source === "string"
    && finiteFields(value, ["timestamp", "openInterest"])
    && (value.openInterestValue === null || Number.isFinite(value.openInterestValue))
}

function validLiquidationRecord(value: unknown): value is CanonicalLiquidationEvent {
  return isRecord(value)
    && typeof value.exchange === "string"
    && typeof value.symbol === "string"
    && typeof value.source === "string"
    && (value.side === "long" || value.side === "short" || value.side === "unknown")
    && finiteFields(value, ["timestamp", "price", "quantity", "notional"])
}

function validLevels(value: unknown) {
  return Array.isArray(value)
    && value.every((level) => Array.isArray(level) && Number.isFinite(level[0]) && Number.isFinite(level[1]))
}

function validOrderbookRecord(value: unknown): value is CanonicalOrderbookSnapshot {
  return isRecord(value)
    && typeof value.exchange === "string"
    && typeof value.symbol === "string"
    && typeof value.source === "string"
    && finiteFields(value, [
      "timestamp",
      "bestBid",
      "bestAsk",
      "spread",
      "imbalance",
      "bidLiquidity",
      "askLiquidity",
    ])
    && validLevels(value.bids)
    && validLevels(value.asks)
}

async function readCanonicalDataset<TRecord>(
  coordinates: CanonicalMarketDataCacheCoordinates,
  validRecord: (record: unknown) => record is TRecord,
) {
  const result = await consumeHistoricalCache<
    CanonicalMarketDataPayload<TRecord>,
    CanonicalMarketDataCacheMetadata
  >({
    identity: canonicalMarketDataCacheIdentity(coordinates),
    expectedSchemaVersion: CANONICAL_MARKET_DATA_SCHEMA_VERSIONS[coordinates.dataset],
  })
  if (result.ok && !validPayload(result.data, coordinates, validRecord)) {
    return {
      ok: false as const,
      state: "corrupted" as const,
      reason: `Canonical ${coordinates.dataset} cache payload is invalid.`,
      manifest: result.manifest,
    }
  }
  return result
}

export function readCanonicalOhlcvCache(
  coordinates: Omit<CanonicalMarketDataCacheCoordinates, "dataset"> & { interval: NonNullable<CanonicalMarketDataCacheCoordinates["interval"]> },
) {
  return readCanonicalDataset<CanonicalOhlcvCandle>({ ...coordinates, dataset: "ohlcv" }, validOhlcvRecord)
}

export function readCanonicalFundingCache(
  coordinates: Omit<CanonicalMarketDataCacheCoordinates, "dataset" | "interval">,
) {
  return readCanonicalDataset<CanonicalFundingPoint>({ ...coordinates, dataset: "funding" }, validFundingRecord)
}

export function readCanonicalOpenInterestCache(
  coordinates: Omit<CanonicalMarketDataCacheCoordinates, "dataset" | "interval">,
) {
  return readCanonicalDataset<CanonicalOpenInterestPoint>({ ...coordinates, dataset: "open-interest" }, validOpenInterestRecord)
}

export function readCanonicalLiquidationCache(
  coordinates: Omit<CanonicalMarketDataCacheCoordinates, "dataset" | "interval">,
) {
  return readCanonicalDataset<CanonicalLiquidationEvent>({ ...coordinates, dataset: "liquidations" }, validLiquidationRecord)
}

export function readCanonicalOrderbookSnapshotCache(
  coordinates: Omit<CanonicalMarketDataCacheCoordinates, "dataset" | "interval">,
) {
  return readCanonicalDataset<CanonicalOrderbookSnapshot>({ ...coordinates, dataset: "orderbook-snapshots" }, validOrderbookRecord)
}
