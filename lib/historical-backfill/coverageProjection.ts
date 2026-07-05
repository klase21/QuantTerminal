import { createHash } from "node:crypto"

import {
  COVERAGE_DATASETS,
  REPOSITORY_COVERAGE_STATUSES,
  createCoverageResultKey,
  type RepositoryCoverageReport,
  type RepositoryCoverageResult,
} from "@/lib/historical-backfill/coverageEngine"
import {
  isProviderAvailabilityStatus,
} from "@/lib/historical-backfill/repositoryHealth"
import {
  COVERAGE_PROJECTION_KIND,
  evaluateProjectionFreshness,
  createProjectionLifecycleMetadata,
  type ProjectionLifecycleMetadata,
  type ProjectionReadStatus,
} from "@/lib/historical-backfill/projectionLifecycle"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { HistoricalProviderMetadataTargetKind } from "@/lib/persistence/repository/types"
import type { StorageJsonValue } from "@/lib/persistence/types"

export const HISTORICAL_COVERAGE_PROJECTION_SCHEMA_VERSION = 2 as const

export interface HistoricalCoverageProjection
  extends RepositoryCoverageResult, ProjectionLifecycleMetadata {}

export interface CoverageProjectionWriteResult {
  readonly status: "SUCCESS" | "DUPLICATE" | "VALIDATION_ERROR" | "PERSISTENCE_ERROR"
  readonly totalRecords: number
  readonly persistedCount: number
  readonly duplicateCount: number
  readonly errors: readonly string[]
}

export interface CoverageProjectionReadResult {
  readonly status: "SUCCESS" | "PARTIAL" | "VALIDATION_ERROR" | "UNAVAILABLE"
  readonly symbol: string
  readonly utcDay: string
  readonly projectionStatus: ProjectionReadStatus
  readonly projections: readonly HistoricalCoverageProjection[]
  readonly errors: readonly string[]
}

function projectionWatermark(result: RepositoryCoverageResult): string {
  return createHash("sha256").update(JSON.stringify({
    key: createCoverageResultKey(result),
    expectedRecords: result.expectedRecords,
    actualRecords: result.actualRecords,
    coverageStatus: result.repositoryCoverageStatus,
    firstObservedAt: result.firstObservedAt,
    lastObservedAt: result.lastObservedAt,
    provider: result.provider,
    providerTier: result.providerTier,
    canonical: result.canonical,
    verified: result.verified,
    confidence: result.confidence,
  })).digest("hex")
}

function createProjection(
  result: RepositoryCoverageResult,
  computedAt: string,
): HistoricalCoverageProjection | null {
  if (!Number.isFinite(Date.parse(computedAt)) || result.resolution === null
    || result.coverageMode === null || result.provider === null
    || result.providerTier === null || result.canonical === null
    || result.verified === null || result.confidence === null) return null
  return Object.freeze({
    ...result,
    ...createProjectionLifecycleMetadata({
      symbol: result.symbol,
      utcDay: result.utcDay,
      computedAt,
      sourceRepositoryWatermark: projectionWatermark(result),
      sourceRecordCount: result.actualRecords,
    }),
  })
}

