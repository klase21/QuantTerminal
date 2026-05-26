export type CorrelationRegime =
  | "RISK_ON_EXPANSION"
  | "FRAGILE_RALLY"
  | "LIQUIDITY_SQUEEZE"
  | "PERP_EUPHORIA"
  | "DEFENSIVE_ROTATION"
  | "MIXED"

export interface MacroSnapshot {
  btcChange: number
  ethChange: number
  ethBtcChange: number
  nasdaqChange: number
  dxyChange: number
  us10yChange: number
  goldChange: number
  perpDivergence: number
  spotConfirmation: number
}

export interface CorrelationRegimeState {
  regime: CorrelationRegime
  riskOnScore: number
  liquidityStress: number
  crossAssetConfirmation: number
  fragileRallyRisk: number
  betaLeadership: number
  macroWeight: number
  executionWeight: number
  narrativeWeight: number
  summary: string
  tacticalRules: string[]
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function buildDefaultMacroSnapshot(): MacroSnapshot {
  return {
    btcChange: 0.45,
    ethChange: 0.28,
    ethBtcChange: -0.12,
    nasdaqChange: 0.62,
    dxyChange: -0.08,
    us10yChange: -0.04,
    goldChange: 0.10,
    perpDivergence: 34,
    spotConfirmation: 57,
  }
}

export function buildCorrelationRegimeState(
  snapshot: MacroSnapshot = buildDefaultMacroSnapshot(),
): CorrelationRegimeState {
  const riskOnScore = clamp(
    48 +
      snapshot.btcChange * 14 +
      snapshot.nasdaqChange * 18 -
      snapshot.dxyChange * 14 -
      snapshot.us10yChange * 12 +
      snapshot.ethBtcChange * 16,
  )

  const liquidityStress = clamp(
    34 +
      Math.max(0, snapshot.dxyChange) * 28 +
      Math.max(0, snapshot.us10yChange) * 32 -
      Math.max(0, snapshot.nasdaqChange) * 8,
  )

  const betaLeadership = clamp(
    50 +
      snapshot.ethBtcChange * 28 +
      (snapshot.ethChange - snapshot.btcChange) * 12,
  )

  const crossAssetConfirmation = clamp(
    riskOnScore * 0.36 +
      snapshot.spotConfirmation * 0.34 +
      (100 - liquidityStress) * 0.18 +
      betaLeadership * 0.12,
  )

  const fragileRallyRisk = clamp(
    snapshot.btcChange > 0
      ? liquidityStress * 0.42 +
          Math.max(0, -snapshot.ethBtcChange) * 28 +
          snapshot.perpDivergence * 0.35 +
          (snapshot.spotConfirmation < 50 ? 18 : 0)
      : liquidityStress * 0.3,
  )

  let regime: CorrelationRegime = "MIXED"

  if (riskOnScore >= 68 && crossAssetConfirmation >= 64 && liquidityStress < 45) {
    regime = "RISK_ON_EXPANSION"
  } else if (fragileRallyRisk >= 62 && snapshot.btcChange > 0) {
    regime = "FRAGILE_RALLY"
  } else if (liquidityStress >= 68) {
    regime = "LIQUIDITY_SQUEEZE"
  } else if (snapshot.perpDivergence >= 65 && snapshot.spotConfirmation < 48) {
    regime = "PERP_EUPHORIA"
  } else if (riskOnScore < 42 && liquidityStress >= 50) {
    regime = "DEFENSIVE_ROTATION"
  }

  const macroWeight =
    regime === "LIQUIDITY_SQUEEZE" || regime === "DEFENSIVE_ROTATION"
      ? 1.35
      : regime === "FRAGILE_RALLY"
        ? 1.2
        : 1

  const executionWeight =
    regime === "PERP_EUPHORIA" || regime === "FRAGILE_RALLY" ? 1.35 : 1.05

  const narrativeWeight =
    regime === "RISK_ON_EXPANSION" ? 1.25 : regime === "LIQUIDITY_SQUEEZE" ? 0.72 : 0.95

  const summary =
    regime === "RISK_ON_EXPANSION"
      ? "Cross-asset backdrop supports risk-on continuation. Narrative and execution signals can receive higher weight."
      : regime === "FRAGILE_RALLY"
        ? "BTC is positive, but macro/beta confirmation is incomplete. Treat breakouts as fragile until spot and ETH/BTC confirm."
        : regime === "LIQUIDITY_SQUEEZE"
          ? "DXY/yield pressure is tightening liquidity. Reduce risk and require stronger confirmation."
          : regime === "PERP_EUPHORIA"
            ? "Perp-led enthusiasm detected. Fake breakout risk is elevated unless spot demand improves."
            : regime === "DEFENSIVE_ROTATION"
              ? "Risk-off structure favors BTC/stable defensive flow over beta rotation."
              : "Cross-market structure is mixed. Let execution and spot confirmation decide."

  const tacticalRules = [
    "BTC long validity improves when NASDAQ confirms and DXY/US10Y weaken.",
    "ETH beta trades require ETH/BTC recovery or at least stabilization.",
    "Perp-led breakouts need spot confirmation before full sizing.",
    "When liquidity stress rises, reduce narrative weight and prioritize execution quality.",
  ]

  return {
    regime,
    riskOnScore,
    liquidityStress,
    crossAssetConfirmation,
    fragileRallyRisk,
    betaLeadership,
    macroWeight,
    executionWeight,
    narrativeWeight,
    summary,
    tacticalRules,
  }
}
