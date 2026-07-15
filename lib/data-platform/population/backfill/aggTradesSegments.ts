import { createHash, randomUUID } from "node:crypto"
import { mkdir, open, rm, stat } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { ObjectStoragePort } from "@/lib/data-platform/population/contracts"

import type { AggTradeSourceRow } from "./aggTradesSource"

export const AGG_TRADES_SEGMENT_SCHEMA_ID = "agg-trades-parquet" as const
export const AGG_TRADES_SEGMENT_SCHEMA_VERSION = "1.0.0" as const
export const AGG_TRADES_SEGMENT_NORMALIZER_VERSION = "d3-phase3-segment-normalizer-v1" as const
export const AGG_TRADES_SEGMENT_ORDER_POLICY = "EVENT_TIME_AGGREGATE_TRADE_ID_SOURCE_ORDINAL" as const
export const AGG_TRADES_SEGMENT_ROW_GROUP_SIZE = 100_000 as const

export interface AggTradesSegmentIdentityInput {
  readonly datasetId: "agg-trade"
  readonly providerId: "binance-public-archive"
  readonly venue: "binance-usdm-futures"
  readonly marketType: "perpetual-futures"
  readonly canonicalInstrumentId: string
  readonly providerSymbol: string
  readonly partitionStart: string
  readonly partitionEnd: string
  readonly rawObjectId: string
  readonly rawObjectChecksum: string
  readonly schemaId: typeof AGG_TRADES_SEGMENT_SCHEMA_ID
  readonly schemaVersion: typeof AGG_TRADES_SEGMENT_SCHEMA_VERSION
  readonly normalizerVersion: typeof AGG_TRADES_SEGMENT_NORMALIZER_VERSION
  readonly eventOrderPolicy: typeof AGG_TRADES_SEGMENT_ORDER_POLICY
}

export interface AggTradesSegmentBuildResult extends AggTradesSegmentIdentityInput {
  readonly segmentId: string
  readonly segmentVersion: string
  readonly segmentObjectKey: string
  readonly segmentChecksum: string
  readonly byteLength: number
  readonly eventCount: number
  readonly eventTimeMinimum: string
  readonly eventTimeMaximum: string
  readonly firstAggregateTradeId: string
  readonly lastAggregateTradeId: string
  readonly acceptedCount: number
  readonly rejectedCount: 0
  readonly duplicateCount: 0
  readonly validationStatus: "VALID"
  readonly columnarFormat: "PARQUET"
  readonly compressionFormat: "SNAPPY"
}

export interface AggTradesSegmentEvent {
  readonly aggregate_trade_id: string
  readonly price: string
  readonly quantity: string
  readonly first_trade_id: string
  readonly last_trade_id: string
  readonly event_time_utc: string
  readonly provider_timestamp: string
  readonly buyer_is_maker: boolean
  readonly canonical_instrument_id: string
  readonly provider_id: string
  readonly source_row_ordinal: number
}

export interface AggTradesFlowSummary {
  readonly eventCount: number
  readonly aggressiveBuyQuantity: string
  readonly aggressiveSellQuantity: string
  readonly eventTimeMinimum: string
  readonly eventTimeMaximum: string
  readonly checksumVerified: true
}

export interface AggTradesFlowBucket {
  readonly bucketStart: string
  readonly bucketEnd: string
  readonly aggressiveBuyQuantity: string
  readonly aggressiveSellQuantity: string
  readonly eventCount: number
  readonly imbalanceRatio: number | null
}

class DecimalAccumulator {
  private value = BigInt(0)
  private scale = 0
  private power10(exponent: number): bigint { let result = BigInt(1); for (let index = 0; index < exponent; index += 1) result *= BigInt(10); return result }
  add(input: string): void {
    const normalized = normalizeAggTradesSegmentDecimal(input)
    const [whole, fraction = ""] = normalized.split(".")
    const scale = fraction.length
    if (scale > this.scale) { this.value *= this.power10(scale - this.scale); this.scale = scale }
    this.value += BigInt(`${whole}${fraction}`) * this.power10(this.scale - scale)
  }
  toString(): string {
    const digits = this.value.toString().padStart(this.scale + 1, "0")
    if (!this.scale) return digits
    const result = `${digits.slice(0, -this.scale)}.${digits.slice(-this.scale)}`
    return normalizeAggTradesSegmentDecimal(result)
  }
}

