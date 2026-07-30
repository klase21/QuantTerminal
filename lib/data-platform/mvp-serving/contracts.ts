import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"
import type { ReplaySequenceModel } from "@/lib/replay-sequence"

export const MVP_SERVING_SCHEMA_VERSION = "mvp-serving/1.0.0" as const
export type MvpServingMode = "serving_postgres" | "certified_snapshot" | "local_truth"
export type MvpServingFailureCode =
  | "SERVING_CORPUS_UNAVAILABLE"
  | "SERVING_CORPUS_CHECKSUM_MISMATCH"
  | "SERVING_PROJECTION_MISSING"
  | "SERVING_EVIDENCE_SUMMARY_MISSING"
  | "CERTIFIED_SNAPSHOT_ACTIVE"
  | "CERTIFIED_SNAPSHOT_EXPIRED"
  | "CERTIFIED_SNAPSHOT_CHECKSUM_MISMATCH"
  | "REPLAY_SNAPSHOT_MISSING"
  | "REPLAY_SNAPSHOT_CHECKSUM_MISMATCH"
  | "SERVING_DEMO_PROFILE_MISSING"

export interface ServingCorpusRecord {
  readonly corpusId: string
  readonly corpusVersion: string
  readonly sourceCorpusId: string
  readonly sourceCorpusChecksum: string
  readonly servingChecksum: string
  readonly schemaVersion: typeof MVP_SERVING_SCHEMA_VERSION
  readonly generatedAt: string
  readonly governedThrough: string
  readonly lifecycle: "PUBLISHED"
  readonly exposure: "CONSUMER_VISIBLE"
  readonly projectionCount: number
  readonly evidenceSummaryCount: number
  readonly replaySnapshotCount: number
  readonly demoProfileCount: number
  readonly releaseInventoryCount: number
  readonly publicationEventCount: number
}

export interface ServingEvidenceSummary {
  readonly evidenceSummaryId: string
  readonly evidencePacketId: string
  readonly instrument: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly assessmentState: string
  readonly confidence: Readonly<Record<string, unknown>>
  readonly coverage: Readonly<Record<string, unknown>>
  readonly verifiedFacts: Readonly<Record<string, unknown>>
  readonly interpretation: Readonly<Record<string, unknown>>
  readonly supportingEvidence: readonly unknown[]
  readonly counterEvidence: readonly unknown[]
  readonly sourceLimitations: readonly string[]
  readonly sourceProjectionIdentities: readonly string[]
  readonly summaryChecksum: string
}

export interface ServingReplaySnapshot {
  readonly replaySnapshotId: string
  readonly snapshotIdentity: string
  readonly sourceProjectionVersionId: string
  readonly sourceProjectionChecksum: string
  readonly sourceDependencyDigest: string
  readonly instrument: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly knowledgeTimeCutoff: string
  readonly modelVersion: string
  readonly payload: ReplaySequenceModel
  readonly modelChecksum: string
  readonly snapshotChecksum: string
  readonly priceSampleCount: number
  readonly openInterestSampleCount: number
  readonly fundingSampleCount: number
  readonly flowBucketCount: number
  readonly limitations: readonly string[]
}

export interface ServingDemoProfile {
  readonly profileId: string
  readonly role: "PRIMARY" | "BACKUP"
  readonly instrument: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly evidenceIdentity: string
  readonly replayIdentity: string
  readonly researchIdentity: string
  readonly initialCursorTimestamp: string
  readonly profilePayload: Readonly<Record<string, unknown>>
  readonly profileChecksum: string
}

export interface ServingReleaseInventoryItem {
  readonly inventoryId: string
  readonly sourceProjectionVersionId: string
  readonly projectionKind: string
  readonly subjectId: string
  readonly sourceChecksum: string
  readonly checksumValid: boolean
  readonly lifecycle: string
  readonly exposure: string
  readonly supersessionIdentity: string | null
  readonly eligibility: "ELIGIBLE" | "INELIGIBLE"
  readonly disposition: "INCLUDED" | "EXCLUDED"
  readonly dispositionReason: "RELEASE_ELIGIBLE" | "EXCLUDED_SUPERSEDED_IMMUTABLE_CONFLICT"
}

