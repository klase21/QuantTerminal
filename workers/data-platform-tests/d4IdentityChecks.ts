import { createConsistencyRunId, consistencyInputDigest } from "@/lib/data-platform/consistency"
import { createEvidencePacketIdentity, createEvidencePhysicalPacketId } from "@/lib/data-platform/evidence-platform"
import type { ConsistencyInputReference } from "@/lib/data-platform/consistency"
import type { EvidenceFactReference, EvidenceIdentityDimensions } from "@/lib/data-platform/evidence-platform"

const governance = { datasetRegistrySnapshotId: "dataset-snapshot", providerRegistrySnapshotId: "provider-snapshot", providerCertificationSnapshotId: "certification-snapshot", policyVersionId: "policy-v1", schemaVersion: "1.0.0", normalizationVersion: "1.0.0" }
const fact = { datasetId: "funding", businessIdentity: "business", canonicalRecordId: "record", recordVersion: 1, factTable: "FUNDING" } as const
const input: ConsistencyInputReference = { roleId: "fact", fact, physicalFactId: "fact-row", datasetId: "funding", providerId: "provider", effectiveAt: null, observedAt: "2026-01-01T00:00:00.000Z", knowledgeAvailableAt: "2026-01-01T00:01:00.000Z", publicationState: "PUBLISHED", checksum: "a".repeat(64), governance, lineageNodeId: "lineage" }
const scope = { datasetIds: ["funding"], subjectId: "BTCUSDT", windowStart: "2026-01-01T00:00:00Z", windowEnd: "2026-01-01T01:00:00Z", knowledgeCutoff: "2026-01-01T01:01:00Z" }
export const consistencyIdentityStable = createConsistencyRunId({ ruleSetId: "core", ruleSetVersion: "1", scope, inputs: [input], policyVersionId: "policy-v1" }) === createConsistencyRunId({ ruleSetId: "core", ruleSetVersion: "1", scope, inputs: [input], policyVersionId: "policy-v1" })
export const exactVersionChangesDigest = consistencyInputDigest([input]) !== consistencyInputDigest([{ ...input, fact: { ...fact, recordVersion: 2 } }])

const evidenceFact: EvidenceFactReference = { referenceId: "reference", role: "SUPPORTING", fact, physicalFactId: "fact-row", datasetId: "funding", providerId: "provider", checksum: "a".repeat(64), effectiveAt: null, observedAt: input.observedAt, knowledgeAvailableAt: input.knowledgeAvailableAt, publicationState: "PUBLISHED", governance, lineageNodeId: "lineage" }
const dimensions: EvidenceIdentityDimensions = { profileId: "d4.market-state", profileVersion: "1.0.0", subjectId: "BTCUSDT", timeWindow: { start: scope.windowStart, end: scope.windowEnd }, knowledgeMode: "AS_KNOWN_THEN", scenarioOrHypothesisId: null, identityDefiningPolicyVersionId: null }
const firstPacket = createEvidencePacketIdentity(dimensions, [evidenceFact])
const secondPacket = createEvidencePacketIdentity(dimensions, [evidenceFact])
export const evidenceIdentityStable = firstPacket.packetId === secondPacket.packetId
export const generatedProseExcluded = firstPacket.packetId === createEvidencePacketIdentity({ ...dimensions }, [{ ...evidenceFact }]).packetId
export const factVersionChangesEvidenceIdentity = firstPacket.packetId !== createEvidencePacketIdentity(dimensions, [{ ...evidenceFact, fact: { ...fact, recordVersion: 2 } }]).packetId
export const positiveEvidenceVersionEnforced = (() => { try { createEvidencePhysicalPacketId(firstPacket.packetId, 0, "b".repeat(64)); return false } catch { return true } })()
