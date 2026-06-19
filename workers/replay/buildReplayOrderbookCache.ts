import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { decompress } from "fzstd"
import { parquetMetadataAsync, parquetReadObjects, parquetSchema } from "hyparquet"

import type { HistoricalIngestionJob } from "@/core/historical-intelligence/ingestion/ingestionJobTypes"
import {
  REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
  REPLAY_ORDERBOOK_LEVEL_LIMIT,
  replayOrderbookCacheIdentity,
  replayOrderbookWindow,
  type ReplayOrderbookCacheCoordinates,
  type ReplayOrderbookCacheMetadata,
  type ReplayOrderbookCachePayload,
} from "@/core/replay/replayOrderbookCache"
import {
  writeHistoricalCache,
  writeHistoricalCacheFailure,
} from "@/lib/historical-intelligence/cache/fileCacheStore"

const REQUIRED_COLUMNS = [
  "received_time",
  "event_time",
  "transaction_time",
  "event_type",
  "side",
  "price",
  "quantity",
]

export interface ReplayOrderbookCacheBuildInput extends ReplayOrderbookCacheCoordinates {
  file: string
}

export interface ReplayOrderbookCacheBuildResult {
  job: HistoricalIngestionJob
  payload: ReplayOrderbookCachePayload
  metadata: ReplayOrderbookCacheMetadata
}

function exactArrayBuffer(buffer: Uint8Array) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer
}

async function readParquetFile(file: string) {
  const source = await readFile(file)
  if (file.toLowerCase().endsWith(".zst")) {
    return exactArrayBuffer(decompress(source))
  }
  return exactArrayBuffer(source)
}

