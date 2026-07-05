import { createHash } from "node:crypto"

import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import {
  AGG_TRADE_CONFIDENCE,
  AGG_TRADE_EXCHANGE,
  AGG_TRADE_PROVIDER,
  AGG_TRADE_PROVIDER_TIER,
  AGG_TRADE_SOURCE_ID,
  canonicalAggTradeSymbol,
  createBinanceVisionAggTradeCapability,
} from "@/lib/historical-backfill/aggTradeSources"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { StorageJsonValue } from "@/lib/persistence/types"
import type { HistoricalDatasetResolutionMetadata } from "@/lib/persistence/repository/types"
import { getHistoricalDatasetResolutionMetadata } from "@/lib/historical-backfill/datasetMetadata"

const AGG_TRADE_RESOLUTION = getHistoricalDatasetResolutionMetadata("HISTORICAL_AGG_TRADE")

export const HISTORICAL_AGG_TRADE_SCHEMA_VERSION = 1 as const
export const HISTORICAL_AGG_TRADE_FRESHNESS = "UNAVAILABLE" as const
export const HISTORICAL_AGG_TRADE_INITIAL_DAY = "2026-07-01" as const

const BASE_URL = "https://data.binance.vision/data/futures/um/daily/aggTrades"
const EXPECTED_HEADER = "agg_trade_id,price,quantity,first_trade_id,last_trade_id,transact_time,is_buyer_maker"

export interface HistoricalAggTradeRecord extends HistoricalDatasetResolutionMetadata {
  readonly recordId: string
  readonly symbol: string
  readonly exchange: typeof AGG_TRADE_EXCHANGE
  readonly provider: typeof AGG_TRADE_PROVIDER
  readonly providerTier: typeof AGG_TRADE_PROVIDER_TIER
  readonly canonical: true
  readonly verified: true
  readonly confidence: typeof AGG_TRADE_CONFIDENCE
  readonly observedAt: string
  readonly aggregateTradeId: number
  readonly price: number
  readonly quantity: number
  readonly firstTradeId: number
  readonly lastTradeId: number
  readonly tradeTime: string
  readonly isBuyerMaker: boolean
  readonly sourceId: typeof AGG_TRADE_SOURCE_ID
  readonly sourceTimestamp: string
  readonly freshness: typeof HISTORICAL_AGG_TRADE_FRESHNESS
}

export interface HistoricalAggTradeValidation {
  readonly valid: boolean
  readonly totalRecords: number
  readonly duplicateCount: number
  readonly errors: readonly string[]
}

export interface HistoricalAggTradeBackfillOptions {
  readonly repository: PersistenceRepository
  readonly recordedAt: string
  readonly symbol?: string
  readonly day?: string
  readonly fetchImpl?: typeof fetch
  readonly onProgress?: (progress: { readonly processed: number; readonly persisted: number; readonly duplicates: number }) => void
}

export interface HistoricalAggTradeBackfillResult {
  readonly status: "SUCCESS" | "DUPLICATE" | "UNAVAILABLE" | "VALIDATION_ERROR" | "PERSISTENCE_ERROR"
  readonly symbol: string
  readonly day: string
  readonly firstTimestamp: string | null
  readonly lastTimestamp: string | null
  readonly totalRecords: number
  readonly persistedCount: number
  readonly duplicateWriteCount: number
  readonly sourceDuplicateCount: number
  readonly errors: readonly string[]
}

function archiveUrl(symbol: string, day: string): string {
  return `${BASE_URL}/${symbol}/${symbol}-aggTrades-${day}.zip`
}

function *csvDataLines(csv: string): Generator<string> {
  let start = 0
  let lineNumber = 0
  while (start < csv.length) {
    let end = csv.indexOf("\n", start)
    if (end < 0) end = csv.length
    const line = csv.slice(start, end).replace(/\r$/, "")
    start = end + 1
    if (!line) continue
    if (lineNumber === 0) {
      if (line !== EXPECTED_HEADER) throw new Error("Binance Vision AggTrade schema is unsupported.")
      lineNumber += 1
      continue
    }
    lineNumber += 1
    yield line
  }
}

