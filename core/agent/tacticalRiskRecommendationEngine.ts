import type { AgentDecision } from "@/core/agent/tacticalAgentDecisionEngine"
import type { TacticalAgentContext } from "@/core/agent/tacticalContextBuilder"

export interface RiskRecommendation {
  suggestedSize: string
  stopStyle: string
  timing: string
  invalidation: string
  checklist: string[]
}

export function buildRiskRecommendation(
  decision: AgentDecision,
  context: TacticalAgentContext,
): RiskRecommendation {
  const highRisk =
    context.dualMarket.fakeBreakoutRisk >= 62 ||
    context.macro.liquidityStress >= 65 ||
    context.scenario.collapseRisk >= 60

  const suggestedSize =
    decision.action === "NO_TRADE" || decision.action === "REDUCE_RISK"
      ? "0x ~ 0.10x"
      : highRisk
        ? "0.20x ~ 0.35x normal size"
        : decision.confidence >= 74
          ? "0.50x ~ 0.70x normal size"
          : "0.25x ~ 0.40x normal size"

  const stopStyle =
    decision.action === "LONG"
      ? "flow invalidation stop below failed absorption"
      : decision.action === "SCALP_ONLY" || decision.action === "SHORT"
        ? "tight stop above failed bounce / imbalance flip"
        : "no active stop because no trade is preferred"

  const timing =
    decision.action === "LONG"
      ? "wait for buy imbalance + CVD recovery"
      : decision.action === "SCALP_ONLY"
        ? "only during immediate sell-pressure continuation"
        : "wait for next clean trigger"

  const invalidation =
    decision.action === "LONG"
      ? "invalidate if spot confirmation fades or sell pressure expands"
      : decision.action === "SCALP_ONLY"
        ? "invalidate if absorption appears or buy pressure reclaims tape"
        : "invalidate the idea until cross-market confirmation improves"

  const checklist = [
    "Spot/Futures divergence is acceptable",
    "Macro regime does not contradict the trade",
    "Execution flow confirms direction",
    "Scenario collapse risk is controlled",
    "Position size matches confidence",
  ]

  return {
    suggestedSize,
    stopStyle,
    timing,
    invalidation,
    checklist,
  }
}
