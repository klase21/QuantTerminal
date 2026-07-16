import { createHash } from "node:crypto"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import { iterateBinanceVisionAggTradesZip, type AggTradeSourceRow } from "@/lib/data-platform/population/backfill/aggTradesSource"
import { AGG_TRADES_SEGMENT_NORMALIZER_VERSION, AGG_TRADES_SEGMENT_ORDER_POLICY, AGG_TRADES_SEGMENT_SCHEMA_ID, AGG_TRADES_SEGMENT_SCHEMA_VERSION, buildAggTradesSegment, type AggTradesSegmentBuildResult } from "@/lib/data-platform/population/backfill/aggTradesSegments"
import { parseBinanceVisionOpenInterestSource, type OpenInterestSourceRow } from "@/lib/data-platform/population/backfill/openInterestSource"
import { createBinanceVisionAggTradesPartition, createBinanceVisionOhlcvPartition, createBinanceVisionOpenInterestPartition } from "@/lib/data-platform/population/backfill/sourceAdapters"
import type { ObjectStoragePort } from "@/lib/data-platform/population/contracts"
import { MVP_REFRESH_INSTRUMENTS } from "./contracts"

export const BOUNDED_ARCHIVE_PROVIDER = "binance-vision" as const
export const BOUNDED_ARCHIVE_MAX_INTERVAL_MS = 86_400_000
export type BoundedArchiveDataset = "ohlcv" | "open-interest" | "agg-trade"
export type SourceFinalizationState = "TIME_NOT_ELIGIBLE" | "TIME_ELIGIBLE" | "SOURCE_NOT_FINALIZED" | "SOURCE_AVAILABLE" | "READY_FOR_ACQUISITION"
export type AcquisitionReadiness = "NOT_READY_FOR_ACQUISITION" | "READY_FOR_ACQUISITION"

export interface BoundedArchiveRequest {
  readonly dataset: BoundedArchiveDataset
  readonly provider: typeof BOUNDED_ARCHIVE_PROVIDER
  readonly instrument: typeof MVP_REFRESH_INSTRUMENTS[number]
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly sourceContractVersion: string
  readonly maximumRecordCount: number
  readonly sourceIdentity: string
  readonly requestIdentity: string
}

export interface BoundedSourceAvailability {
  readonly dataset: BoundedArchiveDataset
  readonly instrument: typeof MVP_REFRESH_INSTRUMENTS[number]
  readonly sourceClassification: "HTTP_SUCCESS" | "HTTP_NOT_FOUND" | "SOURCE_ERROR" | "CONTENT_INVALID"
  readonly available: boolean
  readonly finalized: boolean
  readonly observedThrough: string | null
  readonly checksumState: "VERIFIED" | "NOT_VERIFIED" | "MISMATCH"
  readonly limitationReason: string | null
}

export interface BoundedOhlcvRow {
  readonly openTime: string
  readonly closeTime: string
  readonly open: string
  readonly high: string
  readonly low: string
  readonly close: string
  readonly volume: string
  readonly sourceOrdinal: number
}

export interface BoundedArchiveBatch<Row> {
  readonly request: BoundedArchiveRequest
  readonly sourceChecksum: string
  readonly rows: readonly Row[]
  readonly observedThrough: string
  readonly batchIdentity: string
}

function exactIso(value: string, code: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error(code)
  return parsed
}

function positiveMaximum(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("BOUNDED_MAXIMUM_RECORD_COUNT_INVALID")
  return value
}

function dayFromWindow(start: string, end: string): string {
  const startMs = exactIso(start, "BOUNDED_START_INVALID")
  const endMs = exactIso(end, "BOUNDED_END_INVALID")
  if (endMs <= startMs || endMs - startMs > BOUNDED_ARCHIVE_MAX_INTERVAL_MS) throw new Error("BOUNDED_INTERVAL_INVALID")
  if (startMs % BOUNDED_ARCHIVE_MAX_INTERVAL_MS !== 0 || endMs - startMs !== BOUNDED_ARCHIVE_MAX_INTERVAL_MS) throw new Error("BOUNDED_DAILY_INTERVAL_REQUIRED")
  return start.slice(0, 10)
}

