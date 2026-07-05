export type ResearchRepositoryProjectionStatus = "AVAILABLE" | "STALE" | "PROJECTION_MISSING" | "UNAVAILABLE"

export interface ResearchRepositoryCoverageDataset {
  readonly dataset: string
  readonly actualRecords: number
  readonly expectedRecords: number | null
  readonly coverageStatus: string
  readonly coveragePercent: number | null
  readonly resolution: string
  readonly coverageMode: string
  readonly providerTier: string
  readonly canonical: boolean
  readonly verified: boolean
  readonly confidence: number
  readonly firstObservedAt: string | null
  readonly lastObservedAt: string | null
  readonly computedAt: string
  readonly sourceRecordCount: number
  readonly sourceRepositoryWatermark: string
}

export interface ResearchRepositoryCoverageResponse {
  readonly ok: true
  readonly symbol: string
  readonly utcDay: string
  readonly generatedFromProjection: true
  readonly projectionStatus: "AVAILABLE"
  readonly datasets: readonly ResearchRepositoryCoverageDataset[]
}

export type ResearchRepositoryClientResult =
  | { readonly status: "AVAILABLE"; readonly value: ResearchRepositoryCoverageResponse }
  | { readonly status: "STALE" | "PROJECTION_MISSING" | "UNAVAILABLE" | "VALIDATION_ERROR"; readonly reason: string }

interface ResearchRepositoryCoveragePayload {
  readonly ok?: unknown
  readonly symbol?: unknown
  readonly utcDay?: unknown
  readonly generatedFromProjection?: unknown
  readonly projectionStatus?: unknown
  readonly datasets?: unknown
  readonly reason?: unknown
}

function validUtcDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function loadResearchRepositoryCoverage(input: {
  readonly symbol: string
  readonly utcDay: string
  readonly signal?: AbortSignal
  readonly fetchImpl?: typeof fetch
}): Promise<ResearchRepositoryClientResult> {
  const symbol = input.symbol.trim().toUpperCase()
  if (!/^[A-Z0-9]{5,24}$/.test(symbol) || !validUtcDay(input.utcDay)) {
    return Object.freeze({ status: "VALIDATION_ERROR", reason: "Research Repository symbol or UTC day is invalid." })
  }

  const params = new URLSearchParams({ symbol, date: input.utcDay })
  try {
    const response = await (input.fetchImpl ?? fetch)(`/api/repository/coverage?${params.toString()}`, {
      cache: "no-store",
      signal: input.signal,
    })
    const payload = await response.json() as ResearchRepositoryCoveragePayload
    if (payload.projectionStatus === "STALE") {
      return Object.freeze({ status: "STALE", reason: typeof payload.reason === "string" ? payload.reason : "Repository coverage projection is stale." })
    }
    if (payload.projectionStatus === "PROJECTION_MISSING") {
      return Object.freeze({ status: "PROJECTION_MISSING", reason: typeof payload.reason === "string" ? payload.reason : "Repository coverage projection is missing." })
    }
    if (!response.ok || payload.ok !== true || payload.generatedFromProjection !== true
      || payload.projectionStatus !== "AVAILABLE" || !Array.isArray(payload.datasets)) {
      return Object.freeze({ status: "UNAVAILABLE", reason: typeof payload.reason === "string" ? payload.reason : "Repository coverage projection is unavailable." })
    }
    return Object.freeze({ status: "AVAILABLE", value: payload as ResearchRepositoryCoverageResponse })
  } catch {
    return Object.freeze({ status: "UNAVAILABLE", reason: "Repository coverage projection request failed." })
  }
}