const SCHEMA = Object.freeze([
  { name: "agg_trades_segment", num_children: 11 },
  { name: "aggregate_trade_id", type: "BYTE_ARRAY", converted_type: "UTF8", repetition_type: "REQUIRED" },
  { name: "price", type: "BYTE_ARRAY", converted_type: "UTF8", repetition_type: "REQUIRED" },
  { name: "quantity", type: "BYTE_ARRAY", converted_type: "UTF8", repetition_type: "REQUIRED" },
  { name: "first_trade_id", type: "BYTE_ARRAY", converted_type: "UTF8", repetition_type: "REQUIRED" },
  { name: "last_trade_id", type: "BYTE_ARRAY", converted_type: "UTF8", repetition_type: "REQUIRED" },
  { name: "event_time_utc", type: "BYTE_ARRAY", converted_type: "UTF8", repetition_type: "REQUIRED" },
  { name: "provider_timestamp", type: "BYTE_ARRAY", converted_type: "UTF8", repetition_type: "REQUIRED" },
  { name: "buyer_is_maker", type: "BOOLEAN", repetition_type: "REQUIRED" },
  { name: "canonical_instrument_id", type: "BYTE_ARRAY", converted_type: "UTF8", repetition_type: "REQUIRED" },
  { name: "provider_id", type: "BYTE_ARRAY", converted_type: "UTF8", repetition_type: "REQUIRED" },
  { name: "source_row_ordinal", type: "INT32", repetition_type: "REQUIRED" },
] as const)

export function createAggTradesSegmentId(input: AggTradesSegmentIdentityInput): string {
  return `segment_${canonicalChecksum({
    datasetId: input.datasetId,
    providerId: input.providerId,
    venue: input.venue,
    marketType: input.marketType,
    canonicalInstrumentId: input.canonicalInstrumentId,
    providerSymbol: input.providerSymbol,
    partitionStart: input.partitionStart,
    partitionEnd: input.partitionEnd,
    eventOrderPolicy: input.eventOrderPolicy,
  })}`
}

export function createAggTradesSegmentVersion(input: AggTradesSegmentIdentityInput, segmentChecksum: string): string {
  return `segment_version_${canonicalChecksum({
    segmentId: createAggTradesSegmentId(input),
    rawObjectChecksum: input.rawObjectChecksum,
    schemaVersion: input.schemaVersion,
    normalizerVersion: input.normalizerVersion,
    segmentChecksum,
  })}`
}

export function normalizeAggTradesSegmentDecimal(value: string): string {
  const match = /^(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(value)
  if (!match) throw new Error("AGG_TRADE_SEGMENT_DECIMAL_INVALID")
  const integer = match[1]
  const fraction = match[2] ?? ""
  const exponent = Number(match[3] ?? "0")
  if (!Number.isSafeInteger(exponent)) throw new Error("AGG_TRADE_SEGMENT_DECIMAL_EXPONENT_UNSAFE")
  const digits = `${integer}${fraction}`
  const decimalPosition = integer.length + exponent
  const plain = decimalPosition <= 0 ? `0.${"0".repeat(-decimalPosition)}${digits}`
    : decimalPosition >= digits.length ? `${digits}${"0".repeat(decimalPosition - digits.length)}`
    : `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`
  const [whole, decimal = ""] = plain.split(".")
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "")
  const normalizedDecimal = decimal.replace(/0+$/, "")
  return normalizedDecimal ? `${normalizedWhole}.${normalizedDecimal}` : normalizedWhole
}

function columns() {
  return {
    aggregate_trade_id: [] as string[], price: [] as string[], quantity: [] as string[], first_trade_id: [] as string[],
    last_trade_id: [] as string[], event_time_utc: [] as string[], provider_timestamp: [] as string[], buyer_is_maker: [] as boolean[],
    canonical_instrument_id: [] as string[], provider_id: [] as string[], source_row_ordinal: [] as number[],
  }
}

