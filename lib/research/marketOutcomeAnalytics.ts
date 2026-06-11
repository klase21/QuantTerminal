import type { MarketOutcome } from "@/types/historical"

export function average(values: number[]) {
  if (!values.length) return null
  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1))
}

export function successRate(values: Array<boolean | null>) {
  const usable = values.filter((value): value is boolean => value !== null)
  if (!usable.length) return null
  return Math.round((usable.filter(Boolean).length / usable.length) * 100)
}

export function dominantOutcome(values: string[]) {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

export function outcomeLabel(value: string | null) {
  const labels: Record<string, string> = {
    bullish_continuation: "Bullish Continuation",
    bearish_continuation: "Bearish Continuation",
    range_continuation: "Range Continuation",
    mixed: "Mixed Follow-Through",
  }
  return value ? labels[value] ?? value : null
}

export function summarizeOutcomes(outcomes: MarketOutcome[]) {
  return {
    totalMatches: outcomes.length,
    avgReturn7d: average(outcomes.map((outcome) => outcome.forwardReturn7d).filter((value): value is number => value !== null)),
    avgReturn30d: average(outcomes.map((outcome) => outcome.forwardReturn30d).filter((value): value is number => value !== null)),
    successRate: successRate(outcomes.map((outcome) => outcome.success7d)),
    dominantOutcome: outcomeLabel(dominantOutcome(outcomes.map((outcome) => outcome.dominantOutcome))),
  }
}

export function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}
