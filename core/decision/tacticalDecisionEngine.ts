import { assessMarketRegimeV2, type MarketRegimeAssessment } from "@/core/decision/marketRegimeEngineV2"

export type TacticalAction = "ENTER" | "WAIT" | "WATCH" | "AVOID" | "REDUCE"
export type EntryGrade = "A+" | "A" | "B" | "C"
export type SetupLifetime = "FRESH" | "DEVELOPING" | "LATE" | "EXHAUSTED"

export interface TacticalDecisionInput {
  rotationConfidence?: number
  entryQuality?: number
  contradictionPenalty?: number
  liquidityRisk?: number
  buyPressure?: number
  sellPressure?: number
  momentumScore?: number
  trendScore?: number
  volatilityScore?: number
  macroRiskScore?: number
  flowScore?: number
  marketRegime?: "TREND_EXPANSION" | "CHOPPY" | "RISK_OFF" | "SHORT_SQUEEZE"
}

export interface TacticalDecision {
  action: TacticalAction
  headline: string
  confidence: number
  readiness: number
  entryQuality: number
  entryGrade: EntryGrade
  setupLifetime: SetupLifetime
  suggestedSize: string
  timingWindow: string
  trigger: string
  invalidation: string
  regime: MarketRegimeAssessment
  reason: string[]
  suppress: string[]
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : min)))
}

function grade(score: number): EntryGrade {
  if (score >= 86) return "A+"
  if (score >= 74) return "A"
  if (score >= 58) return "B"
  return "C"
}

function lifetime(input: {
  volatility: number
  momentum: number
  liquidityRisk: number
  readiness: number
  contradictionPenalty: number
}): SetupLifetime {
  if (input.liquidityRisk >= 82 || (input.volatility >= 78 && input.momentum >= 76)) return "EXHAUSTED"
  if (input.contradictionPenalty >= 20 || input.readiness < 54) return "DEVELOPING"
  if (input.readiness >= 72 && input.momentum >= 62) return "FRESH"
  return "LATE"
}

