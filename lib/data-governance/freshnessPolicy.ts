import type { SourceFreshness } from "@/lib/data-governance/freshness"
import {
  getFreshnessPolicy,
  isValidFreshnessPolicy,
  type SourceFreshnessPolicy,
} from "@/lib/data-governance/freshnessRules"
import { getSource } from "@/lib/data-governance/registry"

export const FRESHNESS_EVALUATION_REASONS = [
  "WITHIN_LIVE_WINDOW",
  "WITHIN_CURRENT_WINDOW",
  "WITHIN_STALE_WINDOW",
  "PAST_STALE_WINDOW",
  "AGE_INDEPENDENT",
  "MISSING_LAST_UPDATED_AT",
  "INVALID_LAST_UPDATED_AT",
  "MISSING_RETRIEVED_AT",
  "INVALID_RETRIEVED_AT",
  "FUTURE_LAST_UPDATED_AT",
  "SOURCE_NOT_REGISTERED",
  "SOURCE_DISABLED",
  "SOURCE_UNAVAILABLE",
  "POLICY_NOT_CONFIGURED",
  "POLICY_SOURCE_MISMATCH",
  "INVALID_POLICY",
] as const

export type FreshnessEvaluationReason = typeof FRESHNESS_EVALUATION_REASONS[number]

export interface FreshnessCalculationInput {
  lastUpdatedAt?: string | null
  retrievedAt?: string | null
  policy: SourceFreshnessPolicy
}

export interface FreshnessEvaluationInput {
  sourceId: string
  lastUpdatedAt?: string | null
  retrievedAt?: string | null
  policy?: SourceFreshnessPolicy
}

export interface FreshnessCalculationResult {
  status: SourceFreshness
  reason: FreshnessEvaluationReason
  lastUpdatedAt: string | null
  retrievedAt: string | null
  ageMs: number | null
  policy: SourceFreshnessPolicy | null
}

export interface SourceFreshnessEvaluation extends FreshnessCalculationResult {
  sourceId: string
  sourceName: string | null
  productionApproved: boolean
}

function missingTimestamp(value: unknown) {
  return value === null || value === undefined || (typeof value === "string" && !value.trim())
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function unavailable(
  reason: FreshnessEvaluationReason,
  input: FreshnessCalculationInput,
): FreshnessCalculationResult {
  return {
    status: "UNAVAILABLE",
    reason,
    lastUpdatedAt: parseTimestamp(input.lastUpdatedAt) === null ? null : input.lastUpdatedAt ?? null,
    retrievedAt: parseTimestamp(input.retrievedAt) === null ? null : input.retrievedAt ?? null,
    ageMs: null,
    policy: input.policy,
  }
}

export function calculateFreshness(input: FreshnessCalculationInput): FreshnessCalculationResult {
  if (!isValidFreshnessPolicy(input.policy)) return unavailable("INVALID_POLICY", input)
  if (missingTimestamp(input.lastUpdatedAt)) return unavailable("MISSING_LAST_UPDATED_AT", input)
  const lastUpdatedAt = parseTimestamp(input.lastUpdatedAt)
  if (lastUpdatedAt === null) return unavailable("INVALID_LAST_UPDATED_AT", input)
  if (missingTimestamp(input.retrievedAt)) return unavailable("MISSING_RETRIEVED_AT", input)
  const retrievedAt = parseTimestamp(input.retrievedAt)
  if (retrievedAt === null) return unavailable("INVALID_RETRIEVED_AT", input)

  const ageMs = retrievedAt - lastUpdatedAt
  if (ageMs < 0) return unavailable("FUTURE_LAST_UPDATED_AT", input)

  const base = {
    lastUpdatedAt: input.lastUpdatedAt ?? null,
    retrievedAt: input.retrievedAt ?? null,
    ageMs,
    policy: input.policy,
  }

  if (input.policy.mode === "AGE_INDEPENDENT") {
    return { ...base, status: "CURRENT", reason: "AGE_INDEPENDENT" }
  }
  if (input.policy.liveWindowMs !== null && ageMs <= input.policy.liveWindowMs) {
    return { ...base, status: "LIVE", reason: "WITHIN_LIVE_WINDOW" }
  }
  if (input.policy.currentWindowMs !== null && ageMs <= input.policy.currentWindowMs) {
    return { ...base, status: "CURRENT", reason: "WITHIN_CURRENT_WINDOW" }
  }
  if (input.policy.staleWindowMs !== null && ageMs <= input.policy.staleWindowMs) {
    return { ...base, status: "STALE", reason: "WITHIN_STALE_WINDOW" }
  }
  return { ...base, status: "EXPIRED", reason: "PAST_STALE_WINDOW" }
}

function unavailableEvaluation(
  input: FreshnessEvaluationInput,
  reason: FreshnessEvaluationReason,
  policy: SourceFreshnessPolicy | null,
  sourceName: string | null,
  productionApproved: boolean,
): SourceFreshnessEvaluation {
  return {
    sourceId: input.sourceId,
    sourceName,
    productionApproved,
    status: "UNAVAILABLE",
    reason,
    lastUpdatedAt: null,
    retrievedAt: null,
    ageMs: null,
    policy,
  }
}

export function evaluateFreshness(input: FreshnessEvaluationInput): SourceFreshnessEvaluation {
  const source = getSource(input.sourceId)
  if (!source) {
    return unavailableEvaluation(input, "SOURCE_NOT_REGISTERED", input.policy ?? null, null, false)
  }
  if (!source.productionApproved || source.status === "DISABLED") {
    return unavailableEvaluation(input, "SOURCE_DISABLED", input.policy ?? null, source.displayName, source.productionApproved)
  }
  if (source.status === "UNAVAILABLE") {
    return unavailableEvaluation(input, "SOURCE_UNAVAILABLE", input.policy ?? null, source.displayName, source.productionApproved)
  }

  const policy = input.policy ?? getFreshnessPolicy(input.sourceId)
  if (!policy) {
    return unavailableEvaluation(input, "POLICY_NOT_CONFIGURED", null, source.displayName, source.productionApproved)
  }
  if (policy.sourceId !== input.sourceId) {
    return unavailableEvaluation(input, "POLICY_SOURCE_MISMATCH", policy, source.displayName, source.productionApproved)
  }

  const result = calculateFreshness({
    lastUpdatedAt: input.lastUpdatedAt,
    retrievedAt: input.retrievedAt,
    policy,
  })
  return {
    sourceId: source.id,
    sourceName: source.displayName,
    productionApproved: source.productionApproved,
    ...result,
  }
}
