import { createHash } from "node:crypto"

import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { StorageJsonValue } from "@/lib/persistence/types"
import type { HistoricalDatasetResolutionMetadata } from "@/lib/persistence/repository/types"
import { getHistoricalDatasetResolutionMetadata } from "@/lib/historical-backfill/datasetMetadata"

const FUNDING_RESOLUTION = getHistoricalDatasetResolutionMetadata("HISTORICAL_FUNDING")

export const HISTORICAL_FUNDING_SOURCE_ID = "binance-vision" as const
export const HISTORICAL_FUNDING_SOURCE = "Binance Vision" as const
export const HISTORICAL_FUNDING_SYMBOL = "BTCUSDT" as const
export const HISTORICAL_FUNDING_SCHEMA_VERSION = 1 as const
export const HISTORICAL_FUNDING_EARLIEST_MONTH = "2020-01" as const

const BASE_URL = "https://data.binance.vision/data/futures/um/monthly/fundingRate"
const HOUR_MS = 60 * 60 * 1000

export interface HistoricalFundingRecord extends HistoricalDatasetResolutionMetadata {
  readonly providerTier: "CANONICAL"
  readonly canonical: true
  readonly verified: true
  readonly confidence: 1
  readonly recordId: string
  readonly symbol: string
  readonly fundingTime: string
  readonly sourceFundingTime: string
  readonly fundingRate: number
  readonly fundingIntervalHours: number
  readonly source: string
  readonly sourceId: string
  readonly observedAt: string
}

export interface HistoricalFundingValidation {
  readonly valid: boolean
  readonly duplicateCount: number
  readonly missingIntervalCount: number
  readonly errors: readonly string[]
}

export interface HistoricalFundingProgress {
  readonly month: string
  readonly monthIndex: number
  readonly monthCount: number
  readonly totalRecords: number
  readonly persistedCount: number
  readonly duplicateWriteCount: number
  readonly missingIntervalCount: number
}

export interface HistoricalFundingBackfillOptions {
  readonly repository: PersistenceRepository
  readonly recordedAt: string
  readonly symbol?: string
  readonly fetchImpl?: typeof fetch
  readonly onProgress?: (progress: HistoricalFundingProgress) => void
}

export interface HistoricalFundingBackfillResult {
  readonly status: "SUCCESS" | "DUPLICATE" | "UNAVAILABLE" | "VALIDATION_ERROR" | "PERSISTENCE_ERROR"
  readonly firstFundingTimestamp: string | null
  readonly lastFundingTimestamp: string | null
  readonly monthCount: number
  readonly completedMonthCount: number
  readonly totalRecords: number
  readonly persistedCount: number
  readonly duplicateWriteCount: number
  readonly sourceDuplicateCount: number
  readonly missingIntervalCount: number
  readonly errors: readonly string[]
}

export function createHistoricalFundingId(
  fundingTime: string,
  symbol: string = HISTORICAL_FUNDING_SYMBOL,
  sourceId: string = HISTORICAL_FUNDING_SOURCE_ID,
): string {
  return ["historical-funding-v1", sourceId,
    symbol, encodeURIComponent(fundingTime)].join(":")
}

export function createHistoricalFundingChecksum(record: HistoricalFundingRecord): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex")
}

function canonicalSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

function monthUrl(month: string, symbol: string): string {
  return `${BASE_URL}/${symbol}/${symbol}-fundingRate-${month}.zip`
}

async function sourceExists(fetchImpl: typeof fetch, month: string, symbol: string): Promise<boolean> {
  const response = await fetchImpl(monthUrl(month, symbol), { method: "HEAD", cache: "no-store" })
  if (response.status === 404) return false
  if (!response.ok) throw new Error(`Binance Vision availability check returned HTTP ${response.status}.`)
  return true
}

function previousMonth(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString().slice(0, 7)
}

function nextMonth(month: string): string {
  const value = new Date(`${month}-01T00:00:00.000Z`)
  value.setUTCMonth(value.getUTCMonth() + 1)
  return value.toISOString().slice(0, 7)
}

