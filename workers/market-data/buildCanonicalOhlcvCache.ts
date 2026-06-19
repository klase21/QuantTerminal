import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { HistoricalIngestionJob } from "@/core/historical-intelligence/ingestion/ingestionJobTypes"
import {
  CANONICAL_MARKET_DATA_SCHEMA_VERSIONS,
  canonicalMarketDataCacheIdentity,
} from "@/core/historical-intelligence/market-data/marketDataCache"
import type {
  CanonicalExchange,
  CanonicalMarketDataSource,
  CanonicalMarketInterval,
  CanonicalOhlcvCandle,
} from "@/core/historical-intelligence/market-data/canonicalMarketDataTypes"
import { writeHistoricalCacheFailure } from "@/lib/historical-intelligence/cache/fileCacheStore"
import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import { publishCanonicalOhlcv } from "@/workers/market-data/publishCanonicalMarketData"

export interface CanonicalOhlcvBuildInput {
  file: string
  exchange: CanonicalExchange
  symbol: string
  interval: CanonicalMarketInterval
  source?: Extract<CanonicalMarketDataSource, "binance-vision" | "binance-historical-api">
}

export interface CanonicalOhlcvBuildResult {
  job: HistoricalIngestionJob
  records: CanonicalOhlcvCandle[]
}

function validExchange(value: string): value is CanonicalExchange {
  return ["binance_futures", "binance_spot", "bybit", "hyperliquid", "deribit"].includes(value)
}

function validInterval(value: string): value is CanonicalMarketInterval {
  return ["1m", "5m", "15m", "1h", "4h", "1d"].includes(value)
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function validDownloadedAt(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback
}

function normalizeRecord(
  value: unknown,
  input: CanonicalOhlcvBuildInput,
  downloadedAt: string,
): CanonicalOhlcvCandle | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const openTime = number(row.openTime ?? row.open_time ?? row.timestamp)
  const closeTime = number(row.closeTime ?? row.close_time)
  const open = number(row.open)
  const high = number(row.high)
  const low = number(row.low)
  const close = number(row.close)
  const volume = number(row.volume)
  if (
    openTime === null
    || closeTime === null
    || open === null
    || high === null
    || low === null
    || close === null
    || volume === null
    || openTime < 0
    || closeTime < openTime
    || open <= 0
    || high <= 0
    || low <= 0
    || close <= 0
    || volume < 0
    || high < low
    || high < Math.max(open, close)
    || low > Math.min(open, close)
  ) {
    return null
  }
  return {
    exchange: input.exchange,
    symbol: input.symbol,
    interval: input.interval,
    openTime,
    closeTime,
    open,
    high,
    low,
    close,
    volume,
    source: input.source ?? "binance-vision",
    downloadedAt: validDownloadedAt(row.downloadedAt ?? row.createdAt, downloadedAt),
  }
}

function parseCsv(
  csv: string,
  input: CanonicalOhlcvBuildInput,
  downloadedAt: string,
) {
  return csv
    .trim()
    .split(/\r?\n/)
    .flatMap((line) => {
      const columns = line.split(",")
      if (columns.length < 7 || !Number.isFinite(Number(columns[0]))) return []
      return [normalizeRecord({
        openTime: columns[0],
        open: columns[1],
        high: columns[2],
        low: columns[3],
        close: columns[4],
        volume: columns[5],
        closeTime: columns[6],
      }, input, downloadedAt)]
    })
    .filter((record): record is CanonicalOhlcvCandle => Boolean(record))
}

async function loadRecords(input: CanonicalOhlcvBuildInput) {
  const sourceFile = path.resolve(input.file)
  const fileStats = await stat(sourceFile)
  const downloadedAt = fileStats.mtime.toISOString()
  const extension = path.extname(sourceFile).toLowerCase()

  if (extension === ".json") {
    const parsed: unknown = JSON.parse(await readFile(sourceFile, "utf8"))
    if (!Array.isArray(parsed)) throw new Error("OHLCV JSON input must contain an array.")
    return parsed
      .filter((value) => {
        if (!value || typeof value !== "object") return false
        const row = value as Record<string, unknown>
        return (
          String(row.symbol ?? input.symbol).toUpperCase() === input.symbol
          && String(row.interval ?? input.interval) === input.interval
        )
      })
      .map((value) => normalizeRecord(value, input, downloadedAt))
      .filter((record): record is CanonicalOhlcvCandle => Boolean(record))
  }

  const buffer = await readFile(sourceFile)
  if (extension === ".zip") {
    return parseCsv(extractFirstCsvFromZip(buffer), input, downloadedAt)
  }
  if (extension === ".csv") {
    return parseCsv(buffer.toString("utf8"), input, downloadedAt)
  }
  throw new Error("OHLCV builder supports .json, .csv, and .zip inputs.")
}