export function buildTacticalDecision(input: TacticalDecisionInput = {}): TacticalDecision {
  const rotationConfidence = clamp(input.rotationConfidence ?? 72)
  const entryQuality = clamp(input.entryQuality ?? 64)
  const contradictionPenalty = clamp(input.contradictionPenalty ?? 12)
  const liquidityRisk = clamp(input.liquidityRisk ?? 58)
  const buyPressure = clamp(input.buyPressure ?? 50)
  const sellPressure = clamp(input.sellPressure ?? 50)
  const momentumScore = clamp(input.momentumScore ?? 62)
  const trendScore = clamp(input.trendScore ?? 60)
  const volatilityScore = clamp(input.volatilityScore ?? 54)
  const macroRiskScore = clamp(input.macroRiskScore ?? 46)
  const flowScore = clamp(input.flowScore ?? Math.max(buyPressure, sellPressure))

  const regime = assessMarketRegimeV2({
    momentum: momentumScore,
    trend: trendScore,
    volatility: volatilityScore,
    flow: flowScore,
    rotation: rotationConfidence,
    macroRisk: macroRiskScore,
    liquidityRisk,
    buyPressure,
    sellPressure,
  })

  const executionConfirmation = buyPressure > sellPressure ? 74 : sellPressure > buyPressure + 16 ? 42 : 58
  const regimeBoost =
    regime.regime === "ROTATION" ? 8 :
    regime.regime === "TREND" ? 5 :
    regime.regime === "EXPANSION" ? 3 :
    regime.regime === "SQUEEZE" ? -2 :
    regime.regime === "CHOP" ? -8 : -16

  const readiness = clamp(
    rotationConfidence * 0.24 +
      entryQuality * 0.26 +
      executionConfirmation * 0.18 +
      momentumScore * 0.12 +
      trendScore * 0.1 +
      (100 - liquidityRisk) * 0.06 +
      (100 - contradictionPenalty * 3) * 0.04 +
      regimeBoost
  )

  const confidence = clamp(readiness + regime.confidence * 0.08 - contradictionPenalty * 0.75 - Math.max(0, macroRiskScore - 60) * 0.4)
  const setupLifetime = lifetime({ volatility: volatilityScore, momentum: momentumScore, liquidityRisk, readiness, contradictionPenalty })
  const entryGrade = grade(confidence)

  let action: TacticalAction = "WAIT"
  let headline = "WAIT — trigger required"
  let suggestedSize = "0.25x normal size"
  let timingWindow = "Wait for trigger"
  let trigger = "15m reclaim + flow confirmation"
  let invalidation = "Failed reclaim with rising sell pressure"

  if (regime.regime === "RISK_OFF" || macroRiskScore >= 76 || confidence < 46 || setupLifetime === "EXHAUSTED") {
    action = regime.regime === "RISK_OFF" || setupLifetime === "EXHAUSTED" ? "AVOID" : "REDUCE"
    headline = action === "AVOID" ? "AVOID — low quality environment" : "REDUCE — edge is deteriorating"
    suggestedSize = "No trade or 0.10x max"
    timingWindow = "Stand down until risk resets"
    trigger = "Risk pressure fades + structure reclaims"
    invalidation = "Continued volatility expansion without absorption"
  } else if (confidence >= 78 && entryQuality >= 72 && buyPressure >= sellPressure && setupLifetime !== "LATE") {
    action = "ENTER"
    headline = "ENTER — quality trigger aligned"
    suggestedSize = entryGrade === "A+" ? "0.50x~0.75x normal size" : "0.35x~0.50x normal size"
    timingWindow = "Current trigger window"
    trigger = "Hold reclaim while buy pressure stays dominant"
    invalidation = "Reclaim failure + flow flips negative"
  } else if (confidence >= 64 && (regime.regime === "ROTATION" || regime.regime === "TREND" || regime.regime === "SQUEEZE")) {
    action = "WATCH"
    headline = regime.regime === "SQUEEZE" ? "WATCH — compression trigger building" : "WATCH — setup developing"
    suggestedSize = "Probe only after trigger"
    timingWindow = regime.regime === "SQUEEZE" ? "Next expansion break" : "Next 10~30m"
    trigger = regime.regime === "ROTATION" ? "Leader pullback holds + sector flow confirms" : "Break/reclaim with volume expansion"
    invalidation = "Leader loses relative strength or flow diverges"
  } else {
    action = "WAIT"
    headline = "WAIT — not enough edge"
    suggestedSize = "No position until confirmation"
    timingWindow = "No clean timing window"
    trigger = "Cleaner structure + aligned flow"
    invalidation = "More chop, crowding, or failed continuation"
  }

  const reason = [
    `Regime: ${regime.regime} (${regime.strategyBias.toLowerCase().replaceAll("_", " ")}).`,
    `Entry grade is ${entryGrade} with ${confidence}% confidence.`,
    buyPressure > sellPressure ? "Buy pressure supports timing." : "Sell pressure still blocks aggressive long execution.",
    setupLifetime === "FRESH" ? "Setup is fresh enough to act when trigger confirms." : `Setup lifetime is ${setupLifetime.toLowerCase()}, so sizing must stay disciplined.`,
  ]

  const suppress = [
    ...regime.suppressed.map((item) => `Suppress: ${item}.`),
    liquidityRisk > 70 ? "Suppress chase entries until liquidity sweep risk resolves." : "",
    contradictionPenalty > 14 ? "Suppress low-confidence secondary signals until alignment improves." : "",
  ].filter(Boolean)

  return {
    action,
    headline,
    confidence,
    readiness,
    entryQuality,
    entryGrade,
    setupLifetime,
    suggestedSize,
    timingWindow,
    trigger,
    invalidation,
    regime,
    reason,
    suppress,
  }
}
