import { createHash } from "node:crypto"

import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { StorageJsonValue } from "@/lib/persistence/types"
import {
  canonicalLiquidationSymbol,
  createBinanceLiquidationCapability,
  createCoinalyzeInternalLiquidationCapability,
  type CoinalyzeInternalLiquidationMapping,
  VERIFIED_COINALYZE_INTERNAL_LIQUIDATION_SYMBOLS,
} from "@/lib/historical-backfill/liquidationSources"
import type { HistoricalProviderTier } from "@/lib/persistence/repository/types"
import type { HistoricalDatasetResolutionMetadata } from "@/lib/persistence/repository/types"
import { getHistoricalDatasetResolutionMetadata } from "@/lib/historical-backfill/datasetMetadata"

const LIQUIDATION_RESOLUTION = getHistoricalDatasetResolutionMetadata("HISTORICAL_LIQUIDATION")
const CANONICAL_LIQUIDATION_RESOLUTION = Object.freeze({
  ...LIQUIDATION_RESOLUTION,
  coverageMode: "time_series" as const,
})

export const HISTORICAL_LIQUIDATION_SOURCE_ID = "binance-vision" as const
export const HISTORICAL_LIQUIDATION_PROVIDER = "Binance Vision" as const
export const HISTORICAL_LIQUIDATION_EXCHANGE = "BINANCE" as const
export const HISTORICAL_LIQUIDATION_FRESHNESS = "UNAVAILABLE" as const
export const HISTORICAL_LIQUIDATION_SCHEMA_VERSION = 1 as const

const BASE_URL = "https://data.binance.vision/data/futures/um/daily/liquidationSnapshot"

export type HistoricalLiquidationSide = "BUY" | "SELL" | "LONG" | "SHORT"
export type HistoricalLiquidationSourceId = "binance-vision" | "coinalyze-internal-web"
export type HistoricalLiquidationReasonCode =
  | "BINANCE_UNAVAILABLE"
  | "COINALYZE_MAPPING_MISSING"
  | "COINALYZE_DISABLED"
  | "COINALYZE_EMPTY"
  | "COINALYZE_REQUEST_KEY_MISSING"

export interface HistoricalLiquidationRecord extends HistoricalDatasetResolutionMetadata {
  readonly providerTier: HistoricalProviderTier
  readonly canonical: boolean
  readonly verified: boolean
  readonly confidence: number
  readonly recordId: string
  readonly symbol: string
  readonly exchange: typeof HISTORICAL_LIQUIDATION_EXCHANGE
  readonly provider: "Binance Vision" | "Coinalyze Internal Web"
  readonly observedAt: string
  readonly side: HistoricalLiquidationSide
  readonly price: number | null
  readonly quantity: number | null
  readonly notional: number | null
  readonly sourceId: HistoricalLiquidationSourceId
  readonly sourceTimestamp: string
  readonly freshness: typeof HISTORICAL_LIQUIDATION_FRESHNESS
}

export interface HistoricalLiquidationValidation {
  readonly valid: boolean
  readonly duplicateCount: number
  readonly errors: readonly string[]
}

export interface HistoricalLiquidationBackfillOptions {
  readonly repository: PersistenceRepository
  readonly recordedAt: string
  readonly symbol?: string
  readonly day: string
  readonly fetchImpl?: typeof fetch
  readonly coinalyzeInternalEnabled?: boolean
  readonly coinalyzeRequestKey?: string
  readonly coinalyzeSymbols?: ReadonlyMap<string, CoinalyzeInternalLiquidationMapping>
}

export interface HistoricalLiquidationBackfillResult {
  readonly status: "SUCCESS" | "DUPLICATE" | "UNAVAILABLE" | "VALIDATION_ERROR" | "PERSISTENCE_ERROR"
  readonly symbol: string
  readonly day: string
  readonly firstTimestamp: string | null
  readonly lastTimestamp: string | null
  readonly totalRecords: number
  readonly persistedCount: number
  readonly duplicateWriteCount: number
  readonly sourceDuplicateCount: number
  readonly provider: HistoricalLiquidationSourceId | null
  readonly providerSymbol: string | null
  readonly reasonCodes: readonly HistoricalLiquidationReasonCode[]
  readonly coinalyzeQueried: boolean
  readonly errors: readonly string[]
}

function archiveUrl(symbol: string, day: string): string {
  return `${BASE_URL}/${symbol}/${symbol}-liquidationSnapshot-${day}.zip`
}

