import assert from "node:assert/strict"
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import {
  ATOMIC_MANIFEST_LAST_DERIVED_STATE_V1,
  MVP_GREEN_ACQUISITION_APPLICATION_COMMIT,
  MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM,
  MVP_GREEN_ACQUISITION_BUNDLE_PATHS,
  MVP_GREEN_ACQUISITION_EXPECTED_COUNTS,
  MVP_GREEN_ACQUISITION_FILE_SHA256,
  MVP_GREEN_ACQUISITION_TARGET,
  classifyMvpGreenAcquisitionDerivedState,
  computeMvpGreenAcquisitionBundleChecksum,
  executeMvpGreenAtomicDerivedStateAcquisition,
  loadCertifiedMvpGreenAcquisitionInput,
  loadMvpGreenAcquisitionBundle,
  parseMvpGreenAcquisitionManifest,
  type MvpGreenAcquisitionCatalogSnapshot,
} from "../../../lib/data-platform/mvp-release"
import { MVP_INACTIVE_SERVING_STAGE_WRITE_ORDER } from "../../../lib/data-platform/mvp-serving"

const CANDIDATE_ID = "mvp8i-candidate:fa295d3b749fd45d8c5172c5b5568463a4e645f9a0312d2d7945c4840753dc57"
const MANIFEST_PATH = resolve("docs/project/mvp-green-acquisition-a4590b21.json")
const BUNDLE_DIRECTORY = join(
  process.env.LOCALAPPDATA ?? "",
  "QuantTerminal",
  "GreenAcquisition",
  "mvp8i-candidate-fa295d3b749fd45d8c5172c5b5568463a4e645f9a0312d2d7945c4840753dc57",
)

function snapshot(overrides: Partial<MvpGreenAcquisitionCatalogSnapshot> = {}): MvpGreenAcquisitionCatalogSnapshot {
  return {
    runtimeBindingExact: true,
    immutableConflict: false,
    corpusCount: 0,
    candidateCorpusCount: 0,
    projectionCount: 0,
    evidenceSummaryCount: 0,
    replaySnapshotCount: 0,
    demoProfileCount: 0,
    corpusMemberCount: 0,
    candidateManifestCount: 0,
    releaseInventoryCount: 0,
    exposureCount: 0,
    publicationEventCount: 0,
    cutoverCount: 0,
    candidate: null,
    ...overrides,
  }
}