export function createBoundedArchiveRequest(input: Omit<BoundedArchiveRequest, "sourceIdentity" | "requestIdentity">, now = new Date().toISOString()): BoundedArchiveRequest {
  if (input.provider !== BOUNDED_ARCHIVE_PROVIDER) throw new Error("BOUNDED_PROVIDER_SOURCE_MISMATCH")
  if (!MVP_REFRESH_INSTRUMENTS.includes(input.instrument)) throw new Error("BOUNDED_INSTRUMENT_INVALID")
  const day = dayFromWindow(input.eventTimeStart, input.eventTimeEnd)
  if (Date.parse(input.eventTimeEnd) > exactIso(now, "BOUNDED_NOW_INVALID")) throw new Error("BOUNDED_OPEN_OR_FUTURE_INTERVAL")
  const maximumRecordCount = positiveMaximum(input.maximumRecordCount)
  if (!input.sourceContractVersion.trim()) throw new Error("BOUNDED_SOURCE_CONTRACT_REQUIRED")
  const sourceIdentity = `binance-vision:${input.dataset}:${input.instrument}:${day}`
  const basis = { ...input, maximumRecordCount, sourceIdentity }
  return Object.freeze({ ...basis, requestIdentity: `mbar_${canonicalChecksum(basis)}` })
}

export function boundedArchiveSourceUrl(request: BoundedArchiveRequest): string {
  const day = request.eventTimeStart.slice(0, 10)
  if (request.dataset === "ohlcv") return createBinanceVisionOhlcvPartition({ symbol: request.instrument, resolution: "5m", day }).sourceUrl
  if (request.dataset === "open-interest") return createBinanceVisionOpenInterestPartition({ symbol: request.instrument, day }).sourceUrl
  return createBinanceVisionAggTradesPartition({ symbol: request.instrument, day }).sourceUrl
}

function decimal(value: string, field: string): string {
  const result = value.trim()
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(result)) throw new Error(`OHLCV_${field}_INVALID`)
  return result
}

function parseOhlcvCsv(csv: string, request: BoundedArchiveRequest): readonly BoundedOhlcvRow[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  if (lines[0]?.toLowerCase().includes("open_time")) lines.shift()
  const start = Date.parse(request.eventTimeStart), end = Date.parse(request.eventTimeEnd)
  const seen = new Map<string, string>()
  const rows = lines.map((line, sourceOrdinal) => {
    const columns = line.split(",")
    if (columns.length < 7 || !/^\d+$/.test(columns[0] ?? "") || !/^\d+$/.test(columns[6] ?? "")) throw new Error("OHLCV_SOURCE_ROW_INVALID")
    const openMs = Number(columns[0]), closeMs = Number(columns[6])
    if (!Number.isSafeInteger(openMs) || !Number.isSafeInteger(closeMs) || openMs < start || openMs >= end || closeMs < openMs || closeMs >= end) throw new Error("OHLCV_EVENT_OUT_OF_WINDOW")
    const row = Object.freeze({ openTime: new Date(openMs).toISOString(), closeTime: new Date(closeMs).toISOString(), open: decimal(columns[1] ?? "", "OPEN"), high: decimal(columns[2] ?? "", "HIGH"), low: decimal(columns[3] ?? "", "LOW"), close: decimal(columns[4] ?? "", "CLOSE"), volume: decimal(columns[5] ?? "", "VOLUME"), sourceOrdinal })
    if (Number(row.high) < Math.max(Number(row.open), Number(row.close)) || Number(row.low) > Math.min(Number(row.open), Number(row.close)) || Number(row.high) < Number(row.low)) throw new Error("OHLCV_PRICE_INVARIANT_INVALID")
    const checksum = canonicalChecksum(row)
    const existing = seen.get(row.openTime)
    if (existing && existing !== checksum) throw new Error("OHLCV_IMMUTABLE_CONFLICT")
    if (existing) throw new Error("OHLCV_EXACT_DUPLICATE_ROW")
    seen.set(row.openTime, checksum)
    return row
  }).sort((left, right) => left.openTime.localeCompare(right.openTime))
  return Object.freeze(rows)
}

