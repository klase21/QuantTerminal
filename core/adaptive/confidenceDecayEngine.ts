export interface DecayedConfidence {
  original: number
  decayed: number
  freshness: number
  label: "FRESH" | "VALID" | "STALE"
}

export function applyConfidenceDecay({
  confidence,
  ageMinutes,
  halfLifeMinutes = 35,
}: {
  confidence: number
  ageMinutes: number
  halfLifeMinutes?: number
}): DecayedConfidence {
  const decayFactor = Math.pow(0.5, Math.max(0, ageMinutes) / Math.max(1, halfLifeMinutes))
  const decayed = Math.round(confidence * decayFactor)
  const freshness = Math.round(decayFactor * 100)

  return {
    original: confidence,
    decayed,
    freshness,
    label: freshness > 72 ? "FRESH" : freshness > 42 ? "VALID" : "STALE",
  }
}
