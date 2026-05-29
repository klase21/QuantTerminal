import type { MarketStructureIntelligenceResponse, MarketStructureSectorSnapshot } from "@/core/market-structure/marketStructureTypes"
import type {
  AIIntelligenceLayerSurface,
  AutonomousSignal,
  ForecastDirection,
  LiquidityFractureSignal,
  NarrativeForecastSignal,
  OperatorCopilotBrief,
  OperatorPriority,
  RegimeTransitionSignal,
  RegimeTransitionState,
  RiskLevel,
} from "@/core/ai-intelligence/aiIntelligenceTypes"

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function avg(values: number[]) {
  const valid = values.filter(Number.isFinite)
  if (!valid.length) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function riskLevel(score: number): RiskLevel {
  if (score >= 84) return "CRITICAL"
  if (score >= 68) return "HIGH"
  if (score >= 44) return "MEDIUM"
  return "LOW"
}

function priorityFromScore(score: number, defensive = false): OperatorPriority {
  if (score >= 78) return defensive ? "DEFENSIVE" : "ACTIONABLE"
  if (score >= 50) return "WATCH"
  return "IGNORE"
}

function forecastDirection(sector: MarketStructureSectorSnapshot): ForecastDirection {
  const velocity = sector.participation.participationVelocity
  const conviction = sector.narrative.convictionScore
  const crowding = sector.derivatives.leverageCrowding
  const breadth = sector.participation.breadthPersistence
  if (crowding >= 82 && breadth < 42) return "REVERSAL"
  if (conviction >= 72 && velocity >= 62 && crowding < 78) return "ACCELERATE"
  if (conviction >= 58 && velocity >= 48) return "CONTINUE"
  if (velocity < 32 || sector.operatorState === "COOLING") return "FADE"
  return "NEUTRAL"
}

function buildForecast(sectors: MarketStructureSectorSnapshot[]): NarrativeForecastSignal[] {
  return sectors.slice(0, 8).map((sector) => {
    const direction = forecastDirection(sector)
    const currentScore = round(sector.marketStructureScore)
    const forecastScore = clamp(
      sector.marketStructureScore * 0.32 +
      sector.narrative.convictionScore * 0.28 +
      sector.participation.participationVelocity * 0.22 +
      sector.historical.persistenceScore * 0.1 +
      Math.max(0, 100 - sector.derivatives.leverageCrowding) * 0.08
    )
    const probability = clamp(
      forecastScore * 0.72 +
      sector.narrative.regionalSpread * 0.1 +
      sector.historical.regimeSimilarity * 0.08 +
      (direction === "ACCELERATE" ? 8 : direction === "REVERSAL" ? 4 : 0)
    )
    const drivers = [
      `conviction ${round(sector.narrative.convictionScore, 1)}`,
      `participation velocity ${round(sector.participation.participationVelocity, 1)}`,
      `leverage crowding ${round(sector.derivatives.leverageCrowding, 1)}`,
    ]
    return {
      sector: sector.sector,
      narrative: `${sector.sector} rotation`,
      currentScore,
      forecastScore: round(forecastScore),
      probability: round(probability),
      direction,
      horizon: direction === "REVERSAL" ? "1H" : direction === "ACCELERATE" ? "4H" : "24H",
      drivers,
      operatorRead: `${sector.sector} forecast is ${direction.toLowerCase()} with ${round(probability, 0)}% probability based on flow, leverage, and memory confirmation.`,
    }
  })
}

function buildFractures(sectors: MarketStructureSectorSnapshot[]): LiquidityFractureSignal[] {
  return sectors.map((sector) => {
    const narrowBreadth = Math.max(0, 60 - sector.participation.breadthPersistence)
    const leverageStress = sector.derivatives.leverageCrowding
    const narrativeExtreme = sector.narrative.extremityScore
    const weakMemory = Math.max(0, 50 - sector.historical.persistenceScore)
    const fractureScore = clamp(leverageStress * 0.38 + narrativeExtreme * 0.24 + narrowBreadth * 0.24 + weakMemory * 0.14)
    const triggers = []
    if (leverageStress >= 72) triggers.push("leverage crowding")
    if (narrativeExtreme >= 70) triggers.push("narrative extremity")
    if (sector.participation.breadthPersistence < 42) triggers.push("thin breadth")
    if (weakMemory >= 20) triggers.push("weak historical persistence")
    if (!triggers.length) triggers.push("no active fracture trigger")
    return {
      sector: sector.sector,
      fractureScore: round(fractureScore),
      level: riskLevel(fractureScore),
      triggers,
      operatorRead: `${sector.sector} liquidity fracture risk is ${riskLevel(fractureScore).toLowerCase()} because ${triggers.slice(0, 3).join(", ")}.`,
    }
  }).sort((a, b) => b.fractureScore - a.fractureScore).slice(0, 8)
}

function transitionState(top?: MarketStructureSectorSnapshot, marketScore = 0, fracture = 0): RegimeTransitionState {
  if (fracture >= 72) return "RISK_OFF"
  if ((top?.derivatives.leverageCrowding ?? 0) >= 75 && (top?.participation.breadthPersistence ?? 0) < 45) return "VOLATILITY_BREAKOUT"
  if ((top?.sector ?? "") === "L1" && marketScore >= 62) return "BTC_DOMINANCE"
  if (marketScore >= 58) return "ALT_ROTATION"
  if (marketScore < 34) return "COMPRESSION"
  return "RISK_ON"
}

function buildRegimeTransitions(sectors: MarketStructureSectorSnapshot[], fractures: LiquidityFractureSignal[]): RegimeTransitionSignal[] {
  const top = sectors[0]
  const marketScore = avg(sectors.slice(0, 5).map((sector) => sector.marketStructureScore))
  const fracture = fractures[0]?.fractureScore ?? 0
  const to = transitionState(top, marketScore, fracture)
  const probability = clamp(marketScore * 0.44 + fracture * 0.22 + (top?.narrative.convictionScore ?? 0) * 0.2 + (top?.historical.regimeSimilarity ?? 0) * 0.14)
  const evidence = [
    `top sector ${top?.sector ?? "NONE"}`,
    `market structure ${round(marketScore, 1)}`,
    `max fracture ${round(fracture, 1)}`,
  ]
  return [{
    from: "CURRENT_STRUCTURE",
    to,
    probability: round(probability),
    confidence: round(clamp(avg([top?.narrative.convictionScore ?? 0, top?.historical.replayReadiness ?? 0, 100 - fracture * 0.35]))),
    evidence,
    operatorRead: `Regime transition model points to ${to.replaceAll("_", " ").toLowerCase()} with ${round(probability, 0)}% probability.`,
  }]
}

function buildCopilot(sectors: MarketStructureSectorSnapshot[], forecasts: NarrativeForecastSignal[], fractures: LiquidityFractureSignal[], transitions: RegimeTransitionSignal[]): OperatorCopilotBrief {
  const topForecast = forecasts[0]
  const topFracture = fractures[0]
  const transition = transitions[0]
  const defensive = (topFracture?.fractureScore ?? 0) >= 68 || transition?.to === "RISK_OFF"
  const priority = defensive ? "DEFENSIVE" : priorityFromScore(topForecast?.probability ?? 0)
  const watchlist = Array.from(new Set([
    ...(forecasts.filter((item) => item.probability >= 55).map((item) => item.sector)),
    ...(fractures.filter((item) => item.fractureScore >= 55).map((item) => item.sector)),
  ])).slice(0, 6)
  const bullets = [
    topForecast ? topForecast.operatorRead : "No active narrative forecast.",
    topFracture ? topFracture.operatorRead : "No active liquidity fracture.",
    transition ? transition.operatorRead : "No active regime transition.",
  ]
  return {
    title: defensive ? "Defensive operator mode" : "AI operator briefing",
    priority,
    summary: sectors.length
      ? `${sectors[0].sector} leads the current intelligence stack while ${watchlist.join(", ") || "no sector"} remains on watch.`
      : "Waiting for sufficient market structure inputs.",
    bullets,
    watchlist,
  }
}

function buildAutonomousSignals(forecasts: NarrativeForecastSignal[], fractures: LiquidityFractureSignal[], transitions: RegimeTransitionSignal[]): AutonomousSignal[] {
  const signals: AutonomousSignal[] = []
  forecasts.slice(0, 5).forEach((forecast) => {
    signals.push({
      id: `forecast-${forecast.sector}`,
      rank: 0,
      type: "FORECAST",
      label: `${forecast.sector} ${forecast.direction}`,
      score: forecast.probability,
      priority: priorityFromScore(forecast.probability),
      read: forecast.operatorRead,
    })
  })
  fractures.slice(0, 5).forEach((fracture) => {
    signals.push({
      id: `fracture-${fracture.sector}`,
      rank: 0,
      type: "FRACTURE",
      label: `${fracture.sector} fracture ${fracture.level}`,
      score: fracture.fractureScore,
      priority: priorityFromScore(fracture.fractureScore, true),
      read: fracture.operatorRead,
    })
  })
  transitions.forEach((transition) => {
    signals.push({
      id: `regime-${transition.to}`,
      rank: 0,
      type: "REGIME",
      label: transition.to.replaceAll("_", " "),
      score: transition.probability,
      priority: priorityFromScore(transition.probability, transition.to === "RISK_OFF"),
      read: transition.operatorRead,
    })
  })
  return signals
    .sort((a, b) => b.score - a.score)
    .map((signal, index) => ({ ...signal, rank: index + 1 }))
    .slice(0, 12)
}

export function buildAIIntelligenceLayer(input: MarketStructureIntelligenceResponse | null): AIIntelligenceLayerSurface {
  const sectors = input?.sectors ?? []
  const forecast = buildForecast(sectors)
  const liquidityFractures = buildFractures(sectors)
  const regimeTransitions = buildRegimeTransitions(sectors, liquidityFractures)
  const copilot = buildCopilot(sectors, forecast, liquidityFractures, regimeTransitions)
  const autonomousSignals = buildAutonomousSignals(forecast, liquidityFractures, regimeTransitions)
  return {
    ok: sectors.length > 0,
    source: "phase-36-40-ai-intelligence-layer",
    updatedAt: new Date().toISOString(),
    mode: sectors.length ? "derived" : "empty",
    forecast,
    liquidityFractures,
    regimeTransitions,
    copilot,
    autonomousSignals,
    inputs: {
      sectors: sectors.length,
      topSector: input?.topSector,
    },
    notes: sectors.length ? ["AI Intelligence derived from market structure, derivatives, participation, narrative, and memory layers."] : ["No market structure sectors available."],
  }
}
