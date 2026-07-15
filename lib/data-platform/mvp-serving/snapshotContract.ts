import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { verifyMvpProjection, type MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"
import { verifyReplaySnapshot, type ServingCorpusRecord, type ServingDemoProfile, type ServingEvidenceSummary, type ServingReplaySnapshot } from "./contracts"

export interface CertifiedSnapshotBundle {
  readonly schemaVersion: "mvp-certified-serving-snapshot/1.0.0"
  readonly dataMode: "CERTIFIED_SNAPSHOT"
  readonly governedThrough: string
  readonly corpus: ServingCorpusRecord
  readonly exposure: { readonly state: "CONSUMER_VISIBLE"; readonly source: string }
  readonly projections: readonly MvpProjectionVersion[]
  readonly evidenceSummaries: readonly ServingEvidenceSummary[]
  readonly replaySnapshots: readonly ServingReplaySnapshot[]
  readonly demoProfiles: readonly ServingDemoProfile[]
  readonly bundleChecksum: string
}

export function verifyCertifiedSnapshotBundle(value: CertifiedSnapshotBundle, environment: Readonly<Record<string, string | undefined>> = process.env): CertifiedSnapshotBundle {
  const { bundleChecksum, ...basis } = value
  if (canonicalChecksum(basis) !== bundleChecksum) throw new Error("CERTIFIED_SNAPSHOT_CHECKSUM_MISMATCH")
  if (value.schemaVersion !== "mvp-certified-serving-snapshot/1.0.0" || value.dataMode !== "CERTIFIED_SNAPSHOT" || value.exposure.state !== "CONSUMER_VISIBLE") throw new Error("CERTIFIED_SNAPSHOT_INVALID")
  if (environment.MVP_SERVING_EXPECTED_CORPUS_ID && value.corpus.corpusId !== environment.MVP_SERVING_EXPECTED_CORPUS_ID) throw new Error("SERVING_CORPUS_UNAVAILABLE")
  if (environment.MVP_SERVING_EXPECTED_CHECKSUM && value.corpus.servingChecksum !== environment.MVP_SERVING_EXPECTED_CHECKSUM) throw new Error("SERVING_CORPUS_CHECKSUM_MISMATCH")
  if (value.projections.some((projection) => !verifyMvpProjection(projection)) || value.replaySnapshots.some((snapshot) => !verifyReplaySnapshot(snapshot))) throw new Error("CERTIFIED_SNAPSHOT_CHECKSUM_MISMATCH")
  return Object.freeze(value)
}
