import type { CanonicalCommitCommand, CanonicalCommitResult, CanonicalFactReference, GovernanceBindings } from "./contracts"
import { deriveCanonicalCommitId, deriveCanonicalRecordIdentity } from "./identity"
import { validateLineageEdge } from "./lineage"

export function validateGovernanceBindings(bindings: GovernanceBindings): readonly string[] {
  const errors: string[] = []
  if (!bindings.datasetRegistrySnapshotId) errors.push("DATASET_REGISTRY_SNAPSHOT_MISSING")
  if (!bindings.providerRegistrySnapshotId) errors.push("PROVIDER_REGISTRY_SNAPSHOT_MISSING")
  if (!bindings.providerCertificationSnapshotId) errors.push("PROVIDER_CERTIFICATION_SNAPSHOT_MISSING")
  if (!bindings.policyVersionId) errors.push("POLICY_VERSION_MISSING")
  if (!bindings.schemaVersion) errors.push("SCHEMA_VERSION_MISSING")
  if (!bindings.normalizationVersion) errors.push("NORMALIZATION_VERSION_MISSING")
  return Object.freeze(errors)
}

export function validateCanonicalCommitCommand(command: CanonicalCommitCommand): readonly string[] {
  const errors = [...validateGovernanceBindings(command.fact.governance)]
  if (!Number.isInteger(command.targetRecordVersion) || command.targetRecordVersion <= 0) errors.push("INVALID_RECORD_VERSION")
  if (command.rawObject.verificationState !== "VERIFIED") errors.push("RAW_OBJECT_NOT_VERIFIED")
  if (command.rawObject.objectId !== (command.fact.kind === "STREAM_MANIFEST" ? command.fact.rawObjectId : command.rawObject.objectId)) errors.push("RAW_OBJECT_MISMATCH")
  if (command.fact.identity.canonicalRecordId !== deriveCanonicalRecordIdentity(command.fact).canonicalRecordId) errors.push("CANONICAL_IDENTITY_MISMATCH")
  if (command.requiredLineage.flatMap(validateLineageEdge).length) errors.push("INVALID_REQUIRED_LINEAGE")
  if (command.operationType === "PROVIDER_CORRECTION" && (!command.predecessor || command.targetRecordVersion <= command.predecessor.recordVersion)) errors.push("INVALID_CORRECTION_VERSION")
  return Object.freeze(errors)
}

export function classifyExistingRecord(input: { readonly candidate: CanonicalFactReference; readonly candidateChecksum: string; readonly existing: CanonicalFactReference; readonly existingChecksum: string }): "DUPLICATE" | "CONFLICT" | "DISTINCT_VERSION" {
  if (input.candidate.canonicalRecordId !== input.existing.canonicalRecordId || input.candidate.recordVersion !== input.existing.recordVersion) return "DISTINCT_VERSION"
  return input.candidateChecksum === input.existingChecksum ? "DUPLICATE" : "CONFLICT"
}

export function plannedCommitIdentity(command: CanonicalCommitCommand): string {
  return deriveCanonicalCommitId({ idempotencyKey: command.idempotencyKey, canonicalRecordId: command.fact.identity.canonicalRecordId, recordVersion: command.targetRecordVersion, checksum: command.fact.checksum })
}

export function assertCommitResultExhaustive(result: CanonicalCommitResult): string {
  switch (result.status) { case "SUCCESS": case "DUPLICATE": case "CONFLICT": case "REJECTED": case "RETRYABLE_FAILURE": return result.status }
}
