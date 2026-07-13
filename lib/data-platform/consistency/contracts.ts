import type { CanonicalFactReference, GovernanceBindings, PublicationState } from "@/lib/data-platform/persistence"

export type RuleCategory = "TEMPORAL_ALIGNMENT" | "IDENTITY_ALIGNMENT" | "PROVIDER_AGREEMENT" | "DATASET_AGREEMENT" | "VALUE_DOMAIN_COMPATIBILITY" | "CADENCE_COMPATIBILITY" | "RESOLUTION_COMPATIBILITY" | "DIRECTIONAL_AGREEMENT" | "MAGNITUDE_AGREEMENT" | "PUBLICATION_STATE_COMPATIBILITY" | "CORRECTION_STATE_COMPATIBILITY"
export type RuleSemanticClass = "FACTUAL" | "DIRECTIONAL" | "STRUCTURAL" | "CONTEXTUAL" | "HYPOTHESIS"
export type ConsistencySeverity = "ADVISORY" | "BLOCKING"
export type ConsistencyResultOutcome = "CONSISTENT" | "INCONSISTENT" | "PARTIAL" | "INDETERMINATE" | "NOT_APPLICABLE" | "BLOCKED_MISSING_INPUT" | "BLOCKED_INVALID_INPUT" | "BLOCKED_SUPERSEDED_INPUT"
export type ConsistencyRunOutcome = "COMPLETED" | "PARTIAL" | "BLOCKED" | "FAILED"
export type ConsistencyRetryClassification = "NOT_RETRYABLE" | "RETRYABLE_DEPENDENCY" | "RETRYABLE_STORAGE"
export type TemporalAlignmentMethod = "EXACT_TIMESTAMP" | "WINDOW_CONTAINMENT" | "NEAREST_PRIOR" | "NEAREST_OBSERVATION" | "INTERVAL_OVERLAP" | "AS_OF" | "EVENT_TO_WINDOW"

export interface ConsistencyRuleInputRole { readonly roleId: string; readonly datasetIds: readonly string[]; readonly required: boolean; readonly cardinality: "ONE" | "ONE_OR_MORE" }
export interface TemporalAlignmentPolicyReference { readonly policyId: string; readonly policyVersion: string; readonly method: TemporalAlignmentMethod; readonly noLookahead: boolean; readonly maximumGapPolicyKey: string | null; readonly tieBreakPolicyKey: string; readonly effectiveTimeSemantics: string; readonly observedTimeSemantics: string }
export interface ResolutionCompatibilityPolicyReference { readonly policyId: string; readonly policyVersion: string; readonly interpolationAllowed: false; readonly aggregationPolicyKey: string | null; readonly forwardFillPolicyKey: string | null }
export interface ConsistencyRule {
  readonly ruleId: string; readonly ruleVersion: string; readonly category: RuleCategory; readonly semanticClass: RuleSemanticClass
  readonly inputRoles: readonly ConsistencyRuleInputRole[]; readonly diagnosticsSchemaVersion: string; readonly policyVersionId: string
  readonly defaultSeverity: ConsistencySeverity; readonly temporalAlignment: TemporalAlignmentPolicyReference
  readonly resolutionCompatibility: ResolutionCompatibilityPolicyReference; readonly explanationCodes: readonly string[]
  readonly limitations: readonly string[]; readonly state: "PROPOSED" | "APPROVED" | "SUSPENDED"
}
export interface ConsistencyRuleSet { readonly ruleSetId: string; readonly ruleSetVersion: string; readonly ruleReferences: readonly { readonly ruleId: string; readonly ruleVersion: string }[]; readonly policyVersionId: string; readonly state: "PROPOSED" | "APPROVED" | "SUSPENDED" }
export interface ConsistencyInputReference {
  readonly roleId: string; readonly fact: CanonicalFactReference; readonly physicalFactId: string; readonly datasetId: string; readonly providerId: string
  readonly effectiveAt: string | null; readonly observedAt: string; readonly knowledgeAvailableAt: string; readonly publicationState: PublicationState
  readonly checksum: string; readonly governance: GovernanceBindings; readonly lineageNodeId: string
}
export interface ConsistencyScope { readonly datasetIds: readonly string[]; readonly subjectId: string; readonly windowStart: string; readonly windowEnd: string; readonly knowledgeCutoff: string }
export interface ConsistencyRun {
  readonly runId: string; readonly ruleSetId: string; readonly ruleSetVersion: string; readonly scope: ConsistencyScope
  readonly orderedInputs: readonly ConsistencyInputReference[]; readonly policyVersionId: string; readonly startedAt: string
  readonly completedAt: string; readonly outcome: ConsistencyRunOutcome; readonly retryClassification: ConsistencyRetryClassification
}
export interface ConsistencyDiagnostic { readonly diagnosticId: string; readonly code: string; readonly schemaVersion: string; readonly inputRoleIds: readonly string[]; readonly boundedValues: readonly { readonly name: string; readonly value: string; readonly unit: string | null }[]; readonly explanationCode: string }
export interface ConsistencyResult {
  readonly resultId: string; readonly runId: string; readonly ruleId: string; readonly ruleVersion: string; readonly orderedInputDigest: string
  readonly outcome: ConsistencyResultOutcome; readonly severity: ConsistencySeverity; readonly diagnostics: readonly ConsistencyDiagnostic[]
  readonly policyVersionId: string; readonly createdAt: string
}
export interface ProviderComparison { readonly comparisonId: string; readonly providerIds: readonly string[]; readonly factReferences: readonly ConsistencyInputReference[]; readonly resultId: string }
export interface DatasetComparison { readonly comparisonId: string; readonly datasetIds: readonly string[]; readonly semanticClass: RuleSemanticClass; readonly factReferences: readonly ConsistencyInputReference[]; readonly resultId: string }
export interface ConsistencyRecomputeRequest { readonly requestId: string; readonly trigger: "NEW_FACT" | "CORRECTED_FACT" | "REVOKED_FACT" | "QUALITY_CHANGE" | "COVERAGE_CHANGE" | "POLICY_CHANGE" | "PROFILE_CHANGE"; readonly triggeringObjectId: string; readonly triggeringObjectVersion: string; readonly dependencyGraphVersion: string; readonly requestedAt: string }
