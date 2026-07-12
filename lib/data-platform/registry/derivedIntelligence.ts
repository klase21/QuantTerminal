import type { DerivedIntelligenceRegistration } from "../contracts"

const models = [
  ["funding-momentum", ["funding"]], ["oi-expansion", ["open-interest"]], ["etf-accumulation", ["etf-flow"]],
  ["reserve-pressure", ["reserve"]], ["market-direction", ["ohlcv", "funding", "open-interest"]], ["risk-index", ["liquidation", "open-interest", "funding"]],
] as const

export const DERIVED_INTELLIGENCE_REGISTRY: readonly DerivedIntelligenceRegistration[] = models.map(([modelId, inputDatasets]) => ({
  modelId, modelVersion: "0.1.0", datasetId: "derived-market-intelligence", inputDatasets, inputWatermark: null, inputRecordSetDigest: null,
  calculationOwner: "Derived Intelligence", outputSchemaVersion: "1.0.0", limitations: ["Candidate registration only; calculation and canonical status are not certified in D1."],
  publicationPolicy: "HOLD_FOR_REVIEW", evidenceEligibility: false, status: "CANDIDATE",
}))
