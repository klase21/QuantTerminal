import { createHash } from "node:crypto"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  MVP_INACTIVE_SERVING_STAGE_COUNTS,
  prepareInactiveServingCandidate,
  type InactiveServingCandidateInput,
  type InactiveServingCandidatePlan,
} from "@/lib/data-platform/mvp-serving"

export const MVP_GREEN_ACQUISITION_MANIFEST_VERSION = "mvp-green-acquisition-manifest/1.0.0" as const
export const MVP_GREEN_ACQUISITION_TYPE = "CERTIFIED_INACTIVE_CANDIDATE_COPY" as const
export const ATOMIC_MANIFEST_LAST_DERIVED_STATE_V1 = "ATOMIC_MANIFEST_LAST_DERIVED_STATE_V1" as const

export const MVP_GREEN_ACQUISITION_BUNDLE_PATHS = Object.freeze([
  "candidate-manifest.json",
  "corpus-members.json",
  "corpus.json",
  "evidence-summaries.json",
  "projections.json",
  "replay-snapshots.json",
] as const)

export type MvpGreenAcquisitionBundlePath = typeof MVP_GREEN_ACQUISITION_BUNDLE_PATHS[number]

export const MVP_GREEN_ACQUISITION_FILE_SHA256: Readonly<Record<MvpGreenAcquisitionBundlePath, string>> = Object.freeze({
  "candidate-manifest.json": "79a609f8fd4f3a7b25a8e45cdbb2c5c89907cc0823899755ab12139049dfd63a",
  "corpus-members.json": "93b6a99c9f9437abda99577dada3429940bd0bff21b4fd9ed3c58aab6edaba46",
  "corpus.json": "3a438650cb1f0206e0ebdab023f1e4a7522c1c21ffb37c9fe2692de5809dfb07",
  "evidence-summaries.json": "e02000770f0d7de4d1622018eebe014ae8033e54f45ab0c404755d4257805643",
  "projections.json": "4b7c447039b849d9ada42577e58af9f8eb3fbd1fff0ec0c5fc75ef59ed3ee010",
  "replay-snapshots.json": "fbac47c3f1784c0cd4a523396bbd1c3fe508d0698fe535248e98daa39ae4aa4f",
})
export const MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM = "d5d26fa7ff03b93fe64d44ef17a0cfee9467cc8a9493e28b8510ef6b4f489027" as const
export const MVP_GREEN_ACQUISITION_MANIFEST_CHECKSUM = "d956e4ecefd495128a5ad3bf1ccd055434314d9496d874ae8276c583380f5b19" as const

export const MVP_GREEN_ACQUISITION_EXPECTED_COUNTS = Object.freeze({
  corpus: 2,
  projections: 62,
  evidenceSummaries: 6,
  replaySnapshots: 6,
  corpusMembers: 74,
  candidateManifest: 1,
  releaseInventory: 0,
})

export interface MvpGreenAcquisitionManifest {
  readonly manifestVersion: typeof MVP_GREEN_ACQUISITION_MANIFEST_VERSION
  readonly acquisitionType: typeof MVP_GREEN_ACQUISITION_TYPE
  readonly sourceArtifactIdentity: string
  readonly sourceArtifactCommit: string
  readonly sourceDatabaseIdentity: string
  readonly sourceManifestId: string
  readonly sourceManifestChecksum: string
  readonly sourceCandidateChecksum: string
  readonly sourcePayloadAggregateChecksum: string
  readonly sourcePayloadFiles: readonly { readonly path: MvpGreenAcquisitionBundlePath; readonly sha256: string }[]
  readonly sourcePayloadInventory: typeof MVP_GREEN_ACQUISITION_EXPECTED_COUNTS
  readonly sourceGenesisCorpusId: string
  readonly sourceVerifiedCorpusId: string
  readonly datasetInventory: readonly string[]
  readonly instrumentInventory: readonly string[]
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly maximumKnowledgeTimeCutoff: string
  readonly commonWatermarkId: string
  readonly commonWatermarkValue: string
  readonly commonWatermarkChecksum: string
  readonly memberSetChecksum: string
  readonly targetApplicationCommit: string
  readonly targetApplicationChecksum: string
  readonly targetProjectId: string
  readonly targetBranchId: string
  readonly targetEndpointId: string
  readonly targetDatabaseName: string
  readonly targetDatabaseOwner: string
  readonly approvedParentLsn: string
  readonly migrationPlanChecksum: string
  readonly candidateIdentity: string
  readonly candidateChecksum: string
  readonly expectedRowCounts: typeof MVP_GREEN_ACQUISITION_EXPECTED_COUNTS
  readonly transformationVersion: string
  readonly transformationChecksum: string
  readonly compatibilityVerdict: "COMPATIBLE_WITH_FROZEN_APPLICATION"
  readonly acquisitionStateContract: typeof ATOMIC_MANIFEST_LAST_DERIVED_STATE_V1
  readonly limitations: readonly string[]
  readonly manifestChecksum: string
}

