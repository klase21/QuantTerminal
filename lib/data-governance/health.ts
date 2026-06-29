import {
  isSourceDegradationReason,
  type SourceDegradationReason,
} from "@/lib/data-governance/degradation"
import { isSourceFreshness, type SourceFreshness } from "@/lib/data-governance/freshness"
import type { SourceFreshnessEvaluation } from "@/lib/data-governance/freshnessPolicy"
import { getSourceHealthPolicy } from "@/lib/data-governance/healthRules"
import { isSourceQuality, type SourceQuality } from "@/lib/data-governance/quality"
import { getSource } from "@/lib/data-governance/registry"
import { isSourceStatus, type SourceStatus } from "@/lib/data-governance/sourceStatus"
import { SOURCE_CRITICALITIES, type SourceCriticality } from "@/lib/data-governance/types"
import {
  isSourceUnavailableReason,
  type SourceUnavailableReason,
} from "@/lib/data-governance/unavailable"

export const SOURCE_HEALTH_LEVELS = [
  "HEALTHY",
  "DEGRADED",
  "UNAVAILABLE",
  "DISABLED",
  "UNKNOWN",
] as const

export type SourceHealthLevel = typeof SOURCE_HEALTH_LEVELS[number]

export const SOURCE_HEALTH_REASONS = [
  "CANONICAL_METADATA_HEALTHY",
  "SOURCE_NOT_REGISTERED",
  "PRODUCTION_NOT_APPROVED",
  "SOURCE_DISABLED",
  "SOURCE_STATUS_UNAVAILABLE",
  "UNAVAILABLE_REASON_PRESENT",
  "QUALITY_UNAVAILABLE",
  "FRESHNESS_EXPIRED",
  "FRESHNESS_STALE",
  "FRESHNESS_UNAVAILABLE",
  "QUALITY_LOW",
  "QUALITY_UNKNOWN",
  "SOURCE_STATUS_DEGRADED",
  "DEGRADED_REASON_PRESENT",
  "MISSING_CRITICALITY",
  "INVALID_CRITICALITY",
  "MISSING_SOURCE_STATUS",
  "INVALID_SOURCE_STATUS",
  "MISSING_FRESHNESS",
  "INVALID_FRESHNESS",
  "MISSING_QUALITY",
  "INVALID_QUALITY",
  "INVALID_REASON",
  "FRESHNESS_SOURCE_MISMATCH",
  "INSUFFICIENT_METADATA",
] as const

export type SourceHealthReason = typeof SOURCE_HEALTH_REASONS[number]

export interface SourceHealthCalculationInput {
  productionApproved?: boolean | null
  criticality?: SourceCriticality | null
  freshnessStatus?: SourceFreshness | null
  qualityLevel?: SourceQuality | null
  sourceStatus?: SourceStatus | null
  unavailableReason?: SourceUnavailableReason | null
  degradedReason?: SourceDegradationReason | null
}

export interface SourceHealthCalculation {
  health: SourceHealthLevel
  reason: SourceHealthReason
  productionApproved: boolean | null
  criticality: SourceCriticality | null
  freshnessStatus: SourceFreshness | null
  qualityLevel: SourceQuality | null
  sourceStatus: SourceStatus | null
  unavailableReason: SourceUnavailableReason | null
  degradedReason: SourceDegradationReason | null
}

export interface SourceHealthEvaluationInput {
  sourceId: string
  freshness?: SourceFreshnessEvaluation | null
  qualityLevel?: SourceQuality | null
  sourceStatus?: SourceStatus | null
  unavailableReason?: SourceUnavailableReason | null
  degradedReason?: SourceDegradationReason | null
}

export interface SourceHealthEvaluation extends SourceHealthCalculation {
  sourceId: string
  sourceName: string | null
}

const SOURCE_CRITICALITY_SET = new Set<string>(SOURCE_CRITICALITIES)

function isSourceCriticality(value: unknown): value is SourceCriticality {
  return typeof value === "string" && SOURCE_CRITICALITY_SET.has(value)
}

function result(
  health: SourceHealthLevel,
  reason: SourceHealthReason,
  input: SourceHealthCalculationInput,
): SourceHealthCalculation {
  return {
    health,
    reason,
    productionApproved: typeof input.productionApproved === "boolean" ? input.productionApproved : null,
    criticality: isSourceCriticality(input.criticality) ? input.criticality : null,
    freshnessStatus: isSourceFreshness(input.freshnessStatus) ? input.freshnessStatus : null,
    qualityLevel: isSourceQuality(input.qualityLevel) ? input.qualityLevel : null,
    sourceStatus: isSourceStatus(input.sourceStatus) ? input.sourceStatus : null,
    unavailableReason: isSourceUnavailableReason(input.unavailableReason) ? input.unavailableReason : null,
    degradedReason: isSourceDegradationReason(input.degradedReason) ? input.degradedReason : null,
  }
}

function missing(value: unknown): boolean {
  return value === null || value === undefined
}

export function isSourceHealthLevel(value: unknown): value is SourceHealthLevel {
  return typeof value === "string" && SOURCE_HEALTH_LEVELS.includes(value as SourceHealthLevel)
}

