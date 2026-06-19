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
  CanonicalMarketDataSource,
  CanonicalOhlcvCandle,
  CanonicalOpenInterestPoint,
  CanonicalOrderbookSnapshot,
} from "@/core/historical-intelligence/market-data/canonicalMarketDataTypes"
import { writeHistoricalCache } from "@/lib/historical-intelligence/cache/fileCacheStore"

function sourceKind(source: CanonicalMarketDataSource) {
  if (source === "cryptohftdata") return "enrichment" as const
  if (source === "binance-funding-api" || source === "binance-open-interest-api") return "secondary" as const
  return "primary" as const
}

function assertSingleIdentity(
  records: Array<{ exchange: string; symbol: string; source: CanonicalMarketDataSource }>,
  coordinates: CanonicalMarketDataCacheCoordinates,
  source: CanonicalMarketDataSource,
) {
  const symbol = coordinates.symbol.trim().toUpperCase()
  if (!records.length) throw new Error(`Cannot publish an empty canonical ${coordinates.dataset} cache.`)
  if (records.some((record) => (
    record.exchange !== coordinates.exchange
    || record.symbol !== symbol
    || record.source !== source
  ))) {
    throw new Error(`Canonical ${coordinates.dataset} records must match the cache exchange, symbol, and source.`)
  }
}

async function publish<TRecord extends { exchange: string; symbol: string; source: CanonicalMarketDataSource }>(input: {
  coordinates: CanonicalMarketDataCacheCoordinates
  records: TRecord[]
  source: CanonicalMarketDataSource
  firstTimestamp: number
  lastTimestamp: number
  sourceFile?: string
}) {
  assertSingleIdentity(input.records, input.coordinates, input.source)
  const payload: CanonicalMarketDataPayload<TRecord> = {
    dataset: input.coordinates.dataset,
    exchange: input.coordinates.exchange,
    symbol: input.coordinates.symbol.trim().toUpperCase(),
    interval: input.coordinates.interval,
    records: input.records,
  }
  const metadata: CanonicalMarketDataCacheMetadata = {
    source: input.source,
    recordCount: input.records.length,
    firstTimestamp: input.firstTimestamp,
    lastTimestamp: input.lastTimestamp,
    sourceFile: input.sourceFile,
  }
  return writeHistoricalCache({
    identity: canonicalMarketDataCacheIdentity(input.coordinates),
    source: {
      id: input.source,
      kind: sourceKind(input.source),
      metadata: input.sourceFile ? { file: input.sourceFile } : undefined,
    },
    schemaVersion: CANONICAL_MARKET_DATA_SCHEMA_VERSIONS[input.coordinates.dataset],
    data: payload,
    metadata,
    expiresAt: null,
    recordCount: input.records.length,
  })
}

export function publishCanonicalOhlcv(input: {
  records: CanonicalOhlcvCandle[]
  sourceFile?: string
}) {
  const records = [...input.records].sort((left, right) => left.openTime - right.openTime)
  const first = records[0]
  const last = records.at(-1)
  if (!first || !last) throw new Error("Cannot publish an empty canonical OHLCV cache.")
  if (records.some((record) => record.interval !== first.interval)) {
    throw new Error("Canonical OHLCV records must use one interval.")
  }
  return publish({
    coordinates: {
      dataset: "ohlcv",
      exchange: first.exchange,
      symbol: first.symbol,
      interval: first.interval,
    },
    records,
    source: first.source,
    firstTimestamp: first.openTime,
    lastTimestamp: last.openTime,
    sourceFile: input.sourceFile,
  })
}

export function publishCanonicalFunding(records: CanonicalFundingPoint[]) {
  const sorted = [...records].sort((left, right) => left.fundingTime - right.fundingTime)
  const first = sorted[0]
  const last = sorted.at(-1)
  if (!first || !last) throw new Error("Cannot publish an empty canonical funding cache.")
  return publish({
    coordinates: { dataset: "funding", exchange: first.exchange, symbol: first.symbol },
    records: sorted,
    source: first.source,
    firstTimestamp: first.fundingTime,
    lastTimestamp: last.fundingTime,
  })
}

export function publishCanonicalOpenInterest(records: CanonicalOpenInterestPoint[]) {
  const sorted = [...records].sort((left, right) => left.timestamp - right.timestamp)
  const first = sorted[0]
  const last = sorted.at(-1)
  if (!first || !last) throw new Error("Cannot publish an empty canonical open-interest cache.")
  return publish({
    coordinates: { dataset: "open-interest", exchange: first.exchange, symbol: first.symbol },
    records: sorted,
    source: first.source,
    firstTimestamp: first.timestamp,
    lastTimestamp: last.timestamp,
  })
}

export function publishCanonicalLiquidations(records: CanonicalLiquidationEvent[]) {
  const sorted = [...records].sort((left, right) => left.timestamp - right.timestamp)
  const first = sorted[0]
  const last = sorted.at(-1)
  if (!first || !last) throw new Error("Cannot publish an empty canonical liquidation cache.")
  return publish({
    coordinates: { dataset: "liquidations", exchange: first.exchange, symbol: first.symbol },
    records: sorted,
    source: first.source,
    firstTimestamp: first.timestamp,
    lastTimestamp: last.timestamp,
  })
}

export function publishCanonicalOrderbookSnapshots(records: CanonicalOrderbookSnapshot[]) {
  const sorted = [...records].sort((left, right) => left.timestamp - right.timestamp)
  const first = sorted[0]
  const last = sorted.at(-1)
  if (!first || !last) throw new Error("Cannot publish an empty canonical orderbook snapshot cache.")
  return publish({
    coordinates: { dataset: "orderbook-snapshots", exchange: first.exchange, symbol: first.symbol },
    records: sorted,
    source: first.source,
    firstTimestamp: first.timestamp,
    lastTimestamp: last.timestamp,
  })
}