export interface MvpGreenAcquisitionBundleFile {
  readonly path: MvpGreenAcquisitionBundlePath
  readonly content: string | Uint8Array
}

export interface LoadedMvpGreenAcquisitionBundle {
  readonly input: InactiveServingCandidateInput
  readonly candidate: InactiveServingCandidatePlan
  readonly fileSha256: Readonly<Record<MvpGreenAcquisitionBundlePath, string>>
  readonly aggregateChecksum: string
}

const CHECKSUM = /^[0-9a-f]{64}$/
const COMMIT = /^[0-9a-f]{40}$/
const CANDIDATE_ID = /^mvp8i-candidate:[0-9a-f]{64}$/
const MANIFEST_ID = /^mvp8i-manifest:[0-9a-f]{64}$/
const GENESIS_ID = /^mvp8i-genesis:[0-9a-f]{64}$/
const VERIFIED_SOURCE_ID = /^mvp8i-verified-source:[0-9a-f]{64}$/
const REQUIRED_INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"])
const REQUIRED_DATASETS = Object.freeze(["ohlcv", "openInterest", "funding", "aggTrades"])

function bytes(content: string | Uint8Array): Uint8Array { return typeof content === "string" ? Buffer.from(content, "utf8") : content }
function sha256(content: string | Uint8Array): string { return createHash("sha256").update(bytes(content)).digest("hex") }
function exactSet(actual: readonly string[], expected: readonly string[]): boolean { return actual.length === expected.length && new Set(actual).size === expected.length && [...actual].sort().join("\n") === [...expected].sort().join("\n") }
function record(value: unknown, code: string): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code); return value as Record<string, unknown> }
function stringValue(value: unknown, code: string): string { if (typeof value !== "string" || !value) throw new Error(code); return value }
function checksumValue(value: unknown, code: string): string { const result = stringValue(value, code); if (!CHECKSUM.test(result)) throw new Error(code); return result }
function strings(value: unknown, code: string): readonly string[] { if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item)) throw new Error(code); return Object.freeze([...value]) }
function parseJson(content: string | Uint8Array, code: string): unknown { try { return JSON.parse(Buffer.from(bytes(content)).toString("utf8")) } catch { throw new Error(code) } }
function parseArray(content: string | Uint8Array, code: string): readonly unknown[] { const value = parseJson(content, code); if (!Array.isArray(value)) throw new Error(code); return Object.freeze(value) }
function manifestBasis(manifest: MvpGreenAcquisitionManifest): Omit<MvpGreenAcquisitionManifest, "manifestChecksum"> { const { manifestChecksum, ...basis } = manifest; return basis }
function exactCounts(value: unknown): value is typeof MVP_GREEN_ACQUISITION_EXPECTED_COUNTS {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const actual = value as Record<string, unknown>, expected = MVP_GREEN_ACQUISITION_EXPECTED_COUNTS
  return Object.keys(actual).length === Object.keys(expected).length
    && (Object.keys(expected) as (keyof typeof expected)[]).every((key) => actual[key] === expected[key])
}
function exactIso(value: unknown, expected: string): boolean { return typeof value === "string" && value === expected && new Date(value).toISOString() === value }