export async function createHistoricalFundingMonthPlan(
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
  symbol: string = HISTORICAL_FUNDING_SYMBOL,
): Promise<readonly string[]> {
  const normalizedSymbol = canonicalSymbol(symbol)
  if (!/^[A-Z0-9]{5,30}$/.test(normalizedSymbol)) {
    throw new Error("Funding backfill requires a canonical Binance Futures symbol.")
  }
  const latestCandidate = previousMonth(now)
  const available: string[] = []
  for (let month: string = HISTORICAL_FUNDING_EARLIEST_MONTH; month <= latestCandidate; month = nextMonth(month)) {
    if (await sourceExists(fetchImpl, month, normalizedSymbol)) available.push(month)
  }
  if (available.length === 0) {
    throw new Error(`Binance Vision has no official funding archive for ${normalizedSymbol}.`)
  }
  const months: string[] = []
  const availableSet = new Set(available)
  for (let month = available[0]; month <= available.at(-1)!; month = nextMonth(month)) {
    if (!availableSet.has(month)) {
      throw new Error(`Binance Vision funding coverage for ${normalizedSymbol} is missing ${month}.`)
    }
    months.push(month)
  }
  return Object.freeze(months)
}

function sourceTimestamp(raw: string): string {
  if (!/^\d+$/.test(raw)) throw new Error("Funding row has an invalid provider timestamp.")
  const numeric = Number(raw)
  if (!Number.isSafeInteger(numeric)) throw new Error("Funding row has an unsafe provider timestamp.")
  const milliseconds = raw.length > 13 ? Math.trunc(numeric / 1000) : numeric
  return new Date(milliseconds).toISOString()
}

export function parseBinanceVisionFundingCsv(
  csv: string,
  symbol: string = HISTORICAL_FUNDING_SYMBOL,
): readonly HistoricalFundingRecord[] {
  const normalizedSymbol = canonicalSymbol(symbol)
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  const header = lines.shift()
  if (header !== "calc_time,funding_interval_hours,last_funding_rate") {
    throw new Error("Binance Vision funding schema is unsupported.")
  }
  return Object.freeze(lines.map((line) => {
    const columns = line.split(",")
    if (columns.length !== 3) throw new Error("Funding row has an invalid column count.")
    const fundingTime = sourceTimestamp(columns[0])
    const fundingIntervalHours = Number(columns[1])
    const fundingRate = Number(columns[2])
    if (!Number.isFinite(fundingRate)
      || !Number.isInteger(fundingIntervalHours) || fundingIntervalHours <= 0) {
      throw new Error(`Funding row at ${fundingTime} has invalid source values.`)
    }
    return Object.freeze({
      ...FUNDING_RESOLUTION,
      providerTier: "CANONICAL" as const,
      canonical: true as const,
      verified: true as const,
      confidence: 1 as const,
      recordId: createHistoricalFundingId(fundingTime, normalizedSymbol),
      symbol: normalizedSymbol,
      fundingTime,
      sourceFundingTime: columns[0],
      fundingRate,
      fundingIntervalHours,
      source: HISTORICAL_FUNDING_SOURCE,
      sourceId: HISTORICAL_FUNDING_SOURCE_ID,
      observedAt: fundingTime,
    })
  }))
}

export function validateHistoricalFunding(
  records: readonly HistoricalFundingRecord[],
  expectedSymbol: string = HISTORICAL_FUNDING_SYMBOL,
): HistoricalFundingValidation {
  const normalizedSymbol = canonicalSymbol(expectedSymbol)
  const errors: string[] = []
  const seen = new Set<string>()
  let duplicateCount = 0
  let missingIntervalCount = 0
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    const time = Date.parse(record.fundingTime)
    if (!Number.isFinite(time) || record.observedAt !== record.fundingTime
      || record.sourceId !== HISTORICAL_FUNDING_SOURCE_ID
      || record.symbol !== normalizedSymbol
      || !Number.isFinite(record.fundingRate)) {
      errors.push(`Invalid funding fact at index ${index}.`)
    }
    if (seen.has(record.fundingTime)) duplicateCount += 1
    seen.add(record.fundingTime)
    const previous = records[index - 1]
    if (previous) {
      const previousTime = Date.parse(previous.fundingTime)
      if (time <= previousTime) errors.push(`Funding records are not chronological at index ${index}.`)
      const expectedInterval = previous.fundingIntervalHours * HOUR_MS
      const observedIntervals = Math.round((time - previousTime) / expectedInterval)
      if (observedIntervals > 1) missingIntervalCount += observedIntervals - 1
    }
  }
  if (duplicateCount > 0) errors.push(`Source contains ${duplicateCount} duplicate funding timestamps.`)
  return Object.freeze({ valid: errors.length === 0, duplicateCount, missingIntervalCount, errors: Object.freeze(errors) })
}