function numeric(value: unknown) {
  if (typeof value === "bigint") {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : null
  }
  const numberValue = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function timestamp(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "bigint") return timestamp(Number(value))
  if (typeof value === "number" && Number.isFinite(value)) {
    const absolute = Math.abs(value)
    if (absolute > 1_000_000_000_000_000) return new Date(value / 1000).toISOString()
    if (absolute > 1_000_000_000_000) return new Date(value).toISOString()
    return new Date(value * 1000).toISOString()
  }
  if (typeof value !== "string" || !value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function buildJob(input: ReplayOrderbookCacheBuildInput): HistoricalIngestionJob {
  const now = new Date().toISOString()
  return {
    id: `replay-orderbook:${input.exchange}:${input.symbol}:${input.date}:${String(input.hour).padStart(2, "0")}`,
    kind: "cache_generation",
    source: {
      id: "cryptohftdata",
      kind: "enrichment",
      metadata: { dataset: "orderbook", file: path.basename(input.file) },
    },
    target: {
      cache: replayOrderbookCacheIdentity(input),
      schemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
    },
    status: "running",
    dimensions: {
      exchange: input.exchange,
      symbol: input.symbol,
      date: input.date,
      hour: input.hour,
    },
    window: replayOrderbookWindow(input.date, input.hour),
    progress: { completed: 0, unit: "rows" },
    attempt: 1,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
  }
}

export async function buildReplayOrderbookCache(
  input: ReplayOrderbookCacheBuildInput,
): Promise<ReplayOrderbookCacheBuildResult> {
  const coordinates = {
    exchange: input.exchange.trim().toLowerCase(),
    symbol: input.symbol.trim().toUpperCase(),
    date: input.date,
    hour: input.hour,
  }
  const identity = replayOrderbookCacheIdentity(coordinates)
  const source = {
    id: "cryptohftdata",
    kind: "enrichment" as const,
    metadata: { dataset: "orderbook", file: path.basename(input.file) },
  }
  const job = buildJob({ ...coordinates, file: input.file })

  await writeHistoricalCacheFailure({
    identity,
    source,
    schemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
    status: "generating",
    metadata: {
      sourceFile: path.resolve(input.file),
      jobId: job.id,
    },
  })

  try {
    const file = await readParquetFile(input.file)
    const parquetMetadata = await parquetMetadataAsync(file)
    const columns = parquetSchema(parquetMetadata).children.map((child) => child.element.name)
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !columns.includes(column))
    if (missingColumns.length) {
      throw new Error(`Orderbook parquet is missing required columns: ${missingColumns.join(", ")}`)
    }

    const totalRows = Number(parquetMetadata.num_rows)
    const bids = new Map<number, number>()
    const asks = new Map<number, number>()
    let rowsProcessed = 0
    let snapshotRows = 0
    let updateRows = 0
    let wasPrevSnapshot = false
    let latestTimestamp: string | null = null
    let rowStart = 0

    for (const rowGroup of parquetMetadata.row_groups) {
      const rowEnd = rowStart + Number(rowGroup.num_rows)
      const rows = await parquetReadObjects({
        file,
        metadata: parquetMetadata,
        columns: REQUIRED_COLUMNS,
        rowStart,
        rowEnd,
      })

      for (const row of rows) {
        rowsProcessed += 1
        const eventType = String(row.event_type ?? "").toLowerCase()
        if (eventType === "snapshot") {
          snapshotRows += 1
          if (!wasPrevSnapshot) {
            bids.clear()
            asks.clear()
          }
          wasPrevSnapshot = true
        } else {
          updateRows += 1
          wasPrevSnapshot = false
        }

        const side = String(row.side ?? "").toLowerCase()
        if (side !== "bid" && side !== "ask") continue
        const price = numeric(row.price)
        const quantity = numeric(row.quantity)
        if (price === null || quantity === null) continue

        const target = side === "bid" ? bids : asks
        if (quantity === 0) target.delete(price)
        else target.set(price, quantity)

        const rowTimestamp = timestamp(row.transaction_time ?? row.event_time ?? row.received_time)
        if (rowTimestamp) latestTimestamp = rowTimestamp
      }

      rowStart = rowEnd
      job.progress = { completed: rowsProcessed, total: totalRows, unit: "rows" }
      job.updatedAt = new Date().toISOString()
    }

    const topBids = [...bids.entries()]
      .sort((left, right) => right[0] - left[0])
      .slice(0, REPLAY_ORDERBOOK_LEVEL_LIMIT)
    const topAsks = [...asks.entries()]
      .sort((left, right) => left[0] - right[0])
      .slice(0, REPLAY_ORDERBOOK_LEVEL_LIMIT)
    if (!latestTimestamp || !topBids.length || !topAsks.length) {
      throw new Error("Orderbook reconstruction did not produce both bid and ask levels.")
    }

    const bestBid = topBids[0][0]
    const bestAsk = topAsks[0][0]
    const bidLiquidity = topBids.reduce((sum, [, quantity]) => sum + quantity, 0)
    const askLiquidity = topAsks.reduce((sum, [, quantity]) => sum + quantity, 0)
    const totalLiquidity = bidLiquidity + askLiquidity
    const payload: ReplayOrderbookCachePayload = {
      exchange: coordinates.exchange,
      symbol: coordinates.symbol,
      window: replayOrderbookWindow(coordinates.date, coordinates.hour),
      timestamp: latestTimestamp,
      bestBid,
      bestAsk,
      spread: bestAsk - bestBid,
      imbalance: totalLiquidity > 0
        ? ((bidLiquidity - askLiquidity) / totalLiquidity) * 100
        : 0,
      bidLiquidity,
      askLiquidity,
      bids: topBids,
      asks: topAsks,
    }
    const metadata: ReplayOrderbookCacheMetadata = {
      sourceFile: path.resolve(input.file),
      totalRows,
      rowsProcessed,
      snapshotRows,
      updateRows,
      bidLevelCount: bids.size,
      askLevelCount: asks.size,
    }

    await writeHistoricalCache({
      identity,
      source,
      schemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
      data: payload,
      metadata,
      expiresAt: null,
      status: "complete",
      recordCount: 1,
    })

    const completedAt = new Date().toISOString()
    job.status = "succeeded"
    job.completedAt = completedAt
    job.updatedAt = completedAt
    job.progress = { completed: rowsProcessed, total: totalRows, unit: "rows" }
    return { job, payload, metadata }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Replay orderbook cache generation failed."
    await writeHistoricalCacheFailure({
      identity,
      source,
      schemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
      status: "failed",
      metadata: {
        sourceFile: path.resolve(input.file),
        jobId: job.id,
      },
      error: {
        code: "replay_orderbook_cache_generation_failed",
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
  const exchange = argument("exchange")
  const symbol = argument("symbol")
  const date = argument("date")
  const hour = Number(argument("hour"))
  if (!file || !exchange || !symbol || !date || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Usage: --file <path> --exchange <id> --symbol <symbol> --date <YYYY-MM-DD> --hour <0-23>")
  }

  const result = await buildReplayOrderbookCache({ file, exchange, symbol, date, hour })
  process.stdout.write(`${JSON.stringify({
    cache: result.job.target.cache,
    schemaVersion: result.job.target.schemaVersion,
    rowsProcessed: result.metadata.rowsProcessed,
    generatedAt: result.job.completedAt,
  }, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