export function computeMvpGreenAcquisitionBundleChecksum(fileSha256: Readonly<Partial<Record<MvpGreenAcquisitionBundlePath, string>>>): string {
  return canonicalChecksum(MVP_GREEN_ACQUISITION_BUNDLE_PATHS.map((path) => {
    const digest = fileSha256[path]
    if (!digest || !CHECKSUM.test(digest)) throw new Error("MVP_GREEN_ACQUISITION_FILE_CHECKSUM_INVALID")
    return Object.freeze({ path, sha256: digest })
  }))
}

export function loadMvpGreenAcquisitionBundle(files: readonly MvpGreenAcquisitionBundleFile[]): LoadedMvpGreenAcquisitionBundle {
  if (files.length !== MVP_GREEN_ACQUISITION_BUNDLE_PATHS.length || !exactSet(files.map((file) => file.path), MVP_GREEN_ACQUISITION_BUNDLE_PATHS)) throw new Error("MVP_GREEN_ACQUISITION_BUNDLE_FILE_SET_INVALID")
  const byPath = new Map(files.map((file) => [file.path, file.content]))
  const fileSha256 = Object.freeze(Object.fromEntries(MVP_GREEN_ACQUISITION_BUNDLE_PATHS.map((path) => [path, sha256(byPath.get(path)!)])) as Record<MvpGreenAcquisitionBundlePath, string>)
  if (MVP_GREEN_ACQUISITION_BUNDLE_PATHS.some((path) => fileSha256[path] !== MVP_GREEN_ACQUISITION_FILE_SHA256[path])) throw new Error("MVP_GREEN_ACQUISITION_FILE_CHECKSUM_MISMATCH")
  const aggregateChecksum = computeMvpGreenAcquisitionBundleChecksum(fileSha256)
  if (aggregateChecksum !== MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM) throw new Error("MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM_MISMATCH")

  const candidateManifestRows = parseArray(byPath.get("candidate-manifest.json")!, "MVP_GREEN_ACQUISITION_CANDIDATE_MANIFEST_INVALID")
  const corpusRows = parseArray(byPath.get("corpus.json")!, "MVP_GREEN_ACQUISITION_CORPUS_INVALID")
  const memberRows = parseArray(byPath.get("corpus-members.json")!, "MVP_GREEN_ACQUISITION_MEMBERS_INVALID")
  const projections = parseArray(byPath.get("projections.json")!, "MVP_GREEN_ACQUISITION_PROJECTIONS_INVALID")
  const evidenceSummaries = parseArray(byPath.get("evidence-summaries.json")!, "MVP_GREEN_ACQUISITION_EVIDENCE_INVALID")
  const replaySnapshots = parseArray(byPath.get("replay-snapshots.json")!, "MVP_GREEN_ACQUISITION_REPLAY_INVALID")
  if (candidateManifestRows.length !== 1 || corpusRows.length !== 2 || memberRows.length !== 74 || projections.length !== 62 || evidenceSummaries.length !== 6 || replaySnapshots.length !== 6) throw new Error("MVP_GREEN_ACQUISITION_BUNDLE_COUNTS_INVALID")

  const candidateManifestRow = record(candidateManifestRows[0], "MVP_GREEN_ACQUISITION_CANDIDATE_MANIFEST_INVALID")
  const metadata = record(candidateManifestRow.manifest, "MVP_GREEN_ACQUISITION_CANDIDATE_MANIFEST_INVALID")
  const input = Object.freeze({
    schemaVersion: metadata.schemaVersion,
    replaySourceCorpusId: metadata.replaySourceCorpusId,
    replaySourceCorpusChecksum: metadata.replaySourceCorpusChecksum,
    commonWatermarkId: metadata.commonWatermarkId,
    commonWatermarkValue: metadata.commonWatermarkValue,
    commonWatermarkChecksum: metadata.commonWatermarkChecksum,
    projections,
    evidenceSummaries,
    replaySnapshots,
  }) as InactiveServingCandidateInput
  const candidate = prepareInactiveServingCandidate(input)
  const normalizedMembers = memberRows.map((value) => {
    const row = record(value, "MVP_GREEN_ACQUISITION_MEMBERS_INVALID")
    return Object.freeze({
      memberKind: row.member_kind,
      memberId: row.member_id,
      memberChecksum: row.member_checksum,
      canonicalSortKey: row.canonical_sort_key,
      inheritedSourceCorpusId: row.inherited_source_corpus_id,
      schemaVersion: row.schema_version,
      metadata: row.metadata,
    })
  })
  if (canonicalChecksum(normalizedMembers) !== canonicalChecksum(candidate.members)) throw new Error("MVP_GREEN_ACQUISITION_MEMBER_BINDING_MISMATCH")
  if (
    candidateManifestRow.manifest_id !== candidate.manifestId
    || candidateManifestRow.manifest_checksum !== candidate.manifestChecksum
    || candidateManifestRow.corpus_id !== candidate.candidateId
    || candidateManifestRow.previous_corpus_id !== candidate.genesisCorpusId
  ) throw new Error("MVP_GREEN_ACQUISITION_CANDIDATE_MANIFEST_BINDING_MISMATCH")
  const corpusIds = corpusRows.map((value) => stringValue(record(value, "MVP_GREEN_ACQUISITION_CORPUS_INVALID").corpus_id, "MVP_GREEN_ACQUISITION_CORPUS_INVALID"))
  if (!exactSet(corpusIds, [candidate.candidateId, candidate.genesisCorpusId])) throw new Error("MVP_GREEN_ACQUISITION_CORPUS_BINDING_MISMATCH")
  return Object.freeze({ input, candidate, fileSha256, aggregateChecksum })
}