export interface MvpServingPublication {
  readonly corpus: ServingCorpusRecord
  readonly projections: readonly MvpProjectionVersion[]
  readonly evidenceSummaries: readonly ServingEvidenceSummary[]
  readonly replaySnapshots: readonly ServingReplaySnapshot[]
  readonly demoProfiles: readonly ServingDemoProfile[]
  readonly releaseInventory: readonly ServingReleaseInventoryItem[]
}

export function createServingEvidenceSummary(projection: MvpProjectionVersion): ServingEvidenceSummary {
  if (projection.projectionKind !== "ResearchEvidenceProjection") throw new Error("SERVING_EVIDENCE_SOURCE_KIND_INVALID")
  const payload = projection.structuredPayload
  const evidencePacketId = String(payload.packetId ?? "")
  if (!evidencePacketId) throw new Error("SERVING_EVIDENCE_PACKET_ID_REQUIRED")
  const base = {
    evidencePacketId,
    instrument: projection.subjectId,
    eventTimeStart: projection.eventTimeStart,
    eventTimeEnd: projection.eventTimeEnd,
    assessmentState: String(payload.conclusion ?? "NOT_EVALUABLE"),
    confidence: asRecord(payload.confidence),
    coverage: asRecord(payload.coverage),
    verifiedFacts: asRecord(payload.verifiedFacts),
    interpretation: asRecord(payload.interpretation),
    supportingEvidence: asList(payload.supportingEvidence),
    counterEvidence: asList(payload.counterEvidence),
    sourceLimitations: Object.freeze([...projection.limitations]),
    sourceProjectionIdentities: Object.freeze([projection.projectionVersionId]),
  }
  const summaryChecksum = canonicalChecksum(base)
  return Object.freeze({ evidenceSummaryId: `mses_${summaryChecksum}`, ...base, summaryChecksum })
}

export function verifyServingEvidenceSummary(summary: ServingEvidenceSummary): boolean {
  const { evidenceSummaryId, summaryChecksum, ...base } = summary
  return /^[0-9a-f]{64}$/.test(summaryChecksum)
    && evidenceSummaryId === `mses_${summaryChecksum}`
    && canonicalChecksum(base) === summaryChecksum
}

export function createServingReplaySnapshot(projection: MvpProjectionVersion, model: ReplaySequenceModel): ServingReplaySnapshot {
  if (projection.projectionKind !== "ReplayTimelineProjection" || model.sourceProjectionVersionId !== projection.projectionVersionId || model.sourceProjectionChecksum !== projection.projectionChecksum) throw new Error("SERVING_REPLAY_SOURCE_MISMATCH")
  if (!verifyReplayModelFunding(model) || model.sampleCounts.price !== 288 || model.sampleCounts.openInterest !== 288 || model.sampleCounts.flow !== 48) throw new Error("SERVING_REPLAY_SAMPLE_COUNT_MISMATCH")
  const identity = canonicalChecksum({ schemaVersion: "mvp-replay-sequence-snapshot/1.0.0", modelVersion: model.modelVersion, sourceProjectionVersionId: projection.projectionVersionId, sourceProjectionChecksum: projection.projectionChecksum, sourceDependencyDigest: projection.dependencyDigest, instrument: projection.subjectId, eventTimeStart: projection.eventTimeStart, eventTimeEnd: projection.eventTimeEnd })
  const base = { replaySnapshotId: `mrss_${identity}`, snapshotIdentity: identity, sourceProjectionVersionId: projection.projectionVersionId, sourceProjectionChecksum: projection.projectionChecksum, sourceDependencyDigest: projection.dependencyDigest, instrument: projection.subjectId, eventTimeStart: projection.eventTimeStart, eventTimeEnd: projection.eventTimeEnd, knowledgeTimeCutoff: projection.knowledgeTimeCutoff, modelVersion: model.modelVersion, payload: model, modelChecksum: model.modelChecksum, priceSampleCount: model.sampleCounts.price, openInterestSampleCount: model.sampleCounts.openInterest, fundingSampleCount: model.sampleCounts.funding, flowBucketCount: model.sampleCounts.flow, limitations: Object.freeze([...model.limitations]) }
  return Object.freeze({ ...base, snapshotChecksum: canonicalChecksum(base) })
}

