import { createHash } from "node:crypto"

import { getHistoricalDatasetResolutionMetadata } from "@/lib/historical-backfill/datasetMetadata"
import { createHistoricalFundingId } from "@/lib/historical-backfill/funding"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { HistoricalDatasetResolutionMetadata } from "@/lib/persistence/repository/types"
import type { StorageJsonValue } from "@/lib/persistence/types"

const FUNDING_RESOLUTION = getHistoricalDatasetResolutionMetadata("HISTORICAL_FUNDING")
const FUNDING_INTERVAL_HOURS = 8
const FUNDING_INTERVAL_MS = FUNDING_INTERVAL_HOURS * 60 * 60 * 1000
const FUNDING_SLOT_TOLERANCE_MS = 1000
const MAX_ROWS = 1000
const BASE_URL = "https://fapi.binance.com/fapi/v1/fundingRate"

export const REST_FUNDING_SOURCE_ID = "binance-official-rest-funding-rate" as const
export const REST_FUNDING_PROVIDER = "Binance Official REST Funding Rate" as const
export const REST_FUNDING_SOURCE_ORIGIN = "OFFICIAL_REST_RECENT_GAP" as const

interface BinanceFundingRateRow {
  readonly symbol?: unknown
  readonly fundingTime?: unknown
  readonly fundingRate?: unknown
}

export interface RestHistoricalFundingRecord extends HistoricalDatasetResolutionMetadata {
  readonly providerTier: "CANONICAL"
  readonly canonical: true
  readonly verified: true
  readonly confidence: 1
  readonly recordId: string
  readonly symbol: string
  readonly fundingTime: string
  readonly sourceFundingTime: string
  readonly fundingRate: number
  readonly fundingIntervalHours: 8
  readonly source: typeof REST_FUNDING_PROVIDER
  readonly provider: typeof REST_FUNDING_PROVIDER
  readonly sourceId: typeof REST_FUNDING_SOURCE_ID
  readonly sourceOrigin: typeof REST_FUNDING_SOURCE_ORIGIN
  readonly observedAt: string
}

export interface RestFundingRecentGapOptions {
  readonly repository: PersistenceRepository
  readonly recordedAt: string
  readonly symbol: string
  readonly startTime: string
  readonly endTime: string
  readonly fetchImpl?: typeof fetch
}

export interface RestFundingRecentGapResult {
  readonly status: "SUCCESS" | "DUPLICATE" | "UNAVAILABLE" | "VALIDATION_ERROR" | "PERSISTENCE_ERROR"
  readonly queryStartTime: string
  readonly queryEndTime: string
  readonly expectedFundingSlots: readonly string[]
  readonly recordsReturned: number
  readonly persistedCount: number
  readonly duplicateWriteCount: number
  readonly firstFundingTimestamp: string | null
  readonly lastFundingTimestamp: string | null
  readonly affectedUtcDays: readonly string[]
  readonly errors: readonly string[]
}

function canonicalSymbol(value: string): string {
  return value.trim().toUpperCase()
}

function alignedFundingStart(value: number): number {
  return Math.ceil(value / FUNDING_INTERVAL_MS) * FUNDING_INTERVAL_MS
}

function expectedSlots(start: number, end: number): readonly string[] {
  const slots: string[] = []
  for (let cursor = alignedFundingStart(start); cursor <= end; cursor += FUNDING_INTERVAL_MS) {
    slots.push(new Date(cursor).toISOString())
  }
  return Object.freeze(slots)
}

function affectedDays(records: readonly RestHistoricalFundingRecord[]): readonly string[] {
  return Object.freeze([...new Set(records.map((record) => record.fundingTime.slice(0, 10)))].sort())
}

function checksum(record: RestHistoricalFundingRecord): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex")
}

function parseRows(
  value: unknown,
  symbol: string,
  start: number,
  end: number,
): readonly RestHistoricalFundingRecord[] {
  if (!Array.isArray(value)) throw new Error("Binance funding response is not an array.")
  const seen = new Set<number>()
  const records: RestHistoricalFundingRecord[] = []
  for (const raw of value as BinanceFundingRateRow[]) {
    const rowSymbol = typeof raw.symbol === "string" ? canonicalSymbol(raw.symbol) : ""
    const fundingTime = typeof raw.fundingTime === "number" ? raw.fundingTime : Number.NaN
    const fundingRate = typeof raw.fundingRate === "string" ? Number(raw.fundingRate) : Number.NaN
    if (rowSymbol !== symbol || !Number.isSafeInteger(fundingTime) || !Number.isFinite(fundingRate)) {
      throw new Error("Binance funding response contains a malformed source row.")
    }
    if (fundingTime < start || fundingTime > end) continue
    if (seen.has(fundingTime)) throw new Error(`Binance funding response duplicates ${fundingTime}.`)
    seen.add(fundingTime)
    const timestamp = new Date(fundingTime).toISOString()
    records.push(Object.freeze({
      ...FUNDING_RESOLUTION,
      providerTier: "CANONICAL",
      canonical: true,
      verified: true,
      confidence: 1,
      recordId: createHistoricalFundingId(timestamp, symbol, REST_FUNDING_SOURCE_ID),
      symbol,
      fundingTime: timestamp,
      sourceFundingTime: String(fundingTime),
      fundingRate,
      fundingIntervalHours: FUNDING_INTERVAL_HOURS,
      source: REST_FUNDING_PROVIDER,
      provider: REST_FUNDING_PROVIDER,
      sourceId: REST_FUNDING_SOURCE_ID,
      sourceOrigin: REST_FUNDING_SOURCE_ORIGIN,
      observedAt: timestamp,
    }))
  }
  records.sort((left, right) => left.fundingTime.localeCompare(right.fundingTime))
  return Object.freeze(records)
}

