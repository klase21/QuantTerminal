export interface DebateAgent {
  name: string
  stance: "BULL" | "BEAR" | "RISK"
  argument: string
  confidence: number
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function buildAIDebate({
  buyPressure = 38,
  sellPressure = 62,
  realDemandConfirmation = 0,
  fakeBreakoutRisk = 0,
  liquidityStress = 50,
}: {
  buyPressure?: number
  sellPressure?: number
  realDemandConfirmation?: number
  fakeBreakoutRisk?: number
  liquidityStress?: number
} = {}): DebateAgent[] {
  const bullConfidence = clamp(42 + realDemandConfirmation * 0.4 + Math.max(0, buyPressure - sellPressure) * 0.5)
  const bearConfidence = clamp(38 + fakeBreakoutRisk * 0.35 + Math.max(0, sellPressure - buyPressure) * 0.45)
  const riskConfidence = clamp(45 + liquidityStress * 0.35 + fakeBreakoutRisk * 0.3)

  return [
    {
      name: "Bull Agent",
      stance: "BULL",
      argument:
        bullConfidence >= 65
          ? "Spot/futures confirmation and execution flow are supportive enough to track continuation."
          : "Bull case needs stronger spot confirmation and buy pressure recovery.",
      confidence: bullConfidence,
    },
    {
      name: "Bear Agent",
      stance: "BEAR",
      argument:
        bearConfidence >= 65
          ? "Sell pressure and fake breakout risk argue against chasing."
          : "Bear case is present but not dominant.",
      confidence: bearConfidence,
    },
    {
      name: "Risk Agent",
      stance: "RISK",
      argument:
        riskConfidence >= 70
          ? "Sizing should stay reduced until liquidity and divergence risks compress."
          : "Risk is manageable, but confirmation is still required.",
      confidence: riskConfidence,
    },
  ]
}
