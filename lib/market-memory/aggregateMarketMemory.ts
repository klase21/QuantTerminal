import type { CurrentHistoricalAnalogState } from "@/lib/historical-analog/buildCurrentMarketState"
import type { HistoricalMarketSnapshot, MarketMemoryStats, MarketOutcome } from "@/types/historical"

export type MarketMemoryAggregationResult = {
  status: "available" | "unavailable"
  reason?: "insufficient_cases" | "weak_match_quality"
  similarOutcomes: MarketOutcome[]
  stats?: MarketMemoryStats
  topMatchedContexts: string[]
  topSymbolsInMatches: string[]
}

function average(values: number[]) {
  if (!values.length) return null
  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1))
}

function successRate(values: Array<boolean | null>) {
  const usable = values.filter((value): value is boolean => value !== null)
  if (!usable.length) return null
  return Math.round((usable.filter(Boolean).length / usable.length) * 100)
}

function directionAwareSuccessRate(current: CurrentHistoricalAnalogState, values: Array<boolean | null>) {
  if (current.direction === "neutral") return null
  return successRate(values)
}

function mode(values: string[]) {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

function label(value: string) {
  const labels: Record<string, string> = {
    bullish: "Bullish Market Direction",
    bearish: "Bearish Market Direction",
    neutral: "Neutral Market Direction",
    bullish_momentum: "Bullish Momentum",
    bearish_momentum: "Bearish Momentum",
    neutral_momentum: "Neutral Momentum",
    testing_upper_range: "Testing Upper Range",
    testing_lower_range: "Testing Lower Range",
    range_middle: "Range Middle",
    high_volatility: "High Volatility",
    normal_volatility: "Normal Volatility",
    low_volatility: "Low Volatility",
    bullish_continuation: "Bullish Continuation",
    bearish_continuation: "Bearish Continuation",
    range_continuation: "Range Continuation",
    mixed: "Mixed Follow-Through",
    buying_pressure: "Buying Pressure",
    selling_pressure: "Selling Pressure",
    sector_rotation: "Sector Rotation",
    narrative_heat: "Narrative Heat",
    etf_narrative: "ETF Interest",
  }

  return labels[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function driverThemes(snapshot: HistoricalMarketSnapshot) {
  const themes: string[] = []
  if (snapshot.momentumState === "bullish_momentum") themes.push("buying_pressure")
  if (snapshot.momentumState === "bearish_momentum") themes.push("selling_pressure")
  if (snapshot.breakoutState === "testing_upper_range") themes.push("breakout_attempt")
  return themes
}

function intersectionCount(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((item) => rightSet.has(item)).length
}

export function historicalSnapshotScore(current: CurrentHistoricalAnalogState, candidate: HistoricalMarketSnapshot) {
  let total = 0
  if (current.symbol === candidate.symbol) total += 15
  if (current.direction === candidate.marketDirection) total += 25
  if (current.momentumState === candidate.momentumState) total += 20
  if (current.breakoutState === candidate.breakoutState) total += 20
  if (candidate.volatilityState === "normal_volatility") total += 5
  else total += 10
  if (intersectionCount(current.drivers, driverThemes(candidate)) > 0) total += 10
  return total
}

export function matchedContexts(current: CurrentHistoricalAnalogState, snapshot: HistoricalMarketSnapshot) {
  const contexts: string[] = []
  if (current.direction === snapshot.marketDirection) contexts.push(label(snapshot.marketDirection))
  if (current.momentumState === snapshot.momentumState) contexts.push(label(snapshot.momentumState))
  if (current.breakoutState === snapshot.breakoutState) contexts.push(label(snapshot.breakoutState))
  contexts.push(...current.drivers.filter((driver) => driverThemes(snapshot).includes(driver)).map(label))
  return Array.from(new Set(contexts)).slice(0, 3)
}

function weakContextOnly(contexts: string[]) {
  const weak = new Set(["Neutral Market Direction", "Neutral Momentum", "Range Middle"])
  return contexts.length > 0 && contexts.every((context) => weak.has(context))
}

function setupPerformance(outcomes: MarketOutcome[], sortDirection: "best" | "worst") {
  const bySetup = new Map<string, number[]>()
  outcomes.forEach((outcome) => {
    if (outcome.forwardReturn7d === null) return
    bySetup.set(outcome.setupKey, [...(bySetup.get(outcome.setupKey) ?? []), outcome.forwardReturn7d])
  })

  return [...bySetup.entries()]
    .map(([setup, values]) => ({ setup, avg: average(values) ?? 0 }))
    .sort((left, right) => sortDirection === "best" ? right.avg - left.avg : left.avg - right.avg)[0]?.setup ?? null
}

export function aggregateMarketMemory(
  current: CurrentHistoricalAnalogState,
  snapshots: HistoricalMarketSnapshot[],
  outcomes: MarketOutcome[],
): MarketMemoryAggregationResult {
  const outcomeBySnapshotId = new Map(outcomes.map((outcome) => [outcome.snapshotId, outcome]))
  const ranked = snapshots
    .map((snapshot) => ({ snapshot, score: historicalSnapshotScore(current, snapshot), contexts: matchedContexts(current, snapshot) }))
    .filter((item) => item.score >= 50)
    .sort((left, right) => right.score - left.score)
  const similarOutcomes = ranked
    .map((item) => outcomeBySnapshotId.get(item.snapshot.id))
    .filter((item): item is MarketOutcome => Boolean(item))
    .slice(0, 200)

  if (similarOutcomes.length < 10) {
    return {
      status: "unavailable",
      reason: "insufficient_cases",
      similarOutcomes,
      topMatchedContexts: [],
      topSymbolsInMatches: [],
    }
  }

  const contextCounts = new Map<string, number>()
  ranked.slice(0, 200).forEach((item) => item.contexts.forEach((context) => contextCounts.set(context, (contextCounts.get(context) ?? 0) + 1)))
  const symbolCounts = new Map<string, number>()
  similarOutcomes.forEach((outcome) => symbolCounts.set(outcome.symbol, (symbolCounts.get(outcome.symbol) ?? 0) + 1))
  const strongest = [...contextCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
  const weakest = [...contextCounts.entries()].sort((left, right) => left[1] - right[1])[0]?.[0] ?? null
  const topMatchedContexts = [...contextCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3).map(([context]) => context)
  if (weakContextOnly(topMatchedContexts)) {
    return {
      status: "unavailable",
      reason: "weak_match_quality",
      similarOutcomes,
      topMatchedContexts,
      topSymbolsInMatches: [],
    }
  }

  return {
    status: "available",
    similarOutcomes,
    topMatchedContexts,
    topSymbolsInMatches: [...symbolCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3).map(([symbol]) => symbol),
    stats: {
      totalCases: similarOutcomes.length,
      avgReturn1d: average(similarOutcomes.map((outcome) => outcome.forwardReturn1d).filter((value): value is number => value !== null)),
      avgReturn7d: average(similarOutcomes.map((outcome) => outcome.forwardReturn7d).filter((value): value is number => value !== null)),
      avgReturn30d: average(similarOutcomes.map((outcome) => outcome.forwardReturn30d).filter((value): value is number => value !== null)),
      successRate1d: directionAwareSuccessRate(current, similarOutcomes.map((outcome) => outcome.success1d)),
      successRate7d: directionAwareSuccessRate(current, similarOutcomes.map((outcome) => outcome.success7d)),
      successRate30d: directionAwareSuccessRate(current, similarOutcomes.map((outcome) => outcome.success30d)),
      dominantOutcome: current.direction === "neutral" ? "Mixed" : label(mode(similarOutcomes.map((outcome) => outcome.dominantOutcome)) ?? "mixed"),
      strongestMatchedContext: strongest,
      weakestMatchedContext: weakest,
      bestPerformingSetup: setupPerformance(similarOutcomes, "best"),
      worstPerformingSetup: setupPerformance(similarOutcomes, "worst"),
    },
  }
}