export function parseMvpGreenAcquisitionManifest(value: unknown): MvpGreenAcquisitionManifest {
  const source = record(value, "MVP_GREEN_ACQUISITION_MANIFEST_INVALID")
  const sourcePayloadFiles = source.sourcePayloadFiles
  if (!Array.isArray(sourcePayloadFiles)) throw new Error("MVP_GREEN_ACQUISITION_MANIFEST_INVALID")
  const manifest = Object.freeze({
    ...source,
    sourcePayloadFiles: Object.freeze(sourcePayloadFiles.map((value) => {
      const file = record(value, "MVP_GREEN_ACQUISITION_MANIFEST_INVALID")
      return Object.freeze({ path: stringValue(file.path, "MVP_GREEN_ACQUISITION_MANIFEST_INVALID") as MvpGreenAcquisitionBundlePath, sha256: checksumValue(file.sha256, "MVP_GREEN_ACQUISITION_MANIFEST_INVALID") })
    })),
    datasetInventory: strings(source.datasetInventory, "MVP_GREEN_ACQUISITION_MANIFEST_INVALID"),
    instrumentInventory: strings(source.instrumentInventory, "MVP_GREEN_ACQUISITION_MANIFEST_INVALID"),
    limitations: strings(source.limitations, "MVP_GREEN_ACQUISITION_MANIFEST_INVALID"),
  }) as unknown as MvpGreenAcquisitionManifest
  if (
    manifest.manifestVersion !== MVP_GREEN_ACQUISITION_MANIFEST_VERSION
    || manifest.acquisitionType !== MVP_GREEN_ACQUISITION_TYPE
    || manifest.acquisitionStateContract !== ATOMIC_MANIFEST_LAST_DERIVED_STATE_V1
    || manifest.compatibilityVerdict !== "COMPATIBLE_WITH_FROZEN_APPLICATION"
    || !COMMIT.test(manifest.sourceArtifactCommit)
    || !COMMIT.test(manifest.targetApplicationCommit)
    || !CANDIDATE_ID.test(manifest.sourceArtifactIdentity)
    || !CANDIDATE_ID.test(manifest.candidateIdentity)
    || !MANIFEST_ID.test(manifest.sourceManifestId)
    || !GENESIS_ID.test(manifest.sourceGenesisCorpusId)
    || !VERIFIED_SOURCE_ID.test(manifest.sourceVerifiedCorpusId)
    || !CHECKSUM.test(manifest.sourceManifestChecksum)
    || !CHECKSUM.test(manifest.sourceCandidateChecksum)
    || !CHECKSUM.test(manifest.sourcePayloadAggregateChecksum)
    || !CHECKSUM.test(manifest.targetApplicationChecksum)
    || !CHECKSUM.test(manifest.migrationPlanChecksum)
    || !CHECKSUM.test(manifest.candidateChecksum)
    || !CHECKSUM.test(manifest.transformationChecksum)
    || !CHECKSUM.test(manifest.commonWatermarkChecksum)
    || !CHECKSUM.test(manifest.memberSetChecksum)
    || !CHECKSUM.test(manifest.manifestChecksum)
    || manifest.manifestChecksum !== MVP_GREEN_ACQUISITION_MANIFEST_CHECKSUM
    || !exactCounts(manifest.sourcePayloadInventory)
    || !exactCounts(manifest.expectedRowCounts)
    || !exactSet(manifest.sourcePayloadFiles.map((file) => file.path), MVP_GREEN_ACQUISITION_BUNDLE_PATHS)
    || manifest.sourcePayloadFiles.some((file) => MVP_GREEN_ACQUISITION_FILE_SHA256[file.path] !== file.sha256)
    || !exactSet(manifest.datasetInventory, REQUIRED_DATASETS)
    || !exactSet(manifest.instrumentInventory, REQUIRED_INSTRUMENTS)
    || !exactIso(manifest.eventTimeStart, "2026-07-15T00:00:00.000Z")
    || !exactIso(manifest.eventTimeEnd, "2026-07-16T00:00:00.000Z")
    || !exactIso(manifest.maximumKnowledgeTimeCutoff, "2026-07-17T13:35:16.000Z")
    || !exactIso(manifest.commonWatermarkValue, "2026-07-16T00:00:00.000Z")
    || manifest.transformationChecksum !== canonicalChecksum({
      transformationVersion: manifest.transformationVersion,
      transformations: [],
      persistencePath: "publishInactiveCandidateToSeparateTarget",
      acquisitionStateContract: manifest.acquisitionStateContract,
    })
    || canonicalChecksum(manifestBasis(manifest)) !== manifest.manifestChecksum
  ) throw new Error("MVP_GREEN_ACQUISITION_MANIFEST_BINDING_INVALID")
  return manifest
}

