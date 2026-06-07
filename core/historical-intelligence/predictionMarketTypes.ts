export type PredictionMarketVenue = "polymarket" | "kalshi" | "cme_fedwatch" | "internal_mock"
export type PredictionMarketCategory = "crypto_policy" | "macro" | "regulatory" | "election" | "flows"
export type MarketDisagreementSignal = "low" | "medium" | "high"

export interface PredictionMarketEvent {
  id: string
  title: string
  venue: PredictionMarketVenue
  category: PredictionMarketCategory
  relatedAsset: string
  relatedNarrative: string
  marketQuestion: string
  impliedProbability: number
  previousProbability: number
  probabilityChange: number
  crowdExpectation: string
  marketDisagreementSignal: MarketDisagreementSignal
  tacticalInterpretation: string
  memoryLinkCandidate: string
  relatedCaseIds: string[]
  updatedAt: string
}

export interface PredictionMarketQuery {
  caseId?: string
  symbol?: string
  category?: PredictionMarketCategory
  narrative?: string
  limit?: number
}

export interface PredictionMarketIntelligence {
  ok: true
  generatedAt: string
  mode: "catalog" | "case" | "filtered"
  marketEvents: PredictionMarketEvent[]
  dominantCrowdExpectation: string
  averageImpliedProbability: number
  averageProbabilityChange: number
  disagreementSignal: MarketDisagreementSignal
  tacticalInterpretation: string
  memoryLinkCandidates: string[]
}

export interface PredictionMarketRepository {
  listMarketEvents(query?: PredictionMarketQuery): PredictionMarketEvent[]
  getMarketEvent(id: string): PredictionMarketEvent | null
}
