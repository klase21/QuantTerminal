import { createHash } from "node:crypto"

import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { StorageJsonValue } from "@/lib/persistence/types"
import type { HistoricalDatasetResolutionMetadata } from "@/lib/persistence/repository/types"
import { getHistoricalDatasetResolutionMetadata } from "@/lib/historical-backfill/datasetMetadata"
import {
  canonicalOpenInterestSymbol,
  createBinanceOpenInterestCapability,
} from "@/lib/historical-backfill/openInterestSources"

const OPEN_INTEREST_RESOLUTION = getHistoricalDatasetResolutionMetadata("HISTORICAL_OPEN_INTEREST")

export const HISTORICAL_OPEN_INTEREST_SOURCE_ID = "binance-vision" as const
export const HISTORICAL_OPEN_INTEREST_PROVIDER = "Binance Vision" as const
export const HISTORICAL_OPEN_INTEREST_EXCHANGE = "BINANCE" as const
export const HISTORICAL_OPEN_INTEREST_UNIT = "PROVIDER_NATIVE" as const
export const HISTORICAL_OPEN_INTEREST_SCHEMA_VERSION = 1 as const
export const HISTORICAL_OPEN_INTEREST_FRESHNESS = "UNAVAILABLE" as const

const BASE_URL = "https://data.binance.vision/data/futures/um/daily/metrics"
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_LATEST_DAY_LOOKBACK = 14

export interface HistoricalOpenInterestRecord extends HistoricalDatasetResolutionMetadata {
  readonly providerTier: "CANONICAL"
  readonly canonical: true
  readonly verified: true
  readonly confidence: 1
  readonly recordId: string
  readonly symbol: string
  readonly exchange: typeof HISTORICAL_OPEN_INTEREST_EXCHANGE
  readonly provider: typeof HISTORICAL_OPEN_INTEREST_PROVIDER
  readonly observedAt: string
  readonly openInterest: number
  readonly unit: typeof HISTORICAL_OPEN_INTEREST_UNIT
  readonly sourceId: typeof HISTORICAL_OPEN_INTEREST_SOURCE_ID
  readonly sourceTimestamp: string
  readonly freshness: typeof HISTORICAL_OPEN_INTEREST_FRESHNESS
}

export interface HistoricalOpenInterestValidation {
  readonly valid: boolean
  readonly duplicateCount: number
  readonly missingIntervalCount: number
  readonly errors: readonly string[]
}

export interface HistoricalOpenInterestBackfillOptions {
  readonly repository: PersistenceRepository
  readonly recordedAt: string
  readonly symbol?: string
  readonly day?: string
  readonly fetchImpl?: typeof fetch
}

export interface HistoricalOpenInterestBackfillResult {
  readonly status: "SUCCESS" | "DUPLICATE" | "UNAVAILABLE" | "VALIDATION_ERROR" | "PERSISTENCE_ERROR"
  readonly symbol: string
  readonly day: string | null
  readonly firstTimestamp: string | null
  readonly lastTimestamp: string | null
  readonly totalRecords: number
  readonly persistedCount: number
  readonly duplicateWriteCount: number
  readonly sourceDuplicateCount: number
  readonly missingIntervalCount: number
  readonly errors: readonly string[]
}

export function createHistoricalOpenInterestId(symbol: string, observedAt: string): string {
  return ["historical-open-interest-v1", HISTORICAL_OPEN_INTEREST_SOURCE_ID,
    canonicalOpenInterestSymbol(symbol), encodeURIComponent(observedAt)].join(":")
}

export function createHistoricalOpenInterestChecksum(record: HistoricalOpenInterestRecord): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex")
}

function archiveUrl(symbol: string, day: string): string {
  return `${BASE_URL}/${symbol}/${symbol}-metrics-${day}.zip`
}

function isoDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

async function sourceExists(fetchImpl: typeof fetch, symbol: string, day: string): Promise<boolean> {
  const response = await fetchImpl(archiveUrl(symbol, day), { method: "HEAD", cache: "no-store" })
  if (response.status === 404) return false
  if (!response.ok) throw new Error(`Binance Vision availability check returned HTTP ${response.status}.`)
  return true
}

