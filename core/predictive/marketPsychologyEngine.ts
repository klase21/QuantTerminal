import type { MarketPsychologyState, TradeFlowSnapshot } from "./predictiveTypes"
import { clamp, safeNumber } from "./tacticalMath"

export function deriveMarketPsychology(flow?: Partial<TradeFlowSnapshot>): MarketPsychologyState {
  const buy = safeNumber(flow?.buyVolume)
  const sell = safeNumber(flow?.sellVolume)
  const total = Math.max(1, buy + sell)
  const buyPressure = (buy / total) * 100
  const sellPressure = 100 - buyPressure
  const pressureGap = Math.abs(buyPressure - sellPressure)
  const cvd = safeNumber(flow?.cvd)
  const delta = safeNumber(flow?.delta)

  const retailAggression = clamp(Math.round(pressureGap * 1.15 + Math.min(28, total / 120)))
  const euphoria = clamp(Math.round(Math.max(0, buyPressure - 50) * 1.6 + Math.max(0, delta) * 0.08))
  const panic = clamp(Math.round(Math.max(0, sellPressure - 50) * 1.6 + Math.max(0, -delta) * 0.08))
  const smartMoneyDivergence = clamp(Math.round(pressureGap * 0.45 + (Math.sign(delta) !== Math.sign(cvd) ? 36 : 8)))

  const read =
    smartMoneyDivergence >= 62
      ? "Aggressive flow is diverging from CVD. Watch absorption or trap risk."
      : panic > euphoria + 15
      ? "Sellers are emotionally dominant, but confirmation depends on continuation."
      : euphoria > panic + 15
      ? "Buyers are driving tape. Favor continuation only while CVD confirms."
      : "Psychology is balanced. Wait for a cleaner pressure expansion."

  return { euphoria, panic, retailAggression, smartMoneyDivergence, read }
}