function deduplicate(records: CanonicalOhlcvCandle[]) {
  const byOpenTime = new Map<number, CanonicalOhlcvCandle>()
  records.forEach((record) => byOpenTime.set(record.openTime, record))
  return [...byOpenTime.values()].sort((left, right) => left.openTime - right.openTime)
}

function buildJob(input: CanonicalOhlcvBuildInput): HistoricalIngestionJob {
  const now = new Date().toISOString()
  const source = input.source ?? "binance-vision"
  return {
    id: `canonical-ohlcv:${input.exchange}:${input.symbol}:${input.interval}:${now}`,
    kind: "cache_generation",
    source: {
      id: source,
      kind: "primary",
      metadata: { file: path.basename(input.file) },
    },
    target: {
      cache: canonicalMarketDataCacheIdentity({
        dataset: "ohlcv",
        exchange: input.exchange,
        symbol: input.symbol,
        interval: input.interval,
      }),
      schemaVersion: CANONICAL_MARKET_DATA_SCHEMA_VERSIONS.ohlcv,
    },
    status: "running",
    dimensions: {
      exchange: input.exchange,
      symbol: input.symbol,
      interval: input.interval,
    },
    progress: { completed: 0, unit: "rows" },
    attempt: 1,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
  }
}

export async function buildCanonicalOhlcvCache(
  rawInput: CanonicalOhlcvBuildInput,
): Promise<CanonicalOhlcvBuildResult> {
  const input = {
    ...rawInput,
    symbol: rawInput.symbol.trim().toUpperCase(),
  }
  const job = buildJob(input)
  const identity = job.target.cache
  const source = job.source

  await writeHistoricalCacheFailure({
    identity,
    source,
    schemaVersion: CANONICAL_MARKET_DATA_SCHEMA_VERSIONS.ohlcv,
    status: "generating",
    metadata: { sourceFile: path.resolve(input.file), jobId: job.id },
  })

  try {
    const records = deduplicate(await loadRecords(input))
    if (!records.length) {
      throw new Error(`No valid ${input.symbol} ${input.interval} OHLCV records were found.`)
    }
    await publishCanonicalOhlcv({
      records,
      sourceFile: path.resolve(input.file),
    })
    const completedAt = new Date().toISOString()
    job.status = "succeeded"
    job.completedAt = completedAt
    job.updatedAt = completedAt
    job.progress = { completed: records.length, total: records.length, unit: "rows" }
    return { job, records }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canonical OHLCV cache generation failed."
    await writeHistoricalCacheFailure({
      identity,
      source,
      schemaVersion: CANONICAL_MARKET_DATA_SCHEMA_VERSIONS.ohlcv,
      status: "failed",
      metadata: { sourceFile: path.resolve(input.file), jobId: job.id },
      error: {
        code: "canonical_ohlcv_generation_failed",
        message,
      },
    })
    throw error
  }
}

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const file = argument("file")
  const exchange = argument("exchange") ?? "binance_futures"
  const symbol = argument("symbol")
  const interval = argument("interval")
  if (!file || !symbol || !validExchange(exchange) || !interval || !validInterval(interval)) {
    throw new Error("Usage: --file <json|csv|zip> --exchange <exchange> --symbol <symbol> --interval <1m|5m|15m|1h|4h|1d>")
  }

  const result = await buildCanonicalOhlcvCache({
    file,
    exchange,
    symbol,
    interval,
    source: "binance-vision",
  })
  process.stdout.write(`${JSON.stringify({
    cache: result.job.target.cache,
    schemaVersion: result.job.target.schemaVersion,
    records: result.records.length,
    firstOpenTime: result.records[0]?.openTime,
    lastOpenTime: result.records.at(-1)?.openTime,
    generatedAt: result.job.completedAt,
  }, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