export async function findLatestOpenInterestDay(
  symbol: string,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<string> {
  const normalized = canonicalOpenInterestSymbol(symbol)
  const latestPossible = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY_MS
  for (let offset = 0; offset < MAX_LATEST_DAY_LOOKBACK; offset += 1) {
    const day = isoDay(latestPossible - offset * DAY_MS)
    if (await sourceExists(fetchImpl, normalized, day)) return day
  }
  throw new Error(`Binance Vision has no complete historical OI archive for ${normalized} in the lookback window.`)
}

function providerTimestamp(raw: string): string {
  const value = raw.trim()
  if (/^\d+$/.test(value)) {
    const numeric = Number(value)
    if (!Number.isSafeInteger(numeric)) throw new Error("Open Interest row has an unsafe provider timestamp.")
    return new Date(value.length > 13 ? Math.trunc(numeric / 1000) : numeric).toISOString()
  }
  const parsed = Date.parse(value.endsWith("Z") ? value : `${value}Z`)
  if (!Number.isFinite(parsed)) throw new Error("Open Interest row has an invalid provider timestamp.")
  return new Date(parsed).toISOString()
}

export function parseBinanceVisionOpenInterestCsv(
  csv: string,
  symbol: string,
): readonly HistoricalOpenInterestRecord[] {
  const normalized = canonicalOpenInterestSymbol(symbol)
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  const header = lines.shift()?.split(",") ?? []
  const timeIndex = header.indexOf("create_time")
  const symbolIndex = header.indexOf("symbol")
  const oiIndex = header.indexOf("sum_open_interest")
  if (timeIndex < 0 || symbolIndex < 0 || oiIndex < 0) {
    throw new Error("Binance Vision metrics schema does not contain source-backed Open Interest fields.")
  }
  return Object.freeze(lines.map((line) => {
    const columns = line.split(",")
    const sourceTimestamp = columns[timeIndex]?.trim() ?? ""
    const observedAt = providerTimestamp(sourceTimestamp)
    const rowSymbol = canonicalOpenInterestSymbol(columns[symbolIndex] ?? "")
    const openInterest = Number(columns[oiIndex])
    if (rowSymbol !== normalized || !Number.isFinite(openInterest) || openInterest < 0) {
      throw new Error(`Open Interest row at ${sourceTimestamp || "<unknown>"} has invalid source values.`)
    }
    return Object.freeze({
      ...OPEN_INTEREST_RESOLUTION,
      providerTier: "CANONICAL" as const,
      canonical: true as const,
      verified: true as const,
      confidence: 1 as const,
      recordId: createHistoricalOpenInterestId(normalized, observedAt),
      symbol: normalized,
      exchange: HISTORICAL_OPEN_INTEREST_EXCHANGE,
      provider: HISTORICAL_OPEN_INTEREST_PROVIDER,
      observedAt,
      openInterest,
      unit: HISTORICAL_OPEN_INTEREST_UNIT,
      sourceId: HISTORICAL_OPEN_INTEREST_SOURCE_ID,
      sourceTimestamp,
      freshness: HISTORICAL_OPEN_INTEREST_FRESHNESS,
    })
  }))
}

export function validateHistoricalOpenInterest(
  records: readonly HistoricalOpenInterestRecord[],
  symbol: string,
): HistoricalOpenInterestValidation {
  const normalized = canonicalOpenInterestSymbol(symbol)
  const errors: string[] = []
  const seen = new Set<string>()
  let duplicateCount = 0
  let missingIntervalCount = 0
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    const time = Date.parse(record.observedAt)
    if (!Number.isFinite(time) || record.symbol !== normalized
      || record.sourceId !== HISTORICAL_OPEN_INTEREST_SOURCE_ID
      || !Number.isFinite(record.openInterest) || record.openInterest < 0) {
      errors.push(`Invalid Open Interest fact at index ${index}.`)
    }
    if (seen.has(record.observedAt)) duplicateCount += 1
    seen.add(record.observedAt)
    const previous = records[index - 1]
    if (previous) {
      const previousTime = Date.parse(previous.observedAt)
      if (time <= previousTime) errors.push(`Open Interest records are not chronological at index ${index}.`)
      const intervals = Math.round((time - previousTime) / (5 * 60 * 1000))
      if (intervals > 1) missingIntervalCount += intervals - 1
    }
  }
  if (duplicateCount > 0) errors.push(`Source contains ${duplicateCount} duplicate Open Interest timestamps.`)
  return Object.freeze({ valid: errors.length === 0, duplicateCount, missingIntervalCount, errors: Object.freeze(errors) })
}

