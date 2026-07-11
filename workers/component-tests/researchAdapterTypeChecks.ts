import type { ResearchV2ViewModel } from "@/lib/research-presentation/contracts"
import { buildResearchV2ViewModel, type ResearchPresentationInput } from "@/lib/research-presentation/adapters"

const input: ResearchPresentationInput = {
  symbol: "EXAMPLEUSDT", exchange: "example_exchange", timeframe: "1h", title: "Synthetic Research", question: "What supplied evidence is available?",
  decisionBrief: null, evidence: [], secondaryContext: [], primarySourceCandidates: [], predictionMarkets: [], predictionSource: null,
  predictionPolling: { loading: false, error: null, hasPayload: false }, relatedResearch: [],
  repository: { utcDay: "2025-01-15", status: "NOT_CHECKED", reason: null, rows: [] },
  selectedHistoricalCaseId: null, availableHistoricalCaseIds: [], handoffs: [],
}
const model: ResearchV2ViewModel = buildResearchV2ViewModel(input)
void model

// @ts-expect-error Lifecycle and availability are separate vocabularies.
const invalidLifecycle: ResearchV2ViewModel = { ...model, summary: { ...model.summary, lifecycle: "UNAVAILABLE" } }
// @ts-expect-error Prediction probability cannot become a confidence contract.
const invalidPrediction: ResearchV2ViewModel = { ...model, predictionContext: [{ ...model.predictionContext[0], confidence: 70 }] }
// @ts-expect-error Search cannot be implied by the current runtime contract.
const invalidFilters: ResearchV2ViewModel = { ...model, filters: { ...model.filters, searchSupported: true } }
void invalidLifecycle
void invalidPrediction
void invalidFilters
