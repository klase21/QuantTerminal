import type { PublicationState } from "@/lib/data-platform/persistence"
import type { ConsistencyDiagnostic, ConsistencyResultOutcome, ConsistencySeverity } from "./contracts"
import type { ConsistencyKnowledgeMode, ConsistencyRunSpecification } from "./runContracts"
import type { TemporalAlignmentOutcome } from "./temporalContracts"

export type ConsistencyResultSeverity = ConsistencySeverity
export type ConsistencyResultDiagnostic = ConsistencyDiagnostic
export type ConsistencyResultSupersessionState = "ACTIVE" | "SUPERSEDED" | "CORRECTION"

export interface ConsistencyResultInputReference {
  readonly roleId: string
  readonly canonicalRecordId: string
  readonly recordVersion: number
  readonly datasetId: string
  readonly providerId: string
  readonly providerSnapshotId: string
  readonly effectiveAt: string | null
  readonly observedAt: string
  readonly knowledgeAvailableAt: string
  readonly publicationState: PublicationState
  readonly supersessionState: ConsistencyResultSupersessionState
  readonly checksum: string
  readonly lineageNodeId: string
}

export interface ConsistencyResultPolicyBindings {
  readonly temporalPolicyId: string
  readonly temporalPolicyVersion: string
  readonly comparisonPolicyReferences: readonly { readonly policyId: string; readonly policyVersion: string }[]
  readonly severityPolicyId: string
  readonly severityPolicyVersion: string
}

export interface ConsistencyResultIdentity {
  readonly resultId: string
  readonly resultIdentity: string
  readonly inputSetIdentity: string
}

export interface ConsistencyResult extends ConsistencyResultIdentity {
  readonly ruleId: string
  readonly ruleVersion: string
  readonly ruleSetId: string
  readonly ruleSetVersion: string
  readonly temporalAlignmentId: string
  readonly temporalAlignmentChecksum: string
  readonly inputs: readonly ConsistencyResultInputReference[]
  readonly outcome: ConsistencyResultOutcome
  readonly severity: ConsistencyResultSeverity
  readonly blocking: boolean
  readonly diagnostics: readonly ConsistencyResultDiagnostic[]
  readonly eventTimeWindow: { readonly start: string; readonly end: string }
  readonly knowledgeMode: ConsistencyKnowledgeMode
  readonly knowledgeTimeCutoff: string
  readonly policyBindings: ConsistencyResultPolicyBindings
  readonly diagnosticSchemaVersion: string
  readonly schemaVersion: string
  readonly checksum: string
  readonly createdAt: string
}

export interface ConsistencyResultRunReference {
  readonly resultId: string
  readonly runId: string
  readonly runSpecificationChecksum: string
  readonly sourceAlignmentId: string
  readonly sourceAlignmentChecksum: string
  readonly linkedAt: string
}

export interface ConsistencyResultWriteRequest {
  readonly runSpecification: ConsistencyRunSpecification
  readonly alignment: TemporalAlignmentOutcome
  readonly ruleId: string
  readonly ruleVersion: string
  readonly diagnosticSchemaVersion: string
  readonly inputs: readonly ConsistencyResultInputReference[]
  readonly outcome: ConsistencyResultOutcome
  readonly severity: ConsistencyResultSeverity
  readonly blocking: boolean
  readonly diagnostics: readonly ConsistencyResultDiagnostic[]
  readonly policyBindings: ConsistencyResultPolicyBindings
  readonly schemaVersion: string
  readonly createdAt: string
}

export interface ConsistencyResultConflict {
  readonly conflictId: string
  readonly resultIdentity: string
  readonly existingResultId: string
  readonly existingChecksum: string
  readonly incomingChecksum: string
  readonly ruleId: string
  readonly ruleVersion: string
  readonly inputSetIdentity: string
  readonly detectedAt: string
  readonly reasonCode: "IMMUTABLE_CONTENT_MISMATCH"
}

export type ConsistencyResultWriteOutcome =
  | { readonly status: "CREATED"; readonly result: ConsistencyResult; readonly runReference: ConsistencyResultRunReference; readonly reconciledUnknownOutcome: false }
  | { readonly status: "DUPLICATE"; readonly result: ConsistencyResult; readonly runReference: ConsistencyResultRunReference; readonly reconciledUnknownOutcome: boolean }
  | { readonly status: "REUSED"; readonly result: ConsistencyResult; readonly runReference: ConsistencyResultRunReference; readonly reconciledUnknownOutcome: false }
  | { readonly status: "CONFLICT"; readonly conflict: ConsistencyResultConflict; readonly existingResult: ConsistencyResult }
  | { readonly status: "REJECTED"; readonly reason: ConsistencyResultWriteFailure }
  | { readonly status: "RETRYABLE_FAILURE"; readonly reason: "DATABASE_RETRYABLE" | "UNKNOWN_WRITE_OUTCOME_UNRESOLVED" }

export type ConsistencyResultWriteFailure =
  | "RUN_SPECIFICATION_MISMATCH"
  | "RULESET_MISMATCH"
  | "POLICY_BINDING_MISMATCH"
  | "TEMPORAL_ALIGNMENT_MISMATCH"
  | "TEMPORAL_OUTCOME_INVALID"
  | "INPUT_REFERENCE_MISMATCH"
  | "INPUT_REFERENCE_INVALID"
  | "FUTURE_KNOWLEDGE_INPUT"
  | "RESULT_CONTENT_INVALID"

export type ConsistencyResultLookupResponse =
  | { readonly status: "FOUND"; readonly result: ConsistencyResult; readonly runReferences: readonly ConsistencyResultRunReference[] }
  | { readonly status: "NOT_FOUND"; readonly resultIdentity: string }

export type ConsistencyResultReconciliationReason =
  | "RESULT_CHECKSUM_MISMATCH"
  | "RESULT_IDENTITY_MISMATCH"
  | "INPUT_SET_IDENTITY_MISMATCH"
  | "INPUT_REFERENCE_MISMATCH"
  | "RULE_BINDING_MISMATCH"
  | "RULESET_BINDING_MISMATCH"
  | "TEMPORAL_ALIGNMENT_MISMATCH"
  | "EVENT_TIME_MISMATCH"
  | "KNOWLEDGE_TIME_MISMATCH"
  | "POLICY_BINDING_MISMATCH"
  | "DIAGNOSTIC_MISMATCH"
  | "RUN_REFERENCE_MISMATCH"
  | "CONFLICT_AUDIT_MISMATCH"

export interface ConsistencyResultReconciliation {
  readonly consistent: boolean
  readonly reasonCodes: readonly ConsistencyResultReconciliationReason[]
  readonly affectedIdentities: readonly string[]
}
