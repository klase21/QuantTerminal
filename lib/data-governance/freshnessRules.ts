import { SOURCE_REGISTRY } from "@/lib/data-governance/registry"

export type FreshnessPolicyMode = "AGE_BASED" | "AGE_INDEPENDENT"

export interface SourceFreshnessPolicy {
  sourceId: string
  mode: FreshnessPolicyMode
  liveWindowMs: number | null
  currentWindowMs: number | null
  staleWindowMs: number | null
}

export interface FreshnessRulesValidationResult {
  valid: boolean
  policyCount: number
  missingSourceIds: string[]
  unknownSourceIds: string[]
  invalidSourceIds: string[]
}

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function ageBased(
  sourceId: string,
  currentWindowMs: number,
  staleWindowMs: number,
  liveWindowMs: number | null = null,
): SourceFreshnessPolicy {
  return Object.freeze({ sourceId, mode: "AGE_BASED", liveWindowMs, currentWindowMs, staleWindowMs })
}

function ageIndependent(sourceId: string): SourceFreshnessPolicy {
  return Object.freeze({
    sourceId,
    mode: "AGE_INDEPENDENT",
    liveWindowMs: null,
    currentWindowMs: null,
    staleWindowMs: null,
  })
}

export const SOURCE_FRESHNESS_POLICIES: readonly SourceFreshnessPolicy[] = Object.freeze([
  ageBased("binance-live", 5 * MINUTE, 15 * MINUTE, 15 * SECOND),
  ageIndependent("binance-vision"),
  ageBased("upbit-live", 5 * MINUTE, 15 * MINUTE, 15 * SECOND),
  ageBased("upbit-datalab", 15 * MINUTE, HOUR),
  ageBased("bybit-live", 5 * MINUTE, 15 * MINUTE, 15 * SECOND),
  ageIndependent("cryptohftdata"),
  ageBased("coinmarketcap-data-api", HOUR, DAY),
  ageBased("farside-etf", DAY, 7 * DAY),
  ageBased("polymarket-gamma", 15 * MINUTE, 6 * HOUR),
  ageBased("stooq-macro", 30 * MINUTE, DAY),
  ageBased("gdelt-doc", 15 * MINUTE, 6 * HOUR),
  ageBased("regional-news", 15 * MINUTE, 6 * HOUR),
  ageBased("saveticker", 15 * MINUTE, 6 * HOUR),
  ageIndependent("verified-event-catalog"),

  ageBased("etf-flow", DAY, 7 * DAY),
  ageBased("exchange-flow", HOUR, 6 * HOUR),
  ageBased("treasury-snapshot", DAY, 7 * DAY),
  ageBased("exchange-reserve", HOUR, 6 * HOUR),
  ageBased("market-movers", 5 * MINUTE, 15 * MINUTE),
  ageBased("futures-intelligence", 15 * MINUTE, HOUR),
  ageBased("exchange-comparison", 5 * MINUTE, 15 * MINUTE),
  ageBased("sector-rotation", 5 * MINUTE, 15 * MINUTE),
  ageBased("market-structure", 5 * MINUTE, 15 * MINUTE),
  ageBased("scanner-opportunities", 5 * MINUTE, 15 * MINUTE),
  ageBased("news", 15 * MINUTE, 6 * HOUR),
  ageBased("narratives", 15 * MINUTE, 6 * HOUR),
  ageBased("prediction-markets", 15 * MINUTE, 6 * HOUR),
  ageBased("macro", 30 * MINUTE, DAY),
  ageBased("historical-analog", DAY, 7 * DAY),
  ageIndependent("event-impact"),
  ageBased("market-memory", DAY, 7 * DAY),
  ageIndependent("replay-cache"),
  ageBased("data-health", 15 * MINUTE, HOUR),
])

const POLICY_BY_SOURCE_ID = new Map(SOURCE_FRESHNESS_POLICIES.map((policy) => [policy.sourceId, policy]))

export function getFreshnessPolicy(sourceId: string): SourceFreshnessPolicy | undefined {
  return POLICY_BY_SOURCE_ID.get(sourceId)
}

export function listFreshnessRules(): readonly SourceFreshnessPolicy[] {
  return [...SOURCE_FRESHNESS_POLICIES]
}

export function isValidFreshnessPolicy(policy: SourceFreshnessPolicy): boolean {
  if (!policy.sourceId) return false
  if (policy.mode === "AGE_INDEPENDENT") {
    return policy.liveWindowMs === null
      && policy.currentWindowMs === null
      && policy.staleWindowMs === null
  }
  if (policy.currentWindowMs === null || policy.staleWindowMs === null) return false
  if (policy.currentWindowMs < 0 || policy.staleWindowMs < policy.currentWindowMs) return false
  return policy.liveWindowMs === null
    || (policy.liveWindowMs >= 0 && policy.liveWindowMs <= policy.currentWindowMs)
}

export function validateFreshnessRules(): FreshnessRulesValidationResult {
  const registeredIds = new Set(SOURCE_REGISTRY.map((source) => source.id))
  const policyIds = new Set(SOURCE_FRESHNESS_POLICIES.map((policy) => policy.sourceId))
  const missingSourceIds = [...registeredIds].filter((sourceId) => !policyIds.has(sourceId))
  const unknownSourceIds = [...policyIds].filter((sourceId) => !registeredIds.has(sourceId))
  const invalidSourceIds = SOURCE_FRESHNESS_POLICIES
    .filter((policy) => !isValidFreshnessPolicy(policy))
    .map((policy) => policy.sourceId)

  return {
    valid: !missingSourceIds.length && !unknownSourceIds.length && !invalidSourceIds.length,
    policyCount: SOURCE_FRESHNESS_POLICIES.length,
    missingSourceIds,
    unknownSourceIds,
    invalidSourceIds,
  }
}

export const SOURCE_FRESHNESS_RULES_VALIDATION = Object.freeze(validateFreshnessRules())
