import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { classifyExistingRecord, validateGovernanceBindings, type CanonicalFactReference, type GovernanceBindings } from "@/lib/data-platform/persistence"
const reference: CanonicalFactReference = { datasetId: "funding", businessIdentity: "biz", canonicalRecordId: "rec", recordVersion: 1, factTable: "FUNDING" }
const checksumA = canonicalChecksum(["a"]); const checksumB = canonicalChecksum(["b"])
export const duplicateClassification = classifyExistingRecord({ candidate: reference, candidateChecksum: checksumA, existing: reference, existingChecksum: checksumA })
export const conflictClassification = classifyExistingRecord({ candidate: reference, candidateChecksum: checksumB, existing: reference, existingChecksum: checksumA })
export const distinctVersionClassification = classifyExistingRecord({ candidate: { ...reference, recordVersion: 2 }, candidateChecksum: checksumB, existing: reference, existingChecksum: checksumA })
const complete: GovernanceBindings = { datasetRegistrySnapshotId: "d", providerRegistrySnapshotId: "p", providerCertificationSnapshotId: "c", policyVersionId: "q", schemaVersion: "1", normalizationVersion: "1" }
export const completeBindingsPass = validateGovernanceBindings(complete).length === 0
export const missingBindingsFail = validateGovernanceBindings({ ...complete, policyVersionId: "" }).includes("POLICY_VERSION_MISSING")
export const missingCertificationFails = validateGovernanceBindings({ ...complete, providerCertificationSnapshotId: "" }).includes("PROVIDER_CERTIFICATION_SNAPSHOT_MISSING")
