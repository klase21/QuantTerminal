import type {
  DualMarketIntelligence,
  MarketFlowSnapshot,
  MarketMode,
} from "@/core/dual-market/dualMarketTypes"

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function safeNumber(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export function emptyMarketFlow(
  symbol: string,
  source: "SPOT" | "FUTURES",
): MarketFlowSnapshot {
  return {
    symbol,
    source,
    buyVolume: 0,
    sellVolume: 0,
    cvd: 0,
    buyPressure: 0,
    sellPressure: 0,
  }
}

export function normalizeFlowSnapshot(
  flow: any,
  source: "SPOT" | "FUTURES",
  fallbackSymbol = "BTCUSDT",
): MarketFlowSnapshot {
  const symbol = String(flow?.symbol ?? fallbackSymbol).toUpperCase()
  const buyVolume = safeNumber(flow?.buyVolume)
  const sellVolume = safeNumber(flow?.sellVolume)
  const total = Math.max(1, buyVolume + sellVolume)

  return {
    symbol,
    source,
    buyVolume,
    sellVolume,
    cvd: safeNumber(flow?.cvd),
    buyPressure: safeNumber(flow?.buyPressure, Math.round((buyVolume / total) * 100)),
    sellPressure: safeNumber(flow?.sellPressure, Math.round((sellVolume / total) * 100)),
  }
}

export function buildDualMarketIntelligence({
  symbol,
  mode,
  spot,
  futures,
}: {
  symbol: string
  mode: MarketMode
  spot: MarketFlowSnapshot
  futures: MarketFlowSnapshot
}): DualMarketIntelligence {
  const futuresAggression = futures.buyPressure - futures.sellPressure
  const spotAggression = spot.buyPressure - spot.sellPressure
  const cvdGap = futures.cvd - spot.cvd
  const pressureGap = futuresAggression - spotAggression

  const divergenceScore = clamp(Math.abs(pressureGap) * 0.72 + Math.abs(cvdGap) * 0.015)

  const fakeBreakoutRisk = clamp(
    (futures.buyPressure > 58 && spot.buyPressure < 48 ? 38 : 0) +
      Math.max(0, futures.buyPressure - spot.buyPressure) * 0.9 +
      divergenceScore * 0.35,
  )

  const realDemandConfirmation = clamp(
    spot.buyPressure * 0.58 +
      futures.buyPressure * 0.24 +
      (spot.cvd > 0 ? 12 : 0) -
      (fakeBreakoutRisk > 60 ? 10 : 0),
  )

  const absorptionScore = clamp(
    (spot.buyPressure > 52 && futures.sellPressure > 55 ? 34 : 0) +
      Math.max(0, futures.sellPressure - spot.sellPressure) * 0.8 +
      (spot.cvd > futures.cvd ? 16 : 0),
  )

  const warnings: string[] = []

  if (fakeBreakoutRisk >= 65) {
    warnings.push("Futures buying is stronger than spot demand. Breakout may be perp-driven.")
  }

  if (absorptionScore >= 60) {
    warnings.push("Spot appears to absorb while futures sells. Watch for reversal trigger.")
  }

  if (realDemandConfirmation >= 70) {
    warnings.push("Spot demand is confirming. Continuation quality improves.")
  }

  const summary =
    fakeBreakoutRisk >= 65
      ? "Perp-led move detected. Prefer confirmation from spot before chasing."
      : realDemandConfirmation >= 70
        ? "Spot and futures are aligned enough to support continuation."
        : absorptionScore >= 60
          ? "Potential absorption regime. Watch for CVD recovery and failed downside follow-through."
          : "Dual-market read is mixed. Use execution confirmation before sizing."

  return {
    symbol,
    mode,
    spot,
    futures,
    divergenceScore,
    fakeBreakoutRisk,
    realDemandConfirmation,
    absorptionScore,
    summary,
    warnings,
  }
}