function safeInteger(value: string, field: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`AggTrade has invalid ${field}.`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw new Error(`AggTrade has unsafe ${field}.`)
  return parsed
}

function positiveNumber(value: string, field: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`AggTrade has invalid ${field}.`)
  return parsed
}

function providerTimestamp(raw: string): string {
  const numeric = safeInteger(raw, "provider timestamp")
  const milliseconds = raw.length > 13 ? Math.trunc(numeric / 1000) : numeric
  return new Date(milliseconds).toISOString()
}

export function createHistoricalAggTradeId(symbol: string, aggregateTradeId: number): string {
  return ["historical-agg-trade-v1", AGG_TRADE_SOURCE_ID,
    canonicalAggTradeSymbol(symbol), String(aggregateTradeId)].join(":")
}

export function createHistoricalAggTradeChecksum(record: HistoricalAggTradeRecord): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex")
}

export function parseBinanceVisionAggTradeLine(line: string, symbol: string): HistoricalAggTradeRecord {
  const columns = line.split(",")
  if (columns.length !== 7) throw new Error("AggTrade row has an invalid column count.")
  const aggregateTradeId = safeInteger(columns[0], "aggregate trade ID")
  const firstTradeId = safeInteger(columns[3], "first trade ID")
  const lastTradeId = safeInteger(columns[4], "last trade ID")
  const sourceTimestamp = columns[5]
  const tradeTime = providerTimestamp(sourceTimestamp)
  if (firstTradeId > lastTradeId || (columns[6] !== "true" && columns[6] !== "false")) {
    throw new Error(`AggTrade ${aggregateTradeId} has invalid provider values.`)
  }
  const normalized = canonicalAggTradeSymbol(symbol)
  return Object.freeze({
    ...AGG_TRADE_RESOLUTION,
    recordId: createHistoricalAggTradeId(normalized, aggregateTradeId),
    symbol: normalized,
    exchange: AGG_TRADE_EXCHANGE,
    provider: AGG_TRADE_PROVIDER,
    providerTier: AGG_TRADE_PROVIDER_TIER,
    canonical: true,
    verified: true,
    confidence: AGG_TRADE_CONFIDENCE,
    observedAt: tradeTime,
    aggregateTradeId,
    price: positiveNumber(columns[1], "price"),
    quantity: positiveNumber(columns[2], "quantity"),
    firstTradeId,
    lastTradeId,
    tradeTime,
    isBuyerMaker: columns[6] === "true",
    sourceId: AGG_TRADE_SOURCE_ID,
    sourceTimestamp,
    freshness: HISTORICAL_AGG_TRADE_FRESHNESS,
  })
}

export function *iterateBinanceVisionAggTrades(csv: string, symbol: string): Generator<HistoricalAggTradeRecord> {
  for (const line of csvDataLines(csv)) yield parseBinanceVisionAggTradeLine(line, symbol)
}

