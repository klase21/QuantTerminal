import { canonicalChecksum, normalizeIdentifier, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import type { EvidenceCandidate, EvidenceFactReference, EvidenceIdentityDimensions, EvidencePacketIdentity } from "./contracts"

function normalizeDimensions(input: EvidenceIdentityDimensions) {
  return {
    profileId: normalizeIdentifier(input.profileId), profileVersion: input.profileVersion,
    subjectId: normalizeIdentifier(input.subjectId), windowStart: normalizeIsoTimestamp(input.timeWindow.start),
    windowEnd: normalizeIsoTimestamp(input.timeWindow.end), knowledgeMode: input.knowledgeMode,
    scenarioOrHypothesisId: input.scenarioOrHypothesisId, identityDefiningPolicyVersionId: input.identityDefiningPolicyVersionId,
  }
}
function exactFactVersion(input: EvidenceFactReference) {
  return { role: input.role, canonicalRecordId: input.fact.canonicalRecordId, recordVersion: input.fact.recordVersion, checksum: input.checksum }
}
export function createEvidencePacketIdentity(dimensions: EvidenceIdentityDimensions, factReferences: readonly EvidenceFactReference[]): EvidencePacketIdentity {
  if (!factReferences.length) throw new Error("EVIDENCE_FACT_REFERENCES_REQUIRED")
  const evidenceBusinessIdentity = canonicalChecksum({ ...normalizeDimensions(dimensions), exactFactVersions: factReferences.map(exactFactVersion) })
  return Object.freeze({ evidenceBusinessIdentity, packetId: "epkt_" + canonicalChecksum(["core-evidence-v1", evidenceBusinessIdentity]) })
}
export function createEvidenceCandidateId(candidate: Omit<EvidenceCandidate, "candidateId">): string {
  return "ecnd_" + canonicalChecksum({
    identity: normalizeDimensions(candidate.identity), factReferences: candidate.factReferences.map(exactFactVersion),
    consistencyResultIds: candidate.consistencyReferences.map((item) => item.resultId),
    requirementIds: candidate.requirements.map((item) => item.requirementId),
    assemblyPolicyVersionId: candidate.assemblyPolicyVersionId, schemaVersion: candidate.schemaVersion,
  })
}
export function createEvidencePhysicalPacketId(packetId: string, packetVersion: number, contentChecksum: string): string {
  if (!Number.isInteger(packetVersion) || packetVersion <= 0) throw new Error("EVIDENCE_VERSION_MUST_BE_POSITIVE")
  return "epvr_" + canonicalChecksum([packetId, packetVersion, contentChecksum])
}
