import { inflateRawSync } from "node:zlib"

import { ohlcvId } from "@/lib/historical-data/localHistoricalStore"
import type { HistoricalInterval, MarketOhlcvRow } from "@/types/historical"

const BASE_URL = "https://data.binance.vision"
const REQUEST_TIMEOUT_MS = 30000

export function buildBinanceVisionUrl(symbol: string, interval: HistoricalInterval, period: string) {
  return `${BASE_URL}/data/futures/um/monthly/klines/${symbol}/${interval}/${symbol}-${interval}-${period}.zip`
}

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

export async function downloadBinanceVisionZip(url: string) {
  const timeout = timeoutSignal(REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: timeout.signal,
      headers: {
        accept: "application/zip,application/octet-stream,*/*",
        "user-agent": "QuantTerminal/1.0",
      },
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Binance Vision returned ${response.status}`)
    return Buffer.from(await response.arrayBuffer())
  } finally {
    timeout.cancel()
  }
}

function findEndOfCentralDirectory(buffer: Buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset
  }
  return -1
}

export function extractFirstCsvFromZip(buffer: Buffer) {
  const eocd = findEndOfCentralDirectory(buffer)
  if (eocd < 0) throw new Error("ZIP central directory not found.")

  const entryCount = buffer.readUInt16LE(eocd + 10)
  let centralOffset = buffer.readUInt32LE(eocd + 16)

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) break
    const method = buffer.readUInt16LE(centralOffset + 10)
    const compressedSize = buffer.readUInt32LE(centralOffset + 20)
    const nameLength = buffer.readUInt16LE(centralOffset + 28)
    const extraLength = buffer.readUInt16LE(centralOffset + 30)
    const commentLength = buffer.readUInt16LE(centralOffset + 32)
    const localHeaderOffset = buffer.readUInt32LE(centralOffset + 42)
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString("utf8")

    if (name.endsWith(".csv")) {
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26)
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28)
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize)
      if (method === 0) return compressed.toString("utf8")
      if (method === 8) return inflateRawSync(compressed).toString("utf8")
      throw new Error(`Unsupported ZIP compression method ${method}.`)
    }

    centralOffset += 46 + nameLength + extraLength + commentLength
  }

  throw new Error("No CSV file found in Binance Vision ZIP.")
}

function parseNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseBinanceVisionKlinesCsv(csv: string, symbol: string, interval: HistoricalInterval): MarketOhlcvRow[] {
  const now = new Date().toISOString()
  return csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(","))
    .filter((columns) => Number.isFinite(Number(columns[0])) && columns.length >= 11)
    .map((columns) => {
      const openTime = Number(columns[0])
      return {
        id: ohlcvId("binance-vision", symbol, interval, openTime),
        source: "binance-vision" as const,
        symbol,
        interval,
        openTime,
        open: parseNumber(columns[1]),
        high: parseNumber(columns[2]),
        low: parseNumber(columns[3]),
        close: parseNumber(columns[4]),
        volume: parseNumber(columns[5]),
        closeTime: Number(columns[6]),
        quoteVolume: parseNumber(columns[7]),
        tradeCount: Math.round(parseNumber(columns[8])),
        takerBuyVolume: parseNumber(columns[9]),
        takerBuyQuoteVolume: parseNumber(columns[10]),
        createdAt: now,
      }
    })
}
