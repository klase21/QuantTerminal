import type { HistoricalCacheIdentity } from "@/core/historical-intelligence/cache/cacheTypes"

export const REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION = "1"
export const REPLAY_ORDERBOOK_CACHE_NAMESPACE = "replay"
export const REPLAY_ORDERBOOK_CACHE_DATASET_ID = "orderbook-snapshot"
export const REPLAY_ORDERBOOK_LEVEL_LIMIT = 20

export type ReplayOrderbookLevel = [price: number, quantity: number]

export interface ReplayOrderbookCachePayload {
  exchange: string
  symbol: string
  window: {
    date: string
    hour: number
    start: string
    end: string
  }
  timestamp: string
  bestBid: number
  bestAsk: number
  spread: number
  imbalance: number
  bidLiquidity: number
  askLiquidity: number
  bids: ReplayOrderbookLevel[]
  asks: ReplayOrderbookLevel[]
}

export interface ReplayOrderbookCacheMetadata extends Record<string, unknown> {
  sourceFile: string
  totalRows: number
  rowsProcessed: number
  snapshotRows: number
  updateRows: number
  bidLevelCount: number
  askLevelCount: number
}

export interface ReplayOrderbookCacheCoordinates {
  exchange: string
  symbol: string
  date: string
  hour: number
}

export function replayOrderbookCacheIdentity(
  coordinates: ReplayOrderbookCacheCoordinates,
): HistoricalCacheIdentity {
  return {
    namespace: REPLAY_ORDERBOOK_CACHE_NAMESPACE,
    datasetId: REPLAY_ORDERBOOK_CACHE_DATASET_ID,
    partition: {
      exchange: coordinates.exchange.trim().toLowerCase(),
      symbol: coordinates.symbol.trim().toUpperCase(),
      date: coordinates.date,
      hour: String(coordinates.hour).padStart(2, "0"),
    },
  }
}

export function replayOrderbookWindow(date: string, hour: number) {
  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`)
  return {
    date,
    hour,
    start: start.toISOString(),
    end: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
  }
}
