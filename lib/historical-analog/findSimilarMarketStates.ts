import type { CurrentHistoricalAnalogState } from "@/lib/historical-analog/buildCurrentMarketState"
import type { DashboardMarketStateSnapshot, HistoricalMarketSnapshot } from "@/types/historical"

export type SimilarMarketState = {
  snapshot: HistoricalMarketSnapshot | DashboardMarketStateSnapshot
  label: string
  matchedConditions: string[]
  outcomeSummary: string
  outcomeStats?: OutcomeStats
}

export type OutcomeStats = {
  found: number
  avg7d: number | null
  avg30d: number | null
  successRate: number | null
}

const ANALOG_EXCLUSION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export function filterHistoricalAnalogCandidates(snapshots: HistoricalMarketSnapshot[], now = Date.now()) {
  const cutoff = now - ANALOG_EXCLUSION_WINDOW_MS
  const currentDate = new Date(now).toISOString().slice(0, 10)
  return snapshots.filter((snapshot) => {
    if (snapshot.timestamp > cutoff) return false
    if (new Date(snapshot.timestamp).toISOString().slice(0, 10) === currentDate) return false
    return true
  })
}

function contextLabel(value: string) {
  const labels: Record<string, string> = {
    bullish: "Bullish Market Direction",
    bearish: "Bearish Market Direction",
    neutral: "Neutral Market Direction",
    buying_pressure: "Strong Buying Pressure",
    selling_pressure: "Strong Selling Pressure",
    sector_rotation: "Sector Rotation Improving",
    leverage_risk: "Crowded Positioning",
    dollar_strength: "Dollar Strength",
    dollar_weakness: "Dollar Weakness",
    risk_off: "Risk-Off Sentiment",
    risk_on: "Risk-On Sentiment",
    narrative_heat: "Narrative Heat Rising",
    etf_narrative: "ETF Interest Rising",
    liquidity_improving: "Liquidity Improving",
    liquidity_weakening: "Liquidity Weakening",
    liquidity_stable: "Liquidity Stable",
    etf_positive: "Positive ETF Flow",
    etf_negative: "Negative ETF Flow",
    etf_neutral: "Neutral ETF Flow",
    prediction_bullish: "Prediction Markets Bullish",
    prediction_bearish: "Prediction Markets Bearish",
    prediction_neutral: "Prediction Markets Neutral",
    narrative_very_hot: "Narrative Heat Rising",
    narrative_hot: "Narrative Interest Active",
    sector_improving: "Sector Rotation Improving",
    sector_weakening: "Sector Rotation Weakening",
    sector_mixed: "Mixed Sector Rotation",
  }

  return labels[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function intersects(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((item) => rightSet.has(item))
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

function driverThemes(snapshot: HistoricalMarketSnapshot) {
  const themes: string[] = []
  if (snapshot.momentumState === "bullish_momentum") themes.push("buying_pressure")
  if (snapshot.momentumState === "bearish_momentum") themes.push("selling_pressure")
  if (snapshot.breakoutState === "testing_upper_range") themes.push("breakout_attempt")
  return themes
}

function dashboardContext(snapshot: DashboardMarketStateSnapshot) {
  const drivers = parseJsonArray(snapshot.driversJson)
  const narratives = parseJsonArray(snapshot.narrativesJson)
  return {
    drivers,
    narratives,
    dominantNarrative: snapshot.dominantNarrative ?? narratives[0] ?? null,
    narrativeHeat: snapshot.narrativeHeat ?? "unknown",
    sectorRotationState: snapshot.sectorRotationState ?? "unknown",
  }
}

function score(current: CurrentHistoricalAnalogState, candidate: HistoricalMarketSnapshot) {
  let total = 0
  if (current.symbol === candidate.symbol) total += 20
  if (current.direction === candidate.marketDirection) total += 25
  if (current.momentumState === candidate.momentumState) total += 20
  if (current.breakoutState === candidate.breakoutState) total += 20
  if (candidate.volatilityState === "normal_volatility") total += 5
  else total += 10
  if (intersects(current.drivers, driverThemes(candidate)).length > 0) total += 10
  if (current.narratives.length > 0) total += 10
  return total
}

function contextScore(current: CurrentHistoricalAnalogState, candidate: DashboardMarketStateSnapshot) {
  const context = dashboardContext(candidate)
  let total = 0

  if (current.symbol === candidate.symbol) total += 10
  if (current.direction === candidate.direction) total += 20
  total += Math.min(30, intersects(current.drivers, context.drivers).length * 10)
  if (current.dominantNarrative && context.dominantNarrative && current.dominantNarrative === context.dominantNarrative) total += 20
  else total += Math.min(20, intersects(current.narratives, context.narratives).length * 8)
  if (current.narrativeHeat !== "unknown" && current.narrativeHeat === context.narrativeHeat) total += 15
  if (current.sectorRotationState !== "unknown" && current.sectorRotationState === context.sectorRotationState) total += 15
  if (current.liquidityState !== "unknown" && current.liquidityState === candidate.liquidityState) total += 15
  if (current.etfFlowState !== "unknown" && current.etfFlowState === candidate.etfFlowState) total += 10
  if (current.predictionState !== "unknown" && current.predictionState === candidate.predictionState) total += 5

  return total
}

function labelFor() {
  return "Similar Market Setup"
}

function matchedConditions(current: CurrentHistoricalAnalogState, snapshot: HistoricalMarketSnapshot) {
  const conditions: string[] = []
  if (current.direction === snapshot.marketDirection) conditions.push(contextLabel(snapshot.marketDirection))
  conditions.push(...intersects(current.drivers, driverThemes(snapshot)).map(contextLabel))
  return Array.from(new Set(conditions)).slice(0, 3)
}

function matchedDashboardConditions(current: CurrentHistoricalAnalogState, snapshot: DashboardMarketStateSnapshot) {
  const context = dashboardContext(snapshot)
  const conditions: string[] = []
  conditions.push(...intersects(current.drivers, context.drivers).map(contextLabel))
  if (current.dominantNarrative && current.dominantNarrative === context.dominantNarrative) {
    conditions.push(`${contextLabel(current.dominantNarrative)} Interest Rising`)
  } else {
    conditions.push(...intersects(current.narratives, context.narratives).slice(0, 1).map((item) => `${contextLabel(item)} Interest Rising`))
  }
  if (current.sectorRotationState !== "unknown" && current.sectorRotationState === context.sectorRotationState) conditions.push(contextLabel(`sector_${current.sectorRotationState}`))
  if (current.liquidityState !== "unknown" && current.liquidityState === snapshot.liquidityState) conditions.push(contextLabel(`liquidity_${snapshot.liquidityState}`))
  if (current.etfFlowState !== "unknown" && current.etfFlowState === snapshot.etfFlowState) conditions.push(contextLabel(`etf_${snapshot.etfFlowState}`))

  return Array.from(new Set(conditions)).slice(0, 3)
}

function outcomeSummary(snapshot: HistoricalMarketSnapshot) {
  const sevenDay = snapshot.forwardReturn7d
  const thirtyDay = snapshot.forwardReturn30d
  if ((sevenDay ?? 0) > 3 || (thirtyDay ?? 0) > 8) return "Trend Extension"
  if ((sevenDay ?? 0) < -3 || (thirtyDay ?? 0) < -8) return "Trend Reversal"
  return "Mixed Follow-Through"
}

function dashboardOutcomeSummary(snapshot: DashboardMarketStateSnapshot) {
  if (snapshot.direction === "bullish" && snapshot.bullFactors > snapshot.bearFactors) return "Bullish Continuation"
  if (snapshot.direction === "bearish" && snapshot.bearFactors > snapshot.bullFactors) return "Bearish Continuation"
  if (snapshot.bullFactors === snapshot.bearFactors) return "Mixed Follow-Through"
  return "Context Stayed Active"
}

function dashboardDateKey(value: string) {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : value.slice(0, 10)
}

function dashboardSetupKey(snapshot: DashboardMarketStateSnapshot) {
  return [
    snapshot.symbol,
    dashboardDateKey(snapshot.timestamp),
    snapshot.direction,
    snapshot.driversJson,
    snapshot.narrativesJson,
    snapshot.liquidityState,
    snapshot.sectorRotationState ?? "unknown",
    snapshot.etfFlowState,
    snapshot.predictionState,
  ].join(":")
}

function average(values: number[]) {
  if (!values.length) return null
  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1))
}

function success(current: CurrentHistoricalAnalogState, snapshot: HistoricalMarketSnapshot) {
  const value = snapshot.forwardReturn7d
  if (value === null) return null
  if (current.direction === "bullish") return value > 0
  if (current.direction === "bearish") return value < 0
  return Math.abs(value) <= 2
}

function outcomeStats(current: CurrentHistoricalAnalogState, snapshots: HistoricalMarketSnapshot[]): OutcomeStats | undefined {
  const usable = snapshots.filter((snapshot) => snapshot.forwardReturn7d !== null || snapshot.forwardReturn30d !== null)
  if (!usable.length) return undefined
  if (current.direction === "neutral") {
    return {
      found: usable.length,
      avg7d: average(usable.map((snapshot) => snapshot.forwardReturn7d).filter((value): value is number => value !== null)),
      avg30d: average(usable.map((snapshot) => snapshot.forwardReturn30d).filter((value): value is number => value !== null)),
      successRate: null,
    }
  }
  const successes = usable
    .map((snapshot) => success(current, snapshot))
    .filter((item): item is boolean => item !== null)

  return {
    found: usable.length,
    avg7d: average(usable.map((snapshot) => snapshot.forwardReturn7d).filter((value): value is number => value !== null)),
    avg30d: average(usable.map((snapshot) => snapshot.forwardReturn30d).filter((value): value is number => value !== null)),
    successRate: successes.length ? Math.round((successes.filter(Boolean).length / successes.length) * 100) : null,
  }
}

function dateKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function setupKey(snapshot: HistoricalMarketSnapshot) {
  return `${snapshot.symbol}:${dateKey(snapshot.timestamp)}:${snapshot.marketDirection}:${snapshot.momentumState}:${snapshot.breakoutState}:${snapshot.volatilityState}`
}

export function findSimilarDashboardMarketStates(current: CurrentHistoricalAnalogState, snapshots: DashboardMarketStateSnapshot[], currentSnapshotId?: string) {
  const currentTimestamp = Date.now()
  const currentDate = new Date(currentTimestamp).toISOString().slice(0, 10)
  const cutoff = currentTimestamp - ANALOG_EXCLUSION_WINDOW_MS
  const historical = snapshots.filter((snapshot) => {
    const timestamp = new Date(snapshot.timestamp).getTime()
    if (!Number.isFinite(timestamp)) return false
    if (snapshot.id === currentSnapshotId) return false
    if (timestamp > cutoff) return false
    if (new Date(timestamp).toISOString().slice(0, 10) === currentDate) return false
    return true
  })
  if (historical.length < 3) {
    return {
      recordCountSearched: historical.length,
      matches: [] as SimilarMarketState[],
      reason: "insufficient_market_memory_snapshots",
    }
  }

  const seen = new Set<string>()
  const ranked = historical
    .map((snapshot) => ({ snapshot, score: contextScore(current, snapshot) }))
    .filter((item) => item.score >= 50)
    .sort((left, right) => right.score - left.score || new Date(right.snapshot.timestamp).getTime() - new Date(left.snapshot.timestamp).getTime())
    .filter((item) => {
      const key = dashboardSetupKey(item.snapshot)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 3)

  return {
    recordCountSearched: historical.length,
    matches: ranked.map((item) => ({
      snapshot: item.snapshot,
      label: labelFor(),
      matchedConditions: matchedDashboardConditions(current, item.snapshot),
      outcomeSummary: dashboardOutcomeSummary(item.snapshot),
    })),
    reason: ranked.length ? undefined : "no_context_match_above_threshold",
  }
}

export function findSimilarMarketStates(current: CurrentHistoricalAnalogState, snapshots: HistoricalMarketSnapshot[]) {
  const historical = filterHistoricalAnalogCandidates(snapshots)

  if (historical.length < 100) {
    return {
      recordCountSearched: historical.length,
      matches: [] as SimilarMarketState[],
      reason: "insufficient_historical_snapshots",
    }
  }

  const seen = new Set<string>()
  const ranked = historical
    .map((snapshot) => ({ snapshot, score: score(current, snapshot) }))
    .filter((item) => item.score >= 50)
    .sort((left, right) => right.score - left.score)
    .filter((item) => {
      const key = setupKey(item.snapshot)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  const topMatches = ranked.slice(0, 3)
  const stats = outcomeStats(current, ranked.slice(0, 100).map((item) => item.snapshot))

  return {
    recordCountSearched: historical.length,
    matches: topMatches.map((item) => ({
      snapshot: item.snapshot,
      label: labelFor(),
      matchedConditions: matchedConditions(current, item.snapshot),
      outcomeSummary: outcomeSummary(item.snapshot),
      outcomeStats: stats,
    })),
    outcomeStats: stats,
    reason: topMatches.length ? undefined : "no_match_above_threshold",
  }
}
