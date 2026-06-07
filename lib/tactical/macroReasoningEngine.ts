export type MacroSignalInput = {
  dxyChange?: number
  us10yChange?: number
  nasdaqChange?: number
  btcDominanceChange?: number
  stablecoinLiquidityScore?: number
  cryptoBetaScore?: number
}

export type MacroRegime =
  | "RISK-ON SUPPORTIVE"
  | "MIXED RISK"
  | "RISK-OFF PRESSURE"
  | "LIQUIDITY STRESS"

export type MacroReasoningResult = {
  regime: MacroRegime
  macroScore: number
  read: string
  possibleDrivers: string[]
  executionImpact: string
  riskFilter: string
  tacticalBiasModifier: "SUPPORTS LONGS" | "LIMITS UPSIDE" | "SUPPORTS SHORTS" | "NO STRONG MACRO EDGE"
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function valueOr(value: number | undefined, fallback: number) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

export function buildMacroReasoning(input: MacroSignalInput = {}): MacroReasoningResult {
  const dxy = valueOr(input.dxyChange, 0)
  const us10y = valueOr(input.us10yChange, 0)
  const nasdaq = valueOr(input.nasdaqChange, 0)
  const btcDom = valueOr(input.btcDominanceChange, 0)
  const liquidity = valueOr(input.stablecoinLiquidityScore, 50)
  const beta = valueOr(input.cryptoBetaScore, 50)

  const score = clamp(
    50 +
      nasdaq * 9 -
      dxy * 8 -
      us10y * 7 -
      btcDom * 4 +
      (liquidity - 50) * 0.35 +
      (beta - 50) * 0.3,
  )

  let regime: MacroRegime = "MIXED RISK"
  if (score >= 66) regime = "RISK-ON SUPPORTIVE"
  if (score <= 38) regime = "RISK-OFF PRESSURE"
  if (score <= 28 || liquidity < 30) regime = "LIQUIDITY STRESS"

  const possibleDrivers: string[] = []

  if (nasdaq > 0.25) possibleDrivers.push("US tech strength may be supporting crypto beta.")
  if (nasdaq < -0.25) possibleDrivers.push("US tech weakness may be pressuring risk assets.")
  if (dxy > 0.15) possibleDrivers.push("DXY strength may cap aggressive upside continuation.")
  if (dxy < -0.15) possibleDrivers.push("DXY softness may support selective risk exposure.")
  if (us10y > 0.12) possibleDrivers.push("Rising yields may reduce clean risk-on follow-through.")
  if (us10y < -0.12) possibleDrivers.push("Lower yields may improve liquidity-sensitive sentiment.")
  if (btcDom < -0.15) possibleDrivers.push("BTC dominance softening may support alt rotation.")
  if (btcDom > 0.15) possibleDrivers.push("BTC dominance strength may limit broad alt participation.")
  if (liquidity >= 62) possibleDrivers.push("Stablecoin liquidity conditions appear supportive.")
  if (liquidity <= 38) possibleDrivers.push("Liquidity conditions appear restrictive.")

  if (possibleDrivers.length === 0) {
    possibleDrivers.push("No dominant macro driver is clear from current inputs.")
  }

  const read =
    regime === "RISK-ON SUPPORTIVE"
      ? "Macro conditions are supportive for selective risk exposure."
      : regime === "RISK-OFF PRESSURE"
        ? "Macro conditions are pressuring risk appetite."
        : regime === "LIQUIDITY STRESS"
          ? "Macro liquidity conditions are stressed; execution risk is elevated."
          : "Macro conditions are mixed and should be treated as a filter, not a standalone signal."

  const executionImpact =
    regime === "RISK-ON SUPPORTIVE"
      ? "Execution Impact: selective longs are acceptable when local flow and liquidity confirm."
      : regime === "RISK-OFF PRESSURE"
        ? "Execution Impact: avoid chasing longs; prioritize defensive or short-side setups after confirmation."
        : regime === "LIQUIDITY STRESS"
          ? "Execution Impact: reduce size, avoid thin liquidity, and wait for cleaner confirmation."
          : "Execution Impact: stay selective; macro is not strong enough to justify aggressive entries alone."

  const riskFilter =
    regime === "RISK-ON SUPPORTIVE"
      ? "Risk Filter: do not chase late extensions if DXY or yields start rising again."
      : regime === "RISK-OFF PRESSURE"
        ? "Risk Filter: failed bounces and weak liquidity matter more than isolated green candles."
        : regime === "LIQUIDITY STRESS"
          ? "Risk Filter: slippage and liquidation cascades can dominate local technical setups."
          : "Risk Filter: require local confirmation from flow, CVD, and liquidity before acting."

  const tacticalBiasModifier =
    regime === "RISK-ON SUPPORTIVE"
      ? "SUPPORTS LONGS"
      : regime === "RISK-OFF PRESSURE" || regime === "LIQUIDITY STRESS"
        ? "SUPPORTS SHORTS"
        : dxy > 0.15 || us10y > 0.12
          ? "LIMITS UPSIDE"
          : "NO STRONG MACRO EDGE"

  return {
    regime,
    macroScore: Math.round(score),
    read,
    possibleDrivers,
    executionImpact,
    riskFilter,
    tacticalBiasModifier,
  }
}
