export const SOURCE_UNAVAILABLE_REASONS = [
  "SOURCE_UNAVAILABLE",
  "SOURCE_NOT_REGISTERED",
  "SOURCE_DISABLED",
  "NO_FALLBACK",
  "EXPIRED",
  "INVALID_RESPONSE",
  "EMPTY_RESPONSE",
  "UNKNOWN",
] as const

export type SourceUnavailableReason = typeof SOURCE_UNAVAILABLE_REASONS[number]

const SOURCE_UNAVAILABLE_REASON_SET = new Set<string>(SOURCE_UNAVAILABLE_REASONS)

export function isSourceUnavailableReason(value: unknown): value is SourceUnavailableReason {
  return typeof value === "string" && SOURCE_UNAVAILABLE_REASON_SET.has(value)
}
