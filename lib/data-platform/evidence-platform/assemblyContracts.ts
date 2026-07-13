import type { ConsistencyKnowledgeMode, ConsistencyResult, ConsistencyResultInputReference, ConsistencyResultOutcome, ConsistencyResultSeverity } from "@/lib/data-platform/consistency"

export type EvidenceCandidateRole = "SUPPORTING" | "CONFLICTING" | "CONTEXTUAL" | "BLOCKING" | "MISSING" | "UNSUPPORTED" | "INAPPLICABLE"
export type EvidenceCandidateStatus = "ELIGIBLE" | "BLOCKED" | "INSUFFICIENT" | "NOT_APPLICABLE"
export type CoreEvidencePacketStatus = "ELIGIBLE" | "BLOCKED" | "INSUFFICIENT" | "NOT_APPLICABLE"
export type EvidenceConclusionCode = "EVIDENCE_SUPPORTS" | "EVIDENCE_CONFLICTS" | "EVIDENCE_MIXED" | "EVIDENCE_INSUFFICIENT" | "EVIDENCE_BLOCKED" | "NOT_APPLICABLE"
export type EvidenceRequirementKind = "MISSING" | "UNSUPPORTED" | "INAPPLICABLE" | "BLOCKED"

export interface EvidenceSubject { readonly subjectId:string; readonly subjectType:string }
export interface EvidenceTimeScope { readonly eventTimeStart:string; readonly eventTimeEnd:string; readonly knowledgeMode:ConsistencyKnowledgeMode; readonly knowledgeTimeCutoff:string }
export interface EvidenceAssemblyRoleRule { readonly ruleId:string; readonly ruleVersion:string; readonly outcomes:readonly ConsistencyResultOutcome[]; readonly role:Exclude<EvidenceCandidateRole,"MISSING"|"UNSUPPORTED"|"INAPPLICABLE"> }
export interface EvidenceAssemblyProfile {
  readonly profileId:string; readonly profileVersion:string; readonly schemaVersion:string; readonly assemblyPolicyId:string; readonly assemblyPolicyVersion:string
  readonly selectionPolicyReferences:readonly {readonly policyId:string;readonly policyVersion:string}[]
  readonly conclusionPolicyId:string; readonly conclusionPolicyVersion:string
  readonly roleRules:readonly EvidenceAssemblyRoleRule[]; readonly requiredRoles:readonly EvidenceCandidateRole[]; readonly optionalRoles:readonly EvidenceCandidateRole[]
}
export interface EvidenceRequirementInput { readonly requirementId:string; readonly kind:EvidenceRequirementKind; readonly datasetId:string|null; readonly reasonCode:string; readonly policyId:string; readonly policyVersion:string }
export interface EvidenceResultSelection { readonly result:ConsistencyResult; readonly dependencySnapshotId:string|null }
export interface EvidenceAssemblyRequest {
  readonly subject:EvidenceSubject; readonly topic:string; readonly timeScope:EvidenceTimeScope; readonly profile:EvidenceAssemblyProfile
  readonly selections:readonly EvidenceResultSelection[]; readonly requirements:readonly EvidenceRequirementInput[]; readonly createdAt:string
}
export interface EvidenceCandidateIdentity { readonly candidateId:string; readonly candidateIdentity:string }
export interface EvidenceCandidate extends EvidenceCandidateIdentity {
  readonly subject:EvidenceSubject; readonly topic:string; readonly role:EvidenceCandidateRole; readonly status:EvidenceCandidateStatus
  readonly resultId:string; readonly resultIdentity:string; readonly resultChecksum:string; readonly ruleId:string; readonly ruleVersion:string; readonly ruleSetId:string; readonly ruleSetVersion:string
  readonly resultOutcome:ConsistencyResultOutcome; readonly resultSeverity:ConsistencyResultSeverity; readonly timeScope:EvidenceTimeScope
  readonly exactFactReferences:readonly ConsistencyResultInputReference[]; readonly policyReferences:readonly {readonly policyId:string;readonly policyVersion:string}[]
  readonly dependencySnapshotId:string|null; readonly diagnosticCodes:readonly string[]; readonly checksum:string
}
export interface EvidenceReference { readonly candidateId:string; readonly resultId:string; readonly resultIdentity:string; readonly factReferences:readonly ConsistencyResultInputReference[]; readonly checksum:string }
export interface CoreEvidenceEntry { readonly candidateId:string; readonly resultId:string; readonly resultIdentity:string; readonly ruleId:string; readonly ruleVersion:string; readonly reasonCodes:readonly string[]; readonly timeScope:EvidenceTimeScope; readonly policyReferences:readonly {readonly policyId:string;readonly policyVersion:string}[]; readonly diagnosticCodes:readonly string[]; readonly checksum:string }
export type SupportingEvidenceEntry=CoreEvidenceEntry
export type ConflictingEvidenceEntry=CoreEvidenceEntry
export interface MissingEvidenceEntry extends EvidenceRequirementInput { readonly kind:"MISSING" }
export interface UnsupportedEvidenceEntry extends EvidenceRequirementInput { readonly kind:"UNSUPPORTED" }
export interface InapplicableEvidenceEntry extends EvidenceRequirementInput { readonly kind:"INAPPLICABLE" }
export interface EvidenceBusinessIdentity { readonly packetId:string; readonly evidenceBusinessIdentity:string }
export interface EvidencePacketVersionIdentity { readonly packetVersionId:string; readonly packetVersionIdentity:string }
export interface CoreEvidencePacket extends EvidenceBusinessIdentity,EvidencePacketVersionIdentity {
  readonly subject:EvidenceSubject; readonly topic:string; readonly timeScope:EvidenceTimeScope; readonly profileId:string; readonly profileVersion:string
  readonly assemblyPolicyId:string; readonly assemblyPolicyVersion:string; readonly selectionPolicyReferences:readonly {readonly policyId:string;readonly policyVersion:string}[]
  readonly conclusionPolicyId:string; readonly conclusionPolicyVersion:string; readonly candidates:readonly EvidenceCandidate[]
  readonly supportingEvidence:readonly SupportingEvidenceEntry[]; readonly conflictingEvidence:readonly ConflictingEvidenceEntry[]; readonly contextualEvidence:readonly CoreEvidenceEntry[]
  readonly missingEvidence:readonly MissingEvidenceEntry[]; readonly unsupportedEvidence:readonly UnsupportedEvidenceEntry[]; readonly inapplicableEvidence:readonly InapplicableEvidenceEntry[]
  readonly blockingConditions:readonly EvidenceRequirementInput[]; readonly resultReferences:readonly EvidenceReference[]; readonly factReferences:readonly ConsistencyResultInputReference[]
  readonly lineageReferences:readonly {readonly lineageType:"PACKET_TO_CANDIDATE"|"CANDIDATE_TO_RESULT"|"RESULT_TO_FACT"|"PACKET_TO_PROFILE"|"PACKET_REPLACES_PACKET";readonly fromId:string;readonly toId:string;readonly checksum:string}[]
  readonly conclusionCode:EvidenceConclusionCode; readonly uncertaintyReasonCodes:readonly string[]; readonly status:CoreEvidencePacketStatus; readonly schemaVersion:string; readonly packetChecksum:string; readonly createdAt:string
}
export interface EvidenceAssemblyConflict { readonly conflictId:string;readonly packetVersionIdentity:string;readonly existingPacketVersionId:string;readonly existingChecksum:string;readonly incomingChecksum:string;readonly detectedAt:string;readonly reasonCode:"IMMUTABLE_PACKET_CONTENT_MISMATCH" }
export type EvidenceAssemblyOutcome=
  |{readonly status:"CREATED";readonly packet:CoreEvidencePacket;readonly reconciledUnknownOutcome:false}
  |{readonly status:"DUPLICATE";readonly packet:CoreEvidencePacket;readonly reconciledUnknownOutcome:boolean}
  |{readonly status:"REUSED";readonly packet:CoreEvidencePacket}
  |{readonly status:"CONFLICT";readonly conflict:EvidenceAssemblyConflict;readonly existingPacketVersionId:string}
  |{readonly status:"BLOCKED";readonly packet:CoreEvidencePacket}
  |{readonly status:"INSUFFICIENT_EVIDENCE";readonly packet:CoreEvidencePacket}
  |{readonly status:"NOT_APPLICABLE";readonly packet:CoreEvidencePacket}
  |{readonly status:"REJECTED";readonly reason:string}
  |{readonly status:"RETRYABLE_FAILURE";readonly reason:"DATABASE_RETRYABLE"|"UNKNOWN_WRITE_OUTCOME_UNRESOLVED"}
export interface EvidenceAssemblyReconciliation {readonly consistent:boolean;readonly reasonCodes:readonly string[];readonly affectedIdentities:readonly string[];readonly traversalComplete:boolean}