function ensureBatch<Row>(request: BoundedArchiveRequest, bytes: Uint8Array, rows: readonly Row[], observedThrough: string): BoundedArchiveBatch<Row> {
  if (!bytes.byteLength) throw new Error("BOUNDED_SOURCE_EMPTY")
  if (!rows.length) throw new Error("BOUNDED_ROWS_EMPTY")
  if (rows.length > request.maximumRecordCount) throw new Error("BOUNDED_MAXIMUM_RECORD_COUNT_EXCEEDED")
  const sourceChecksum = createHash("sha256").update(bytes).digest("hex")
  return Object.freeze({ request, sourceChecksum, rows: Object.freeze([...rows]), observedThrough, batchIdentity: `mbab_${canonicalChecksum({ requestIdentity: request.requestIdentity, sourceChecksum, rowCount: rows.length, observedThrough })}` })
}

export function parseBoundedOhlcvArchive(request: BoundedArchiveRequest, bytes: Uint8Array): BoundedArchiveBatch<BoundedOhlcvRow> {
  if (request.dataset !== "ohlcv") throw new Error("BOUNDED_DATASET_MISMATCH")
  const rows = parseOhlcvCsv(extractFirstCsvFromZip(Buffer.from(bytes)), request)
  return ensureBatch(request, bytes, rows, rows.at(-1)!.closeTime)
}

export function parseBoundedOpenInterestArchive(request: BoundedArchiveRequest, bytes: Uint8Array): BoundedArchiveBatch<OpenInterestSourceRow> {
  if (request.dataset !== "open-interest") throw new Error("BOUNDED_DATASET_MISMATCH")
  const parsed = parseBinanceVisionOpenInterestSource(extractFirstCsvFromZip(Buffer.from(bytes)), request.instrument)
  if (Object.keys(parsed.rejected).length) throw new Error("OPEN_INTEREST_SOURCE_ROW_REJECTED")
  const start = request.eventTimeStart, end = request.eventTimeEnd
  if (parsed.rows.some((row) => row.observedAt < start || row.observedAt >= end)) throw new Error("OPEN_INTEREST_EVENT_OUT_OF_WINDOW")
  return ensureBatch(request, bytes, parsed.rows, parsed.rows.at(-1)?.observedAt ?? start)
}

export async function parseBoundedAggTradesArchive(request: BoundedArchiveRequest, bytes: Uint8Array): Promise<BoundedArchiveBatch<AggTradeSourceRow>> {
  if (request.dataset !== "agg-trade") throw new Error("BOUNDED_DATASET_MISMATCH")
  const rows: AggTradeSourceRow[] = []
  for await (const row of iterateBinanceVisionAggTradesZip(Buffer.from(bytes))) {
    if (row.tradeTime < request.eventTimeStart || row.tradeTime >= request.eventTimeEnd) throw new Error("AGG_TRADE_EVENT_OUT_OF_WINDOW")
    if (rows.length >= request.maximumRecordCount) throw new Error("BOUNDED_MAXIMUM_RECORD_COUNT_EXCEEDED")
    rows.push(row)
  }
  return ensureBatch(request, bytes, rows, rows.at(-1)?.tradeTime ?? request.eventTimeStart)
}

