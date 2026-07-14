import { createInflateRaw } from "node:zlib"
import { Readable } from "node:stream"
import readline from "node:readline"

export const BINANCE_AGG_TRADES_HEADER = "agg_trade_id,price,quantity,first_trade_id,last_trade_id,transact_time,is_buyer_maker" as const

export interface AggTradeSourceRow {
  readonly aggregateTradeId: string
  readonly price: string
  readonly quantity: string
  readonly firstTradeId: string
  readonly lastTradeId: string
  readonly tradeTime: string
  readonly sourceTimestamp: string
  readonly buyerIsMaker: boolean
  readonly sourceOrdinal: number
}

function unsignedInteger(value: string, field: string): string {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) throw new Error(`AGG_TRADE_${field}_INVALID`)
  return normalized
}

function positiveDecimal(value: string, field: string): string {
  const normalized = value.trim()
  const [mantissa] = normalized.split(/[eE]/, 1)
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized) || !/[1-9]/.test(mantissa)) throw new Error(`AGG_TRADE_${field}_INVALID`)
  return normalized
}

function providerTimestamp(value: string): string {
  const sourceTimestamp = unsignedInteger(value, "TIMESTAMP")
  const raw = BigInt(sourceTimestamp)
  const milliseconds = sourceTimestamp.length > 13 ? raw / BigInt(1000) : raw
  if (milliseconds > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("AGG_TRADE_TIMESTAMP_UNSAFE")
  const date = new Date(Number(milliseconds))
  if (!Number.isFinite(date.getTime())) throw new Error("AGG_TRADE_TIMESTAMP_INVALID")
  return date.toISOString()
}

export function parseBinanceVisionAggTradeLine(line: string, sourceOrdinal: number): AggTradeSourceRow {
  const columns = line.replace(/\r$/, "").split(",")
  if (columns.length !== 7) throw new Error("AGG_TRADE_COLUMN_COUNT_INVALID")
  const aggregateTradeId = unsignedInteger(columns[0], "AGGREGATE_ID")
  const firstTradeId = unsignedInteger(columns[3], "FIRST_TRADE_ID")
  const lastTradeId = unsignedInteger(columns[4], "LAST_TRADE_ID")
  if (BigInt(firstTradeId) > BigInt(lastTradeId)) throw new Error("AGG_TRADE_TRADE_ID_RANGE_INVALID")
  if (columns[6] !== "true" && columns[6] !== "false") throw new Error("AGG_TRADE_BUYER_MAKER_INVALID")
  return Object.freeze({
    aggregateTradeId,
    price: positiveDecimal(columns[1], "PRICE"),
    quantity: positiveDecimal(columns[2], "QUANTITY"),
    firstTradeId,
    lastTradeId,
    tradeTime: providerTimestamp(columns[5]),
    sourceTimestamp: columns[5],
    buyerIsMaker: columns[6] === "true",
    sourceOrdinal,
  })
}

function firstCsvEntry(buffer: Buffer): { readonly method: number; readonly compressed: Buffer; readonly uncompressedBytes: number } {
  let eocd = -1
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break }
  }
  if (eocd < 0) throw new Error("AGG_TRADE_ZIP_DIRECTORY_MISSING")
  const entryCount = buffer.readUInt16LE(eocd + 10)
  let centralOffset = buffer.readUInt32LE(eocd + 16)
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) break
    const method = buffer.readUInt16LE(centralOffset + 10)
    const compressedSize = buffer.readUInt32LE(centralOffset + 20)
    const uncompressedBytes = buffer.readUInt32LE(centralOffset + 24)
    const nameLength = buffer.readUInt16LE(centralOffset + 28)
    const extraLength = buffer.readUInt16LE(centralOffset + 30)
    const commentLength = buffer.readUInt16LE(centralOffset + 32)
    const localHeaderOffset = buffer.readUInt32LE(centralOffset + 42)
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString("utf8")
    if (name.endsWith(".csv")) {
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26)
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28)
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
      return Object.freeze({ method, compressed: buffer.subarray(dataStart, dataStart + compressedSize), uncompressedBytes })
    }
    centralOffset += 46 + nameLength + extraLength + commentLength
  }
  throw new Error("AGG_TRADE_ZIP_CSV_MISSING")
}

function csvContent(entry: ReturnType<typeof firstCsvEntry>): Readable {
  const source = Readable.from(entry.compressed)
  if (entry.method === 0) return source
  if (entry.method === 8) return source.pipe(createInflateRaw())
  throw new Error(`AGG_TRADE_ZIP_METHOD_UNSUPPORTED:${entry.method}`)
}

export async function inspectBinanceVisionAggTradesZip(buffer: Buffer): Promise<{ readonly uncompressedBytes: number; readonly headerPresent: boolean }> {
  const entry = firstCsvEntry(buffer)
  const lines = readline.createInterface({ input: csvContent(entry), crlfDelay: Infinity })
  let firstLine: string | null = null
  for await (const line of lines) {
    if (!line.trim()) continue
    firstLine = line.replace(/\r$/, "")
    break
  }
  lines.close()
  if (firstLine === null) throw new Error("AGG_TRADE_ARCHIVE_EMPTY")
  return Object.freeze({ uncompressedBytes: entry.uncompressedBytes, headerPresent: firstLine === BINANCE_AGG_TRADES_HEADER })
}

export async function *iterateBinanceVisionAggTradesZip(buffer: Buffer): AsyncGenerator<AggTradeSourceRow> {
  const entry = firstCsvEntry(buffer)
  const lines = readline.createInterface({ input: csvContent(entry), crlfDelay: Infinity })
  let ordinal = 0
  let previousId: bigint | null = null
  let previousTime: string | null = null
  for await (const line of lines) {
    if (!line.trim()) continue
    if (ordinal === 0 && line.replace(/\r$/, "") === BINANCE_AGG_TRADES_HEADER) continue
    const row = parseBinanceVisionAggTradeLine(line, ordinal)
    const currentId = BigInt(row.aggregateTradeId)
    if (previousId !== null && currentId <= previousId) throw new Error("AGG_TRADE_IDS_NOT_STRICTLY_INCREASING")
    if (previousTime !== null && row.tradeTime < previousTime) throw new Error("AGG_TRADE_TIMES_NOT_MONOTONIC")
    previousId = currentId
    previousTime = row.tradeTime
    ordinal += 1
    yield row
  }
  if (ordinal === 0) throw new Error("AGG_TRADE_ARCHIVE_EMPTY")
}
