import { buildCorrelationRegimeState } from "@/core/correlation/correlationRegimeEngine"
import { buildProbabilisticScenarioState } from "@/core/scenario/probabilisticScenarioEngine"
import { buildDualMarketIntelligence } from "@/core/dual-market/dualMarketEngine"
import { emptyMarketFlow, normalizeFlowSnapshot } from "@/core/dual-market/dualMarketEngine"

export interface TacticalAgentContext {
  symbol: string
  flow: {
    buyPressure: number
    sellPressure: number
    cvd: number
    delta: number
  }
  dualMarket: {
    divergenceScore: number
    fakeBreakoutRisk: number
    realDemandConfirmation: number
    absorptionScore: number
    summary: string
  }
  macro: {
    regime: string
    riskOnScore: number
    liquidityStress: number
    crossAssetConfirmation: number
    fragileRallyRisk: number
  }
  scenario: {
    topScenario: string
    topProbability: number
    collapseRisk: number
  }
  focus: {
    target: string
    scope: string
  }
}

function safeNumber(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export function buildTacticalAgentContext({
  symbol = "BTCUSDT",
  flow,
  spotFlow,
  futuresFlow,
  focusTarget = "NONE",
  focusScope = "GLOBAL",
}: {
  symbol?: string
  flow?: any
  spotFlow?: any
  futuresFlow?: any
  focusTarget?: string
  focusScope?: string
}): TacticalAgentContext {
  const normalizedSymbol = String(symbol || flow?.symbol || "BTCUSDT").toUpperCase()

  const macro = buildCorrelationRegimeState()
  const scenario = buildProbabilisticScenarioState({
    buyPressure: safeNumber(flow?.buyPressure, 38),
    sellPressure: safeNumber(flow?.sellPressure, 62),
    rotationConfidence: 81,
    liquidityRisk: macro.liquidityStress,
    contradictionPenalty: macro.fragileRallyRisk > 60 ? 18 : 12,
  })

  const spot = spotFlow
    ? normalizeFlowSnapshot(spotFlow, "SPOT", normalizedSymbol)
    : emptyMarketFlow(normalizedSymbol, "SPOT")

  const futures = futuresFlow
    ? normalizeFlowSnapshot(futuresFlow, "FUTURES", normalizedSymbol)
    : normalizeFlowSnapshot(flow, "FUTURES", normalizedSymbol)

  const dual = buildDualMarketIntelligence({
    symbol: normalizedSymbol,
    mode: "HYBRID",
    spot,
    futures,
  })

  return {
    symbol: normalizedSymbol,
    flow: {
      buyPressure: safeNumber(flow?.buyPressure, 38),
      sellPressure: safeNumber(flow?.sellPressure, 62),
      cvd: safeNumber(flow?.cvd),
      delta: safeNumber(flow?.delta),
    },
    dualMarket: {
      divergenceScore: dual.divergenceScore,
      fakeBreakoutRisk: dual.fakeBreakoutRisk,
      realDemandConfirmation: dual.realDemandConfirmation,
      absorptionScore: dual.absorptionScore,
      summary: dual.summary,
    },
    macro: {
      regime: macro.regime,
      riskOnScore: macro.riskOnScore,
      liquidityStress: macro.liquidityStress,
      crossAssetConfirmation: macro.crossAssetConfirmation,
      fragileRallyRisk: macro.fragileRallyRisk,
    },
    scenario: {
      topScenario: scenario.branches[0]?.title ?? "No scenario",
      topProbability: scenario.branches[0]?.probability ?? 0,
      collapseRisk: scenario.confidenceCollapseRisk,
    },
    focus: {
      target: focusTarget,
      scope: focusScope,
    },
  }
}
