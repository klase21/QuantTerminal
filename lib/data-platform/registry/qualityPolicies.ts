import type { DatasetQualityPolicy, QualityRule } from "../contracts"

export const QUALITY_RULES = [
  { ruleId: "structural.schema", ruleClass: "STRUCTURAL", applicability: "All canonical candidates", ruleVersion: "1.0.0", severity: "CRITICAL", publicationEffect: "REJECT" },
  { ruleId: "identity.deterministic", ruleClass: "IDENTITY", applicability: "All canonical candidates", ruleVersion: "1.0.0", severity: "CRITICAL", publicationEffect: "REJECT" },
  { ruleId: "temporal.valid", ruleClass: "TEMPORAL", applicability: "Temporal datasets", ruleVersion: "1.0.0", severity: "HIGH", publicationEffect: "HOLD" },
  { ruleId: "domain.values", ruleClass: "DOMAIN", applicability: "Dataset-specific values", ruleVersion: "1.0.0", severity: "CRITICAL", publicationEffect: "REJECT" },
  { ruleId: "lineage.raw-object", ruleClass: "LINEAGE", applicability: "Externally sourced facts", ruleVersion: "1.0.0", severity: "HIGH", publicationEffect: "QUARANTINE" },
  { ruleId: "publication.consistency", ruleClass: "PUBLICATION", applicability: "Published read models", ruleVersion: "1.0.0", severity: "CRITICAL", publicationEffect: "HOLD" },
] as const satisfies readonly QualityRule[]

const policyDatasets = ["ohlcv", "funding", "open-interest", "liquidation", "agg-trade", "orderbook", "prediction-market", "etf-flow", "reserve", "macro", "research-document", "evidence-packet"] as const
export const QUALITY_POLICIES: readonly DatasetQualityPolicy[] = policyDatasets.map((datasetId) => ({
  policyId: `quality.${datasetId}`, datasetId, policyVersion: "1.0.0", state: "PROPOSED",
  rules: ["structural.schema", "identity.deterministic", "domain.values", "lineage.raw-object"].map((ruleId) => ({ ruleId, mandatory: true })),
  providerTierRequirement: "Dataset registry governs tier", coverageMethod: "Dataset-class-specific coverage", freshnessPolicyState: "PROPOSED",
  publicationEffect: "HOLD", evidenceEligibility: datasetId !== "prediction-market",
  unresolvedGovernanceDecisions: ["Numeric freshness and coverage thresholds require D2 operational evidence."],
}))