export function assertMvpGreenAcquisitionManifestBinding(manifest: MvpGreenAcquisitionManifest, bundle: LoadedMvpGreenAcquisitionBundle): void {
  const candidate = bundle.candidate
  if (
    manifest.sourcePayloadAggregateChecksum !== bundle.aggregateChecksum
    || manifest.sourceArtifactIdentity !== candidate.candidateId
    || manifest.candidateIdentity !== candidate.candidateId
    || manifest.sourceCandidateChecksum !== candidate.servingChecksum
    || manifest.candidateChecksum !== candidate.servingChecksum
    || manifest.sourceManifestId !== candidate.manifestId
    || manifest.sourceManifestChecksum !== candidate.manifestChecksum
    || manifest.sourceGenesisCorpusId !== candidate.genesisCorpusId
    || manifest.sourceVerifiedCorpusId !== candidate.verifiedSourceCorpusId
    || manifest.commonWatermarkId !== candidate.commonWatermarkId
    || manifest.commonWatermarkValue !== candidate.commonWatermarkValue
    || manifest.commonWatermarkChecksum !== candidate.commonWatermarkChecksum
    || manifest.memberSetChecksum !== candidate.memberSetChecksum
  ) throw new Error("MVP_GREEN_ACQUISITION_MANIFEST_SOURCE_BINDING_MISMATCH")
}

export interface MvpGreenAcquisitionCatalogSnapshot {
  readonly runtimeBindingExact: boolean
  readonly immutableConflict: boolean
  readonly corpusCount: number
  readonly candidateCorpusCount: number
  readonly projectionCount: number
  readonly evidenceSummaryCount: number
  readonly replaySnapshotCount: number
  readonly demoProfileCount: number
  readonly corpusMemberCount: number
  readonly candidateManifestCount: number
  readonly releaseInventoryCount: number
  readonly exposureCount: number
  readonly publicationEventCount: number
  readonly cutoverCount: number
  readonly candidate: {
    readonly candidateId: string
    readonly servingChecksum: string
    readonly memberSetChecksum: string
    readonly manifestChecksum: string
    readonly commonWatermarkId: string
    readonly commonWatermarkValue: string
    readonly commonWatermarkChecksum: string
    readonly lifecycle: string
    readonly exposure: string
    readonly exposureEligibility: string
  } | null
}

