export const SOURCE_QUALITY_LEVELS = [
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNKNOWN",
  "UNAVAILABLE",
] as const

export type SourceQuality = typeof SOURCE_QUALITY_LEVELS[number]

const SOURCE_QUALITY_SET = new Set<string>(SOURCE_QUALITY_LEVELS)

export function isSourceQuality(value: unknown): value is SourceQuality {
  return typeof value === "string" && SOURCE_QUALITY_SET.has(value)
}
