import assert from "node:assert/strict"

import {
  assertMvpBlueGreenReleaseImmutable,
  createMvpBlueGreenBranchPlan,
  createMvpBlueGreenIncrementalWindows,
  createMvpBlueGreenReleaseUnit,
  discoverLatestMvpBlueGreenWatermark,
  expectedMvpBlueGreenReplayShape,
  MVP_BLUE_GREEN_REQUIRED_SYMBOLS,
  transitionMvpBlueGreenRelease,
  verifyMvpBlueGreenSourceDay,
  runMvpBlueGreenReleasePipeline,
  type MvpBlueGreenSourceDay,
} from "@/lib/data-platform/mvp-release"
import { inspectD4RuntimeTarget } from "@/lib/data-platform/consistency-evidence/postgres/safety"
import { inspectMvpRefreshTarget } from "@/lib/data-platform/mvp-refresh/safety"

const checksum = (character: string) => character.repeat(64)
const sourceDay = (start: string, complete = true): MvpBlueGreenSourceDay => {
  const end = new Date(Date.parse(start) + 86_400_000).toISOString()
  return Object.freeze({
    start,
    end,
    archiveChecks: Object.freeze((["ohlcv", "open-interest", "agg-trade"] as const).flatMap((dataset) => MVP_BLUE_GREEN_REQUIRED_SYMBOLS.map((instrument) => Object.freeze({ dataset, instrument, available: complete, finalized: complete, checksumState: complete ? "VERIFIED" as const : "NOT_VERIFIED" as const })))),
    fundingChecks: Object.freeze(MVP_BLUE_GREEN_REQUIRED_SYMBOLS.map((instrument) => Object.freeze({ instrument, eventCount: complete ? 3 : 2, checksumState: complete ? "VERIFIED" as const : "NOT_VERIFIED" as const }))),
  })
}

