import type { CanonicalFactReference, GovernanceBindings, PublicationState } from "@/lib/data-platform/persistence"

export type KnowledgeMode = "AS_KNOWN_THEN" | "LATEST_CORRECTED" | "RETROSPECTIVE"
export type EvidenceStatus = "CANDIDATE" | "ELIGIBLE" | "BLOCKED" | "INVALIDATED"
export type EvidenceRole = "SUPPORTING" | "CONFLICTING"
export type EvidenceRequirementStatus = "MISSING" | "UNSUPPORTED" | "INAPPLICABLE"
export type ConfidenceComponentKind = "AVAILABILITY" | "COVERAGE" | "FRESHNESS" | "QUALITY" | "CONSISTENCY" | "PROVIDER_DIVERSITY" | "CONFLICT_BURDEN" | "POLICY_COMPLETENESS" | "MODEL_CERTAINTY"
export type ConfidenceComponentState = "AVAILABLE" | "PARTIAL" | "MISSING" | "UNAVAILABLE" | "NOT_APPLICABLE"

export interface EvidenceTimeWindow { readonly start: string; readonly end: string }
export interface EvidenceIdentityDimensions {
  readonly profileId: string; readonly profileVersion: string; readonly subjectId: string; readonly timeWindow: EvidenceTimeWindow
  readonly knowledgeMode: KnowledgeMode; readonly scenarioOrHypothesisId: string | null
  readonly identityDefiningPolicyVersionId: string | null
}
export interface EvidenceFactReference {
  readonly referenceId: string; readonly role: EvidenceRole; readonly fact: CanonicalFactReference; readonly physicalFactId: string
  readonly datasetId: string; readonly providerId: string; readonly checksum: string; readonly effectiveAt: string | null
  readonly observedAt: string; readonly knowledgeAvailableAt: string; readonly publicationState: PublicationState
  readonly governance: GovernanceBindings; readonly lineageNodeId: string
}
export interface EvidenceConsistencyReference { readonly referenceId: string; readonly resultId: string; readonly ruleId: string; readonly ruleVersion: string; readonly role: EvidenceRole; readonly outcome: string; readonly severity: "ADVISORY" | "BLOCKING" }
export interface EvidenceRequirement { readonly requirementId: string; readonly status: EvidenceRequirementStatus; readonly datasetId: string | null; readonly reasonCode: string; readonly policyVersionId: string }
export interface ConfidenceComponent {
  readonly componentId: string; readonly kind: ConfidenceComponentKind; readonly state: ConfidenceComponentState
  readonly evaluationReferenceIds: readonly string[]; readonly policyVersionId: string; readonly governedValue: string | null
  readonly unit: string | null; readonly limitations: readonly string[]
}
export interface ExplanationCode { readonly code: string; readonly version: string; readonly driverCode: string | null; readonly evidenceReferenceIds: readonly string[] }

export interface EvidenceProfileRequirement {
  readonly requirementId: string; readonly datasetIds: readonly string[]; readonly required: boolean
  readonly acceptedRoles: readonly EvidenceRole[]; readonly consistencyRuleReferences: readonly { readonly ruleId: string; readonly ruleVersion: string }[]
}
export interface EvidenceProfile {
  readonly profileId: string; readonly profileVersion: string; readonly description: string
  readonly requirements: readonly EvidenceProfileRequirement[]; readonly assemblyPolicyVersionId: string
  readonly publicationPolicyVersionId: string; readonly schemaVersion: string
  readonly consumerNeutral: true; readonly state: "PROPOSED" | "APPROVED" | "SUSPENDED"
  readonly limitations: readonly string[]
}

export interface EvidenceCandidate {
  readonly candidateId: string; readonly identity: EvidenceIdentityDimensions; readonly factReferences: readonly EvidenceFactReference[]
  readonly consistencyReferences: readonly EvidenceConsistencyReference[]; readonly requirements: readonly EvidenceRequirement[]
  readonly confidenceComponents: readonly ConfidenceComponent[]; readonly explanationCodes: readonly ExplanationCode[]
  readonly coverageEvaluationIds: readonly string[]; readonly freshnessEvaluationIds: readonly string[]; readonly qualityEvaluationIds: readonly string[]
  readonly assemblyPolicyVersionId: string; readonly schemaVersion: string; readonly status: EvidenceStatus; readonly createdAt: string
}

export interface EvidencePacketIdentity {
  readonly evidenceBusinessIdentity: string; readonly packetId: string
}
export interface EvidenceVersion {
  readonly packetId: string; readonly packetVersion: number; readonly physicalPacketId: string; readonly contentChecksum: string
  readonly predecessorVersion: number | null; readonly createdAt: string
}
export interface CoreEvidencePacket {
  readonly packetIdentity: EvidencePacketIdentity; readonly version: EvidenceVersion; readonly identity: EvidenceIdentityDimensions
  readonly factReferences: readonly EvidenceFactReference[]; readonly consistencyReferences: readonly EvidenceConsistencyReference[]
  readonly requirements: readonly EvidenceRequirement[]; readonly confidenceComponents: readonly ConfidenceComponent[]
  readonly explanationCodes: readonly ExplanationCode[]; readonly coverageEvaluationIds: readonly string[]
  readonly freshnessEvaluationIds: readonly string[]; readonly qualityEvaluationIds: readonly string[]
  readonly lineageRootId: string; readonly assemblyPolicyVersionId: string; readonly schemaVersion: string
  readonly publicationState: PublicationState; readonly status: Exclude<EvidenceStatus, "CANDIDATE">
}

export interface EvidencePacketSupersession {
  readonly supersessionId: string; readonly packetId: string; readonly predecessorVersion: number
  readonly successorVersion: number; readonly createdAt: string
}
export interface EvidenceInvalidationEvent {
  readonly invalidationId: string; readonly packetId: string; readonly packetVersion: number
  readonly triggerObjectId: string; readonly triggerObjectVersion: string; readonly reasonCode: string; readonly createdAt: string
}

export type EvidenceAssemblyResult =
  | { readonly status: "ELIGIBLE"; readonly candidate: EvidenceCandidate }
  | { readonly status: "BLOCKED"; readonly candidate: EvidenceCandidate; readonly blockingRequirementIds: readonly string[] }
  | { readonly status: "DUPLICATE"; readonly packetId: string; readonly packetVersion: number; readonly contentChecksum: string }
  | { readonly status: "CONFLICT"; readonly conflictId: string; readonly candidateId: string }
  | { readonly status: "RETRYABLE_FAILURE"; readonly code: "DEPENDENCY_UNAVAILABLE" | "STORAGE_UNAVAILABLE" }
