import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
  HISTORICAL_STATE_DATASET_SCHEMA_VERSION,
  historicalAnalogCacheIdentity,
  historicalStateDatasetCacheIdentity,
  type HistoricalAnalogCacheMetadata,
  type HistoricalStateDatasetCacheMetadata,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogCache"
import { aggregateHistoricalAnalogOutcomes } from "@/core/historical-intelligence/analog-v2/aggregateOutcomes"
import { buildHistoricalMarketStatesV2 } from "@/core/historical-intelligence/analog-v2/buildMarketStates"
import { buildHistoricalAnalogOutcomes } from "@/core/historical-intelligence/analog-v2/buildOutcomes"
import {
  HISTORICAL_ANALOG_MINIMUM_COMPARABLE_FEATURES,
  findHistoricalAnalogsV2,
} from "@/core/historical-intelligence/analog-v2/searchAnalogs"
import type {
  HistoricalAnalogCachePayloadV2,
  HistoricalStateDatasetV2,
  HistoricalStateEnrichmentPoint,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
import type { HistoricalIngestionJob } from "@/core/historical-intelligence/ingestion/ingestionJobTypes"
import {
  writeHistoricalCache,
  writeHistoricalCacheFailure,
} from "@/lib/historical-intelligence/cache/fileCacheStore"
import type { HistoricalInterval, MarketOhlcvRow } from "@/types/historical"

export interface HistoricalAnalogCacheBuildInput {
  file: string
  symbol: string
  interval: HistoricalInterval
  asOf?: string | number
  enrichmentFile?: string
  limit?: number
}

export interface HistoricalAnalogCacheBuildResult {
  job: HistoricalIngestionJob
  payload: HistoricalAnalogCachePayloadV2
}

function validInterval(value: string): value is HistoricalInterval {
  return value === "1h" || value === "4h" || value === "1d"
}

function parseAsOf(value: string | number | undefined) {
  if (value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const numericValue = Number(value)
  if (Number.isFinite(numericValue) && numericValue > 0) return numericValue
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function readJsonArray(file: string): Promise<unknown[]> {
  const raw = await readFile(file, "utf8")
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error(`${path.basename(file)} must contain a JSON array.`)
  return parsed
}

function isOhlcvRow(value: unknown): value is MarketOhlcvRow {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<MarketOhlcvRow>
  return (
    typeof row.symbol === "string"
    && validInterval(String(row.interval))
    && Number.isFinite(row.openTime)
    && Number.isFinite(row.close)
    && Number.isFinite(row.volume)
  )
}

function isEnrichmentPoint(value: unknown): value is HistoricalStateEnrichmentPoint {
  if (!value || typeof value !== "object") return false
  const point = value as Partial<HistoricalStateEnrichmentPoint>
  return Number.isFinite(point.timestamp)
}

function buildJob(input: HistoricalAnalogCacheBuildInput, source: string): HistoricalIngestionJob {
  const now = new Date().toISOString()
  return {
    id: `historical-analog-v2:${input.symbol}:${input.interval}:${now}`,
    kind: "cache_generation",
    source: {
      id: source,
      kind: "primary",
      metadata: { file: path.basename(input.file) },
    },
    target: {
      cache: historicalAnalogCacheIdentity(input),
      schemaVersion: HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
    },
    status: "running",
    dimensions: {
      symbol: input.symbol,
      interval: input.interval,
    },
    options: {
      asOf: input.asOf ?? null,
      limit: input.limit ?? 25,
      enrichmentFile: input.enrichmentFile ?? null,
    },
    progress: { completed: 0, unit: "rows" },
    attempt: 1,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
  }
}

export async function buildHistoricalAnalogCacheV2(
  input: HistoricalAnalogCacheBuildInput,
): Promise<HistoricalAnalogCacheBuildResult> {
  const symbol = input.symbol.trim().toUpperCase()
  const rows = (await readJsonArray(input.file))
    .filter(isOhlcvRow)
    .filter((row) => row.symbol === symbol && row.interval === input.interval)
    .sort((left, right) => left.openTime - right.openTime)
  if (!rows.length) throw new Error(`No ${symbol} ${input.interval} OHLCV rows were found.`)

  const sourceId = rows[0].source
  const source = {
    id: sourceId,
    kind: "primary" as const,
    metadata: { dataset: "ohlcv", file: path.basename(input.file) },
  }
  const stateIdentity = historicalStateDatasetCacheIdentity({
    source: sourceId,
    symbol,
    interval: input.interval,
  })
  const analogIdentity = historicalAnalogCacheIdentity({ symbol, interval: input.interval })
  const job = buildJob({ ...input, symbol }, sourceId)

  await writeHistoricalCacheFailure({
    identity: analogIdentity,
    source,
    schemaVersion: HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
    status: "generating",
    metadata: { sourceFile: path.resolve(input.file), jobId: job.id },
  })

  try {
    const enrichment = input.enrichmentFile
      ? (await readJsonArray(input.enrichmentFile)).filter(isEnrichmentPoint)
      : []
    const states = buildHistoricalMarketStatesV2({ rows, source: sourceId, enrichment })
    const outcomes = buildHistoricalAnalogOutcomes(rows, states)
    const asOf = parseAsOf(input.asOf)
    if (input.asOf !== undefined && asOf === null) throw new Error("asOf must be a timestamp or ISO date.")
    const currentState = [...states]
      .reverse()
      .find((state) => asOf === null || state.timestamp <= asOf)
    if (!currentState) throw new Error("No market state exists at or before the requested asOf time.")

    const stateDataset: HistoricalStateDatasetV2 = {
      source: sourceId,
      symbol,
      interval: input.interval,
      states,
      outcomes,
    }
    const stateMetadata: HistoricalStateDatasetCacheMetadata = {
      sourceFile: path.resolve(input.file),
      inputRows: rows.length,
      stateCount: states.length,
      outcomeCount: outcomes.length,
      firstTimestamp: states[0]?.timestamp ?? null,
      lastTimestamp: states.at(-1)?.timestamp ?? null,
    }
    await writeHistoricalCache({
      identity: stateIdentity,
      source,
      schemaVersion: HISTORICAL_STATE_DATASET_SCHEMA_VERSION,
      data: stateDataset,
      metadata: stateMetadata,
      expiresAt: null,
      recordCount: states.length,
    })

    const search = findHistoricalAnalogsV2({
      currentState,
      states,
      outcomes,
      limit: input.limit,
    })
    const payload: HistoricalAnalogCachePayloadV2 = {
      source: sourceId,
      symbol,
      interval: input.interval,
      currentState,
      cases: search.cases,
      statistics: aggregateHistoricalAnalogOutcomes(search.cases),
      search: {
        candidateCount: search.candidateCount,
        minimumComparableFeatures: HISTORICAL_ANALOG_MINIMUM_COMPARABLE_FEATURES,
        exclusionWindowMs: search.exclusionWindowMs,
      },
    }
    const analogMetadata: HistoricalAnalogCacheMetadata = {
      stateDatasetSchemaVersion: HISTORICAL_STATE_DATASET_SCHEMA_VERSION,
      currentStateId: currentState.id,
      candidateCount: search.candidateCount,
      analogCount: search.cases.length,
    }
    await writeHistoricalCache({
      identity: analogIdentity,
      source,
      schemaVersion: HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
      data: payload,
      metadata: analogMetadata,
      expiresAt: null,
      recordCount: search.cases.length,
    })

    const completedAt = new Date().toISOString()
    job.status = "succeeded"
    job.completedAt = completedAt
    job.updatedAt = completedAt
    job.progress = { completed: rows.length, total: rows.length, unit: "rows" }
    return { job, payload }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Historical Analog V2 cache generation failed."
    await writeHistoricalCacheFailure({
      identity: analogIdentity,
      source,
      schemaVersion: HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
      status: "failed",
      metadata: { sourceFile: path.resolve(input.file), jobId: job.id },
      error: {
        code: "historical_analog_v2_generation_failed",
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
  const symbol = argument("symbol")
  const interval = argument("interval")
  if (!file || !symbol || !interval || !validInterval(interval)) {
    throw new Error("Usage: --file <market_ohlcv.json> --symbol <symbol> --interval <1h|4h|1d> [--as-of <time>] [--enrichment-file <json>] [--limit <count>]")
  }

  const result = await buildHistoricalAnalogCacheV2({
    file,
    symbol,
    interval,
    asOf: argument("as-of"),
    enrichmentFile: argument("enrichment-file"),
    limit: Number(argument("limit")) || 25,
  })
  process.stdout.write(`${JSON.stringify({
    cache: result.job.target.cache,
    schemaVersion: result.job.target.schemaVersion,
    currentState: result.payload.currentState.id,
    analogCount: result.payload.cases.length,
    generatedAt: result.job.completedAt,
  }, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
