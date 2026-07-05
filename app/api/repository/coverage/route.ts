import path from "node:path"

import { NextResponse } from "next/server"

import { readCoverageProjectionRecords } from "@/lib/historical-backfill/coverageProjection"
import { evaluateProjectionRepositoryHealth } from "@/lib/historical-backfill/repositoryHealth"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import { createPostgresPersistenceRepository } from "@/lib/persistence/postgres"
import { createSQLitePersistenceRepository } from "@/lib/persistence/sqlite"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"

function createCoverageRepository(): PersistenceRepository {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawSymbol = searchParams.get("symbol")?.trim() ?? ""
  const symbol = rawSymbol.toUpperCase()
  const utcDay = searchParams.get("date")?.trim() ?? ""

  if (!/^[A-Z0-9]{5,24}$/.test(symbol)) {
    return json({
      ok: false,
      symbol,
      utcDay,
      generatedFromProjection: false,
      projectionStatus: "VALIDATION_ERROR",
      reason: "symbol must be a canonical market symbol.",
      datasets: [],
    }, 400)
  }
  if (!isUtcDay(utcDay)) {
    return json({
      ok: false,
      symbol,
      utcDay,
      generatedFromProjection: false,
      projectionStatus: "VALIDATION_ERROR",
      reason: "date must be a valid UTC calendar day in YYYY-MM-DD format.",
      datasets: [],
    }, 400)
  }

  const read = await readCoverageProjectionRecords({
    repository: createCoverageRepository(),
    symbol,
    utcDay,
  })
  const projectionMissing = read.projectionStatus === "PROJECTION_MISSING"
    && read.errors.length > 0
    && read.errors.every((error) => error.endsWith("projection is missing."))
  if (projectionMissing) {
    return json({
      ok: false,
      symbol,
      utcDay,
      generatedFromProjection: false,
      projectionStatus: "PROJECTION_MISSING",
      projectionHealth: evaluateProjectionRepositoryHealth("PROJECTION_MISSING"),
      reason: "No complete precomputed repository coverage projection exists for this symbol and UTC day.",
      datasets: [],
    }, 404)
  }
  if (read.status === "UNAVAILABLE" || read.status === "VALIDATION_ERROR") {
    return json({
      ok: false,
      symbol,
      utcDay,
      generatedFromProjection: false,
      projectionStatus: "UNAVAILABLE",
      reason: read.errors.join("; ") || "Repository coverage projection is unavailable.",
      datasets: [],
    }, 503)
  }
  if (read.projectionStatus === "PROJECTION_MISSING") {
    return json({
      ok: false,
      symbol,
      utcDay,
      generatedFromProjection: false,
      projectionStatus: "PROJECTION_MISSING",
      projectionHealth: evaluateProjectionRepositoryHealth("PROJECTION_MISSING"),
      reason: "No complete precomputed repository coverage projection exists for this symbol and UTC day.",
      datasets: [],
    }, 404)
  }

  return json({
    ok: true,
    symbol,
    utcDay,
    generatedFromProjection: true,
    projectionStatus: read.projectionStatus,
    projectionHealth: evaluateProjectionRepositoryHealth(read.projectionStatus),
    datasets: read.projections.map((projection) => ({
      dataset: projection.dataset,
      actualRecords: projection.actualRecords,
      expectedRecords: projection.expectedRecords,
      coverageStatus: projection.repositoryCoverageStatus,
      coveragePercent: projection.coveragePercent,
      resolution: projection.resolution,
      coverageMode: projection.coverageMode,
      providerTier: projection.providerTier,
      canonical: projection.canonical,
      verified: projection.verified,
      confidence: projection.confidence,
      firstObservedAt: projection.firstObservedAt,
      lastObservedAt: projection.lastObservedAt,
      computedAt: projection.computedAt,
      sourceRecordCount: projection.sourceRecordCount,
      sourceRepositoryWatermark: projection.sourceRepositoryWatermark,
      projectionKind: projection.projectionKind,
      stale: projection.stale,
      recomputeRequired: projection.recomputeRequired,
      projectionVersion: projection.projectionVersion,
    })),
  })
}
