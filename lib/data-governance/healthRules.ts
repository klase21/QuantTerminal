import type { SourceCriticality } from "@/lib/data-governance/types"

export type ExpiredFreshnessHealth = "DEGRADED" | "UNAVAILABLE"
export type IndeterminateHealth = "DEGRADED" | "UNKNOWN" | "UNAVAILABLE"

export interface SourceHealthPolicy {
  criticality: SourceCriticality
  expiredFreshnessHealth: ExpiredFreshnessHealth
  unavailableFreshnessHealth: IndeterminateHealth
  unknownQualityHealth: "DEGRADED" | "UNKNOWN"
}

const SOURCE_HEALTH_POLICIES: Readonly<Record<SourceCriticality, SourceHealthPolicy>> = Object.freeze({
  P0: Object.freeze({
    criticality: "P0",
    expiredFreshnessHealth: "UNAVAILABLE",
    unavailableFreshnessHealth: "UNAVAILABLE",
    unknownQualityHealth: "DEGRADED",
  }),
  P1: Object.freeze({
    criticality: "P1",
    expiredFreshnessHealth: "DEGRADED",
    unavailableFreshnessHealth: "UNKNOWN",
    unknownQualityHealth: "UNKNOWN",
  }),
  P2: Object.freeze({
    criticality: "P2",
    expiredFreshnessHealth: "DEGRADED",
    unavailableFreshnessHealth: "UNKNOWN",
    unknownQualityHealth: "UNKNOWN",
  }),
})

export function getSourceHealthPolicy(criticality: SourceCriticality): SourceHealthPolicy {
  return SOURCE_HEALTH_POLICIES[criticality]
}

export function listSourceHealthRules(): readonly SourceHealthPolicy[] {
  return Object.values(SOURCE_HEALTH_POLICIES)
}

