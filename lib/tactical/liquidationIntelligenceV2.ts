import type { DirectionalBias, TacticalVerdictInput } from "./tacticalVerdictEngine"

export type LiquidationIntelligenceV2 = {
  pressure: "LOW" | "MEDIUM" | "HIGH"
  sweepProbability: number
  clusterRead: string
  tacticalRisk: string
  executionGuidance: string
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function n(value: number | undefined, fallback = 35) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

export function buildLiquidationIntelligenceV2(
  input: TacticalVerdictInput,
  bias: DirectionalBias,
): LiquidationIntelligenceV2 {
  const liquidation = n(input.liquidationPressure)
  const volatility = n(input.volatilityScore, 50)
  const liquidity = n(input.liquidityScore, 50)
  const flow = n(input.flowScore, 50)

  const sweepProbability = clamp(
    liquidation * 0.45 + volatility * 0.25 + (100 - liquidity) * 0.2 + Math.abs(flow - 50) * 0.1,
  )

  const pressure =
    sweepProbability >= 68 ? "HIGH" : sweepProbability >= 45 ? "MEDIUM" : "LOW"

  const clusterRead =
    pressure === "HIGH"
      ? "Liquidation pressure is high enough to distort short-term price action."
      : pressure === "MEDIUM"
        ? "Liquidation pressure is present and should be used as a risk filter."
        : "Liquidation pressure is not the dominant tactical driver."

  let tacticalRisk =
    pressure === "HIGH"
      ? "Sweep-and-reversal risk is elevated near obvious liquidity zones."
      : pressure === "MEDIUM"
        ? "Do not treat liquidation levels as automatic entries; require confirmation."
        : "Liquidation conditions are secondary to flow and trend quality."

  if (bias === "LONG BIAS" && pressure === "HIGH") {
    tacticalRisk = "Long bias exists, but upside liquidation magnets can create late chase traps."
  }

  if (bias === "SHORT BIAS" && pressure === "HIGH") {
    tacticalRisk = "Short bias exists, but downside liquidation sweeps can trigger violent rebounds."
  }

  const executionGuidance =
    pressure === "HIGH"
      ? "Wait for sweep confirmation or reclaim/rejection before entering."
      : pressure === "MEDIUM"
        ? "Use liquidation zones to define invalidation and avoid mid-range entries."
        : "Focus on execution quality, CVD, and liquidity structure."

  return {
    pressure,
    sweepProbability: Math.round(sweepProbability),
    clusterRead,
    tacticalRisk,
    executionGuidance,
  }
}
