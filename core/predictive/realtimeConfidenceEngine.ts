import type { NarrativeMomentumSignal, RealtimeConfidenceState, TacticalProbabilityResult } from "./predictiveTypes"
import { clamp } from "./tacticalMath"

export function deriveRealtimeConfidence(probability: TacticalProbabilityResult, narrative?: NarrativeMomentumSignal): RealtimeConfidenceState {
  const rawConfidence = clamp(probability.probability)
  const validationBoost = clamp((narrative?.phase === "EXPANSION" ? 12 : 4) + (probability.blockers.length <= 1 ? 8 : 0), 0, 25)
  const contradictionPenalty = clamp(probability.blockers.length * 7, 0, 30)
  const decayPenalty = clamp(narrative?.saturation && narrative.saturation > 72 ? 12 : 4, 0, 20)
  const finalConfidence = clamp(Math.round(rawConfidence + validationBoost - contradictionPenalty - decayPenalty))

  return { rawConfidence, validationBoost, contradictionPenalty, decayPenalty, finalConfidence }
}
