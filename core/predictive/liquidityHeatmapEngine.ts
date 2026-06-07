import type { LiquidityZone, TradeFlowSnapshot } from "./predictiveTypes"
import { clamp, safeNumber } from "./tacticalMath"

export function deriveLiquidityZones(flow?: Partial<TradeFlowSnapshot>): LiquidityZone[] {
  const buy = safeNumber(flow?.buyVolume)
  const sell = safeNumber(flow?.sellVolume)
  const total = Math.max(1, buy + sell)
  const buyPressure = (buy / total) * 100
  const sellPressure = 100 - buyPressure

  const upsideMagnet = clamp(Math.round(42 + buyPressure * 0.45 + Math.max(0, safeNumber(flow?.cvd)) * 0.02))
  const downsideMagnet = clamp(Math.round(42 + sellPressure * 0.45 + Math.max(0, -safeNumber(flow?.cvd)) * 0.02))

  const zones: LiquidityZone[] = [
    {
      label: "Upside liquidity",
      side: "upside",
      magnetScore: upsideMagnet,
      sweepProbability: clamp(Math.round(upsideMagnet * 0.78)),
      note: buyPressure >= 55 ? "Buy flow can pull price toward upper stops." : "Needs buyer expansion before becoming primary magnet.",
    },
    {
      label: "Downside liquidity",
      side: "downside",
      magnetScore: downsideMagnet,
      sweepProbability: clamp(Math.round(downsideMagnet * 0.78)),
      note: sellPressure >= 55 ? "Sell flow can drag price toward lower liquidity." : "Downside sweep risk is secondary for now.",
    },
  ]

  return zones.sort((a, b) => b.magnetScore - a.magnetScore)
}
