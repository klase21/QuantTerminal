import type { ConsistencyRule, ConsistencyRuleSet } from "./contracts"
const unavailableAlignment = { policyId: "d4.temporal-policy.unapproved", policyVersion: "1.0.0", method: "AS_OF", noLookahead: true, maximumGapPolicyKey: null, tieBreakPolicyKey: "EARLIER_EFFECTIVE_TIME_THEN_RECORD_ID", effectiveTimeSemantics: "Dataset contract", observedTimeSemantics: "Canonical observed time" } as const
const noResampling = { policyId: "d4.resolution-policy.no-implicit-resampling", policyVersion: "1.0.0", interpolationAllowed: false, aggregationPolicyKey: null, forwardFillPolicyKey: null } as const
export const CONSISTENCY_RULE_REGISTRY: readonly ConsistencyRule[] = Object.freeze([{
  ruleId: "d4.publication-state-compatible", ruleVersion: "1.0.0", category: "PUBLICATION_STATE_COMPATIBILITY", semanticClass: "FACTUAL",
  inputRoles: [{ roleId: "fact", datasetIds: ["*"], required: true, cardinality: "ONE_OR_MORE" }], diagnosticsSchemaVersion: "1.0.0",
  policyVersionId: "d4.policy.unapproved", defaultSeverity: "BLOCKING", temporalAlignment: unavailableAlignment, resolutionCompatibility: noResampling,
  explanationCodes: ["INPUT_PUBLICATION_STATE_INELIGIBLE"], limitations: ["Candidate contract only; no threshold or runtime is approved."], state: "PROPOSED",
}])
export const CONSISTENCY_RULE_SET_REGISTRY: readonly ConsistencyRuleSet[] = Object.freeze([{
  ruleSetId: "d4.core-eligibility", ruleSetVersion: "1.0.0", ruleReferences: [{ ruleId: "d4.publication-state-compatible", ruleVersion: "1.0.0" }],
  policyVersionId: "d4.policy.unapproved", state: "PROPOSED",
}])
