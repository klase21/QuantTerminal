import { clamp } from "@/core/shared/metrics"
import type { CrowdingInput, CrowdingRiskItem, CrowdRiskState } from "./crowdingTypes"

function stateFor(score: number): CrowdRiskState {
  if (score >= 82) return "Extreme"
  if (score >= 68) return "Elevated"
  if (score >= 48) return "Moderate"
  return "Low"
}

function labelFor(state: CrowdRiskState) {
  switch (state) {
    case "Extreme":
      return "Extreme Crowding"
    case "Elevated":
      return "Elevated Crowding"
    case "Moderate":
      return "Moderate Crowding"
    default:
      return "Low Crowding"
  }
}

function noteFor(input: CrowdingInput, state: CrowdRiskState) {
  if (state === "Extreme") return `${input.narrative} is at extreme participation risk; avoid chasing late continuation.`
  if (state === "Elevated") return `${input.narrative} participation is strong but crowding is rising.`
  if (state === "Moderate") return `${input.narrative} has manageable crowding; wait for breadth confirmation.`
  return `${input.narrative} crowding remains low.`
}

export function deriveCrowdingRisk(inputs: CrowdingInput[]): CrowdingRiskItem[] {
  return inputs.map((input) => {
    const newsBuzz = input.newsBuzz ?? 0
    const confidence = input.confidence ?? 0
    const breadthDecay = Math.max(0, input.participationVelocity - input.breadth)
    const extremity = clamp(
      input.participationVelocity * 0.30 +
        input.volatility * 0.24 +
        newsBuzz * 0.18 +
        input.premiumBoost * 0.14 +
        confidence * 0.08 +
        breadthDecay * 0.06
    )
    const crowdRisk = clamp(extremity * 0.78 + breadthDecay * 0.22)
    const state = stateFor(crowdRisk)
    return {
      narrative: input.narrative,
      crowdRisk,
      extremity,
      state,
      label: labelFor(state),
      operatorNote: noteFor(input, state),
    }
  })
}
