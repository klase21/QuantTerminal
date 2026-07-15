import "server-only"

import snapshotJson from "./generated/certifiedSnapshot.json"

import type { MvpProjectionExposureDecision } from "@/lib/data-platform/consistency-evidence/postgres"
import { type MvpProjectionKind } from "@/lib/data-platform/evidence-platform"
import type { MvpConsumerProjectionSource } from "@/lib/data-platform/consumer-projections"
import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { ServingReplaySnapshot } from "./contracts"
import { verifyCertifiedSnapshotBundle, type CertifiedSnapshotBundle } from "./snapshotContract"

let verified: CertifiedSnapshotBundle | null = null

export function readCertifiedSnapshotBundle(environment: Readonly<Record<string, string | undefined>> = process.env): CertifiedSnapshotBundle {
  if (verified) return verified
  const value = snapshotJson as unknown as CertifiedSnapshotBundle
  verified = verifyCertifiedSnapshotBundle(value, environment)
  return verified
}

export function createCertifiedSnapshotProjectionSource(bundle = readCertifiedSnapshotBundle()): MvpConsumerProjectionSource {
  const successors = new Set(bundle.projections.map((value) => value.supersedesProjectionVersionId).filter((value): value is string => Boolean(value)))
  const exposure: MvpProjectionExposureDecision = Object.freeze({ decisionId: `snapshot:${bundle.corpus.corpusId}`, projectionCorpusId: bundle.corpus.corpusId, projectionCorpusChecksum: bundle.corpus.servingChecksum, action: "CUTOVER", effectiveExposure: "CONSUMER_VISIBLE", previousDecisionId: null, reasonCode: "CERTIFIED_SNAPSHOT_ACTIVE", actorId: "mvp-serving-publisher", decisionChecksum: canonicalChecksum({ corpusId: bundle.corpus.corpusId, checksum: bundle.corpus.servingChecksum, mode: "CERTIFIED_SNAPSHOT" }), createdAt: bundle.corpus.generatedAt })
  return Object.freeze({
    latest: async (kind: MvpProjectionKind, subjectId: string) => bundle.projections.filter((value) => value.projectionKind === kind && value.subjectId === subjectId && !successors.has(value.projectionVersionId)).sort((a, b) => b.eventTimeEnd.localeCompare(a.eventTimeEnd) || b.createdAt.localeCompare(a.createdAt))[0] ?? null,
    byVersion: async (projectionVersionId: string) => bundle.projections.find((value) => value.projectionVersionId === projectionVersionId) ?? null,
    list: async (input) => Object.freeze(bundle.projections.filter((value) => (!input.kind || value.projectionKind === input.kind) && (!input.subjectId || value.subjectId === input.subjectId) && (!input.start || value.eventTimeStart >= input.start) && (!input.end || value.eventTimeEnd <= input.end)).sort((a, b) => a.eventTimeStart.localeCompare(b.eventTimeStart) || a.subjectId.localeCompare(b.subjectId)).slice(input.offset ?? 0, (input.offset ?? 0) + input.limit)),
    exposure: async () => exposure,
  })
}

export function readCertifiedReplaySnapshot(input: { readonly sourceProjectionVersionId?: string; readonly instrument?: string; readonly start?: string; readonly end?: string }): ServingReplaySnapshot | null {
  const values = readCertifiedSnapshotBundle().replaySnapshots.filter((value) => (!input.sourceProjectionVersionId || value.sourceProjectionVersionId === input.sourceProjectionVersionId) && (!input.instrument || value.instrument === input.instrument) && (!input.start || value.eventTimeStart === input.start) && (!input.end || value.eventTimeEnd === input.end))
  if (values.length > 1) throw new Error("REPLAY_SNAPSHOT_AMBIGUOUS")
  return values[0] ?? null
}
