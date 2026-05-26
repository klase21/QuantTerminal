import type { TacticalAgentContext } from "@/core/agent/tacticalContextBuilder"

export type AgentAction =
  | "LONG"
  | "SHORT"
  | "WAIT"
  | "REDUCE_RISK"
  | "SCALP_ONLY"
  | "NO_TRADE"

export interface ConfidenceFactor {
  label: string
  impact: "positive" | "negative" | "neutral"
  weight: number
  detail: string
}

export interface AgentDecision {
  action: AgentAction
  headline: string
  confidence: number
  conviction: "LOW" | "MEDIUM" | "HIGH"
  confidenceTree: ConfidenceFactor[]
  summary: string
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function buildAgentDecision(context: TacticalAgentContext): AgentDecision {
  const factors: ConfidenceFactor[] = []

  if (context.dualMarket.realDemandConfirmation >= 65) {
    factors.push({
      label: "Spot demand confirmation",
      impact: "positive",
      weight: 18,
      detail: "Spot demand is strong enough to support continuation.",
    })
  } else {
    factors.push({
      label: "Weak real demand",
      impact: "negative",
      weight: -12,
      detail: "Spot confirmation is not strong enough yet.",
    })
  }

  if (context.dualMarket.fakeBreakoutRisk >= 62) {
    factors.push({
      label: "Fake breakout risk",
      impact: "negative",
      weight: -18,
      detail: "Perp/spot divergence suggests breakout quality is fragile.",
    })
  }

  if (context.macro.regime === "RISK_ON_EXPANSION") {
    factors.push({
      label: "Risk-on macro regime",
      impact: "positive",
      weight: 14,
      detail: "Cross-asset backdrop supports risk-on continuation.",
    })
  }

  if (
    context.macro.regime === "FRAGILE_RALLY" ||
    context.macro.regime === "LIQUIDITY_SQUEEZE" ||
    context.macro.regime === "DEFENSIVE_ROTATION"
  ) {
    factors.push({
      label: "Macro risk filter",
      impact: "negative",
      weight: -18,
      detail: "Macro regime requires reduced aggression.",
    })
  }

  if (context.flow.sellPressure > context.flow.buyPressure + 15) {
    factors.push({
      label: "Sell pressure dominance",
      impact: "negative",
      weight: -14,
      detail: "Execution flow is still sell-heavy.",
    })
  } else if (context.flow.buyPressure > context.flow.sellPressure) {
    factors.push({
      label: "Buy pressure recovery",
      impact: "positive",
      weight: 12,
      detail: "Execution flow supports bullish confirmation.",
    })
  }

  if (context.dualMarket.absorptionScore >= 60) {
    factors.push({
      label: "Absorption regime",
      impact: "positive",
      weight: 10,
      detail: "Spot may be absorbing futures selling.",
    })
  }

  if (context.scenario.collapseRisk >= 60) {
    factors.push({
      label: "Scenario collapse risk",
      impact: "negative",
      weight: -12,
      detail: "Scenario confidence can deteriorate quickly.",
    })
  }

  const rawScore =
    50 + factors.reduce((sum, item) => sum + item.weight, 0)

  const confidence = clamp(rawScore)
  const conviction =
    confidence >= 74 ? "HIGH" : confidence >= 58 ? "MEDIUM" : "LOW"

  let action: AgentAction = "WAIT"
  let headline = "Wait for cleaner confirmation"

  if (context.macro.liquidityStress >= 72 || context.scenario.collapseRisk >= 72) {
    action = "REDUCE_RISK"
    headline = "Reduce risk until macro/liquidity pressure fades"
  } else if (context.dualMarket.fakeBreakoutRisk >= 68) {
    action = "NO_TRADE"
    headline = "Avoid chasing perp-led breakout"
  } else if (
    confidence >= 70 &&
    context.dualMarket.realDemandConfirmation >= 65 &&
    context.flow.buyPressure >= context.flow.sellPressure - 5
  ) {
    action = "LONG"
    headline = `Long ${context.symbol} only after execution confirmation`
  } else if (
    context.flow.sellPressure >= 68 &&
    context.dualMarket.realDemandConfirmation < 55
  ) {
    action = "SCALP_ONLY"
    headline = "Short scalp only, avoid overstaying"
  } else if (confidence <= 42) {
    action = "NO_TRADE"
    headline = "No trade: signal quality is too weak"
  }

  const summary =
    action === "LONG"
      ? "Agent favors a conditional long, but only after flow confirmation and invalidation discipline."
      : action === "SCALP_ONLY"
        ? "Agent allows only tactical scalp behavior because broader confirmation is weak."
        : action === "REDUCE_RISK"
          ? "Agent prioritizes capital protection due to elevated macro or scenario risk."
          : action === "NO_TRADE"
            ? "Agent rejects the setup because risk/reward quality is not sufficient."
            : "Agent prefers waiting until spot, futures, macro, and execution signals align."

  return {
    action,
    headline,
    confidence,
    conviction,
    confidenceTree: factors,
    summary,
  }
}
