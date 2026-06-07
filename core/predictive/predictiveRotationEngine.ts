import type { NarrativeMomentumSignal, PredictiveRotationSignal, TradeFlowSnapshot } from "./predictiveTypes"
import { clamp, safeNumber } from "./tacticalMath"

export function predictRotation(flow?: Partial<TradeFlowSnapshot>, narrative?: NarrativeMomentumSignal): PredictiveRotationSignal {
  const buy = safeNumber(flow?.buyVolume)
  const sell = safeNumber(flow?.sellVolume)
  const total = Math.max(1, buy + sell)
  const buyPressure = (buy / total) * 100
  const sellPressure = 100 - buyPressure
  const cvd = safeNumber(flow?.cvd)

  const isRiskOn = buyPressure >= sellPressure && cvd >= 0
  const from = isRiskOn ? "Stable / BTC" : "High beta"
  const to = isRiskOn ? "RWA / AI leaders" : "BTC / Stables"

  const velocity = clamp(Math.round(Math.abs(buyPressure - sellPressure) * 0.9 + (narrative?.velocity ?? 55) * 0.35))
  const acceleration = clamp(Math.round((narrative?.acceleration ?? 50) * 0.65 + Math.abs(safeNumber(flow?.delta)) * 0.03))
  const confidence = clamp(Math.round(velocity * 0.36 + acceleration * 0.32 + (narrative?.phase === "EXPANSION" ? 18 : 8)))
  const probability = clamp(Math.round(confidence * 0.72 + (isRiskOn ? buyPressure : sellPressure) * 0.28))

  return {
    from,
    to,
    probability,
    confidence,
    velocity,
    acceleration,
    reason: isRiskOn
      ? "Buy-side execution and narrative momentum support continuation into leaders."
      : "Sell-side execution pressure favors defensive rotation until absorption appears.",
  }
}
