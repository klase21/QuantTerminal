export type QualityRuleClass = "STRUCTURAL" | "IDENTITY" | "TEMPORAL" | "DOMAIN" | "STATISTICAL" | "LINEAGE" | "PUBLICATION"
export type QualityResultValue = "PASS" | "WARN" | "FAIL" | "NOT_APPLICABLE" | "NOT_EVALUATED"
export type QualitySeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type PublicationEffect = "NONE" | "PARTIAL" | "HOLD" | "QUARANTINE" | "REJECT"
export type PolicyState = "APPROVED" | "PROPOSED"

export interface QualityRule {
  ruleId: string
  ruleClass: QualityRuleClass
  applicability: string
  ruleVersion: string
  severity: QualitySeverity
  publicationEffect: PublicationEffect
}

export interface QualityResult {
  ruleId: string
  mandatory: boolean
  result: QualityResultValue
  severity: QualitySeverity
  details: readonly string[]
}

export interface QualityEvaluationRun {
  evaluationId: string
  datasetId: string
  policyVersion: string
  evaluatedAt: string
  results: readonly QualityResult[]
  resolution: "OPEN" | "ACCEPTED" | "REJECTED" | "REPAIRED"
}

export interface DatasetQualityPolicy {
  policyId: string
  datasetId: string
  policyVersion: string
  state: PolicyState
  rules: readonly { ruleId: string; mandatory: boolean }[]
  providerTierRequirement: string
  coverageMethod: string
  freshnessPolicyState: PolicyState
  publicationEffect: PublicationEffect
  evidenceEligibility: boolean
  unresolvedGovernanceDecisions: readonly string[]
}

export function qualityRunPasses(run: QualityEvaluationRun): boolean {
  return run.results.every((result) => result.result !== "FAIL" && (!result.mandatory || result.result !== "NOT_EVALUATED"))
}

export function validateQualityPolicy(policy: DatasetQualityPolicy): boolean {
  return policy.rules.length > 0 && new Set(policy.rules.map((rule) => rule.ruleId)).size === policy.rules.length
}
