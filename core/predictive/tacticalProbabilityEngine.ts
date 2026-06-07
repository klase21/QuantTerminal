import type { LiquidityZone, NarrativeMomentumSignal, TacticalProbabilityResult, TradeFlowSnapshot } from "./predictiveTypes"
import { clamp, safeNumber } from "./tacticalMath"

export function deriveTacticalProbability(
  flow?: Partial<TradeFlowSnapshot>,
  narrative?: NarrativeMomentumSignal,
  liquidityZones: LiquidityZone[] = []
): TacticalProbabilityResult {
  const buy = safeNumber(flow?.buyVolume)
  const sell = safeNumber(flow?.sellVolume)
  const total = Math.max(1, buy + sell)
  const buyPressure = (buy / total) * 100
  const sellPressure = 100 - buyPressure
  const delta = safeNumber(flow?.delta)
  const cvd = safeNumber(flow?.cvd)
  const topLiquidity = liquidityZones[0]

  const longScore = clamp(Math.round(buyPressure * 0.42 + Math.max(0, delta) * 0.03 + Math.max(0, cvd) * 0.02 + (narrative?.phase === "EXPANSION" ? 18 : 8)))
  const shortScore = clamp(Math.round(sellPressure * 0.42 + Math.max(0, -delta) * 0.03 + Math.max(0, -cvd) * 0.02 + (narrative?.phase === "EXHAUSTION" ? 18 : 8)))

  const direction = longScore > shortScore + 8 ? "LONG" : shortScore > longScore + 8 ? "SHORT" : "NEUTRAL"
  const probability = direction === "LONG" ? longScore : direction === "SHORT" ? shortScore : clamp(Math.round((longScore + shortScore) / 2))

  const blockers = [
    Math.abs(buyPressure - sellPressure) < 12 ? "Buy/Sell pressure gap is too narrow" : "",
    Math.sign(delta) !== Math.sign(cvd) ? "Delta and CVD are not fully aligned" : "",
    narrative?.exhaustionRisk && narrative.exhaustionRisk > 70 ? "Narrative exhaustion risk is elevated" : "",
  ].filter(Boolean)

  const triggers = direction === "LONG"
    ? ["Buy pressure holds above 55%", "CVD continues higher", "Upside liquidity magnet remains active"]
    : direction === "SHORT"
    ? ["Sell pressure holds above 55%", "CVD fails to recover", "Downside liquidity magnet remains active"]
    : ["Wait for pressure expansion above 55%", "Wait for CVD alignment", "Let liquidity magnet choose direction"]

  return {
    direction,
    probability,
    invalidation:
      direction === "LONG"
        ? "Invalidate if buy pressure loses 50% and CVD rolls over."
        : direction === "SHORT"
        ? "Invalidate if sell pressure loses 50% and CVD reclaims positive."
        : "No directional setup until flow expands.",
    triggers,
    blockers: blockers.length ? blockers : [`Primary liquidity: ${topLiquidity?.label ?? "none"}`],
  }
}