export function createServingDemoProfile(role: "PRIMARY" | "BACKUP", value: Readonly<Record<string, unknown>>): ServingDemoProfile {
  const replayUrl = new URL(String(value.replayUrl), "http://local.invalid")
  const base = { profileId: String(value.profileId ?? `mvp-demo-${role.toLowerCase()}`), role, instrument: String(value.instrument), eventTimeStart: String(value.eventTimeStart), eventTimeEnd: String(value.eventTimeEnd), evidenceIdentity: String(value.evidencePacketId), replayIdentity: String(value.replayProjectionVersionId), researchIdentity: String(value.researchProjectionVersionId), initialCursorTimestamp: replayUrl.searchParams.get("timestamp") ?? String(value.eventTimeStart), profilePayload: value }
  return Object.freeze({ ...base, profileChecksum: canonicalChecksum(base) })
}

export function createReleaseInventoryItem(input: Omit<ServingReleaseInventoryItem, "inventoryId">): ServingReleaseInventoryItem {
  return Object.freeze({ inventoryId: `msri_${canonicalChecksum(input)}`, ...input })
}

export function createServingCorpus(input: Omit<ServingCorpusRecord, "corpusId" | "servingChecksum" | "schemaVersion" | "lifecycle" | "exposure"> & { readonly releaseDigest: string }): ServingCorpusRecord {
  const checksumBasis = { schemaVersion: MVP_SERVING_SCHEMA_VERSION, corpusVersion: input.corpusVersion, sourceCorpusId: input.sourceCorpusId, sourceCorpusChecksum: input.sourceCorpusChecksum, generatedAt: input.generatedAt, governedThrough: input.governedThrough, projectionCount: input.projectionCount, evidenceSummaryCount: input.evidenceSummaryCount, replaySnapshotCount: input.replaySnapshotCount, demoProfileCount: input.demoProfileCount, releaseInventoryCount: input.releaseInventoryCount, publicationEventCount: input.publicationEventCount, releaseDigest: input.releaseDigest }
  const servingChecksum = canonicalChecksum(checksumBasis)
  return Object.freeze({ corpusId: `mvp-serving-corpus:${servingChecksum}`, corpusVersion: input.corpusVersion, sourceCorpusId: input.sourceCorpusId, sourceCorpusChecksum: input.sourceCorpusChecksum, servingChecksum, schemaVersion: MVP_SERVING_SCHEMA_VERSION, generatedAt: input.generatedAt, governedThrough: input.governedThrough, lifecycle: "PUBLISHED", exposure: "CONSUMER_VISIBLE", projectionCount: input.projectionCount, evidenceSummaryCount: input.evidenceSummaryCount, replaySnapshotCount: input.replaySnapshotCount, demoProfileCount: input.demoProfileCount, releaseInventoryCount: input.releaseInventoryCount, publicationEventCount: input.publicationEventCount })
}

export function verifyReplaySnapshot(snapshot: ServingReplaySnapshot): boolean {
  const { snapshotChecksum, ...base } = snapshot
  return canonicalChecksum(base) === snapshotChecksum && snapshot.payload.modelChecksum === snapshot.modelChecksum && verifyReplayModelFunding(snapshot.payload)
}

function verifyReplayModelFunding(model: ReplaySequenceModel): boolean {
  const start = Date.parse(model.eventTimeStart), end = Date.parse(model.eventTimeEnd)
  const timestamps = model.funding.map((event) => event.eventTime)
  return Number.isFinite(start)
    && Number.isFinite(end)
    && model.funding.length > 0
    && model.sampleCounts.funding === model.funding.length
    && new Set(timestamps).size === timestamps.length
    && model.funding.every((event) => {
      const timestamp = Date.parse(event.eventTime)
      return Number.isFinite(timestamp)
        && new Date(timestamp).toISOString() === event.eventTime
        && timestamp >= start
        && timestamp < end
        && event.providerId.trim().length > 0
        && /^[0-9a-f]{64}$/.test(event.sourceChecksum)
    })
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> { return value && typeof value === "object" && !Array.isArray(value) ? Object.freeze(value as Record<string, unknown>) : Object.freeze({}) }
function asList(value: unknown): readonly unknown[] { return Object.freeze(Array.isArray(value) ? [...value] : []) }