export async function buildBoundedAggTradesSegment(input: { readonly batch: BoundedArchiveBatch<AggTradeSourceRow>; readonly rawObjectId: string; readonly storage: ObjectStoragePort; readonly objectRoot: string; readonly assertFence?: () => Promise<void> }): Promise<AggTradesSegmentBuildResult> {
  if (input.batch.request.dataset !== "agg-trade") throw new Error("BOUNDED_DATASET_MISMATCH")
  await input.assertFence?.()
  const symbol = input.batch.request.instrument
  const result = await buildAggTradesSegment({
    identity: { datasetId: "agg-trade", providerId: "binance-public-archive", venue: "binance-usdm-futures", marketType: "perpetual-futures", canonicalInstrumentId: `binance-usdm-perpetual:${symbol.slice(0, -4)}-USDT`, providerSymbol: symbol, partitionStart: input.batch.request.eventTimeStart, partitionEnd: input.batch.request.eventTimeEnd, rawObjectId: input.rawObjectId, rawObjectChecksum: input.batch.sourceChecksum, schemaId: AGG_TRADES_SEGMENT_SCHEMA_ID, schemaVersion: AGG_TRADES_SEGMENT_SCHEMA_VERSION, normalizerVersion: AGG_TRADES_SEGMENT_NORMALIZER_VERSION, eventOrderPolicy: AGG_TRADES_SEGMENT_ORDER_POLICY },
    rows: (async function* () { for (const row of input.batch.rows) yield row })(), storage: input.storage, objectRoot: input.objectRoot,
  })
  await input.assertFence?.()
  return result
}

export async function commitBoundedArchiveBatch<Row, Command>(input: { readonly batch: BoundedArchiveBatch<Row>; readonly createCommand: (row: Row, batch: BoundedArchiveBatch<Row>) => Command; readonly execute: (command: Command) => Promise<{ readonly status: "SUCCESS" | "DUPLICATE" | "CONFLICT" | "REJECTED" }>; readonly assertFence?: () => Promise<void> }): Promise<{ readonly status: "CREATED" | "DUPLICATE" | "CONFLICT"; readonly createdCount: number; readonly duplicateCount: number; readonly conflictCount: number; readonly checksum: string }> {
  let createdCount = 0, duplicateCount = 0, conflictCount = 0
  for (const row of input.batch.rows) {
    await input.assertFence?.()
    const result = await input.execute(input.createCommand(row, input.batch))
    if (result.status === "SUCCESS") createdCount += 1
    else if (result.status === "DUPLICATE") duplicateCount += 1
    else conflictCount += 1
  }
  const status: "CREATED" | "DUPLICATE" | "CONFLICT" = conflictCount ? "CONFLICT" : createdCount ? "CREATED" : "DUPLICATE"
  const basis = { batchIdentity: input.batch.batchIdentity, status, createdCount, duplicateCount, conflictCount }
  return Object.freeze({ ...basis, checksum: canonicalChecksum(basis) })
}

export function classifySourceFinalization(input: { readonly now: string; readonly earliestEligibility: string; readonly observations: readonly BoundedSourceAvailability[]; readonly requiredInstrumentCount: number }): { readonly timeState: "TIME_NOT_ELIGIBLE" | "TIME_ELIGIBLE"; readonly sourceState: "SOURCE_NOT_FINALIZED" | "SOURCE_AVAILABLE" | "READY_FOR_ACQUISITION"; readonly acquisitionState: AcquisitionReadiness } {
  const timeState = Date.parse(input.now) < Date.parse(input.earliestEligibility) ? "TIME_NOT_ELIGIBLE" : "TIME_ELIGIBLE"
  if (timeState === "TIME_NOT_ELIGIBLE") return Object.freeze({ timeState, sourceState: "SOURCE_NOT_FINALIZED", acquisitionState: "NOT_READY_FOR_ACQUISITION" })
  const expected = input.requiredInstrumentCount
  const available = input.observations.length === expected && input.observations.every((item) => item.available && item.finalized)
  const ready = available && input.observations.every((item) => item.sourceClassification === "HTTP_SUCCESS" && item.checksumState === "VERIFIED" && item.observedThrough !== null)
  return Object.freeze({ timeState, sourceState: ready ? "READY_FOR_ACQUISITION" : available ? "SOURCE_AVAILABLE" : "SOURCE_NOT_FINALIZED", acquisitionState: ready ? "READY_FOR_ACQUISITION" : "NOT_READY_FOR_ACQUISITION" })
}

