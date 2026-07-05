export const REPLAY_COVERAGE_DEGRADED_REASONS = [
  "STALE_PROJECTION",
  "PROJECTION_MISSING",
  "COVERAGE_API_ERROR",
] as const

export type ReplayCoverageDegradedReason = typeof REPLAY_COVERAGE_DEGRADED_REASONS[number]
export type ReplayCoverageProjectionStatus = "AVAILABLE" | "STALE" | "PROJECTION_MISSING" | "ERROR"

export interface ReplayCoverageGateResult {
  readonly repositoryReady: boolean
  readonly projectionStatus: ReplayCoverageProjectionStatus
  readonly degradedReason: ReplayCoverageDegradedReason | null
  readonly detail: string
}

interface CoverageApiPayload {
  readonly projectionStatus?: unknown
  readonly reason?: unknown
}

function result(
  repositoryReady: boolean,
  projectionStatus: ReplayCoverageProjectionStatus,
  degradedReason: ReplayCoverageDegradedReason | null,
  detail: string,
): ReplayCoverageGateResult {
  return Object.freeze({ repositoryReady, projectionStatus, degradedReason, detail })
}

export function evaluateReplayCoverageGatePayload(
  payload: CoverageApiPayload,
  responseOk: boolean,
): ReplayCoverageGateResult {
  const detail = typeof payload.reason === "string" ? payload.reason : null
  if (responseOk && payload.projectionStatus === "AVAILABLE") {
    return result(true, "AVAILABLE", null, "Repository coverage projection is current.")
  }
  if (responseOk && payload.projectionStatus === "STALE") {
    return result(false, "STALE", "STALE_PROJECTION", detail ?? "Repository coverage projection is stale.")
  }
  if (payload.projectionStatus === "PROJECTION_MISSING") {
    return result(false, "PROJECTION_MISSING", "PROJECTION_MISSING", detail ?? "Repository coverage projection is missing.")
  }
  return result(false, "ERROR", "COVERAGE_API_ERROR", detail ?? "Repository coverage API is unavailable.")
}

export async function checkReplayCoverageGate(input: {
  readonly symbol: string
  readonly utcDay: string
  readonly signal?: AbortSignal
  readonly fetchImpl?: typeof fetch
}): Promise<ReplayCoverageGateResult> {
  const symbol = input.symbol.trim().toUpperCase()
  if (!/^[A-Z0-9]{5,24}$/.test(symbol) || !/^\d{4}-\d{2}-\d{2}$/.test(input.utcDay)) {
    return result(false, "ERROR", "COVERAGE_API_ERROR", "Replay coverage request identity is invalid.")
  }
  const params = new URLSearchParams({ symbol, date: input.utcDay })
  try {
    const response = await (input.fetchImpl ?? fetch)(`/api/repository/coverage?${params.toString()}`, {
      cache: "no-store",
      signal: input.signal,
    })
    const payload = await response.json() as CoverageApiPayload
    return evaluateReplayCoverageGatePayload(payload, response.ok)
  } catch {
    return result(false, "ERROR", "COVERAGE_API_ERROR", "Repository coverage API request failed.")
  }
}