function columnData(value: ReturnType<typeof columns>) {
  return [
    { name: "aggregate_trade_id", type: "STRING" as const, data: value.aggregate_trade_id },
    { name: "price", type: "STRING" as const, data: value.price },
    { name: "quantity", type: "STRING" as const, data: value.quantity },
    { name: "first_trade_id", type: "STRING" as const, data: value.first_trade_id },
    { name: "last_trade_id", type: "STRING" as const, data: value.last_trade_id },
    { name: "event_time_utc", type: "STRING" as const, data: value.event_time_utc },
    { name: "provider_timestamp", type: "STRING" as const, data: value.provider_timestamp },
    { name: "buyer_is_maker", type: "BOOLEAN" as const, data: value.buyer_is_maker },
    { name: "canonical_instrument_id", type: "STRING" as const, data: value.canonical_instrument_id },
    { name: "provider_id", type: "STRING" as const, data: value.provider_id },
    { name: "source_row_ordinal", type: "INT32" as const, data: value.source_row_ordinal },
  ]
}

async function fileChecksum(filename: string): Promise<string> {
  const handle = await open(filename, "r")
  const hash = createHash("sha256")
  try { for await (const chunk of handle.createReadStream({ highWaterMark: 1024 * 1024 })) hash.update(chunk) }
  finally { await handle.close() }
  return hash.digest("hex")
}

export async function buildAggTradesSegment(input: {
  readonly identity: AggTradesSegmentIdentityInput
  readonly rows: AsyncIterable<AggTradeSourceRow>
  readonly storage: ObjectStoragePort
  readonly objectRoot: string
}): Promise<AggTradesSegmentBuildResult> {
  const temporaryDirectory = path.join(input.objectRoot, ".segment-build")
  await mkdir(temporaryDirectory, { recursive: true })
  const temporary = path.join(temporaryDirectory, `${randomUUID()}.parquet.partial`)
  const { fileWriter, ParquetWriter } = await import("hyparquet-writer")
  const writer = new ParquetWriter({ writer: fileWriter(temporary), schema: [...SCHEMA], codec: "SNAPPY" })
  let batch = columns()
  let eventCount = 0
  let firstAggregateTradeId: string | null = null
  let lastAggregateTradeId: string | null = null
  let eventTimeMinimum: string | null = null
  let eventTimeMaximum: string | null = null
  try {
    for await (const row of input.rows) {
      if (row.tradeTime < input.identity.partitionStart || row.tradeTime >= input.identity.partitionEnd) throw new Error("AGG_TRADE_SEGMENT_EVENT_OUTSIDE_PARTITION")
      firstAggregateTradeId ??= row.aggregateTradeId
      lastAggregateTradeId = row.aggregateTradeId
      eventTimeMinimum ??= row.tradeTime
      eventTimeMaximum = row.tradeTime
      batch.aggregate_trade_id.push(row.aggregateTradeId); batch.price.push(normalizeAggTradesSegmentDecimal(row.price)); batch.quantity.push(normalizeAggTradesSegmentDecimal(row.quantity))
      batch.first_trade_id.push(row.firstTradeId); batch.last_trade_id.push(row.lastTradeId); batch.event_time_utc.push(row.tradeTime)
      batch.provider_timestamp.push(row.sourceTimestamp); batch.buyer_is_maker.push(row.buyerIsMaker)
      batch.canonical_instrument_id.push(input.identity.canonicalInstrumentId); batch.provider_id.push(input.identity.providerId)
      batch.source_row_ordinal.push(row.sourceOrdinal)
      eventCount += 1
      if (batch.aggregate_trade_id.length === AGG_TRADES_SEGMENT_ROW_GROUP_SIZE) { await writer.write({ columnData: columnData(batch), rowGroupSize: AGG_TRADES_SEGMENT_ROW_GROUP_SIZE }); batch = columns() }
    }
    if (batch.aggregate_trade_id.length) await writer.write({ columnData: columnData(batch), rowGroupSize: AGG_TRADES_SEGMENT_ROW_GROUP_SIZE })
    if (!eventCount || !firstAggregateTradeId || !lastAggregateTradeId || !eventTimeMinimum || !eventTimeMaximum) throw new Error("AGG_TRADE_SEGMENT_EMPTY")
    await writer.finish()
    const handle = await open(temporary, "r+")
    try { await handle.sync() } finally { await handle.close() }
    const info = await stat(temporary)
    const segmentChecksum = await fileChecksum(temporary)
    const segmentObjectKey = `canonical-segments/agg-trades/${segmentChecksum.slice(0, 2)}/${segmentChecksum}.parquet`
    const readHandle = await open(temporary, "r")
    try {
      await input.storage.putImmutable({ objectStorageKey: segmentObjectKey, contentHash: segmentChecksum, byteLength: info.size, mediaType: "application/vnd.apache.parquet", content: readHandle.createReadStream({ highWaterMark: 1024 * 1024 }) })
    } finally { await readHandle.close() }
    const segmentId = createAggTradesSegmentId(input.identity)
    return Object.freeze({ ...input.identity, segmentId, segmentVersion: createAggTradesSegmentVersion(input.identity, segmentChecksum), segmentObjectKey, segmentChecksum, byteLength: info.size, eventCount, eventTimeMinimum, eventTimeMaximum, firstAggregateTradeId, lastAggregateTradeId, acceptedCount: eventCount, rejectedCount: 0, duplicateCount: 0, validationStatus: "VALID", columnarFormat: "PARQUET", compressionFormat: "SNAPPY" })
  } finally { await rm(temporary, { force: true }) }
}

