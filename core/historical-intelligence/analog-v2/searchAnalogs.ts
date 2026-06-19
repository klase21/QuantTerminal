import type {
  HistoricalAnalogCase,
  HistoricalAnalogFeatureVector,
  HistoricalAnalogOutcome,
  HistoricalMarketStateV2,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"

const FEATURE_MODEL: Record<keyof HistoricalAnalogFeatureVector, { weight: number; scale: number }> = {
  return1h: { weight: 1, scale: 1.5 },
  return4h: { weight: 1.2, scale: 3 },
  return24h: { weight: 1.5, scale: 6 },
  volumeZScore: { weight: 1, scale: 2 },
  realizedVolatility24h: { weight: 1.2, scale: 2 },
  distanceSma20: { weight: 1, scale: 4 },
  distanceSma50: { weight: 1, scale: 8 },
  fundingRate: { weight: 0.5, scale: 0.001 },
  openInterestChange24h: { weight: 0.8, scale: 5 },
}

export const HISTORICAL_ANALOG_MINIMUM_COMPARABLE_FEATURES = 4
export const HISTORICAL_ANALOG_EXCLUSION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

function similarity(current: HistoricalMarketStateV2, candidate: HistoricalMarketStateV2) {
  let weightedDistance = 0
  let totalWeight = 0
  let comparableFeatures = 0

  for (const [name, model] of Object.entries(FEATURE_MODEL) as Array<
    [keyof HistoricalAnalogFeatureVector, { weight: number; scale: number }]
  >) {
    const currentValue = current.features[name]
    const candidateValue = candidate.features[name]
    if (currentValue === null || candidateValue === null) continue
    const normalizedDifference = (currentValue - candidateValue) / model.scale
    weightedDistance += (normalizedDifference ** 2) * model.weight
    totalWeight += model.weight
    comparableFeatures += 1
  }

  if (comparableFeatures < HISTORICAL_ANALOG_MINIMUM_COMPARABLE_FEATURES || totalWeight === 0) {
    return null
  }
  const regimePenalty = current.trendRegime !== "unknown"
    && candidate.trendRegime !== "unknown"
    && current.trendRegime !== candidate.trendRegime
    ? 0.35
    : 0
  const distance = Math.sqrt(weightedDistance / totalWeight) + regimePenalty
  return {
    similarity: Number((100 / (1 + distance)).toFixed(4)),
    comparableFeatures,
  }
}

export function findHistoricalAnalogsV2(input: {
  currentState: HistoricalMarketStateV2
  states: HistoricalMarketStateV2[]
  outcomes: HistoricalAnalogOutcome[]
  limit?: number
  exclusionWindowMs?: number
}) {
  const outcomeByStateId = new Map(input.outcomes.map((outcome) => [outcome.stateId, outcome]))
  const exclusionWindowMs = input.exclusionWindowMs ?? HISTORICAL_ANALOG_EXCLUSION_WINDOW_MS
  const candidates = input.states.filter((state) => (
    state.symbol === input.currentState.symbol
    && state.interval === input.currentState.interval
    && state.timestamp < input.currentState.timestamp - exclusionWindowMs
    && outcomeByStateId.has(state.id)
  ))

  const cases: HistoricalAnalogCase[] = candidates.flatMap((state) => {
    const result = similarity(input.currentState, state)
    const outcome = outcomeByStateId.get(state.id)
    if (!result || !outcome) return []
    return [{ state, outcome, ...result }]
  })

  cases.sort((left, right) => (
    right.similarity - left.similarity
    || right.comparableFeatures - left.comparableFeatures
    || right.state.timestamp - left.state.timestamp
    || left.state.id.localeCompare(right.state.id)
  ))

  return {
    candidateCount: candidates.length,
    cases: cases.slice(0, Math.max(1, input.limit ?? 25)),
    exclusionWindowMs,
  }
}