function sourceTimestamp(raw: string): string {
  if (!/^\d+$/.test(raw)) throw new Error("Liquidation row has an invalid provider timestamp.")
  const numeric = Number(raw)
  if (!Number.isSafeInteger(numeric)) throw new Error("Liquidation row has an unsafe provider timestamp.")
  return new Date(raw.length > 13 ? Math.trunc(numeric / 1000) : numeric).toISOString()
}

export function createHistoricalLiquidationId(
  symbol: string,
  observedAt: string,
  side: HistoricalLiquidationSide,
  price: number,
  quantity: number,
  sourceId: HistoricalLiquidationSourceId = HISTORICAL_LIQUIDATION_SOURCE_ID,
): string {
  const eventHash = createHash("sha256")
    .update(JSON.stringify([side, price, quantity]))
    .digest("hex")
    .slice(0, 24)
  return ["historical-liquidation-v1", sourceId,
    canonicalLiquidationSymbol(symbol), encodeURIComponent(observedAt), eventHash].join(":")
}

export function createHistoricalLiquidationChecksum(record: HistoricalLiquidationRecord): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex")
}

export function parseBinanceVisionLiquidationCsv(
  csv: string,
  symbol: string,
): readonly HistoricalLiquidationRecord[] {
  const normalized = canonicalLiquidationSymbol(symbol)
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  const header = lines.shift()?.split(",") ?? []
  const timeIndex = header.indexOf("time")
  const sideIndex = header.indexOf("side")
  const priceIndex = header.indexOf("average_price")
  const quantityIndex = header.indexOf("accumulated_fill_quantity")
  if (timeIndex < 0 || sideIndex < 0 || priceIndex < 0 || quantityIndex < 0) {
    throw new Error("Binance Vision liquidation schema is unsupported.")
  }
  return Object.freeze(lines.map((line) => {
    const columns = line.split(",")
    const timestamp = columns[timeIndex]?.trim() ?? ""
    const observedAt = sourceTimestamp(timestamp)
    const side = columns[sideIndex]?.trim().toUpperCase()
    const price = Number(columns[priceIndex])
    const quantity = Number(columns[quantityIndex])
    if ((side !== "BUY" && side !== "SELL") || !Number.isFinite(price) || price <= 0
      || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Liquidation row at ${timestamp || "<unknown>"} has invalid source values.`)
    }
    const typedSide: HistoricalLiquidationSide = side
    return Object.freeze({
      ...CANONICAL_LIQUIDATION_RESOLUTION,
      providerTier: "CANONICAL" as const,
      canonical: true,
      verified: true,
      confidence: 1,
      recordId: createHistoricalLiquidationId(normalized, observedAt, typedSide, price, quantity),
      symbol: normalized,
      exchange: HISTORICAL_LIQUIDATION_EXCHANGE,
      provider: HISTORICAL_LIQUIDATION_PROVIDER,
      observedAt,
      side: typedSide,
      price,
      quantity,
      notional: price * quantity,
      sourceId: HISTORICAL_LIQUIDATION_SOURCE_ID,
      sourceTimestamp: timestamp,
      freshness: HISTORICAL_LIQUIDATION_FRESHNESS,
    })
  }))
}

export function validateHistoricalLiquidations(
  records: readonly HistoricalLiquidationRecord[],
  symbol: string,
): HistoricalLiquidationValidation {
  const normalized = canonicalLiquidationSymbol(symbol)
  const errors: string[] = []
  const seen = new Set<string>()
  let duplicateCount = 0
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    const time = Date.parse(record.observedAt)
    if (!Number.isFinite(time) || record.symbol !== normalized
      || record.sourceId !== HISTORICAL_LIQUIDATION_SOURCE_ID
      || (record.side !== "BUY" && record.side !== "SELL")
      || !Number.isFinite(record.price) || record.price! <= 0
      || !Number.isFinite(record.quantity) || record.quantity! <= 0
      || record.notional !== record.price! * record.quantity!) {
      errors.push(`Invalid liquidation fact at index ${index}.`)
    }
    if (seen.has(record.recordId)) duplicateCount += 1
    seen.add(record.recordId)
    const previous = records[index - 1]
    if (previous && time < Date.parse(previous.observedAt)) {
      errors.push(`Liquidation records are not chronological at index ${index}.`)
    }
  }
  return Object.freeze({ valid: errors.length === 0, duplicateCount, errors: Object.freeze(errors) })
}

interface CoinalyzeInternalResponse {
  readonly barData: Readonly<Record<string, readonly (readonly [string, number])[]>>
}

function isCoinalyzeInternalResponse(value: unknown): value is CoinalyzeInternalResponse {
  if (!value || typeof value !== "object") return false
  const barData = (value as Partial<CoinalyzeInternalResponse>).barData
  if (!barData || typeof barData !== "object" || Array.isArray(barData)) return false
  return Object.entries(barData).every(([timestamp, rows]) => /^\d+$/.test(timestamp)
    && Array.isArray(rows)
    && rows.every((row) => Array.isArray(row) && row.length >= 2
      && typeof row[0] === "string" && Number.isFinite(row[1]) && row[1] >= 0))
}

export function parseCoinalyzeInternalLiquidationHistory(
  payload: unknown,
  symbol: string,
  mapping: CoinalyzeInternalLiquidationMapping,
): readonly HistoricalLiquidationRecord[] {
  if (!isCoinalyzeInternalResponse(payload)) throw new Error("Coinalyze Internal Web liquidation response is malformed.")
  const normalized = canonicalLiquidationSymbol(symbol)
  const records: HistoricalLiquidationRecord[] = []
  for (const [timestamp, rows] of Object.entries(payload.barData).sort(([left], [right]) => Number(left) - Number(right))) {
    const epochSeconds = Number(timestamp)
    if (!Number.isSafeInteger(epochSeconds)) throw new Error("Coinalyze Internal Web returned an invalid provider timestamp.")
    const observedAt = new Date(epochSeconds * 1000).toISOString()
    for (const row of rows) {
      const side = row[0] === mapping.longLiquidationSymbol ? "LONG"
        : row[0] === mapping.shortLiquidationSymbol ? "SHORT" : null
      if (!side || row[1] === 0) continue
      const quantity = row[1]
      records.push(Object.freeze({
        ...LIQUIDATION_RESOLUTION,
        providerTier: "EXPERIMENTAL",
        canonical: false,
        verified: false,
        confidence: 0.65,
        recordId: createHistoricalLiquidationAggregateId(normalized, observedAt, side, quantity, "coinalyze-internal-web"),
        symbol: normalized,
        exchange: HISTORICAL_LIQUIDATION_EXCHANGE,
        provider: "Coinalyze Internal Web",
        observedAt,
        side,
        price: null,
        quantity,
        notional: null,
        sourceId: "coinalyze-internal-web",
        sourceTimestamp: timestamp,
        freshness: HISTORICAL_LIQUIDATION_FRESHNESS,
      }))
    }
  }
  return Object.freeze(records)
}

export function createHistoricalLiquidationAggregateId(
  symbol: string,
  observedAt: string,
  side: "LONG" | "SHORT",
  notional: number,
  sourceId: HistoricalLiquidationSourceId,
): string {
  const eventHash = createHash("sha256").update(JSON.stringify([side, notional])).digest("hex").slice(0, 24)
  return ["historical-liquidation-v1", sourceId, canonicalLiquidationSymbol(symbol), encodeURIComponent(observedAt), eventHash].join(":")
}

function validateCoinalyzeLiquidations(
  records: readonly HistoricalLiquidationRecord[],
  symbol: string,
): HistoricalLiquidationValidation {
  const normalized = canonicalLiquidationSymbol(symbol)
  const errors: string[] = []
  const seen = new Set<string>()
  let duplicateCount = 0
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (record.symbol !== normalized || record.sourceId !== "coinalyze-internal-web"
      || (record.side !== "LONG" && record.side !== "SHORT")
      || record.providerTier !== "EXPERIMENTAL" || record.canonical || record.verified
      || record.confidence > 0.65 || record.confidence < 0
      || record.price !== null || !Number.isFinite(record.quantity) || record.quantity! <= 0
      || record.notional !== null
      || !Number.isFinite(Date.parse(record.observedAt))) errors.push(`Invalid Coinalyze liquidation aggregate at index ${index}.`)
    if (seen.has(record.recordId)) duplicateCount += 1
    seen.add(record.recordId)
    const previous = records[index - 1]
    if (previous && Date.parse(record.observedAt) < Date.parse(previous.observedAt)) errors.push(`Coinalyze liquidation records are not chronological at index ${index}.`)
  }
  return Object.freeze({ valid: errors.length === 0, duplicateCount, errors: Object.freeze(errors) })
}

async function fetchCoinalyzeInternalLiquidations(
  fetchImpl: typeof fetch,
  requestKey: string,
  symbol: string,
  mapping: CoinalyzeInternalLiquidationMapping,
  day: string,
): Promise<readonly HistoricalLiquidationRecord[]> {
  const from = Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 1000)
  const to = from + 24 * 60 * 60 - 1
  const body = new URLSearchParams({
    from: String(from),
    to: String(to),
    resolution: "5",
    symbol: `${mapping.marketSymbol},${mapping.shortLiquidationSymbol},${mapping.longLiquidationSymbol}#liquidations`,
    firstDataRequest: "true",
    symbolsForUsdConversion: "[]",
    rk: requestKey,
  })
  const response = await fetchImpl("https://coinalyze.net/chart/getTheBars/", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body,
  })
  if (!response.ok) throw new Error(`Coinalyze Internal Web liquidation datafeed returned HTTP ${response.status}.`)
  return parseCoinalyzeInternalLiquidationHistory(await response.json(), symbol, mapping)
}

async function persistLiquidations(
  repository: PersistenceRepository,
  records: readonly HistoricalLiquidationRecord[],
  recordedAt: string,
): Promise<{ persistedCount: number; duplicateWriteCount: number; errors: readonly string[] }> {
  let persistedCount = 0
  let duplicateWriteCount = 0
  const errors: string[] = []
  for (const record of records) {
    const result = await repository.saveHistoricalLiquidationRecord({
      recordId: record.recordId,
      sourceId: record.sourceId,
      symbol: record.symbol,
      observedAt: record.observedAt,
      schemaVersion: HISTORICAL_LIQUIDATION_SCHEMA_VERSION,
      recordedAt,
      payload: record as unknown as StorageJsonValue,
      checksum: createHistoricalLiquidationChecksum(record),
      providerTier: record.providerTier,
      canonical: record.canonical,
      verified: record.verified,
      confidence: record.confidence,
      resolution: record.resolution,
      coverageMode: record.coverageMode,
      expectedCadenceMinutes: record.expectedCadenceMinutes,
      expectedCadenceHours: record.expectedCadenceHours,
      expectedDailyRecords: record.expectedDailyRecords,
      variableDailyRecords: record.variableDailyRecords,
    })
    if (result.status === "SUCCESS") persistedCount += 1
    else if (result.status === "DUPLICATE") duplicateWriteCount += 1
    else errors.push(`${record.recordId}: ${result.status}`)
  }
  return Object.freeze({ persistedCount, duplicateWriteCount, errors: Object.freeze(errors) })
}

export async function runBinanceVisionLiquidationBackfill(
  options: HistoricalLiquidationBackfillOptions,
): Promise<HistoricalLiquidationBackfillResult> {
  const symbol = canonicalLiquidationSymbol(options.symbol ?? "BTCUSDT")
  const empty = (
    status: HistoricalLiquidationBackfillResult["status"],
    error: string,
    reasonCodes: readonly HistoricalLiquidationReasonCode[] = [],
    providerSymbol: string | null = null,
    coinalyzeQueried = false,
  ): HistoricalLiquidationBackfillResult => Object.freeze({ status, symbol, day: options.day, firstTimestamp: null, lastTimestamp: null, totalRecords: 0, persistedCount: 0, duplicateWriteCount: 0, sourceDuplicateCount: 0, provider: null, providerSymbol, reasonCodes: Object.freeze([...reasonCodes]), coinalyzeQueried, errors: Object.freeze([error]) })
  if (!Number.isFinite(Date.parse(options.recordedAt))) return empty("VALIDATION_ERROR", "recordedAt must be an explicit valid timestamp.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.day)) return empty("VALIDATION_ERROR", "day must be an explicit UTC calendar day.")
  const capability = createBinanceLiquidationCapability(symbol)
  if (capability.status === "UNAVAILABLE") return empty("UNAVAILABLE", capability.reason ?? "Binance liquidation capability is unavailable.")

  const fetchImpl = options.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(archiveUrl(symbol, options.day), { cache: "no-store" })
  } catch (error) {
    return empty("UNAVAILABLE", error instanceof Error ? error.message : String(error), ["BINANCE_UNAVAILABLE"])
  }
  if (response.ok) {
    let sourceRecords: readonly HistoricalLiquidationRecord[]
    try {
      sourceRecords = parseBinanceVisionLiquidationCsv(extractFirstCsvFromZip(Buffer.from(await response.arrayBuffer())), symbol)
    } catch (error) {
      return empty("VALIDATION_ERROR", error instanceof Error ? error.message : String(error))
    }
    const validation = validateHistoricalLiquidations(sourceRecords, symbol)
    if (!validation.valid) return Object.freeze({ ...empty("VALIDATION_ERROR", validation.errors.join("; ")), totalRecords: sourceRecords.length, sourceDuplicateCount: validation.duplicateCount })
    const records = [...new Map(sourceRecords.map((record) => [record.recordId, record])).values()]
    const persisted = await persistLiquidations(options.repository, records, options.recordedAt)
    const status = persisted.errors.length > 0 ? "PERSISTENCE_ERROR"
      : persisted.persistedCount === 0 && persisted.duplicateWriteCount === records.length ? "DUPLICATE" : "SUCCESS"
    return Object.freeze({ status, symbol, day: options.day, firstTimestamp: records[0]?.observedAt ?? null, lastTimestamp: records.at(-1)?.observedAt ?? null, totalRecords: records.length, persistedCount: persisted.persistedCount, duplicateWriteCount: persisted.duplicateWriteCount, sourceDuplicateCount: validation.duplicateCount, provider: "binance-vision", providerSymbol: symbol, reasonCodes: Object.freeze([]), coinalyzeQueried: false, errors: persisted.errors })
  }
  if (response.status !== 404) return empty("UNAVAILABLE", `Binance Vision liquidation archive returned HTTP ${response.status}.`, ["BINANCE_UNAVAILABLE"])

  const reasons: HistoricalLiquidationReasonCode[] = ["BINANCE_UNAVAILABLE"]
  const coinalyzeSymbols = options.coinalyzeSymbols ?? VERIFIED_COINALYZE_INTERNAL_LIQUIDATION_SYMBOLS
  const coinalyzeCapability = createCoinalyzeInternalLiquidationCapability(symbol, coinalyzeSymbols)
  const coinalyzeMapping = coinalyzeSymbols.get(symbol)
  if (coinalyzeCapability.status === "UNAVAILABLE" || !coinalyzeCapability.providerSymbol || !coinalyzeMapping) {
    reasons.push("COINALYZE_MAPPING_MISSING")
    return empty("UNAVAILABLE", coinalyzeCapability.reason ?? "Coinalyze liquidation mapping is missing.", reasons)
  }
  if (!options.coinalyzeInternalEnabled) {
    reasons.push("COINALYZE_DISABLED")
    return empty("UNAVAILABLE", "Coinalyze Internal Web supplemental liquidation provider is not explicitly enabled.", reasons, coinalyzeCapability.providerSymbol)
  }
  if (!options.coinalyzeRequestKey?.trim()) {
    reasons.push("COINALYZE_REQUEST_KEY_MISSING")
    return empty("UNAVAILABLE", "Coinalyze Internal Web requires an ephemeral visible-page request key; none was supplied.", reasons, coinalyzeCapability.providerSymbol)
  }

  let records: readonly HistoricalLiquidationRecord[]
  try {
    records = await fetchCoinalyzeInternalLiquidations(fetchImpl, options.coinalyzeRequestKey, symbol, coinalyzeMapping, options.day)
  } catch (error) {
    return empty("UNAVAILABLE", error instanceof Error ? error.message : String(error), reasons, coinalyzeCapability.providerSymbol, true)
  }
  if (records.length === 0) {
    reasons.push("COINALYZE_EMPTY")
    return empty("UNAVAILABLE", "Coinalyze Internal Web returned no liquidation aggregates for the requested symbol and day.", reasons, coinalyzeCapability.providerSymbol, true)
  }
  const validation = validateCoinalyzeLiquidations(records, symbol)
  if (!validation.valid) return Object.freeze({ ...empty("VALIDATION_ERROR", validation.errors.join("; "), reasons, coinalyzeCapability.providerSymbol, true), totalRecords: records.length, sourceDuplicateCount: validation.duplicateCount })
  const uniqueRecords = [...new Map(records.map((record) => [record.recordId, record])).values()]
  const persisted = await persistLiquidations(options.repository, uniqueRecords, options.recordedAt)
  const status = persisted.errors.length > 0 ? "PERSISTENCE_ERROR"
    : persisted.persistedCount === 0 && persisted.duplicateWriteCount === uniqueRecords.length ? "DUPLICATE" : "SUCCESS"
  return Object.freeze({ status, symbol, day: options.day, firstTimestamp: uniqueRecords[0]?.observedAt ?? null, lastTimestamp: uniqueRecords.at(-1)?.observedAt ?? null, totalRecords: uniqueRecords.length, persistedCount: persisted.persistedCount, duplicateWriteCount: persisted.duplicateWriteCount, sourceDuplicateCount: validation.duplicateCount, provider: "coinalyze-internal-web", providerSymbol: coinalyzeCapability.providerSymbol, reasonCodes: Object.freeze(reasons), coinalyzeQueried: true, errors: persisted.errors })
}
