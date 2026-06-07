import { mockPredictionMarketRepository } from "./predictionMarketRepository"
import type {
  MarketDisagreementSignal,
  PredictionMarketEvent,
  PredictionMarketIntelligence,
  PredictionMarketQuery,
} from "./predictionMarketTypes"

const GENERATED_AT = "2026-06-07T00:00:00.000Z"

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function disagreementSignal(events: PredictionMarketEvent[]): MarketDisagreementSignal {
  if (events.some((event) => event.marketDisagreementSignal === "high")) return "high"
  if (events.some((event) => event.marketDisagreementSignal === "medium")) return "medium"
  return "low"
}

function dominantExpectation(events: PredictionMarketEvent[]) {
  const strongest = [...events].sort((a, b) => b.impliedProbability - a.impliedProbability)[0]
  return strongest?.crowdExpectation ?? "No active mock prediction market expectation."
}

function tacticalInterpretation(events: PredictionMarketEvent[]) {
  const biggestMove = [...events].sort((a, b) => Math.abs(b.probabilityChange) - Math.abs(a.probabilityChange))[0]
  if (!biggestMove) return "Prediction market layer has no mock event for this scope."
  if (biggestMove.marketDisagreementSignal === "high") {
    return `${biggestMove.title}: disagreement is elevated; treat odds movement as a tactical warning, not confirmation.`
  }
  return biggestMove.tacticalInterpretation
}

export function getPredictionMarketIntelligence(query?: PredictionMarketQuery): PredictionMarketIntelligence {
  const marketEvents = mockPredictionMarketRepository.listMarketEvents(query)

  return {
    ok: true,
    generatedAt: GENERATED_AT,
    mode: query?.caseId ? "case" : query?.symbol || query?.category || query?.narrative ? "filtered" : "catalog",
    marketEvents,
    dominantCrowdExpectation: dominantExpectation(marketEvents),
    averageImpliedProbability: Math.round(average(marketEvents.map((event) => event.impliedProbability))),
    averageProbabilityChange: Number(average(marketEvents.map((event) => event.probabilityChange)).toFixed(1)),
    disagreementSignal: disagreementSignal(marketEvents),
    tacticalInterpretation: tacticalInterpretation(marketEvents),
    memoryLinkCandidates: Array.from(new Set(marketEvents.map((event) => event.memoryLinkCandidate))),
  }
}