export async function writeCoverageProjection(input: {
  readonly repository: PersistenceRepository
  readonly report: RepositoryCoverageReport
  readonly computedAt: string
}): Promise<CoverageProjectionWriteResult> {
  if (!Number.isFinite(Date.parse(input.computedAt)) || input.report.datasets.length === 0) {
    return Object.freeze({ status: "VALIDATION_ERROR", totalRecords: 0, persistedCount: 0, duplicateCount: 0, errors: Object.freeze(["computedAt and a non-empty coverage report are required."]) })
  }
  let persistedCount = 0
  let duplicateCount = 0
  const errors: string[] = []
  for (const result of input.report.datasets) {
    const projection = createProjection(result, input.computedAt)
    if (!projection) {
      errors.push(`${result.dataset}: coverage result cannot be projected without canonical metadata.`)
      continue
    }
    const payload = Object.freeze({
      dataset: projection.dataset,
      projectionKind: projection.projectionKind,
      symbol: projection.symbol,
      utcDay: projection.utcDay,
      resolution: projection.resolution,
      coverageMode: projection.coverageMode,
      expectedRecords: projection.expectedRecords,
      actualRecords: projection.actualRecords,
      coverageStatus: projection.repositoryCoverageStatus,
      coveragePercent: projection.coveragePercent,
      providerAvailabilityStatus: projection.providerAvailabilityStatus,
      provider: projection.provider,
      providerTier: projection.providerTier,
      canonical: projection.canonical,
      verified: projection.verified,
      confidence: projection.confidence,
      firstObservedAt: projection.firstObservedAt,
      lastObservedAt: projection.lastObservedAt,
      reason: projection.reason,
      computedAt: projection.computedAt,
      sourceRepositoryWatermark: projection.sourceRepositoryWatermark,
      sourceRecordCount: projection.sourceRecordCount,
      stale: projection.stale,
      recomputeRequired: projection.recomputeRequired,
      projectionVersion: projection.projectionVersion,
    })
    const checksum = createHash("sha256").update(JSON.stringify(payload)).digest("hex")
    const write = await input.repository.saveHistoricalCoverageProjection({
      datasetKind: projection.dataset,
      projectionKind: projection.projectionKind,
      symbol: projection.symbol,
      utcDay: projection.utcDay,
      resolution: projection.resolution,
      coverageMode: projection.coverageMode,
      expectedRecords: projection.expectedRecords,
      actualRecords: projection.actualRecords,
      coverageStatus: projection.repositoryCoverageStatus,
      coveragePercent: projection.coveragePercent,
      providerAvailabilityStatus: projection.providerAvailabilityStatus,
      provider: projection.provider,
      providerTier: projection.providerTier,
      canonical: projection.canonical,
      verified: projection.verified,
      confidence: projection.confidence,
      firstObservedAt: projection.firstObservedAt,
      lastObservedAt: projection.lastObservedAt,
      reason: projection.reason,
      computedAt: projection.computedAt,
      sourceRepositoryWatermark: projection.sourceRepositoryWatermark,
      sourceRecordCount: projection.sourceRecordCount,
      stale: projection.stale,
      recomputeRequired: projection.recomputeRequired,
      projectionVersion: projection.projectionVersion,
      schemaVersion: HISTORICAL_COVERAGE_PROJECTION_SCHEMA_VERSION,
      recordedAt: input.computedAt,
      payload: payload as unknown as StorageJsonValue,
      checksum,
    })
    if (write.status === "SUCCESS") persistedCount += 1
    else if (write.status === "DUPLICATE") duplicateCount += 1
    else errors.push(`${result.dataset}: projection write returned ${write.status}.`)
  }
  const totalRecords = input.report.datasets.length
  return Object.freeze({
    status: errors.length > 0 ? "PERSISTENCE_ERROR"
      : persistedCount === 0 && duplicateCount === totalRecords ? "DUPLICATE" : "SUCCESS",
    totalRecords,
    persistedCount,
    duplicateCount,
    errors: Object.freeze(errors),
  })
}

const COVERAGE_STATUS_SET = new Set<string>(REPOSITORY_COVERAGE_STATUSES)

function parseProjection(payload: unknown): HistoricalCoverageProjection | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null
  const value = payload as Record<string, unknown>
  if (!COVERAGE_DATASETS.includes(value.dataset as HistoricalProviderMetadataTargetKind)
    || typeof value.symbol !== "string" || typeof value.utcDay !== "string"
    || typeof value.resolution !== "string" || typeof value.coverageMode !== "string"
    || (value.expectedRecords !== null && !Number.isInteger(value.expectedRecords))
    || !Number.isInteger(value.actualRecords) || (value.actualRecords as number) < 0
    || !COVERAGE_STATUS_SET.has(value.coverageStatus as string)
    || (value.coveragePercent !== null && typeof value.coveragePercent !== "number")
    || !isProviderAvailabilityStatus(value.providerAvailabilityStatus)
    || typeof value.provider !== "string" || typeof value.providerTier !== "string"
    || typeof value.canonical !== "boolean" || typeof value.verified !== "boolean"
    || typeof value.confidence !== "number"
    || (value.firstObservedAt !== null && typeof value.firstObservedAt !== "string")
    || (value.lastObservedAt !== null && typeof value.lastObservedAt !== "string")
    || typeof value.reason !== "string" || typeof value.computedAt !== "string"
    || !Number.isFinite(Date.parse(value.computedAt))
    || typeof value.sourceRepositoryWatermark !== "string"
    || !Number.isInteger(value.sourceRecordCount)
    || value.sourceRecordCount !== value.actualRecords
    || (value.projectionKind !== undefined && value.projectionKind !== COVERAGE_PROJECTION_KIND)
    || (value.stale !== undefined && typeof value.stale !== "boolean")
    || (value.recomputeRequired !== undefined && typeof value.recomputeRequired !== "boolean")
    || (value.projectionVersion !== undefined
      && (!Number.isInteger(value.projectionVersion) || (value.projectionVersion as number) <= 0))) return null
  const lifecycle: ProjectionLifecycleMetadata = Object.freeze({
    projectionKind: value.projectionKind === COVERAGE_PROJECTION_KIND
      ? COVERAGE_PROJECTION_KIND : COVERAGE_PROJECTION_KIND,
    symbol: value.symbol as string,
    utcDay: value.utcDay as string,
    computedAt: value.computedAt as string,
    sourceRepositoryWatermark: value.sourceRepositoryWatermark as string,
    sourceRecordCount: value.sourceRecordCount as number,
    stale: typeof value.stale === "boolean" ? value.stale : false,
    recomputeRequired: typeof value.recomputeRequired === "boolean" ? value.recomputeRequired : false,
    projectionVersion: Number.isInteger(value.projectionVersion)
      ? value.projectionVersion as number : 1,
  })
  return Object.freeze({
    dataset: value.dataset,
    symbol: value.symbol,
    utcDay: value.utcDay,
    resolution: value.resolution,
    coverageMode: value.coverageMode,
    expectedRecords: value.expectedRecords,
    actualRecords: value.actualRecords,
    coveragePercent: value.coveragePercent,
    repositoryCoverageStatus: value.coverageStatus,
    providerAvailabilityStatus: value.providerAvailabilityStatus,
    provider: value.provider,
    providerTier: value.providerTier,
    canonical: value.canonical,
    verified: value.verified,
    confidence: value.confidence,
    firstObservedAt: value.firstObservedAt,
    lastObservedAt: value.lastObservedAt,
    reason: value.reason,
    ...lifecycle,
  } as HistoricalCoverageProjection)
}

