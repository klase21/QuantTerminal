import {
  EVENT_IMPACT_HORIZONS,
  type EventImpactResult,
} from "@/core/event-impact/eventImpactTypes"
import type { HistoricalAnalogCachePayloadV2 } from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
import type { HistoricalInterval } from "@/types/historical"
import {
  createEvidenceValidity,
  legacyEvidenceValidity,
} from "./evidenceValidity"
import type {
  EvidenceCoverageStatus,
  EvidenceValidity,
} from "./evidenceValidityTypes"

const HISTORICAL_FRESHNESS_WINDOW_MS: Record<HistoricalInterval, number> = {
  "1h": 6 * 60 * 60 * 1000,
  "4h": 24 * 60 * 60 * 1000,
  "1d": 3 * 24 * 60 * 60 * 1000,
}

function historicalCoverage(payload: HistoricalAnalogCachePayloadV2): EvidenceCoverageStatus {
  if (!payload.cases.length) return "UNAVAILABLE"
  const horizonCounts = Object.values(payload.statistics.byHorizon).map((stats) => stats.caseCount)
  return horizonCounts.every((count) => count === payload.statistics.totalCases)
    ? "FULL"
    : "PARTIAL"
}

export function historicalAnalogEvidenceValidity(input: {
  payload: HistoricalAnalogCachePayloadV2
  generatedAt: string
  expiresAt?: string | null
  now?: string | number | Date
}): EvidenceValidity {
  return createEvidenceValidity({
    observedAt: input.payload.currentState.timestamp,
    generatedAt: input.generatedAt,
    expiresAt: input.expiresAt,
    freshnessWindowMs: HISTORICAL_FRESHNESS_WINDOW_MS[input.payload.interval],
    coverageStatus: historicalCoverage(input.payload),
    reason: "Freshness is measured from the cached current market-state observation.",
    now: input.now,
  })
}

function eventImpactCoverage(result: EventImpactResult): EvidenceCoverageStatus {
  if (!result.outcomes.length) return "UNAVAILABLE"
  const available = result.outcomes.flatMap((outcome) => (
    EVENT_IMPACT_HORIZONS.map((horizon) => outcome.outcomes[horizon].available)
  ))
  if (!available.some(Boolean)) return "UNAVAILABLE"
  return available.every(Boolean) ? "FULL" : "PARTIAL"
}

export function eventImpactEvidenceValidity(input: {
  result: EventImpactResult
  generatedAt?: string
}): EvidenceValidity {
  const observedAt = input.result.events
    .map((event) => Date.parse(event.timestamp))
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0]
  return createEvidenceValidity({
    observedAt: observedAt ?? null,
    generatedAt: input.generatedAt ?? input.result.source.generatedAt,
    coverageStatus: eventImpactCoverage(input.result),
    reason: "Event Impact V1 has no accepted age-based freshness policy; coverage reflects available outcome horizons.",
  })
}

export function ensureEvidenceValidity(
  value: unknown,
  fallback: {
    generatedAt: string
    observedAt?: string | number | Date | null
    reason?: string
  },
): EvidenceValidity {
  if (value && typeof value === "object" && "schemaVersion" in value) {
    const candidate = value as EvidenceValidity
    if (
      candidate.schemaVersion === 1
      && typeof candidate.generatedAt === "string"
      && typeof candidate.freshnessStatus === "string"
      && typeof candidate.coverageStatus === "string"
    ) {
      return candidate
    }
  }
  return legacyEvidenceValidity(fallback)
}
