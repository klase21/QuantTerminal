export const SOURCE_DEGRADATION_REASONS = [
  "PRIMARY_SOURCE_UNAVAILABLE",
  "FALLBACK_USED",
  "STALE_DATA",
  "PARTIAL_DATA",
  "RATE_LIMITED",
  "EMPTY_RESPONSE",
  "SOURCE_DISABLED",
  "UNKNOWN",
] as const

export type SourceDegradationReason = typeof SOURCE_DEGRADATION_REASONS[number]

const SOURCE_DEGRADATION_REASON_SET = new Set<string>(SOURCE_DEGRADATION_REASONS)

export function isSourceDegradationReason(value: unknown): value is SourceDegradationReason {
  return typeof value === "string" && SOURCE_DEGRADATION_REASON_SET.has(value)
}