async function main(): Promise<void> {
  const manifestJson = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Record<string, unknown>
  const manifest = parseMvpGreenAcquisitionManifest(manifestJson)
  assert.equal(manifest.manifestChecksum, "d956e4ecefd495128a5ad3bf1ccd055434314d9496d874ae8276c583380f5b19")
  assert.equal(manifest.acquisitionStateContract, ATOMIC_MANIFEST_LAST_DERIVED_STATE_V1)
  assert.notEqual(manifest.sourceArtifactCommit, manifest.targetApplicationCommit)
  assert.equal(manifest.targetApplicationCommit, MVP_GREEN_ACQUISITION_APPLICATION_COMMIT)
  for (const [field, value] of [
    ["targetApplicationCommit", "760697dc8342fec3ba76348cc0aae4df4be5cf54"],
    ["targetBranchId", "br-conflict"],
    ["approvedParentLsn", "0/2CFC129"],
    ["migrationPlanChecksum", "0".repeat(64)],
  ] as const) assert.throws(() => parseMvpGreenAcquisitionManifest({ ...manifestJson, [field]: value }), /MANIFEST_BINDING_INVALID/)
  assert.equal(computeMvpGreenAcquisitionBundleChecksum(MVP_GREEN_ACQUISITION_FILE_SHA256), MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM)

  const files = await Promise.all(MVP_GREEN_ACQUISITION_BUNDLE_PATHS.map(async (path) => ({ path, content: await readFile(join(BUNDLE_DIRECTORY, path)) })))
  const bundle = loadMvpGreenAcquisitionBundle(files)
  assert.equal(bundle.aggregateChecksum, MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM)
  assert.equal(bundle.candidate.candidateId, CANDIDATE_ID)
  assert.deepEqual(bundle.candidate.counts, { projections: 62, evidenceSummaries: 6, replaySnapshots: 6, members: 74 })
  assert.deepEqual(MVP_GREEN_ACQUISITION_EXPECTED_COUNTS, { corpus: 2, projections: 62, evidenceSummaries: 6, replaySnapshots: 6, corpusMembers: 74, candidateManifest: 1, releaseInventory: 0 })

  const loaded = await loadCertifiedMvpGreenAcquisitionInput({
    acquisitionManifestPath: MANIFEST_PATH,
    acquisitionManifestChecksum: manifest.manifestChecksum,
    bundleDirectory: BUNDLE_DIRECTORY,
    bundleAggregateChecksum: MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM,
    candidateIdentity: CANDIDATE_ID,
    greenBranchId: MVP_GREEN_ACQUISITION_TARGET.branchId,
    approvedParentLsn: MVP_GREEN_ACQUISITION_TARGET.approvedParentLsn,
  })
  assert.equal(loaded.bundle.candidate.manifestId, manifest.sourceManifestId)
  await assert.rejects(() => loadCertifiedMvpGreenAcquisitionInput({
    acquisitionManifestPath: MANIFEST_PATH,
    acquisitionManifestChecksum: manifest.manifestChecksum,
    bundleDirectory: BUNDLE_DIRECTORY,
    bundleAggregateChecksum: MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM,
    candidateIdentity: `${CANDIDATE_ID.slice(0, -1)}0`,
    greenBranchId: MVP_GREEN_ACQUISITION_TARGET.branchId,
    approvedParentLsn: MVP_GREEN_ACQUISITION_TARGET.approvedParentLsn,
  }), /RELEASE_BINDING_MISMATCH/)

  const temporary = await mkdtemp(join(tmpdir(), "qt-green-acquisition-"))
  try {
    await Promise.all(MVP_GREEN_ACQUISITION_BUNDLE_PATHS.map((path) => cp(join(BUNDLE_DIRECTORY, path), join(temporary, path))))
    await rm(join(temporary, "replay-snapshots.json"))
    await assert.rejects(() => loadCertifiedMvpGreenAcquisitionInput({
      acquisitionManifestPath: MANIFEST_PATH,
      acquisitionManifestChecksum: manifest.manifestChecksum,
      bundleDirectory: temporary,
      bundleAggregateChecksum: MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM,
      candidateIdentity: CANDIDATE_ID,
      greenBranchId: MVP_GREEN_ACQUISITION_TARGET.branchId,
      approvedParentLsn: MVP_GREEN_ACQUISITION_TARGET.approvedParentLsn,
    }), /BUNDLE_FILE_SET_INVALID/)
    await cp(join(BUNDLE_DIRECTORY, "replay-snapshots.json"), join(temporary, "replay-snapshots.json"))
    await writeFile(join(temporary, "extra.json"), "{}\n", "utf8")
    await assert.rejects(() => loadCertifiedMvpGreenAcquisitionInput({
      acquisitionManifestPath: MANIFEST_PATH,
      acquisitionManifestChecksum: manifest.manifestChecksum,
      bundleDirectory: temporary,
      bundleAggregateChecksum: MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM,
      candidateIdentity: CANDIDATE_ID,
      greenBranchId: MVP_GREEN_ACQUISITION_TARGET.branchId,
      approvedParentLsn: MVP_GREEN_ACQUISITION_TARGET.approvedParentLsn,
    }), /BUNDLE_FILE_SET_INVALID/)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }

  assert.equal(classifyMvpGreenAcquisitionDerivedState(snapshot(), bundle), "NOT_STARTED")
  assert.equal(classifyMvpGreenAcquisitionDerivedState(snapshot({ corpusCount: 1 }), bundle), "NOT_STARTED", "an exact shared genesis corpus does not constitute a started candidate")
  assert.equal(classifyMvpGreenAcquisitionDerivedState(snapshot({ cutoverCount: 1 }), bundle), "PARTIAL")
  assert.equal(classifyMvpGreenAcquisitionDerivedState(snapshot({ demoProfileCount: 1 }), bundle), "PARTIAL")
  assert.equal(classifyMvpGreenAcquisitionDerivedState(snapshot({ projectionCount: 1 }), bundle), "PARTIAL")
  assert.equal(classifyMvpGreenAcquisitionDerivedState(snapshot({ runtimeBindingExact: false }), bundle), "CONFLICT")
  assert.equal(classifyMvpGreenAcquisitionDerivedState(snapshot({ immutableConflict: true }), bundle), "CONFLICT")
  const complete = snapshot({
    corpusCount: 2,
    candidateCorpusCount: 1,
    projectionCount: 62,
    evidenceSummaryCount: 6,
    replaySnapshotCount: 6,
    corpusMemberCount: 74,
    candidateManifestCount: 1,
    candidate: {
      candidateId: bundle.candidate.candidateId,
      servingChecksum: bundle.candidate.servingChecksum,
      memberSetChecksum: bundle.candidate.memberSetChecksum,
      manifestChecksum: bundle.candidate.manifestChecksum,
      commonWatermarkId: bundle.candidate.commonWatermarkId,
      commonWatermarkValue: bundle.candidate.commonWatermarkValue,
      commonWatermarkChecksum: bundle.candidate.commonWatermarkChecksum,
      lifecycle: "WITHHELD",
      exposure: "INTERNAL_ONLY",
      exposureEligibility: "INELIGIBLE",
    },
  })
  assert.equal(classifyMvpGreenAcquisitionDerivedState(complete, bundle), "COMPLETE")
  assert.equal(classifyMvpGreenAcquisitionDerivedState({ ...complete, releaseInventoryCount: 1 }, bundle), "PARTIAL")
  assert.equal(classifyMvpGreenAcquisitionDerivedState({ ...complete, exposureCount: 1 }, bundle), "PARTIAL")

  const firstOrder: string[] = []
  const firstStates: ("NOT_STARTED" | "COMPLETE")[] = ["NOT_STARTED", "COMPLETE"]
  assert.equal(await executeMvpGreenAtomicDerivedStateAcquisition({
    classify: async () => { firstOrder.push("classify"); return firstStates.shift() ?? "COMPLETE" },
    publish: async () => { firstOrder.push("publish-atomic-manifest-last"); return "CREATED" },
    verifyComplete: async () => { firstOrder.push("verify-complete") },
  }), "CREATED")
  assert.deepEqual(firstOrder, ["classify", "publish-atomic-manifest-last", "classify", "verify-complete"])
  let replayWrites = 0
  assert.equal(await executeMvpGreenAtomicDerivedStateAcquisition({
    classify: async () => "COMPLETE",
    publish: async () => { replayWrites += 1; return "CREATED" },
    verifyComplete: async () => undefined,
  }), "RECONCILED")
  assert.equal(replayWrites, 0)
  const racingStates: ("NOT_STARTED" | "COMPLETE")[] = ["NOT_STARTED", "COMPLETE"]
  assert.equal(await executeMvpGreenAtomicDerivedStateAcquisition({
    classify: async () => racingStates.shift() ?? "COMPLETE",
    publish: async () => "DUPLICATE",
    verifyComplete: async () => undefined,
  }), "RECONCILED")
  for (const state of ["PARTIAL", "CONFLICT"] as const) {
    let writes = 0
    await assert.rejects(() => executeMvpGreenAtomicDerivedStateAcquisition({
      classify: async () => state,
      publish: async () => { writes += 1; return "CREATED" },
      verifyComplete: async () => undefined,
    }), state === "PARTIAL" ? /BLOCKED_PARTIAL/ : /CONFLICT/)
    assert.equal(writes, 0)
  }

  assert.deepEqual(MVP_INACTIVE_SERVING_STAGE_WRITE_ORDER, ["PROJECTION_PAYLOADS", "EVIDENCE_PAYLOADS", "REPLAY_PAYLOADS", "MEMBERS", "MANIFEST", "READBACK"])
  const worker = await readFile(resolve("workers/data-platform/runMvpGreenRelease.ts"), "utf8")
  const runtime = await readFile(resolve("lib/data-platform/mvp-release/greenAcquisitionRuntime.ts"), "utf8")
  assert.match(worker, /"acquire-green-candidate"/)
  assert.match(worker, /approvalFromFile\("GREEN_ACQUISITION_START"/)
  assert.match(worker, /productionMutationCalls: 0/)
  for (const flag of ["green-branch-id", "approved-parent-lsn", "acquisition-manifest", "acquisition-manifest-checksum", "bundle-directory", "bundle-aggregate-checksum", "candidate-identity"]) assert.match(worker, new RegExp(`requiredFlag\\("${flag}"\\)`))
  assert.match(runtime, /publishInactiveCandidateToSeparateTarget/)
  assert.ok(runtime.indexOf("publishInactiveCandidateToSeparateTarget") < runtime.lastIndexOf("catalogSnapshot(reader, certified.bundle)"), "post-commit state is reclassified")
  assert.doesNotMatch(runtime, /INSERT INTO|UPDATE serving|DELETE FROM|serving_publication_event.*INSERT|serving_exposure.*INSERT/)
  assert.doesNotMatch(runtime, /STARTED.*INSERT|acquisition_control/i)

  console.log("MVP Green acquisition focused suite passed")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