async function persistFunding(
  repository: PersistenceRepository,
  records: readonly HistoricalFundingRecord[],
  recordedAt: string,
): Promise<{ persisted: number; duplicates: number; errors: readonly string[] }> {
  let persisted = 0
  let duplicates = 0
  const errors: string[] = []
  for (const record of records) {
    const result = await repository.saveHistoricalFundingRecord({
      recordId: record.recordId,
      sourceId: record.sourceId,
      symbol: record.symbol,
      fundingTime: record.fundingTime,
      schemaVersion: HISTORICAL_FUNDING_SCHEMA_VERSION,
      recordedAt,
      payload: record as unknown as StorageJsonValue,
      checksum: createHistoricalFundingChecksum(record),
      providerTier: record.providerTier,
      canonical: record.canonical,
      verified: record.verified,
      confidence: record.confidence,
      ...FUNDING_RESOLUTION,
    })
    if (result.status === "SUCCESS") persisted += 1
    else if (result.status === "DUPLICATE") duplicates += 1
    else errors.push(`${record.recordId}: ${result.status}`)
  }
  return Object.freeze({ persisted, duplicates, errors: Object.freeze(errors) })
}

export async function runBinanceVisionHistoricalFundingBackfill(
  options: HistoricalFundingBackfillOptions,
): Promise<HistoricalFundingBackfillResult> {
  const empty = (status: HistoricalFundingBackfillResult["status"], error: string): HistoricalFundingBackfillResult => Object.freeze({ status, firstFundingTimestamp: null, lastFundingTimestamp: null, monthCount: 0, completedMonthCount: 0, totalRecords: 0, persistedCount: 0, duplicateWriteCount: 0, sourceDuplicateCount: 0, missingIntervalCount: 0, errors: Object.freeze([error]) })
  if (!Number.isFinite(Date.parse(options.recordedAt))) return empty("VALIDATION_ERROR", "recordedAt must be an explicit valid timestamp.")
  const fetchImpl = options.fetchImpl ?? fetch
  const symbol = canonicalSymbol(options.symbol ?? HISTORICAL_FUNDING_SYMBOL)
  let months: readonly string[]
  try {
    months = await createHistoricalFundingMonthPlan(fetchImpl, new Date(), symbol)
  } catch (error) {
    return empty("UNAVAILABLE", error instanceof Error ? error.message : String(error))
  }

  let firstFundingTimestamp: string | null = null
  let lastFundingTimestamp: string | null = null
  let totalRecords = 0
  let persistedCount = 0
  let duplicateWriteCount = 0
  let sourceDuplicateCount = 0
  let missingIntervalCount = 0
  let completedMonthCount = 0
  const errors: string[] = []

  for (let index = 0; index < months.length; index += 1) {
    const month = months[index]
    let records: readonly HistoricalFundingRecord[]
    try {
      const response = await fetchImpl(monthUrl(month, symbol), { cache: "no-store" })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      records = parseBinanceVisionFundingCsv(extractFirstCsvFromZip(Buffer.from(await response.arrayBuffer())), symbol)
    } catch (error) {
      errors.push(`${month}: ${error instanceof Error ? error.message : String(error)}`)
      break
    }
    const validation = validateHistoricalFunding(records, symbol)
    sourceDuplicateCount += validation.duplicateCount
    missingIntervalCount += validation.missingIntervalCount
    if (!validation.valid) {
      errors.push(...validation.errors.map((message) => `${month}: ${message}`))
      break
    }
    const persisted = await persistFunding(options.repository, records, options.recordedAt)
    if (persisted.errors.length > 0) {
      errors.push(...persisted.errors.map((message) => `${month}: ${message}`))
      break
    }
    firstFundingTimestamp ??= records[0]?.fundingTime ?? null
    lastFundingTimestamp = records.at(-1)?.fundingTime ?? lastFundingTimestamp
    totalRecords += records.length
    persistedCount += persisted.persisted
    duplicateWriteCount += persisted.duplicates
    completedMonthCount += 1
    options.onProgress?.(Object.freeze({ month, monthIndex: index + 1, monthCount: months.length, totalRecords, persistedCount, duplicateWriteCount, missingIntervalCount }))
  }
  const status = errors.length > 0
    ? "PERSISTENCE_ERROR"
    : totalRecords > 0 && persistedCount === 0 && duplicateWriteCount === totalRecords
      ? "DUPLICATE"
      : "SUCCESS"
  return Object.freeze({ status, firstFundingTimestamp, lastFundingTimestamp, monthCount: months.length, completedMonthCount, totalRecords, persistedCount, duplicateWriteCount, sourceDuplicateCount, missingIntervalCount, errors: Object.freeze(errors) })
}
