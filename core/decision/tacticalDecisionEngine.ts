export type TacticalAction =
  | "WAIT"
  | "WAIT_FOR_PULLBACK_LONG"
  | "SCALP_SHORT"
  | "TRACK_ROTATION"
  | "REDUCE_RISK"

export interface TacticalDecisionInput {
  rotationConfidence?: number
  entryQuality?: number
  contradictionPenalty?: number
  liquidityRisk?: number
  buyPressure?: number
  sellPressure?: number
  marketRegime?: "TREND_EXPANSION" | "CHOPPY" | "RISK_OFF" | "SHORT_SQUEEZE"
}

export interface TacticalDecision {
  action: TacticalAction
  headline: string
  confidence: number
  readiness: number
  entryQuality: number
  suggestedSize: string
  timingWindow: string
  reason: string[]
  suppress: string[]
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function buildTacticalDecision(input: TacticalDecisionInput = {}): TacticalDecision {
  const rotationConfidence = input.rotationConfidence ?? 81
  const entryQuality = input.entryQuality ?? 68
  const contradictionPenalty = input.contradictionPenalty ?? 14
  const liquidityRisk = input.liquidityRisk ?? 72
  const buyPressure = input.buyPressure ?? 38
  const sellPressure = input.sellPressure ?? 62
  const marketRegime = input.marketRegime ?? "TREND_EXPANSION"

  const executionConfirmation = buyPressure > sellPressure ? 76 : sellPressure > buyPressure + 18 ? 42 : 58
  const readiness = clamp(
    rotationConfidence * 0.32 +
      entryQuality * 0.26 +
      executionConfirmation * 0.22 +
      (100 - contradictionPenalty * 3) * 0.12 +
      (100 - liquidityRisk * 0.65) * 0.08
  )

  const confidence = clamp(readiness + rotationConfidence * 0.1 - contradictionPenalty * 0.7)

  let action: TacticalAction = "WAIT"
  let headline = "Wait for cleaner confirmation"
  let suggestedSize = "0.25x normal size"
  let timingWindow = "No clean timing window"

  if (marketRegime === "RISK_OFF" || contradictionPenalty >= 22) {
    action = "REDUCE_RISK"
    headline = "Reduce risk until contradictions fade"
    suggestedSize = "0.10x or no trade"
    timingWindow = "Stand down until flow stabilizes"
  } else if (rotationConfidence >= 76 && readiness >= 62 && sellPressure > buyPressure) {
    action = "WAIT_FOR_PULLBACK_LONG"
    headline = "Wait for pullback long trigger"
    suggestedSize = liquidityRisk > 70 ? "0.35x normal size" : "0.50x normal size"
    timingWindow = "Next 10~25m after absorption"
  } else if (sellPressure > 70 && entryQuality >= 60) {
    action = "SCALP_SHORT"
    headline = "Short scalp only, do not overstay"
    suggestedSize = "0.25x normal size"
    timingWindow = "Immediate only if failed bounce confirms"
  } else if (rotationConfidence >= 72) {
    action = "TRACK_ROTATION"
    headline = "Track rotation, wait for execution"
    suggestedSize = "0.20x probe max"
    timingWindow = "Next 15~40m"
  }

  const reason = [
    rotationConfidence >= 76
      ? "Rotation confidence is strong enough to track."
      : "Rotation confidence is not strong enough for aggressive action.",
    sellPressure > buyPressure
      ? "Sell pressure still dominates execution flow."
      : "Buy pressure is improving and supports confirmation.",
    liquidityRisk > 70
      ? "Nearby liquidity magnet can cause sweep before continuation."
      : "Liquidity risk is not the primary blocker.",
    contradictionPenalty > 12
      ? "Contradiction penalty requires reduced sizing."
      : "Signals are sufficiently aligned.",
  ]

  const suppress = [
    liquidityRisk > 70 ? "Do not over-focus on narrative heat before sweep behavior resolves." : "",
    contradictionPenalty > 12 ? "Suppress low-priority secondary signals until flow confirms." : "",
    sellPressure > buyPressure ? "Ignore early long signal unless absorption appears." : "",
  ].filter(Boolean)

  return {
    action,
    headline,
    confidence,
    readiness,
    entryQuality: clamp(entryQuality),
    suggestedSize,
    timingWindow,
    reason,
    suppress,
  }
}
