import { DATASET_REGISTRY } from "@/lib/data-platform/registry"
import type { CanonicalFactTable } from "@/lib/data-platform/persistence"
import type { HistoricalDatasetScope } from "./contracts"

const TARGETS: Readonly<Record<string, CanonicalFactTable | "DOCUMENT_METADATA" | null>> = Object.freeze({
  ohlcv: "OHLCV", funding: "FUNDING", "open-interest": "OPEN_INTEREST", liquidation: "LIQUIDATION",
  "agg-trade": "STREAM_MANIFEST", orderbook: "STREAM_MANIFEST", "prediction-market": "PREDICTION_SNAPSHOT",
  "etf-flow": "ETF_OBSERVATION", reserve: "RESERVE_OBSERVATION", macro: "MACRO_OBSERVATION",
  "research-document": null, "research-packet": "DOCUMENT_METADATA", "evidence-packet": "DOCUMENT_METADATA",
  "coverage-projection": null, "derived-market-intelligence": null, "population-job": null, "consistency-result": null,
})

const requiredSources = new Set(["ohlcv", "funding", "open-interest", "liquidation", "agg-trade", "orderbook", "prediction-market", "etf-flow", "reserve", "macro", "research-document"])

export function buildHistoricalDatasetScope(): readonly HistoricalDatasetScope[] {
  return Object.freeze(DATASET_REGISTRY.map((entry): HistoricalDatasetScope => {
    const target = TARGETS[entry.datasetId] ?? null
    if (entry.datasetClass === "CONTROL_PLANE") return Object.freeze({ datasetId: entry.datasetId, classification: "CONTROL_PLANE", status: "EXCLUDED_FROM_SOURCE_BACKFILL", justification: "Runtime control state is not acquired historical source data.", producingOrSourceSystem: entry.primaryProvider ?? "internal-canonical", canonicalTarget: target, ownerPhase: entry.datasetId === "consistency-result" ? "D4" : "D3" })
    if (["PROJECTION", "EVIDENCE", "DERIVED_INTELLIGENCE"].includes(entry.datasetClass) || ["research-packet"].includes(entry.datasetId)) return Object.freeze({ datasetId: entry.datasetId, classification: "DERIVED_INTERNAL", status: "EXCLUDED_FROM_SOURCE_BACKFILL", justification: "This object is produced from canonical source facts and is not fetched as source history.", producingOrSourceSystem: entry.primaryProvider ?? "internal-canonical", canonicalTarget: target, ownerPhase: entry.datasetId === "coverage-projection" ? "D3" : "D4" })
    const required = requiredSources.has(entry.datasetId)
    const providerBlocked = entry.primaryProvider === "governed-external"
    const status = target === null ? "BLOCKED_REQUIRED_TARGET" : providerBlocked ? "BLOCKED_REQUIRED_PROVIDER" : required ? "REQUIRED" : "OPTIONAL"
    return Object.freeze({ datasetId: entry.datasetId, classification: "SOURCE_HISTORICAL", status, justification: required ? "Required by an active product or Replay evidence path; absence must remain explicit." : "Registered factual source without a currently mandatory historical consumer.", producingOrSourceSystem: entry.primaryProvider ?? "UNAVAILABLE", canonicalTarget: target, ownerPhase: "D3" })
  }))
}
