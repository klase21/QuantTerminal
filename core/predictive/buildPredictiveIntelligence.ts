import type { PredictiveIntelligenceState, TradeFlowSnapshot } from "./predictiveTypes"
import { deriveLiquidityZones } from "./liquidityHeatmapEngine"
import { deriveMarketPsychology } from "./marketPsychologyEngine"
import { deriveNarrativeMomentum } from "./narrativeMomentumEngine"
import { predictRotation } from "./predictiveRotationEngine"
import { deriveRealtimeConfidence } from "./realtimeConfidenceEngine"
import { buildScenarioSimulation } from "./scenarioSimulationEngine"
import { generateTacticalSummary } from "./tacticalSummaryEngine"
import { deriveTacticalProbability } from "./tacticalProbabilityEngine"

export function buildPredictiveIntelligence(flow?: Partial<TradeFlowSnapshot>): PredictiveIntelligenceState {
  const buy = Number(flow?.buyVolume || 0)
  const sell = Number(flow?.sellVolume || 0)
  const total = Math.max(1, buy + sell)
  const pressureGap = Math.abs((buy / total) * 100 - (sell / total) * 100)

  const narrative = deriveNarrativeMomentum({
    narrative: buy >= sell ? "Risk-on leadership" : "Defensive rotation",
    velocity: 56 + pressureGap * 0.45,
    acceleration: 50 + Math.min(28, Math.abs(Number(flow?.delta || 0)) * 0.04),
    saturation: 58 + Math.min(26, total / 180),
  })

  const liquidityZones = deriveLiquidityZones(flow)
  const psychology = deriveMarketPsychology(flow)
  const primaryRotation = predictRotation(flow, narrative)
  const probability = deriveTacticalProbability(flow, narrative, liquidityZones)
  const confidence = deriveRealtimeConfidence(probability, narrative)
  const scenarios = buildScenarioSimulation(probability)

  const withoutSummary = {
    primaryRotation,
    narrative,
    liquidityZones,
    psychology,
    probability,
    confidence,
    scenarios,
  }

  return {
    ...withoutSummary,
    summary: generateTacticalSummary(withoutSummary),
  }
}
