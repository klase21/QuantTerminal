import type { CanonicalFactReference, PublicationState } from "@/lib/data-platform/persistence"
import type { TemporalAlignmentMethod } from "./contracts"
import type { ConsistencyKnowledgeMode, ConsistencyRunSpecification } from "./runContracts"

export interface EventTimeWindow { readonly start: string; readonly end: string }
export interface KnowledgeTimeCutoff { readonly mode: ConsistencyKnowledgeMode; readonly cutoff: string }
export type TemporalAlignmentMode = TemporalAlignmentMethod
export type TemporalInputAvailability = "AVAILABLE" | "MISSING" | "UNSUPPORTED" | "INAPPLICABLE"
export type TemporalFailureReason = "MISSING" | "UNSUPPORTED" | "INAPPLICABLE" | "FUTURE_KNOWLEDGE" | "INVALID" | "OUTSIDE_EVENT_WINDOW" | "FUTURE_EVENT" | "GAP_EXCEEDED" | "RESOLUTION_INCOMPATIBLE" | "CADENCE_INCOMPATIBLE" | "RUN_SPECIFICATION_MISMATCH" | "POLICY_MISMATCH"
export type TemporalAlignmentStatus = "MATCHED" | "NOT_MATCHED" | "BLOCKED_FUTURE_KNOWLEDGE" | "BLOCKED_MISSING_INPUT" | "BLOCKED_UNSUPPORTED_INPUT" | "BLOCKED_INVALID_INPUT" | "INAPPLICABLE"
export type TemporalCadenceClass = "FIXED" | "EVENT" | "IRREGULAR" | "SNAPSHOT" | "STREAM_MANIFEST"
export type TemporalResolutionClass = "FIXED_1M" | "FIXED_5M" | "FIXED_1H" | "EVENT_8H" | "DAILY_OBSERVATION" | "IRREGULAR_EVENT" | "SNAPSHOT" | "STREAM_MANIFEST"
export type ResolutionCompatibility = "COMPATIBLE" | "COMPATIBLE_WITH_GOVERNED_MAPPING" | "INCOMPATIBLE" | "INDETERMINATE" | "NOT_APPLICABLE"
export type CadenceCompatibility = ResolutionCompatibility

export interface TemporalPolicyReference { readonly policyId: string; readonly policyVersion: string }
export interface TemporalAlignmentPolicy extends TemporalPolicyReference {
  readonly mode: TemporalAlignmentMode; readonly noLookahead: boolean; readonly boundary: "START_INCLUSIVE_END_EXCLUSIVE" | "BOTH_INCLUSIVE"
  readonly maximumGapMs: number | null; readonly nearestDirection: "PRIOR_ONLY" | "BIDIRECTIONAL"
  readonly tieBreak: "LOWEST_CANONICAL_ID" | "HIGHEST_RECORD_VERSION_THEN_LOWEST_ID"
  readonly missingBehavior: "BLOCK" | "INAPPLICABLE"; readonly unsupportedBehavior: "BLOCK" | "INAPPLICABLE"
  readonly allowMultipleWindowMappings: boolean; readonly interpolationAllowed: false; readonly forwardFillAllowed: false
  readonly aggregationPolicy: TemporalPolicyReference | null; readonly resolutionPolicy: TemporalPolicyReference; readonly cadencePolicy: TemporalPolicyReference
  readonly eligiblePublicationStates: readonly PublicationState[]; readonly diagnosticsSchemaVersion: string
}
export interface AvailableTemporalAlignmentInput {
  readonly availability: "AVAILABLE"; readonly roleId: string; readonly fact: CanonicalFactReference; readonly providerId: string
  readonly effectiveAt: string | null; readonly intervalStart: string | null; readonly intervalEnd: string | null; readonly observedAt: string
  readonly knowledgeAvailableAt: string | null; readonly ingestedAt: string | null; readonly publicationState: PublicationState
  readonly supersessionState: "ACTIVE" | "SUPERSEDED" | "CORRECTION"; readonly supersedes: CanonicalFactReference | null
  readonly checksum: string; readonly cadenceClass: TemporalCadenceClass; readonly resolutionClass: TemporalResolutionClass
}
export interface UnavailableTemporalAlignmentInput { readonly availability: Exclude<TemporalInputAvailability,"AVAILABLE">; readonly roleId: string; readonly datasetId: string; readonly reasonCode: string }
export type TemporalAlignmentInput = AvailableTemporalAlignmentInput | UnavailableTemporalAlignmentInput
export interface TemporalAlignmentRequest { readonly runSpecification: ConsistencyRunSpecification; readonly policy: TemporalAlignmentPolicy; readonly eventTimeWindow: EventTimeWindow; readonly knowledgeTime: KnowledgeTimeCutoff; readonly targetEventTime: string | null; readonly inputs: readonly TemporalAlignmentInput[]; readonly createdAt: string }
export interface NoLookaheadDecision { readonly fact: CanonicalFactReference; readonly eligible: boolean; readonly reason: "KNOWN_BY_CUTOFF" | "FUTURE_KNOWLEDGE" | "KNOWLEDGE_TIME_UNKNOWN" | "MODE_PERMITS_LATER_KNOWLEDGE"; readonly knowledgeOffsetMs: number | null }
export interface TemporalAlignmentDiagnostic { readonly code: string; readonly roleId: string; readonly fact: CanonicalFactReference | null; readonly temporalOffsetMs: number | null; readonly knowledgeOffsetMs: number | null; readonly overlapStart: string | null; readonly overlapEnd: string | null; readonly overlapDurationMs: number | null; readonly policy: TemporalPolicyReference }
export interface TemporalRejectedReference { readonly input: TemporalAlignmentInput; readonly reason: TemporalFailureReason }
export interface TemporalAlignmentOutcome { readonly alignmentId: string; readonly mode: TemporalAlignmentMode; readonly selectedInputs: readonly AvailableTemporalAlignmentInput[]; readonly rejectedInputs: readonly TemporalRejectedReference[]; readonly status: TemporalAlignmentStatus; readonly blocking: boolean; readonly reasonCodes: readonly TemporalFailureReason[]; readonly eventTimeWindow: EventTimeWindow; readonly knowledgeTime: KnowledgeTimeCutoff; readonly policy: TemporalAlignmentPolicy; readonly noLookaheadDecisions: readonly NoLookaheadDecision[]; readonly diagnostics: readonly TemporalAlignmentDiagnostic[]; readonly checksum: string; readonly createdAt: string; readonly runId: string; readonly runSpecificationChecksum: string }
export interface TemporalReconciliationResult { readonly consistent: boolean; readonly reasonCodes: readonly ("CHECKSUM_MISMATCH"|"RUN_BINDING_MISMATCH"|"SELECTED_REFERENCE_MISMATCH"|"NO_LOOKAHEAD_MISMATCH"|"POLICY_BINDING_MISMATCH")[]; readonly affectedIdentities: readonly string[] }