function validateFinalizedSlots(
  records: readonly RestHistoricalFundingRecord[],
  slots: readonly string[],
): string | null {
  if (records.length !== slots.length) {
    return `Expected ${slots.length} finalized funding slots but provider returned ${records.length}.`
  }
  for (let index = 0; index < slots.length; index += 1) {
    const offset = Date.parse(records[index].fundingTime) - Date.parse(slots[index])
    if (offset < 0 || offset > FUNDING_SLOT_TOLERANCE_MS) {
      return `Provider funding timestamp ${records[index].fundingTime} does not match finalized slot ${slots[index]}.`
    }
  }
  return null
}

export async function runBinanceRestFundingRecentGap(
  options: RestFundingRecentGapOptions,
): Promise<RestFundingRecentGapResult> {
  const symbol = canonicalSymbol(options.symbol)
  const start = Date.parse(options.startTime)
  const end = Date.parse(options.endTime)
  const queryStartTime = Number.isFinite(start) ? new Date(start).toISOString() : options.startTime
  const queryEndTime = Number.isFinite(end) ? new Date(end).toISOString() : options.endTime
  const empty = (
    status: RestFundingRecentGapResult["status"],
    error: string,
  ): RestFundingRecentGapResult => Object.freeze({
    status,
    queryStartTime,
    queryEndTime,
    expectedFundingSlots: Object.freeze([]),
    recordsReturned: 0,
    persistedCount: 0,
    duplicateWriteCount: 0,
    firstFundingTimestamp: null,
    lastFundingTimestamp: null,
    affectedUtcDays: Object.freeze([]),
    errors: Object.freeze([error]),
  })

  if (!/^[A-Z0-9]{5,24}$/.test(symbol)) return empty("VALIDATION_ERROR", "Funding sync requires a canonical Binance Futures symbol.")
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return empty("VALIDATION_ERROR", "Funding sync requires a valid bounded time window.")
  if (!Number.isFinite(Date.parse(options.recordedAt))) return empty("VALIDATION_ERROR", "recordedAt must be an explicit valid timestamp.")
  if (end >= Date.now()) return empty("VALIDATION_ERROR", "Funding sync endTime must be before current UTC time.")
  const slots = expectedSlots(start, end)
  if (slots.length > MAX_ROWS) return empty("VALIDATION_ERROR", `Funding sync exceeds the ${MAX_ROWS}-event request bound.`)

  const url = new URL(BASE_URL)
  url.searchParams.set("symbol", symbol)
  url.searchParams.set("startTime", String(start))
  url.searchParams.set("endTime", String(end))
  url.searchParams.set("limit", String(MAX_ROWS))

  let records: readonly RestHistoricalFundingRecord[]
  try {
    const response = await (options.fetchImpl ?? fetch)(url, { cache: "no-store" })
    if (!response.ok) return empty("UNAVAILABLE", `Binance official funding REST returned HTTP ${response.status}.`)
    records = parseRows(await response.json(), symbol, start, end)
  } catch (error) {
    return empty("UNAVAILABLE", error instanceof Error ? error.message : String(error))
  }
  if (!records.length) return empty("UNAVAILABLE", "Binance official funding REST returned no finalized events in the bounded window.")
  const slotError = validateFinalizedSlots(records, slots)
  if (slotError) return empty("VALIDATION_ERROR", slotError)

  let persistedCount = 0
  let duplicateWriteCount = 0
  const errors: string[] = []
  for (const record of records) {
    const saved = await options.repository.saveHistoricalFundingRecord({
      recordId: record.recordId,
      sourceId: record.sourceId,
      symbol: record.symbol,
      fundingTime: record.fundingTime,
      schemaVersion: 1,
      recordedAt: options.recordedAt,
      payload: record as unknown as StorageJsonValue,
      checksum: checksum(record),
      providerTier: record.providerTier,
      canonical: record.canonical,
      verified: record.verified,
      confidence: record.confidence,
      ...FUNDING_RESOLUTION,
    })
    if (saved.status === "SUCCESS") persistedCount += 1
    else if (saved.status === "DUPLICATE") duplicateWriteCount += 1
    else errors.push(`${record.recordId}: ${saved.status}`)
  }
  const status = errors.length
    ? "PERSISTENCE_ERROR"
    : persistedCount === 0 && duplicateWriteCount === records.length
      ? "DUPLICATE"
      : "SUCCESS"
  return Object.freeze({
    status,
    queryStartTime,
    queryEndTime,
    expectedFundingSlots: slots,
    recordsReturned: records.length,
    persistedCount,
    duplicateWriteCount,
    firstFundingTimestamp: records[0]?.fundingTime ?? null,
    lastFundingTimestamp: records.at(-1)?.fundingTime ?? null,
    affectedUtcDays: affectedDays(records),
    errors: Object.freeze(errors),
  })
}
