import type { DatasetClass, DatasetRegistryEntry, ReplayGranularity, StorageClass } from "../contracts"

type Seed = readonly [string, string, DatasetClass, string, ReplayGranularity, readonly StorageClass[], boolean]
const seeds: readonly Seed[] = [
  ["ohlcv", "OHLCV", "FACT_FIXED_CADENCE", "binance-futures-api", "ONE_MINUTE", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW", "OBJECT_STORAGE_COLUMNAR"], true],
  ["funding", "Funding", "FACT_EVENT", "binance-futures-api", "EIGHT_HOUR_EVENT", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW"], true],
  ["open-interest", "Open Interest", "FACT_FIXED_CADENCE", "binance-futures-api", "FIVE_MINUTE", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW"], true],
  ["liquidation", "Liquidation", "FACT_EVENT_STREAM", "binance-futures-api", "EVENT", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW", "OBJECT_STORAGE_COLUMNAR"], true],
  ["agg-trade", "AggTrade", "FACT_EVENT_STREAM", "binance-futures-api", "TICK", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW", "OBJECT_STORAGE_COLUMNAR"], true],
  ["orderbook", "Orderbook", "FACT_EVENT_STREAM", "cryptohftdata", "TICK", ["OBJECT_STORAGE_RAW", "OBJECT_STORAGE_COLUMNAR", "MATERIALIZED_VIEW"], true],
  ["prediction-market", "Prediction Markets", "FACT_SNAPSHOT", "governed-external", "SNAPSHOT", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW"], false],
  ["etf-flow", "ETF Flow", "FACT_FIXED_CADENCE", "farside-investors", "SNAPSHOT", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW"], true],
  ["reserve", "Reserve", "FACT_SNAPSHOT", "governed-external", "SNAPSHOT", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW"], true],
  ["macro", "Official Macro", "FACT_EVENT", "fred", "EVENT", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW"], true],
  ["daily-market-context", "Daily Market Context", "FACT_FIXED_CADENCE", "alpha-vantage", "SNAPSHOT", ["POSTGRES_FACT", "OBJECT_STORAGE_RAW"], true],
  ["research-document", "Research Documents", "DOCUMENT", "governed-external", "DOCUMENT", ["POSTGRES_METADATA", "OBJECT_STORAGE_RAW"], true],
  ["research-packet", "Research Packets", "DOCUMENT", "internal-canonical", "DOCUMENT", ["POSTGRES_METADATA", "OBJECT_STORAGE_RAW"], true],
  ["evidence-packet", "Evidence Packets", "EVIDENCE", "internal-canonical", "DOCUMENT", ["POSTGRES_METADATA", "OBJECT_STORAGE_RAW"], true],
  ["coverage-projection", "Coverage Projections", "PROJECTION", "internal-canonical", "SNAPSHOT", ["POSTGRES_METADATA", "MATERIALIZED_VIEW"], true],
  ["derived-market-intelligence", "Derived Market Intelligence", "DERIVED_INTELLIGENCE", "internal-canonical", "SNAPSHOT", ["POSTGRES_METADATA", "MATERIALIZED_VIEW"], false],
  ["population-job", "Population Jobs", "CONTROL_PLANE", "internal-canonical", "NOT_APPLICABLE", ["POSTGRES_METADATA"], false],
  ["consistency-result", "Consistency Results", "CONTROL_PLANE", "internal-canonical", "NOT_APPLICABLE", ["POSTGRES_METADATA"], false],
]

const proposed = (policyId: string) => ({ policyId, version: "1.0.0", state: "PROPOSED" as const })

export const DATASET_REGISTRY: readonly DatasetRegistryEntry[] = seeds.map(([datasetId, displayName, datasetClass, primaryProvider, granularity, storageClasses, replay]) => ({
  datasetId, displayName, domainOwner: `Data Platform / ${displayName}`, canonicalOwner: "Canonical Data Platform", datasetClass,
  primaryProvider, approvedFallbacks: datasetId === "ohlcv" || datasetId === "agg-trade" ? ["binance-public-archive"] : [],
  providerTierRequirement: primaryProvider === "governed-external" || primaryProvider === "cryptohftdata"
    ? "C_VERIFIED_PUBLIC"
    : ["ohlcv", "agg-trade"].includes(datasetId) ? "B_OFFICIAL_ARCHIVE" : "A_OFFICIAL_API",
  canonicalSchema: `canonical.${datasetId}`, schemaVersion: "1.0.0", identityRule: `identity.${datasetId}.v1`, versioningRule: "immutable-supersession-v1", normalizationRule: `normalize.${datasetId}.v1`,
  qualityPolicy: proposed(`quality.${datasetId}`), coveragePolicy: proposed(`coverage.${datasetId}`), freshnessPolicy: proposed(`freshness.${datasetId}`),
  consistencyPolicy: proposed(`consistency.${datasetId}`), publicationPolicy: proposed(datasetClass === "DERIVED_INTELLIGENCE" ? "experimental-derived" : "fact-strict"),
  retentionPolicy: proposed(`retention.${datasetId}`), storageClasses, partitionPolicy: proposed(`partition.${datasetId}`),
  populationFrequency: proposed(`population.${datasetId}`), reconciliationFrequency: proposed(`reconciliation.${datasetId}`),
  consumerPages: datasetClass === "CONTROL_PLANE" ? ["NONE"] : ["DASHBOARD", "MARKETS", "RESEARCH", "REPLAY", "SCANNER", "TRADE"],
  repositoryTraceability: datasetClass === "CONTROL_PLANE" ? "NONE" : "RECORD_LEVEL", evidenceEligibility: datasetClass !== "CONTROL_PLANE" && datasetClass !== "DERIVED_INTELLIGENCE",
  sensitivity: "PUBLIC", freeTierPriority: ["ohlcv", "funding", "open-interest", "liquidation"].includes(datasetId) ? "P0" : "P1",
  operationalSla: proposed(`sla.${datasetId}`), registryVersion: "1.0.0", effectiveAt: "2026-07-12T00:00:00.000Z", supersedesVersion: null,
  replayCapability: { supported: replay, granularity, boundedQuerySupport: replay, sequenceSupport: ["liquidation", "agg-trade", "orderbook"].includes(datasetId), snapshotSupport: datasetClass === "FACT_SNAPSHOT", rawRehydrationRequired: datasetId === "orderbook", limitations: replay ? [] : ["Replay contract is not certified for this dataset."] },
  dependencies: datasetClass === "PROJECTION" ? [{ upstreamDatasetId: "all-canonical-facts", dependencyType: "FACT_INPUT", required: true, minimumCompatibleVersion: "1.0.0", watermarkRequirement: "AT_LEAST", failureBehavior: "BLOCK" }] : [],
}))

export const DATASET_IDS = DATASET_REGISTRY.map((entry) => entry.datasetId)