export type MvpGreenAcquisitionDerivedState = "NOT_STARTED" | "COMPLETE" | "PARTIAL" | "CONFLICT"

export function classifyMvpGreenAcquisitionDerivedState(snapshot: MvpGreenAcquisitionCatalogSnapshot, bundle: LoadedMvpGreenAcquisitionBundle): MvpGreenAcquisitionDerivedState {
  const counts = [snapshot.corpusCount, snapshot.projectionCount, snapshot.evidenceSummaryCount, snapshot.replaySnapshotCount, snapshot.corpusMemberCount, snapshot.candidateManifestCount]
  if (snapshot.immutableConflict || !snapshot.runtimeBindingExact || counts.some((count) => count < 0 || count > 100_000)) return "CONFLICT"
  if (
    snapshot.candidateCorpusCount === 0
    && snapshot.projectionCount === 0
    && snapshot.evidenceSummaryCount === 0
    && snapshot.replaySnapshotCount === 0
    && snapshot.demoProfileCount === 0
    && snapshot.corpusMemberCount === 0
    && snapshot.candidateManifestCount === 0
    && snapshot.releaseInventoryCount === 0
    && snapshot.exposureCount === 0
    && snapshot.publicationEventCount === 0
    && snapshot.cutoverCount === 0
    && snapshot.candidate === null
  ) return "NOT_STARTED"
  const candidate = snapshot.candidate, expected = bundle.candidate
  if (
    snapshot.corpusCount === 2
    && snapshot.projectionCount === 62
    && snapshot.evidenceSummaryCount === 6
    && snapshot.replaySnapshotCount === 6
    && snapshot.demoProfileCount === 0
    && snapshot.corpusMemberCount === 74
    && snapshot.candidateManifestCount === 1
    && snapshot.releaseInventoryCount === 0
    && snapshot.exposureCount === 0
    && snapshot.publicationEventCount === 0
    && snapshot.cutoverCount === 0
    && candidate?.candidateId === expected.candidateId
    && candidate.servingChecksum === expected.servingChecksum
    && candidate.memberSetChecksum === expected.memberSetChecksum
    && candidate.manifestChecksum === expected.manifestChecksum
    && candidate.commonWatermarkId === expected.commonWatermarkId
    && candidate.commonWatermarkValue === expected.commonWatermarkValue
    && candidate.commonWatermarkChecksum === expected.commonWatermarkChecksum
    && candidate.lifecycle === "WITHHELD"
    && candidate.exposure === "INTERNAL_ONLY"
    && candidate.exposureEligibility === "INELIGIBLE"
  ) return "COMPLETE"
  return "PARTIAL"
}

export interface MvpGreenAtomicAcquisitionPorts {
  readonly classify: () => Promise<MvpGreenAcquisitionDerivedState>
  readonly publish: () => Promise<"CREATED" | "DUPLICATE">
  readonly verifyComplete: () => Promise<void>
}

/** STARTED is process-local: the only durable transition is the atomic manifest-last publication. */
export async function executeMvpGreenAtomicDerivedStateAcquisition(ports: MvpGreenAtomicAcquisitionPorts): Promise<"CREATED" | "RECONCILED"> {
  const initial = await ports.classify()
  if (initial === "CONFLICT") throw new Error("MVP_GREEN_ACQUISITION_CONFLICT")
  if (initial === "PARTIAL") throw new Error("MVP_GREEN_BLOCKED_PARTIAL_ACQUISITION")
  if (initial === "COMPLETE") {
    await ports.verifyComplete()
    return "RECONCILED"
  }
  const publication = await ports.publish()
  if (await ports.classify() !== "COMPLETE") throw new Error("MVP_GREEN_ACQUISITION_POST_COMMIT_INCOMPLETE")
  await ports.verifyComplete()
  return publication === "CREATED" ? "CREATED" : "RECONCILED"
}