const main = async () => {
const days = [sourceDay("2026-07-16T00:00:00.000Z"), sourceDay("2026-07-17T00:00:00.000Z"), sourceDay("2026-07-18T00:00:00.000Z"), sourceDay("2026-07-19T00:00:00.000Z", false)]
assert.equal(days.slice(0, 3).every(verifyMvpBlueGreenSourceDay), true)
assert.equal(verifyMvpBlueGreenSourceDay(days[3]), false)

const discovery = discoverLatestMvpBlueGreenWatermark("2026-07-16T00:00:00.000Z", days)
assert.equal(discovery.status, "COMPLETE_WATERMARK_FOUND")
assert.equal(discovery.governedThrough, "2026-07-19T00:00:00.000Z")
assert.equal(createMvpBlueGreenIncrementalWindows("2026-07-16T00:00:00.000Z", discovery.governedThrough).length, 3)
assert.equal(discoverLatestMvpBlueGreenWatermark("2026-07-16T00:00:00.000Z", [days[3]]).status, "NO_NEW_COMPLETE_WATERMARK")

const plan = createMvpBlueGreenBranchPlan({
  projectId: "soft-cell-16396854",
  parentBranchId: "br-flat-grass-ao9rtnyr",
  databaseName: "mvp_release_20260719",
  applicationCommit: "c28ed35b983376f51d74336604aa63e19d4a8933",
  currentWatermark: "2026-07-16T00:00:00.000Z",
  governedThrough: discovery.governedThrough,
})
assert.match(plan.branchName, /^mvp-release-2026-07-19-[0-9a-f]{12}$/)
assert.equal(plan.branchName, "mvp-release-2026-07-19-4840e8040c7c")
assert.equal(plan.incrementalWindows.length, 3)
assert.throws(() => createMvpBlueGreenBranchPlan({ ...plan, parentBranchId: "br-royal-block-aop70mzq" }), /BRANCH_BINDING_INVALID|INCREMENTAL_RANGE_INVALID/)

const replayProjectionIds = Object.fromEntries(MVP_BLUE_GREEN_REQUIRED_SYMBOLS.map((symbol, index) => [symbol, `projection-${index}`])) as Record<typeof MVP_BLUE_GREEN_REQUIRED_SYMBOLS[number], string>
const base = {
  state: "FROZEN" as const,
  applicationCommit: "c28ed35b983376f51d74336604aa63e19d4a8933",
  projectId: "soft-cell-16396854",
  parentBranchId: "br-flat-grass-ao9rtnyr",
  branchId: "br-green-release-123",
  branchName: plan.branchName,
  databaseName: "mvp_release_20260719",
  readerRole: "mvp_serving_reader" as const,
  targetFingerprint: "neon:soft-cell-16396854/br-green-release-123/mvp_release_20260719",
  candidateId: `mvp8i-candidate:${checksum("a")}`,
  candidateChecksum: checksum("a"),
  memberSetChecksum: checksum("b"),
  commonWatermarkChecksum: checksum("c"),
  governedThrough: discovery.governedThrough,
  counts: { projections: 62, evidence: 6, replay: 6, members: 74, manifests: 1 },
  replayProjectionIds,
  previewDeploymentId: null,
  previewDeploymentCommit: null,
  receiptChecksums: { health: null, dashboard: null, scanner: null, trade: null, replay: null },
}
const frozen = createMvpBlueGreenReleaseUnit(base)
const certified = createMvpBlueGreenReleaseUnit({ ...base, state: "CERTIFIED" })
const certifiedFromFrozen = createMvpBlueGreenReleaseUnit({ ...frozen, state: "CERTIFIED" })
assertMvpBlueGreenReleaseImmutable(frozen, certified)
assert.equal(certifiedFromFrozen.releaseChecksum, certified.releaseChecksum)
assert.equal(transitionMvpBlueGreenRelease("CERTIFIED", "PREVIEW_VERIFIED"), "PREVIEW_VERIFIED")
assert.throws(() => transitionMvpBlueGreenRelease("BUILDING", "PROMOTION_READY"), /TRANSITION_INVALID/)
assert.throws(() => createMvpBlueGreenReleaseUnit({ ...base, databaseName: "neondb", targetFingerprint: "neon:soft-cell-16396854/br-green-release-123/neondb" }), /SEPARATE_DATABASE/)
assert.throws(() => createMvpBlueGreenReleaseUnit({ ...base, branchId: base.parentBranchId, targetFingerprint: `neon:soft-cell-16396854/${base.parentBranchId}/mvp_release_20260719` }), /SEPARATE_DATABASE/)
assert.deepEqual(expectedMvpBlueGreenReplayShape("2026-07-18T00:00:00.000Z", "2026-07-19T00:00:00.000Z"), { price: 288, openInterest: 288, funding: 3, flow: 48 })
assert.deepEqual(expectedMvpBlueGreenReplayShape("2026-07-16T00:00:00.000Z", "2026-07-19T00:00:00.000Z"), { price: 864, openInterest: 864, funding: 9, flow: 144 })

const syntheticManagedUrl = (role: string, database: string) => [
  "postgresql:",
  "",
  `${role}:synthetic@ep-green.ap-southeast-1.aws.neon.tech`,
  `${database}?sslmode=require`,
].join("/")
const d4Url = syntheticManagedUrl("qt_d4_owner", "quantterminal_mvp8z5_d4_4840e804")
const d4Environment = { MVP_BLUE_GREEN_RELEASE_MODE: "IMMUTABLE_CANDIDATE_DATABASE", D4_ISOLATED_POSTGRES_URL: d4Url, D4_EXPECTED_DATABASE_NAME: "quantterminal_mvp8z5_d4_4840e804" }
assert.equal(inspectD4RuntimeTarget(d4Url, d4Environment).safe, true)
assert.equal(inspectD4RuntimeTarget(d4Url, { ...d4Environment, MVP_BLUE_GREEN_RELEASE_MODE: undefined }).safe, false)

const refreshDatabase = "quantterminal_mvp8z5_refresh_4840e804"
const refreshUrl = syntheticManagedUrl("qt_d2_owner", refreshDatabase)
const refreshEnvironment = { MVP_BLUE_GREEN_RELEASE_MODE: "IMMUTABLE_CANDIDATE_DATABASE", MVP_BLUE_GREEN_TARGET_ID: `neon:soft-cell-16396854/br-green-release-123/${refreshDatabase}` }
assert.equal(inspectMvpRefreshTarget(refreshUrl, refreshEnvironment, refreshDatabase).safe, true)
assert.equal(inspectMvpRefreshTarget(refreshUrl, { ...refreshEnvironment, MVP_BLUE_GREEN_TARGET_ID: "" }, refreshDatabase).safe, false)
assert.equal(inspectMvpRefreshTarget(refreshUrl, { ...refreshEnvironment, MVP_BLUE_GREEN_RELEASE_MODE: "" }, refreshDatabase).safe, false)

const order: string[] = []
const coordinatorResult = await runMvpBlueGreenReleasePipeline({
  plan,
  ports: {
    infrastructure: { createBranch: async () => { order.push("branch"); return { projectId: plan.projectId, parentBranchId: plan.parentBranchId, branchId: "br-green-release-123", branchName: plan.branchName, databaseName: plan.databaseName, targetFingerprint: `neon:${plan.projectId}/br-green-release-123/${plan.databaseName}`, createdAt: "2026-07-20T00:00:00.000Z", parentLsn: "0/123", region: "aws-ap-southeast-1", pooledEndpointReady: true } } },
    build: {
      ingest: async (_branch, window) => { order.push(`ingest:${window.start}`); return { ...window, logicalSlots: 24, sourceArtifacts: 24, checksum: checksum("d"), status: "CREATED" } },
      materialize: async () => { order.push("materialize"); return { candidateId: `mvp8i-candidate:${checksum("a")}`, candidateChecksum: checksum("a"), memberSetChecksum: checksum("b"), commonWatermarkChecksum: checksum("c"), governedThrough: plan.governedThrough, counts: { projections: 62, evidence: 6, replay: 6, members: 74, manifests: 1 }, replayProjectionIds } },
    },
    freeze: {
      disablePublisher: async () => { order.push("disable-publisher"); return { writesDisabled: true, checksum: checksum("e") } },
      verifyReader: async () => { order.push("verify-reader"); return { role: "mvp_serving_reader", pooledSsl: true, readOnlyTransaction: true, checksum: checksum("f") } },
    },
    certification: { certify: async () => { order.push("certify"); return { passed: true, checksum: checksum("1") } } },
    preview: {
      deploy: async () => { order.push("preview-deploy"); return { deploymentId: "dpl_green", commit: plan.applicationCommit, checksum: checksum("2") } },
      smoke: async () => { order.push("preview-smoke"); return { health: checksum("3"), dashboard: checksum("4"), scanner: checksum("5"), trade: checksum("6"), replay: checksum("7") } },
    },
    receipts: { persist: async () => { order.push("receipt") } },
  },
})
assert.equal(coordinatorResult.release.state, "PROMOTION_READY")
assert.equal(coordinatorResult.windows.length, 3)
assert.deepEqual(order, ["branch", ...plan.incrementalWindows.map((window) => `ingest:${window.start}`), "materialize", "disable-publisher", "verify-reader", "certify", "preview-deploy", "preview-smoke", "receipt"])

process.stdout.write(JSON.stringify({ status: "PASS", governedThrough: discovery.governedThrough, branchName: plan.branchName, lifecycle: coordinatorResult.release.state, productionWrites: 0, servingExposureWrites: 0 }))
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exitCode = 1
})