export function classifyMandatoryCycleReadiness(input: { readonly now: string; readonly earliestEligibility: string; readonly archiveObservations: readonly BoundedSourceAvailability[]; readonly fundingReady: boolean }) {
  const archives = classifySourceFinalization({ now: input.now, earliestEligibility: input.earliestEligibility, observations: input.archiveObservations, requiredInstrumentCount: MVP_REFRESH_INSTRUMENTS.length * 3 })
  if (archives.acquisitionState !== "READY_FOR_ACQUISITION" || !input.fundingReady) return Object.freeze({ ...archives, sourceState: archives.sourceState === "READY_FOR_ACQUISITION" ? "SOURCE_AVAILABLE" as const : archives.sourceState, acquisitionState: "NOT_READY_FOR_ACQUISITION" as const })
  return archives
}

export async function inspectBoundedArchiveAvailability(request: BoundedArchiveRequest, fetchImpl: typeof fetch = fetch): Promise<BoundedSourceAvailability> {
  let response: Response
  try { response = await fetchImpl(boundedArchiveSourceUrl(request), { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(15_000) }) }
  catch { return Object.freeze({ dataset: request.dataset, instrument: request.instrument, sourceClassification: "SOURCE_ERROR", available: false, finalized: false, observedThrough: null, checksumState: "NOT_VERIFIED", limitationReason: "SOURCE_UNAVAILABLE" }) }
  if (!response.ok) return Object.freeze({ dataset: request.dataset, instrument: request.instrument, sourceClassification: response.status === 404 ? "HTTP_NOT_FOUND" : "SOURCE_ERROR", available: false, finalized: false, observedThrough: null, checksumState: "NOT_VERIFIED", limitationReason: response.status === 404 ? "SOURCE_NOT_FINALIZED" : `SOURCE_HTTP_${response.status}` })
  const type = response.headers.get("content-type")?.toLowerCase() ?? ""
  const length = Number(response.headers.get("content-length") ?? "0")
  const valid = (type.includes("zip") || type.includes("octet-stream")) && Number.isFinite(length) && length > 0
  return Object.freeze({ dataset: request.dataset, instrument: request.instrument, sourceClassification: valid ? "HTTP_SUCCESS" : "CONTENT_INVALID", available: valid, finalized: valid, observedThrough: valid ? request.eventTimeEnd : null, checksumState: "NOT_VERIFIED", limitationReason: valid ? "PAYLOAD_CHECKSUM_NOT_INSPECTED" : "SOURCE_CONTENT_INVALID" })
}

export async function verifyBoundedArchiveAvailability(request: BoundedArchiveRequest, fetchImpl: typeof fetch = fetch): Promise<BoundedSourceAvailability> {
  const head = await inspectBoundedArchiveAvailability(request, fetchImpl)
  if (!head.available) return head
  try {
    const response = await fetchImpl(boundedArchiveSourceUrl(request), { cache: "no-store", signal: AbortSignal.timeout(30_000) })
    if (!response.ok) return Object.freeze({ ...head, sourceClassification: response.status === 404 ? "HTTP_NOT_FOUND" : "SOURCE_ERROR", available: false, finalized: false, observedThrough: null, checksumState: "NOT_VERIFIED", limitationReason: response.status === 404 ? "SOURCE_NOT_FINALIZED" : `SOURCE_HTTP_${response.status}` })
    const bytes = new Uint8Array(await response.arrayBuffer())
    const batch = request.dataset === "ohlcv" ? parseBoundedOhlcvArchive(request, bytes) : request.dataset === "open-interest" ? parseBoundedOpenInterestArchive(request, bytes) : await parseBoundedAggTradesArchive(request, bytes)
    return Object.freeze({ dataset: request.dataset, instrument: request.instrument, sourceClassification: "HTTP_SUCCESS", available: true, finalized: true, observedThrough: batch.observedThrough, checksumState: "VERIFIED", limitationReason: null })
  } catch (error) {
    return Object.freeze({ ...head, sourceClassification: "CONTENT_INVALID", available: false, finalized: false, observedThrough: null, checksumState: "MISMATCH", limitationReason: error instanceof Error ? error.message : "SOURCE_CONTENT_INVALID" })
  }
}
