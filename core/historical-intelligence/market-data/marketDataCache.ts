import type { HistoricalCacheIdentity } from "@/core/historical-intelligence/cache/cacheTypes"
import type {
  CanonicalExchange,
  CanonicalMarketDataDataset,
  CanonicalMarketDataSource,
  CanonicalMarketInterval,
} from "@/core/historical-intelligence/market-data/canonicalMarketDataTypes"

export const CANONICAL_MARKET_DATA_SCHEMA_VERSIONS: Record<CanonicalMarketDataDataset, string> = {
  ohlcv: "1",
  funding: "1",
  "open-interest": "1",
  liquidations: "1",
  "orderbook-snapshots": "1",
}

export interface CanonicalMarketDataCacheCoordinates {
  dataset: CanonicalMarketDataDataset
  exchange: CanonicalExchange
  symbol: string
  interval?: CanonicalMarketInterval
}

export interface CanonicalMarketDataCacheMetadata extends Record<string, unknown> {
  source: CanonicalMarketDataSource
  recordCount: number
  firstTimestamp: number | null
  lastTimestamp: number | null
  sourceFile?: string
}

export function canonicalMarketDataCacheIdentity(
  coordinates: CanonicalMarketDataCacheCoordinates,
): HistoricalCacheIdentity {
  if (coordinates.dataset === "ohlcv" && !coordinates.interval) {
    throw new Error("Canonical OHLCV cache identity requires an interval.")
  }
  return {
    namespace: "market-data",
    datasetId: coordinates.dataset,
    partition: {
      exchange: coordinates.exchange,
      symbol: coordinates.symbol.trim().toUpperCase(),
      ...(coordinates.interval ? { interval: coordinates.interval } : {}),
    },
  }
}
