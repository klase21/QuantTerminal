export const LIFECYCLE_STATES = [
  "LOADING",
  "EMPTY",
  "READY",
  "ERROR",
  "PARTIAL",
  "OFFLINE",
  "REFRESHING",
] as const

export const AVAILABILITY_STATES = [
  "AVAILABLE",
  "UNAVAILABLE",
  "STALE",
  "MISSING",
  "EXPERIMENTAL",
] as const

export const FRESHNESS_STATES = ["CURRENT", "STALE", "EXPIRED", "UNKNOWN"] as const
export const COVERAGE_STATES = ["COMPLETE", "PARTIAL", "MISSING", "UNKNOWN"] as const

export type LifecycleState = (typeof LIFECYCLE_STATES)[number]
export type AvailabilityState = (typeof AVAILABILITY_STATES)[number]
export type FreshnessState = (typeof FRESHNESS_STATES)[number]
export type CoverageState = (typeof COVERAGE_STATES)[number]

export interface AvailabilityModel {
  readonly state: AvailabilityState
  readonly reason?: string | null
}

export interface FreshnessModel {
  readonly state: FreshnessState
  readonly observedAt?: string | null
  readonly reason?: string | null
}

export interface CoverageModel {
  readonly state: CoverageState
  readonly actualRecords?: number | null
  readonly expectedRecords?: number | null
  readonly percent?: number | null
  readonly reason?: string | null
}

export interface ConfidenceModel {
  readonly state: "AVAILABLE" | "UNAVAILABLE"
  readonly value?: string | number | null
  readonly basis?: string | null
  readonly scale?: string | null
  readonly reason?: string | null
}

export function hasAvailableConfidence(model: ConfidenceModel | null | undefined) {
  return model?.state === "AVAILABLE" && model.value !== null && model.value !== undefined
}
