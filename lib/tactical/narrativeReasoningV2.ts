import type {
  DirectionalBias,
  LiquidationIntelligence,
  TacticalOpportunity,
  TacticalVerdictInput,
} from "./tacticalVerdictEngine"
import type { MacroReasoningResult } from "./macroReasoningEngine"

export type NarrativeReasoningV2 = {
  headline: string
  possibleDrivers: string[]
  likelyCatalysts: string[]
  executionImpact: string
  invalidation: string
}

function n(value: number | undefined, fallback = 50) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

export function buildNarrativeReasoningV2({
  input,
  bias,
  opportunity,
  liquidation,
  macro,
}: {
  input: TacticalVerdictInput
  bias: DirectionalBias
  opportunity: TacticalOpportunity
  liquidation: LiquidationIntelligence
  macro?: MacroReasoningResult
}): NarrativeReasoningV2 {
  const rotation = n(input.rotationScore)
  const flow = n(input.flowScore)
  const momentum = n(input.momentumScore)
  const liquidity = n(input.liquidityScore)
  const funding = n(input.fundingPressure, 35)
  const liquidationPressure = n(input.liquidationPressure, 35)

  const possibleDrivers: string[] = []
  const likelyCatalysts: string[] = []

  if (rotation >= 62) possibleDrivers.push("Sector rotation participation appears to be expanding.")
  if (flow >= 62) possibleDrivers.push("Aggressive flow is supporting the current tactical direction.")
  if (momentum >= 62) possibleDrivers.push("Momentum expansion may be attracting short-term participation.")
  if (liquidity < 45) possibleDrivers.push("Thin liquidity may be amplifying price movement.")
  if (funding >= 68) possibleDrivers.push("Crowded positioning may be increasing reversal sensitivity.")
  if (liquidationPressure >= 68) possibleDrivers.push("Liquidation zones may be acting as short-term magnets.")
  if (macro?.possibleDrivers?.length) possibleDrivers.push(...macro.possibleDrivers.slice(0, 2))

  if (opportunity.category !== "No Clean Setup") {
    likelyCatalysts.push(`${opportunity.category} setup is currently the highest-priority tactical context.`)
  }

  if (liquidation.sweepRisk === "HIGH") {
    likelyCatalysts.push("Sweep risk is elevated; liquidity events may dominate short-term direction.")
  }

  if (macro?.regime === "RISK-ON SUPPORTIVE") {
    likelyCatalysts.push("Macro backdrop may support selective risk exposure.")
  }

  if (macro?.regime === "RISK-OFF PRESSURE" || macro?.regime === "LIQUIDITY STRESS") {
    likelyCatalysts.push("Macro pressure may limit clean follow-through.")
  }

  if (!possibleDrivers.length) {
    possibleDrivers.push("No dominant narrative driver is clear from current tactical inputs.")
  }

  if (!likelyCatalysts.length) {
    likelyCatalysts.push("No clean catalyst is confirmed; treat the move as tactical until confirmation improves.")
  }

  const headline =
    bias === "LONG BIAS"
      ? "Possible upside participation, but execution confirmation still matters."
      : bias === "SHORT BIAS"
        ? "Possible downside pressure, with trap risk depending on liquidity behavior."
        : bias === "TWO-WAY"
          ? "Narrative is not directional enough; treat this as a range or reaction market."
          : "No clear narrative edge. Avoid forcing a directional thesis."

  const executionImpact =
    bias === "LONG BIAS"
      ? "Use the narrative as a filter for selective longs, not as permission to chase."
      : bias === "SHORT BIAS"
        ? "Use failed bounce or liquidity rejection as confirmation before short exposure."
        : bias === "TWO-WAY"
          ? "Only act at range extremes, sweeps, or when a new catalyst confirms direction."
          : "Stay observe-only until narrative, flow, and execution quality align."

  const invalidation =
    bias === "LONG BIAS"
      ? "Invalidate if flow weakens, bid support fails, or macro pressure rises."
      : bias === "SHORT BIAS"
        ? "Invalidate if breakdown fails, liquidity is reclaimed, or aggressive buyers absorb supply."
        : "Invalidate any directional attempt if price remains trapped in two-way chop."

  return {
    headline,
    possibleDrivers: possibleDrivers.slice(0, 5),
    likelyCatalysts: likelyCatalysts.slice(0, 4),
    executionImpact,
    invalidation,
  }
}