export async function readCoverageProjectionRecords(input: {
  readonly repository: PersistenceRepository
  readonly symbol: string
  readonly utcDay: string
  readonly now?: string
}): Promise<CoverageProjectionReadResult> {
  const symbol = input.symbol.trim().toUpperCase()
  if (!/^[A-Z0-9]{5,24}$/.test(symbol) || !/^\d{4}-\d{2}-\d{2}$/.test(input.utcDay)) {
    return Object.freeze({ status: "VALIDATION_ERROR", symbol, utcDay: input.utcDay, projectionStatus: "PROJECTION_MISSING", projections: Object.freeze([]), errors: Object.freeze(["symbol and utcDay must be canonical values."]) })
  }
  const latest = new Map<HistoricalProviderMetadataTargetKind, HistoricalCoverageProjection>()
  let cursor: string | undefined
  do {
    const page = await input.repository.listStorageRecords({
      recordKinds: ["HISTORICAL_COVERAGE_PROJECTION"],
      limit: 100,
      ...(cursor ? { cursor } : {}),
    })
    if (page.status !== "SUCCESS") {
      return Object.freeze({ status: "UNAVAILABLE", symbol, utcDay: input.utcDay, projectionStatus: "PROJECTION_MISSING", projections: Object.freeze([]), errors: Object.freeze([`Projection read returned ${page.status}.`]) })
    }
    for (const record of page.value.records) {
      const projection = parseProjection(record.payload)
      if (!projection || projection.symbol !== symbol || projection.utcDay !== input.utcDay) continue
      const current = latest.get(projection.dataset)
      if (!current || projection.projectionVersion > current.projectionVersion
        || (projection.projectionVersion === current.projectionVersion
          && projection.computedAt > current.computedAt)) latest.set(projection.dataset, projection)
    }
    cursor = page.value.nextCursor ?? undefined
  } while (cursor)

  const projections: HistoricalCoverageProjection[] = []
  const errors: string[] = []
  for (const dataset of COVERAGE_DATASETS) {
    const projection = latest.get(dataset)
    if (!projection) {
      errors.push(`${dataset}: projection is missing.`)
      continue
    }
    const freshness = evaluateProjectionFreshness(projection, input.now)
    projections.push(Object.freeze({
      ...projection,
      stale: freshness.stale,
      recomputeRequired: freshness.recomputeRequired,
    }))
  }
  const projectionStatus: ProjectionReadStatus = errors.length > 0
    ? "PROJECTION_MISSING"
    : projections.some((projection) => projection.stale) ? "STALE" : "AVAILABLE"
  return Object.freeze({
    status: errors.length === 0 ? "SUCCESS" : projections.length > 0 ? "PARTIAL" : "UNAVAILABLE",
    symbol,
    utcDay: input.utcDay,
    projectionStatus,
    projections: Object.freeze(projections),
    errors: Object.freeze(errors),
  })
}

export async function readCoverageProjection(input: {
  readonly repository: PersistenceRepository
  readonly symbol: string
  readonly utcDay: string
  readonly now?: string
}): Promise<RepositoryCoverageReport> {
  const read = await readCoverageProjectionRecords(input)
  const datasets: RepositoryCoverageResult[] = read.projections.map((projection) => {
    const { projectionKind: _projectionKind, computedAt: _computedAt,
      sourceRepositoryWatermark: _watermark, sourceRecordCount: _sourceRecordCount,
      stale: _stale, recomputeRequired: _recomputeRequired,
      projectionVersion: _projectionVersion, ...result } = projection
    return Object.freeze(result)
  })
  return Object.freeze({
    status: read.status,
    symbol: read.symbol,
    utcDay: read.utcDay,
    datasets: Object.freeze(datasets),
    errors: read.errors,
  })
}
