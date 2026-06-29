export const SOURCE_STATUSES = [
  "ACTIVE",
  "DEGRADED",
  "UNAVAILABLE",
  "DISABLED",
] as const

export type SourceStatus = typeof SOURCE_STATUSES[number]

const SOURCE_STATUS_SET = new Set<string>(SOURCE_STATUSES)

export function isSourceStatus(value: unknown): value is SourceStatus {
  return typeof value === "string" && SOURCE_STATUS_SET.has(value)
}
