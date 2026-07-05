import path from "node:path"

import { NextResponse } from "next/server"

import { readCoverageProjectionRecords } from "@/lib/historical-backfill/coverageProjection"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import { createPostgresPersistenceRepository } from "@/lib/persistence/postgres"
import { createSQLitePersistenceRepository } from "@/lib/persistence/sqlite"
import type { StorageRecordKind } from "@/lib/persistence/recordKind"
import type { StorageRecord } from "@/lib/persistence/types"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"

const DATASETS = {
  market: "HISTORICAL_MARKET",
  open_interest: "HISTORICAL_OPEN_INTEREST",
  liquidation: "HISTORICAL_LIQUIDATION",
  funding: "HISTORICAL_FUNDING",
  agg_trade: "HISTORICAL_AGG_TRADE",
} as const satisfies Record<string, StorageRecordKind>

type ReplayRepositoryDataset = keyof typeof DATASETS

const DEFAULT_AGG_TRADE_LIMIT = 1000
const MAX_AGG_TRADE_LIMIT = 5000

function createReplayRepository(): PersistenceRepository {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (databaseUrl) return createPostgresPersistenceRepository(databaseUrl)
  const databasePath = process.env.HISTORICAL_REPOSITORY_PATH?.trim()
    || path.join(process.cwd(), ".data", "historical-backfill.sqlite")
  return createSQLitePersistenceRepository(databasePath)
}

function isUtcDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  })
}

function hourRange(utcDay: string, hour: number) {
  const startMs = Date.parse(`${utcDay}T${String(hour).padStart(2, "0")}:00:00.000Z`)
  return Object.freeze({
    start: new Date(startMs).toISOString(),
    endExclusive: new Date(startMs + 60 * 60 * 1000).toISOString(),
    inclusiveEnd: new Date(startMs + 60 * 60 * 1000 - 1).toISOString(),
  })
}

function payloadIdentity(record: StorageRecord) {
  if (!record.payload || typeof record.payload !== "object" || Array.isArray(record.payload)) return null
  const payload = record.payload as Record<string, unknown>
  return typeof payload.symbol === "string" && typeof payload.sourceId === "string"
    ? { symbol: payload.symbol, sourceId: payload.sourceId }
    : null
}

function responseRecord(record: StorageRecord) {
  return Object.freeze({
    recordId: record.recordId,
    observedAt: record.createdAt,
    payload: record.payload,
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get("symbol")?.trim() ?? "").toUpperCase()
  const date = searchParams.get("date")?.trim() ?? ""
  const hourValue = searchParams.get("hour")?.trim() ?? ""
  const datasetValue = searchParams.get("dataset")?.trim() ?? ""
  const dataset = datasetValue in DATASETS ? datasetValue as ReplayRepositoryDataset : null
  const hour = Number(hourValue)

  if (!/^[A-Z0-9]{5,24}$/.test(symbol) || !isUtcDay(date)
    || !/^\d{1,2}$/.test(hourValue) || !Number.isInteger(hour) || hour < 0 || hour > 23
    || dataset === null) {
    return json({ ok: false, status: "VALIDATION_ERROR", reason: "symbol, date, hour, and dataset must be canonical bounded query values." }, 400)
  }

  let limit = dataset === "agg_trade" ? DEFAULT_AGG_TRADE_LIMIT : 1000
  const requestedLimit = searchParams.get("limit")
  if (requestedLimit !== null) {
    const parsed = Number(requestedLimit)
    if (!Number.isInteger(parsed) || parsed <= 0
      || (dataset === "agg_trade" && parsed > MAX_AGG_TRADE_LIMIT)) {
      return json({ ok: false, status: "VALIDATION_ERROR", reason: `limit must be a positive integer${dataset === "agg_trade" ? ` no greater than ${MAX_AGG_TRADE_LIMIT}` : ""}.` }, 400)
    }
    limit = dataset === "agg_trade" ? parsed : Math.min(parsed, 1000)
  }
  const cursor = searchParams.get("cursor")?.trim() || undefined
  const repository = createReplayRepository()
  const coverage = await readCoverageProjectionRecords({ repository, symbol, utcDay: date })
  if (coverage.projectionStatus === "PROJECTION_MISSING") {
    return json({ ok: false, status: "PROJECTION_MISSING", projectionStatus: coverage.projectionStatus, reason: "Repository Replay query requires a complete coverage projection." }, 404)
  }
  if (coverage.projectionStatus !== "AVAILABLE") {
    return json({ ok: false, status: "COVERAGE_NOT_READY", projectionStatus: coverage.projectionStatus, reason: "Repository Replay query requires an AVAILABLE coverage projection." }, 409)
  }

  const recordKind = DATASETS[dataset]
  const projection = coverage.projections.find((item) => item.dataset === recordKind)
  if (!projection) {
    return json({ ok: false, status: "PROJECTION_MISSING", projectionStatus: "PROJECTION_MISSING", reason: "Dataset coverage projection is missing." }, 404)
  }
  const range = hourRange(date, hour)
  const queryStart = dataset === "funding"
    ? new Date(Date.parse(range.start) - 24 * 60 * 60 * 1000).toISOString()
    : range.start
  const page = await repository.listStorageRecords({
    recordKinds: [recordKind],
    createdAfter: queryStart,
    createdBefore: range.inclusiveEnd,
    limit,
    ...(cursor ? { cursor } : {}),
  })
  if (page.status !== "SUCCESS") {
    return json({ ok: false, status: "REPOSITORY_UNAVAILABLE", projectionStatus: coverage.projectionStatus, reason: `Repository dataset read returned ${page.status}.` }, 503)
  }

  const matching = page.value.records.filter((record) => {
    const identity = payloadIdentity(record)
    return identity?.symbol === symbol && identity.sourceId === projection.provider
  })
  const selected = dataset === "funding"
    ? (() => {
        const inHour = matching.filter((record) => record.createdAt >= range.start && record.createdAt < range.endExclusive)
        return inHour.length > 0 ? inHour : matching.length > 0 ? [matching.at(-1)!] : []
      })()
    : matching
  const records = selected.map(responseRecord)

  return json({
    ok: true,
    symbol,
    date,
    hour,
    dataset,
    source: "repository",
    bounded: true,
    records,
    count: records.length,
    firstObservedAt: records[0]?.observedAt ?? null,
    lastObservedAt: records.at(-1)?.observedAt ?? null,
    providerTier: projection.providerTier,
    canonical: projection.canonical,
    verified: projection.verified,
    confidence: projection.confidence,
    truncated: dataset === "agg_trade" && page.value.nextCursor !== null,
    nextCursor: dataset === "agg_trade" ? page.value.nextCursor : null,
    limit: dataset === "agg_trade" ? limit : null,
  })
}
