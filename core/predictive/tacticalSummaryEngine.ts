import type { PredictiveIntelligenceState } from "./predictiveTypes"

export function generateTacticalSummary(state: Omit<PredictiveIntelligenceState, "summary">): string {
  const direction = state.probability.direction === "NEUTRAL" ? "wait" : state.probability.direction.toLowerCase()
  const rotation = `${state.primaryRotation.from} → ${state.primaryRotation.to}`
  const liquidity = state.liquidityZones[0]

  return `Bias is ${direction}. Probable rotation is ${rotation} with ${state.primaryRotation.probability}% probability. Narrative phase is ${state.narrative.phase.toLowerCase()} and ${liquidity?.label.toLowerCase() ?? "liquidity"} is the main magnet. ${state.psychology.read}`
}
