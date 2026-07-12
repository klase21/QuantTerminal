import type { CanonicalCommitCommand, CanonicalCommitResult, LineageEdge, PublicationState, RawObjectManifest } from "../contracts"

export interface RegistrySnapshotInput { readonly snapshotId: string; readonly registryVersion: string; readonly contentChecksum: string; readonly canonicalContent: Readonly<Record<string, string | number | boolean | null>>; readonly effectiveAt: string; readonly createdAt: string }
export interface ProviderSnapshotInput { readonly snapshotId: string; readonly providerId: string; readonly registrationVersion: string; readonly certificationStatus: "CANDIDATE" | "VALIDATING" | "CERTIFIED" | "CERTIFIED_WITH_LIMITATIONS" | "DEGRADED" | "SUSPENDED" | "REVOKED"; readonly contentChecksum: string; readonly canonicalContent: Readonly<Record<string, string | number | boolean | null>>; readonly effectiveAt: string; readonly createdAt: string }
export interface PolicyVersionInput { readonly policyVersionId: string; readonly datasetId: string; readonly policyVersion: string; readonly contentChecksum: string; readonly canonicalContent: Readonly<Record<string, string | number | boolean | null>>; readonly effectiveAt: string; readonly createdAt: string }
export type RegistrationResult = { readonly status: "SUCCESS" | "DUPLICATE"; readonly identity: string } | { readonly status: "CONFLICT" | "REJECTED"; readonly reason: string }
export type ManifestResult = { readonly status: "SUCCESS" | "DUPLICATE"; readonly objectId: string } | { readonly status: "CONFLICT" | "REJECTED"; readonly reason: string }

export interface PublicationCommand { readonly canonicalRecordId: string; readonly recordVersion: number; readonly nextState: PublicationState; readonly policyVersionId: string; readonly decidedAt: string; readonly reasonCodes: readonly string[] }
export type PublicationResult = { readonly status: "SUCCESS"; readonly state: PublicationState; readonly decisionId: string } | { readonly status: "REJECTED"; readonly reason: string } | { readonly status: "RETRYABLE_FAILURE"; readonly reason: string }
export interface RecordVersionRead { readonly canonicalRecordId: string; readonly recordVersion: number; readonly checksum: string; readonly publicationState: PublicationState; readonly commitId: string }
export interface OutboxRead { readonly eventId: string; readonly commitId: string; readonly eventType: "CANONICAL_RECORD_COMMITTED" | "PUBLICATION_STATE_CHANGED"; readonly canonicalRecordId: string; readonly recordVersion: number; readonly publicationDecisionId: string | null; readonly createdAt: string }
export interface ReconciliationResult { readonly consistent: boolean; readonly counts: Readonly<{ fact: number; envelope: number; version: number; initialDecision: number; lineage: number; commitOutbox: number }>; readonly reasons: readonly string[] }
export interface QuarantineConflictRead { readonly conflictId: string; readonly quarantineId: string; readonly canonicalRecordId: string; readonly recordVersion: number; readonly existingChecksum: string; readonly candidateChecksum: string; readonly detectedAt: string }

export type IsolatedFailurePoint = "AFTER_COMMIT_ROW" | "AFTER_FACT_ROW" | "AFTER_ENVELOPE_ROW" | "AFTER_VERSION_ROW" | "AFTER_LINEAGE_ROW" | "AFTER_DECISION_ROW" | "BEFORE_OUTBOX_ROW"
export interface IsolatedAdapterOptions { readonly failurePoint?: IsolatedFailurePoint; readonly allowFailureInjection?: boolean; readonly maxRetries?: number; readonly retryBaseDelayMs?: number }

export interface CanonicalPersistenceAdapter {
  registerRegistrySnapshot(input: RegistrySnapshotInput): Promise<RegistrationResult>
  registerProviderSnapshot(input: ProviderSnapshotInput): Promise<RegistrationResult>
  registerPolicyVersion(input: PolicyVersionInput): Promise<RegistrationResult>
  registerRawObjectManifest(input: RawObjectManifest): Promise<ManifestResult>
  executeCanonicalCommit(command: CanonicalCommitCommand): Promise<CanonicalCommitResult>
  readCanonicalRecordVersion(canonicalRecordId: string, recordVersion: number): Promise<RecordVersionRead | null>
  appendPublicationDecision(command: PublicationCommand): Promise<PublicationResult>
  readLineageEdges(nodeId: string): Promise<readonly LineageEdge[]>
  verifyLineageAcyclic(): Promise<boolean>
  readOutboxEvents(limit?: number): Promise<readonly OutboxRead[]>
  readQuarantineConflicts(canonicalRecordId: string): Promise<readonly QuarantineConflictRead[]>
  reconcileCommit(commitId: string): Promise<ReconciliationResult>
}