export function calculateSourceHealth(input: SourceHealthCalculationInput): SourceHealthCalculation {
  if (input.productionApproved === false) return result("DISABLED", "PRODUCTION_NOT_APPROVED", input)
  if (input.sourceStatus === "DISABLED") return result("DISABLED", "SOURCE_DISABLED", input)
  if (input.sourceStatus === "UNAVAILABLE") return result("UNAVAILABLE", "SOURCE_STATUS_UNAVAILABLE", input)

  if (!missing(input.unavailableReason) && !isSourceUnavailableReason(input.unavailableReason)) {
    return result("UNKNOWN", "INVALID_REASON", input)
  }
  if (isSourceUnavailableReason(input.unavailableReason)) {
    return result("UNAVAILABLE", "UNAVAILABLE_REASON_PRESENT", input)
  }
  if (input.qualityLevel === "UNAVAILABLE") return result("UNAVAILABLE", "QUALITY_UNAVAILABLE", input)

  if (missing(input.criticality)) return result("UNKNOWN", "MISSING_CRITICALITY", input)
  if (!isSourceCriticality(input.criticality)) return result("UNKNOWN", "INVALID_CRITICALITY", input)
  const policy = getSourceHealthPolicy(input.criticality)

  if (missing(input.sourceStatus)) return result("UNKNOWN", "MISSING_SOURCE_STATUS", input)
  if (!isSourceStatus(input.sourceStatus)) return result("UNKNOWN", "INVALID_SOURCE_STATUS", input)

  if (missing(input.freshnessStatus)) {
    return result(policy.unavailableFreshnessHealth, "MISSING_FRESHNESS", input)
  }
  if (!isSourceFreshness(input.freshnessStatus)) return result("UNKNOWN", "INVALID_FRESHNESS", input)
  if (input.freshnessStatus === "UNAVAILABLE") {
    return result(policy.unavailableFreshnessHealth, "FRESHNESS_UNAVAILABLE", input)
  }
  if (input.freshnessStatus === "EXPIRED") {
    return result(policy.expiredFreshnessHealth, "FRESHNESS_EXPIRED", input)
  }

  if (missing(input.qualityLevel)) return result("UNKNOWN", "MISSING_QUALITY", input)
  if (!isSourceQuality(input.qualityLevel)) return result("UNKNOWN", "INVALID_QUALITY", input)

  if (!missing(input.degradedReason) && !isSourceDegradationReason(input.degradedReason)) {
    return result("UNKNOWN", "INVALID_REASON", input)
  }
  if (input.sourceStatus === "DEGRADED") return result("DEGRADED", "SOURCE_STATUS_DEGRADED", input)
  if (input.freshnessStatus === "STALE") return result("DEGRADED", "FRESHNESS_STALE", input)
  if (input.qualityLevel === "LOW") return result("DEGRADED", "QUALITY_LOW", input)
  if (isSourceDegradationReason(input.degradedReason)) {
    return result("DEGRADED", "DEGRADED_REASON_PRESENT", input)
  }
  if (input.qualityLevel === "UNKNOWN") {
    return result(policy.unknownQualityHealth, "QUALITY_UNKNOWN", input)
  }
  if (
    input.productionApproved === true
    && input.sourceStatus === "ACTIVE"
    && (input.freshnessStatus === "LIVE" || input.freshnessStatus === "CURRENT")
    && (input.qualityLevel === "HIGH" || input.qualityLevel === "MEDIUM")
  ) {
    return result("HEALTHY", "CANONICAL_METADATA_HEALTHY", input)
  }

  return result("UNKNOWN", "INSUFFICIENT_METADATA", input)
}

export function evaluateSourceHealth(input: SourceHealthEvaluationInput): SourceHealthEvaluation {
  const source = getSource(input.sourceId)
  if (!source) {
    return {
      sourceId: input.sourceId,
      sourceName: null,
      ...result("UNKNOWN", "SOURCE_NOT_REGISTERED", {
        productionApproved: false,
        freshnessStatus: input.freshness?.status,
        qualityLevel: input.qualityLevel,
        sourceStatus: input.sourceStatus,
        unavailableReason: input.unavailableReason,
        degradedReason: input.degradedReason,
      }),
    }
  }

  if (input.freshness && input.freshness.sourceId !== source.id) {
    return {
      sourceId: source.id,
      sourceName: source.displayName,
      ...result("UNKNOWN", "FRESHNESS_SOURCE_MISMATCH", {
        productionApproved: source.productionApproved,
        criticality: source.criticality,
        freshnessStatus: input.freshness.status,
        qualityLevel: input.qualityLevel,
        sourceStatus: input.sourceStatus ?? source.status,
        unavailableReason: input.unavailableReason,
        degradedReason: input.degradedReason,
      }),
    }
  }

  const calculation = calculateSourceHealth({
    productionApproved: source.productionApproved,
    criticality: source.criticality,
    freshnessStatus: input.freshness?.status,
    qualityLevel: input.qualityLevel,
    sourceStatus: input.sourceStatus ?? source.status,
    unavailableReason: input.unavailableReason,
    degradedReason: input.degradedReason,
  })

  return {
    sourceId: source.id,
    sourceName: source.displayName,
    ...calculation,
  }
}

