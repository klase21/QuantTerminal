import type { EvidenceProfile } from "./contracts"

const proposed = (profileId: string, description: string, datasets: readonly string[]): EvidenceProfile => ({
  profileId, profileVersion: "1.0.0", description,
  requirements: [{ requirementId: profileId + ".facts", datasetIds: datasets, required: true, acceptedRoles: ["SUPPORTING", "CONFLICTING"], consistencyRuleReferences: [{ ruleId: "d4.publication-state-compatible", ruleVersion: "1.0.0" }] }],
  assemblyPolicyVersionId: "d4.assembly-policy.unapproved", publicationPolicyVersionId: "d4.publication-policy.unapproved",
  schemaVersion: "1.0.0", consumerNeutral: true, state: "PROPOSED",
  limitations: ["Profile is a contract candidate only; no thresholds, runtime, or publication approval exists."],
})

export const EVIDENCE_PROFILE_REGISTRY: readonly EvidenceProfile[] = Object.freeze([
  proposed("d4.market-state", "Bounded market-state evidence.", ["ohlcv", "funding", "open-interest"]),
  proposed("d4.market-move-context", "Non-causal market-move context.", ["ohlcv", "liquidation", "open-interest", "funding"]),
  proposed("d4.replay-event-context", "Event and knowledge-time safe Replay evidence.", ["ohlcv", "liquidation", "open-interest", "funding"]),
  proposed("d4.sector-context", "Governed sector context.", ["ohlcv"]),
  proposed("d4.macro-etf-context", "Macro and ETF contextual evidence.", ["macro", "etf-flow"]),
])
