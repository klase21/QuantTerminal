export const COVERAGE_PROJECTION_KIND = "REPOSITORY_COVERAGE" as const
export const COVERAGE_PROJECTION_VERSION = 2 as const
export const COVERAGE_PROJECTION_MAX_AGE_MS = 24 * 60 * 60 * 1000

export const PROJECTION_READ_STATUSES = [
  "AVAILABLE",
  "STALE",
  "PROJECTION_MISSING",
] as const

export type ProjectionReadStatus = typeof PROJECTION_READ_STATUSES[number]

export interface ProjectionLifecycleMetadata {
  readonly projectionKind: typeof COVERAGE_PROJECTION_KIND
  readonly symbol: string
  readonly utcDay: string
  readonly computedAt: string
  readonly sourceRecordCount: number
  readonly sourceRepositoryWatermark: string
  readonly stale: boolean
  readonly recomputeRequired: boolean
  readonly projectionVersion: number
}

export interface ProjectionFreshnessResult {
  readonly status: "AVAILABLE" | "STALE"
  readonly stale: boolean
  readonly recomputeRequired: boolean
  readonly ageMs: number | null
  readonly reason: string
}

export function createProjectionLifecycleMetadata(input: {
  readonly symbol: string
  readonly utcDay: string
  readonly computedAt: string
  readonly sourceRecordCount: number
  readonly sourceRepositoryWatermark: string
}): ProjectionLifecycleMetadata {
  return Object.freeze({
    projectionKind: COVERAGE_PROJECTION_KIND,
    symbol: input.symbol,
    utcDay: input.utcDay,
    computedAt: input.computedAt,
    sourceRecordCount: input.sourceRecordCount,
    sourceRepositoryWatermark: input.sourceRepositoryWatermark,
    stale: false,
    recomputeRequired: false,
    projectionVersion: COVERAGE_PROJECTION_VERSION,
  })
}

export function evaluateProjectionFreshness(
  metadata: ProjectionLifecycleMetadata,
  now: string = new Date().toISOString(),
): ProjectionFreshnessResult {
  const computedTime = Date.parse(metadata.computedAt)
  const nowTime = Date.parse(now)
  if (!Number.isFinite(computedTime) || !Number.isFinite(nowTime)
    || metadata.projectionKind !== COVERAGE_PROJECTION_KIND
    || !Number.isInteger(metadata.sourceRecordCount) || metadata.sourceRecordCount < 0
    || metadata.sourceRepositoryWatermark.trim().length === 0
    || !Number.isInteger(metadata.projectionVersion) || metadata.projectionVersion <= 0) {
    return Object.freeze({ status: "STALE", stale: true, recomputeRequired: true, ageMs: null, reason: "Projection lifecycle metadata is invalid." })
  }
  const ageMs = nowTime - computedTime
  if (metadata.projectionVersion < COVERAGE_PROJECTION_VERSION) {
    return Object.freeze({ status: "STALE", stale: true, recomputeRequired: true, ageMs, reason: "Projection version is older than the current lifecycle contract." })
  }
  if (metadata.stale || metadata.recomputeRequired) {
    return Object.freeze({ status: "STALE", stale: true, recomputeRequired: true, ageMs, reason: "Projection was explicitly marked for recomputation." })
  }
  if (ageMs < 0) {
    return Object.freeze({ status: "STALE", stale: true, recomputeRequired: true, ageMs, reason: "Projection computation timestamp is in the future." })
  }
  if (ageMs > COVERAGE_PROJECTION_MAX_AGE_MS) {
    return Object.freeze({ status: "STALE", stale: true, recomputeRequired: true, ageMs, reason: "Projection exceeded the 24-hour freshness window." })
  }
  return Object.freeze({ status: "AVAILABLE", stale: false, recomputeRequired: false, ageMs, reason: "Projection is current under the lifecycle policy." })
}