export async function runBinanceVisionOpenInterestBackfill(
  options: HistoricalOpenInterestBackfillOptions,
): Promise<HistoricalOpenInterestBackfillResult> {
  const symbol = canonicalOpenInterestSymbol(options.symbol ?? "BTCUSDT")
  const empty = (status: HistoricalOpenInterestBackfillResult["status"], error: string): HistoricalOpenInterestBackfillResult => Object.freeze({ status, symbol, day: options.day ?? null, firstTimestamp: null, lastTimestamp: null, totalRecords: 0, persistedCount: 0, duplicateWriteCount: 0, sourceDuplicateCount: 0, missingIntervalCount: 0, errors: Object.freeze([error]) })
  if (!Number.isFinite(Date.parse(options.recordedAt))) return empty("VALIDATION_ERROR", "recordedAt must be an explicit valid timestamp.")
  const capability = createBinanceOpenInterestCapability(symbol)
  if (capability.status === "UNAVAILABLE") return empty("UNAVAILABLE", capability.reason ?? "Binance Open Interest capability is unavailable.")

  const fetchImpl = options.fetchImpl ?? fetch
  let day: string
  try {
    day = options.day ?? await findLatestOpenInterestDay(symbol, fetchImpl)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !await sourceExists(fetchImpl, symbol, day)) {
      return empty("UNAVAILABLE", `Binance Vision has no official historical OI archive for ${symbol} on ${day}.`)
    }
  } catch (error) {
    return empty("UNAVAILABLE", error instanceof Error ? error.message : String(error))
  }

  let records: readonly HistoricalOpenInterestRecord[]
  try {
    const response = await fetchImpl(archiveUrl(symbol, day), { cache: "no-store" })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    records = parseBinanceVisionOpenInterestCsv(
      extractFirstCsvFromZip(Buffer.from(await response.arrayBuffer())),
      symbol,
    )
  } catch (error) {
    return empty("UNAVAILABLE", `${day}: ${error instanceof Error ? error.message : String(error)}`)
  }

  const validation = validateHistoricalOpenInterest(records, symbol)
  if (!validation.valid) {
    return Object.freeze({ ...empty("VALIDATION_ERROR", validation.errors.join("; ")), day, totalRecords: records.length, sourceDuplicateCount: validation.duplicateCount, missingIntervalCount: validation.missingIntervalCount })
  }

  let persistedCount = 0
  let duplicateWriteCount = 0
  const errors: string[] = []
  for (const record of records) {
    const result = await options.repository.saveHistoricalOpenInterestRecord({
      recordId: record.recordId,
      sourceId: record.sourceId,
      symbol: record.symbol,
      observedAt: record.observedAt,
      schemaVersion: HISTORICAL_OPEN_INTEREST_SCHEMA_VERSION,
      recordedAt: options.recordedAt,
      payload: record as unknown as StorageJsonValue,
      checksum: createHistoricalOpenInterestChecksum(record),
      providerTier: record.providerTier,
      canonical: record.canonical,
      verified: record.verified,
      confidence: record.confidence,
      ...OPEN_INTEREST_RESOLUTION,
    })
    if (result.status === "SUCCESS") persistedCount += 1
    else if (result.status === "DUPLICATE") duplicateWriteCount += 1
    else errors.push(`${record.recordId}: ${result.status}`)
  }
  const status = errors.length > 0 ? "PERSISTENCE_ERROR"
    : persistedCount === 0 && duplicateWriteCount === records.length ? "DUPLICATE" : "SUCCESS"
  return Object.freeze({ status, symbol, day, firstTimestamp: records[0]?.observedAt ?? null, lastTimestamp: records.at(-1)?.observedAt ?? null, totalRecords: records.length, persistedCount, duplicateWriteCount, sourceDuplicateCount: validation.duplicateCount, missingIntervalCount: validation.missingIntervalCount, errors: Object.freeze(errors) })
}