function safeSegmentPath(root: string, key: string): string {
  if (!key.startsWith("canonical-segments/agg-trades/") || key.includes("\\") || key.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("SEGMENT_OBJECT_KEY_INVALID")
  const target = path.resolve(root, ...key.split("/"))
  const relative = path.relative(path.resolve(root), target)
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("SEGMENT_OBJECT_KEY_ESCAPES_ROOT")
  return target
}

export function createAggTradesSegmentReadPort(options: { readonly objectRoot: string }) {
  return Object.freeze({
    async summarizeFlow(input: { readonly objectKey: string; readonly expectedChecksum: string; readonly expectedEventCount: number; readonly batchSize?: number }): Promise<AggTradesFlowSummary> {
      const batchSize = input.batchSize ?? AGG_TRADES_SEGMENT_ROW_GROUP_SIZE
      if (!Number.isInteger(batchSize) || batchSize < 1_000 || batchSize > AGG_TRADES_SEGMENT_ROW_GROUP_SIZE) throw new Error("SEGMENT_SUMMARY_BATCH_SIZE_INVALID")
      if (!Number.isSafeInteger(input.expectedEventCount) || input.expectedEventCount < 1) throw new Error("SEGMENT_SUMMARY_EVENT_COUNT_INVALID")
      const filename = safeSegmentPath(options.objectRoot, input.objectKey)
      if (await fileChecksum(filename) !== input.expectedChecksum) throw new Error("SEGMENT_CHECKSUM_MISMATCH")
      const info = await stat(filename)
      const handle = await open(filename, "r")
      const { parquetReadObjects } = await import("hyparquet")
      const file = { byteLength: info.size, async slice(start: number, end: number): Promise<ArrayBuffer> { const buffer = Buffer.allocUnsafe(end - start); await handle.read(buffer, 0, buffer.length, start); return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) } }
      const buy = new DecimalAccumulator(), sell = new DecimalAccumulator()
      let eventCount = 0, eventTimeMinimum: string | null = null, eventTimeMaximum: string | null = null
      try {
        for (let cursor = 0; cursor < input.expectedEventCount; cursor += batchSize) {
          const rows = await parquetReadObjects({ file, rowStart: cursor, rowEnd: Math.min(input.expectedEventCount, cursor + batchSize), columns: ["quantity", "event_time_utc", "buyer_is_maker"] }) as unknown as Pick<AggTradesSegmentEvent, "quantity" | "event_time_utc" | "buyer_is_maker">[]
          for (const row of rows) {
            if (row.buyer_is_maker) sell.add(row.quantity); else buy.add(row.quantity)
            eventTimeMinimum = eventTimeMinimum === null || row.event_time_utc < eventTimeMinimum ? row.event_time_utc : eventTimeMinimum
            eventTimeMaximum = eventTimeMaximum === null || row.event_time_utc > eventTimeMaximum ? row.event_time_utc : eventTimeMaximum
            eventCount += 1
          }
        }
      } finally { await handle.close() }
      if (eventCount !== input.expectedEventCount || !eventTimeMinimum || !eventTimeMaximum) throw new Error("SEGMENT_SUMMARY_COUNT_MISMATCH")
      return Object.freeze({ eventCount, aggressiveBuyQuantity: buy.toString(), aggressiveSellQuantity: sell.toString(), eventTimeMinimum, eventTimeMaximum, checksumVerified: true as const })
    },
    async summarizeFlowBuckets(input: { readonly objectKey: string; readonly expectedChecksum: string; readonly expectedEventCount: number; readonly windowStart: string; readonly windowEnd: string; readonly bucketMinutes?: number; readonly batchSize?: number }): Promise<{ readonly buckets: readonly AggTradesFlowBucket[]; readonly eventCount: number; readonly checksumVerified: true }> {
      const batchSize = input.batchSize ?? AGG_TRADES_SEGMENT_ROW_GROUP_SIZE
      const bucketMinutes = input.bucketMinutes ?? 30
      if (!Number.isInteger(batchSize) || batchSize < 1_000 || batchSize > AGG_TRADES_SEGMENT_ROW_GROUP_SIZE) throw new Error("SEGMENT_BUCKET_BATCH_SIZE_INVALID")
      if (!Number.isInteger(input.expectedEventCount) || input.expectedEventCount < 1) throw new Error("SEGMENT_BUCKET_EVENT_COUNT_INVALID")
      if (!Number.isInteger(bucketMinutes) || bucketMinutes < 5 || bucketMinutes > 60 || 1_440 % bucketMinutes !== 0) throw new Error("SEGMENT_BUCKET_INTERVAL_INVALID")
      const windowStart = Date.parse(input.windowStart), windowEnd = Date.parse(input.windowEnd), bucketMs = bucketMinutes * 60_000
      if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd) || windowEnd <= windowStart || windowEnd - windowStart > 86_400_000 || (windowEnd - windowStart) % bucketMs !== 0) throw new Error("SEGMENT_BUCKET_WINDOW_INVALID")
      const filename = safeSegmentPath(options.objectRoot, input.objectKey)
      if (await fileChecksum(filename) !== input.expectedChecksum) throw new Error("SEGMENT_CHECKSUM_MISMATCH")
      const info = await stat(filename), handle = await open(filename, "r")
      const { parquetReadObjects } = await import("hyparquet")
      const file = { byteLength: info.size, async slice(start: number, end: number): Promise<ArrayBuffer> { const buffer = Buffer.allocUnsafe(end - start); await handle.read(buffer, 0, buffer.length, start); return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) } }
      const values = Array.from({ length: (windowEnd - windowStart) / bucketMs }, () => ({ buy: new DecimalAccumulator(), sell: new DecimalAccumulator(), count: 0 }))
      let eventCount = 0
      try {
        for (let cursor = 0; cursor < input.expectedEventCount; cursor += batchSize) {
          const rows = await parquetReadObjects({ file, rowStart: cursor, rowEnd: Math.min(input.expectedEventCount, cursor + batchSize), columns: ["quantity", "event_time_utc", "buyer_is_maker"] }) as unknown as Pick<AggTradesSegmentEvent, "quantity" | "event_time_utc" | "buyer_is_maker">[]
          for (const row of rows) {
            const timestamp = Date.parse(row.event_time_utc), ordinal = Math.floor((timestamp - windowStart) / bucketMs)
            if (!Number.isFinite(timestamp) || ordinal < 0 || ordinal >= values.length) throw new Error("SEGMENT_BUCKET_EVENT_OUTSIDE_WINDOW")
            const bucket = values[ordinal]!
            if (row.buyer_is_maker) bucket.sell.add(row.quantity); else bucket.buy.add(row.quantity)
            bucket.count += 1; eventCount += 1
          }
        }
      } finally { await handle.close() }
      if (eventCount !== input.expectedEventCount) throw new Error("SEGMENT_BUCKET_COUNT_MISMATCH")
      const buckets = values.map((bucket, ordinal) => {
        const buy = bucket.buy.toString(), sell = bucket.sell.toString(), total = Number(buy) + Number(sell)
        return Object.freeze({ bucketStart: new Date(windowStart + ordinal * bucketMs).toISOString(), bucketEnd: new Date(windowStart + (ordinal + 1) * bucketMs).toISOString(), aggressiveBuyQuantity: buy, aggressiveSellQuantity: sell, eventCount: bucket.count, imbalanceRatio: total ? Number(((Number(buy) - Number(sell)) / total).toFixed(8)) : null })
      })
      return Object.freeze({ buckets: Object.freeze(buckets), eventCount, checksumVerified: true as const })
    },
    async readPage(input: { readonly objectKey: string; readonly expectedChecksum: string; readonly offset?: number; readonly limit: number; readonly eventTimeStart?: string; readonly eventTimeEnd?: string; readonly aggregateTradeIdStart?: string; readonly aggregateTradeIdEnd?: string }): Promise<{ readonly events: readonly AggTradesSegmentEvent[]; readonly nextOffset: number | null; readonly checksumVerified: true }> {
      if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 1_000) throw new Error("SEGMENT_READ_LIMIT_INVALID")
      const filename = safeSegmentPath(options.objectRoot, input.objectKey)
      if (await fileChecksum(filename) !== input.expectedChecksum) throw new Error("SEGMENT_CHECKSUM_MISMATCH")
      const info = await stat(filename)
      const handle = await open(filename, "r")
      const { parquetReadObjects } = await import("hyparquet")
      const file = { byteLength: info.size, async slice(start: number, end: number): Promise<ArrayBuffer> { const buffer = Buffer.allocUnsafe(end - start); await handle.read(buffer, 0, buffer.length, start); return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) } }
      const events: AggTradesSegmentEvent[] = []
      let cursor = input.offset ?? 0
      try {
        while (events.length < input.limit) {
          const rows = await parquetReadObjects({ file, rowStart: cursor, rowEnd: cursor + Math.max(1_000, input.limit), columns: ["aggregate_trade_id", "price", "quantity", "first_trade_id", "last_trade_id", "event_time_utc", "provider_timestamp", "buyer_is_maker", "canonical_instrument_id", "provider_id", "source_row_ordinal"] }) as unknown as AggTradesSegmentEvent[]
          if (!rows.length) return Object.freeze({ events: Object.freeze(events), nextOffset: null, checksumVerified: true as const })
          for (const row of rows) {
            cursor += 1
            if (input.eventTimeStart && row.event_time_utc < input.eventTimeStart) continue
            if (input.eventTimeEnd && row.event_time_utc >= input.eventTimeEnd) continue
            if (input.aggregateTradeIdStart && BigInt(row.aggregate_trade_id) < BigInt(input.aggregateTradeIdStart)) continue
            if (input.aggregateTradeIdEnd && BigInt(row.aggregate_trade_id) > BigInt(input.aggregateTradeIdEnd)) continue
            events.push(Object.freeze(row))
            if (events.length === input.limit) break
          }
          if (rows.length < Math.max(1_000, input.limit)) return Object.freeze({ events: Object.freeze(events), nextOffset: null, checksumVerified: true as const })
        }
        return Object.freeze({ events: Object.freeze(events), nextOffset: cursor, checksumVerified: true as const })
      } finally { await handle.close() }
    },
  })
}
