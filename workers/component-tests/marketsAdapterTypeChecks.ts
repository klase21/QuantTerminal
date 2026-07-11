import type { MarketsV2ViewModel } from "@/lib/markets-presentation/contracts"
import { buildMarketsV2ViewModel, type MarketsPresentationInput } from "@/lib/markets-presentation/adapters"

const input: MarketsPresentationInput = {
  symbol: "EXAMPLEUSDT", exchange: "example_exchange", timeframe: "1m",
  inheritedDashboard: { label: "UNAVAILABLE", detail: "No synthetic context.", direction: null, driverCount: null, evidenceCount: null, freshness: null },
  summaryMetrics: [], moduleAvailability: [false],
  sectorRotation: { request: { loading: false, error: "Unavailable", hasPayload: false }, source: null, mappedAssets: null, registryAssets: null, sectors: [] },
  etf: { request: { loading: false, error: "Unavailable", hasPayload: false }, source: null, row: null },
  reserve: { request: { loading: false, error: "Unavailable", hasPayload: false }, freshness: null, observedAt: null, row: null },
  derivatives: { fundingRate: null, fundingSource: null, openInterestNotional: null, openInterestSource: null, liquidationState: "unavailable", longLiquidationNotional: null, shortLiquidationNotional: null, venues: [], relationships: [], heuristics: [], liquidationDate: "2025-01-15", liquidationHour: "8" },
  breadth: { request: { loading: false, error: "Unavailable", hasPayload: false }, source: null, universeSize: null, advancers: null, decliners: null, registryAssets: null, heuristicClassification: null }, movers: [],
}
const model: MarketsV2ViewModel = buildMarketsV2ViewModel(input)
void model

// @ts-expect-error Regime cannot contain a locally inferred value.
const invalidRegime: MarketsV2ViewModel = { ...model, summary: { ...model.summary, regime: { ...model.summary.regime, value: "RISK_ON" } } }
// @ts-expect-error Readiness and freshness use independent contracts.
const invalidReadiness: MarketsV2ViewModel = { ...model, summary: { ...model.summary, sourceReadiness: { ...model.summary.sourceReadiness, label: "CURRENT" } } }
// @ts-expect-error Prediction Markets cannot become available in the approved R4 contract.
const invalidPrediction: MarketsV2ViewModel = { ...model, predictionMarkets: { ...model.predictionMarkets, availability: { state: "AVAILABLE" } } }
// @ts-expect-error Search cannot be implied by the existing runtime.
const invalidFilters: MarketsV2ViewModel = { ...model, filters: { ...model.filters, searchSupported: true } }
void invalidRegime
void invalidReadiness
void invalidPrediction
void invalidFilters