export function validateHistoricalAggTrades(csv: string, symbol: string): HistoricalAggTradeValidation {
  const errors: string[] = []
  let totalRecords = 0
  let duplicateCount = 0
  let previousId: number | null = null
  let previousTime: number | null = null
  try {
    for (const record of iterateBinanceVisionAggTrades(csv, symbol)) {
      const time = Date.parse(record.observedAt)
      if (previousId !== null && record.aggregateTradeId <= previousId) {
        if (record.aggregateTradeId === previousId) duplicateCount += 1
        errors.push(`AggTrade IDs are not strictly increasing at record ${totalRecords}.`)
      }
      if (previousTime !== null && time < previousTime) errors.push(`AggTrade timestamps are not chronological at record ${totalRecords}.`)
      previousId = record.aggregateTradeId
      previousTime = time
      totalRecords += 1
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
  if (totalRecords === 0) errors.push("Binance Vision AggTrade archive contains no records.")
  return Object.freeze({ valid: errors.length === 0, totalRecords, duplicateCount, errors: Object.freeze(errors) })
}

export async function runBinanceVisionAggTradeBackfill(
  options: HistoricalAggTradeBackfillOptions,
): Promise<HistoricalAggTradeBackfillResult> {
  const symbol = canonicalAggTradeSymbol(options.symbol ?? "BTCUSDT")
  const day = options.day ?? HISTORICAL_AGG_TRADE_INITIAL_DAY
  const empty = (status: HistoricalAggTradeBackfillResult["status"], error: string): HistoricalAggTradeBackfillResult => Object.freeze({ status, symbol, day, firstTimestamp: null, lastTimestamp: null, totalRecords: 0, persistedCount: 0, duplicateWriteCount: 0, sourceDuplicateCount: 0, errors: Object.freeze([error]) })
  if (!Number.isFinite(Date.parse(options.recordedAt))) return empty("VALIDATION_ERROR", "recordedAt must be an explicit valid timestamp.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return empty("VALIDATION_ERROR", "day must be an explicit UTC calendar day.")
  const capability = createBinanceVisionAggTradeCapability(symbol)
  if (capability.status === "UNAVAILABLE") return empty("UNAVAILABLE", capability.reason ?? "AggTrade capability is unavailable.")

  let csv: string
  try {
    const response = await (options.fetchImpl ?? fetch)(archiveUrl(symbol, day), { cache: "no-store" })
    if (response.status === 404) return empty("UNAVAILABLE", `Binance Vision has no official AggTrade archive for ${symbol} on ${day}.`)
    if (!response.ok) return empty("UNAVAILABLE", `Binance Vision AggTrade archive returned HTTP ${response.status}.`)
    csv = extractFirstCsvFromZip(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    return empty("UNAVAILABLE", error instanceof Error ? error.message : String(error))
  }

  const validation = validateHistoricalAggTrades(csv, symbol)
  if (!validation.valid) return Object.freeze({ ...empty("VALIDATION_ERROR", validation.errors.join("; ")), totalRecords: validation.totalRecords, sourceDuplicateCount: validation.duplicateCount })

  let persistedCount = 0
  let duplicateWriteCount = 0
  let processed = 0
  let firstTimestamp: string | null = null
  let lastTimestamp: string | null = null
  const errors: string[] = []
  for (const record of iterateBinanceVisionAggTrades(csv, symbol)) {
    const result = await options.repository.saveHistoricalAggTradeRecord({
      recordId: record.recordId,
      sourceId: record.sourceId,
      symbol: record.symbol,
      aggregateTradeId: record.aggregateTradeId,
      observedAt: record.observedAt,
      providerTier: record.providerTier,
      canonical: record.canonical,
      verified: record.verified,
      confidence: record.confidence,
      ...AGG_TRADE_RESOLUTION,
      schemaVersion: HISTORICAL_AGG_TRADE_SCHEMA_VERSION,
      recordedAt: options.recordedAt,
      payload: record as unknown as StorageJsonValue,
      checksum: createHistoricalAggTradeChecksum(record),
    })
    if (result.status === "SUCCESS") persistedCount += 1
    else if (result.status === "DUPLICATE") duplicateWriteCount += 1
    else {
      errors.push(`${record.recordId}: ${result.status}`)
      break
    }
    firstTimestamp ??= record.observedAt
    lastTimestamp = record.observedAt
    processed += 1
    if (processed % 10000 === 0) options.onProgress?.(Object.freeze({ processed, persisted: persistedCount, duplicates: duplicateWriteCount }))
  }
  const status = errors.length > 0 ? "PERSISTENCE_ERROR"
    : persistedCount === 0 && duplicateWriteCount === validation.totalRecords ? "DUPLICATE" : "SUCCESS"
  return Object.freeze({ status, symbol, day, firstTimestamp, lastTimestamp, totalRecords: validation.totalRecords, persistedCount, duplicateWriteCount, sourceDuplicateCount: validation.duplicateCount, errors: Object.freeze(errors) })
}
