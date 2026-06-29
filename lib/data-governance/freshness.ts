export const SOURCE_FRESHNESS_STATES = [
  "LIVE",
  "CURRENT",
  "STALE",
  "EXPIRED",
  "UNAVAILABLE",
] as const

export type SourceFreshness = typeof SOURCE_FRESHNESS_STATES[number]

const SOURCE_FRESHNESS_SET = new Set<string>(SOURCE_FRESHNESS_STATES)

export function isSourceFreshness(value: unknown): value is SourceFreshness {
  return typeof value === "string" && SOURCE_FRESHNESS_SET.has(value)
}
