import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  ACTIVE_MVP_SERVING_BASELINE,
  acquireRefreshLease,
  assertRefreshLeaseFence,
  classifyFreshness,
  compareCandidateToActive,
  createCandidateDescriptor,
  createRefreshPlan,
  createRefreshPolicy,
  createRefreshUnits,
  createReleaseManifest,
  discoverMvpRefreshMigrations,
  inspectMvpRefreshTarget,
  inspectMvpRefreshConnectionContract,
  isLegalCandidateTransition,
  isLegalRunTransition,
  isLegalUnitTransition,
  mandatoryCommonWatermark,
  planNextMvpRefresh,
  resolveNextEligibleWindow,
  resolveReleaseReference,
  supplementalWatermark,
  verifyReleaseManifest,
  verifyAppliedMvpRefreshMigrationChecksum,
  type SourceWatermark,
} from "@/lib/data-platform/mvp-refresh"

const checksum = (value: unknown) => canonicalChecksum(value)
const watermark = (datasetId: string, mandatory: boolean, observedThrough: string | null, state: SourceWatermark["state"] = "AVAILABLE"): SourceWatermark => Object.freeze({ datasetId, sourceId: `${datasetId}-source`, mandatory, observedThrough, state, reasonCodes: Object.freeze([]), checksum: state === "AVAILABLE" ? checksum({ datasetId, observedThrough }) : null })

async function main() {
  const policy = createRefreshPolicy({ policyVersion: "test/1", finalizationDelayMinutes: 120, overlapHours: 1, maximumCatchupDays: 7, maximumRetries: 3, leaseSeconds: 300 })
  assert.deepEqual(policy, createRefreshPolicy({ policyVersion: "test/1", finalizationDelayMinutes: 120, overlapHours: 1, maximumCatchupDays: 7, maximumRetries: 3, leaseSeconds: 300 }))

  const window = resolveNextEligibleWindow({ activeGovernedThrough: "2026-07-15T00:00:00.000Z", now: "2026-07-16T12:00:00.000Z", finalizationDelayMinutes: 120, overlapHours: 1 })
  assert.equal(window?.requestedStart, "2026-07-15T00:00:00.000Z")
  assert.equal(window?.requestedEnd, "2026-07-16T00:00:00.000Z")
  assert.equal(resolveNextEligibleWindow({ activeGovernedThrough: "2026-07-16T00:00:00.000Z", now: "2026-07-16T01:00:00.000Z", finalizationDelayMinutes: 120, overlapHours: 1 }), null)

  const mandatory = [watermark("ohlcv", true, "2026-07-16T00:00:00.000Z"), watermark("funding", true, "2026-07-15T00:00:00.000Z")]
  const supplemental = [watermark("macro", false, "2026-07-20T00:00:00.000Z")]
  assert.equal(mandatoryCommonWatermark(mandatory), "2026-07-15T00:00:00.000Z")
  assert.equal(supplementalWatermark(supplemental), "2026-07-20T00:00:00.000Z")
  assert.equal(mandatoryCommonWatermark([...mandatory, ...supplemental]), "2026-07-15T00:00:00.000Z")
  assert.equal(mandatoryCommonWatermark([watermark("funding", true, null, "UNAVAILABLE")]), null)

  const freshness = classifyFreshness({ activeGovernedThrough: "2026-07-15T00:00:00.000Z", eligibleThrough: "2026-07-16T00:00:00.000Z", watermarks: [watermark("funding", true, null, "UNAVAILABLE")], candidateActive: false })
  assert.equal(freshness.state, "UNAVAILABLE")
  assert(freshness.reasonCodes.includes("SOURCE_UNAVAILABLE"))
  assert(freshness.reasonCodes.includes("ACTIVE_CORPUS_BEHIND_ELIGIBLE_WINDOW"))

  assert(isLegalRunTransition("PLANNED", "ACQUIRING"))
  assert(!isLegalRunTransition("ACQUIRING", "READY_FOR_RELEASE_REVIEW"))
  assert(isLegalUnitTransition("PENDING", "BLOCKED"))
  assert(!isLegalUnitTransition("BLOCKED", "COMPLETE"))
  assert(!isLegalCandidateTransition("READY_FOR_RELEASE_REVIEW", "RELEASED"))
  assert(isLegalCandidateTransition("READY_FOR_RELEASE_REVIEW", "RELEASED", true))
  assert(isLegalUnitTransition("ACQUIRED", "NORMALIZED"))
  assert(isLegalUnitTransition("COMMITTED", "VALIDATED"))

  const firstLease = acquireRefreshLease(null, { leaseKey: "unit-a", ownerId: "worker-a", now: "2026-07-16T00:00:00.000Z", leaseSeconds: 60 })
  assert(firstLease.acquired)
  const concurrentLease = acquireRefreshLease(firstLease.lease, { leaseKey: "unit-a", ownerId: "worker-b", now: "2026-07-16T00:00:30.000Z", leaseSeconds: 60 })
  assert.equal(concurrentLease.acquired, false)
  const recoveredLease = acquireRefreshLease(firstLease.lease, { leaseKey: "unit-a", ownerId: "worker-b", now: "2026-07-16T00:01:01.000Z", leaseSeconds: 60 })
  assert(recoveredLease.acquired)
  assert.equal(recoveredLease.lease.fencingToken, 2)
  assert.throws(() => assertRefreshLeaseFence(recoveredLease.lease, { ownerId: "worker-a", fencingToken: 1, now: "2026-07-16T00:01:02.000Z" }), /REFRESH_LEASE_FENCE_LOST/)
  assert.doesNotThrow(() => assertRefreshLeaseFence(recoveredLease.lease, { ownerId: "worker-b", fencingToken: 2, now: "2026-07-16T00:01:02.000Z" }))

  assert(window)
  const plan = createRefreshPlan({ policy, activeCorpusId: ACTIVE_MVP_SERVING_BASELINE.corpusId, activeServingChecksum: ACTIVE_MVP_SERVING_BASELINE.servingChecksum, activeGovernedThrough: ACTIVE_MVP_SERVING_BASELINE.governedThrough, window })
  assert.deepEqual(plan, createRefreshPlan({ policy, activeCorpusId: ACTIVE_MVP_SERVING_BASELINE.corpusId, activeServingChecksum: ACTIVE_MVP_SERVING_BASELINE.servingChecksum, activeGovernedThrough: ACTIVE_MVP_SERVING_BASELINE.governedThrough, window }))
  const units = createRefreshUnits(plan, `mrr_${checksum(plan)}`)
  assert.equal(units.length, 24)
  assert.equal(new Set(units.map((unit) => unit.unitId)).size, 24)
  assert.equal(units.filter((unit) => unit.datasetId === "funding").length, 6)

  const candidate = createCandidateDescriptor({ corpusId: `candidate:${checksum("corpus")}`, servingChecksum: checksum("serving"), sourceCorpusId: ACTIVE_MVP_SERVING_BASELINE.corpusId, sourceCorpusChecksum: ACTIVE_MVP_SERVING_BASELINE.servingChecksum, governedThrough: "2026-07-16T00:00:00.000Z", counts: { ...ACTIVE_MVP_SERVING_BASELINE.counts, projections: 876, evidenceSummaries: 90, replaySnapshots: 90 }, mandatoryWatermarks: [watermark("ohlcv", true, "2026-07-16T00:00:00.000Z")], supplementalWatermarks: supplemental, freshness: classifyFreshness({ activeGovernedThrough: ACTIVE_MVP_SERVING_BASELINE.governedThrough, candidateGovernedThrough: "2026-07-16T00:00:00.000Z", eligibleThrough: "2026-07-16T00:00:00.000Z", watermarks: [watermark("ohlcv", true, "2026-07-16T00:00:00.000Z")], candidateActive: false }), limitations: [], lifecycle: "READY_FOR_RELEASE_REVIEW" })
  assert.deepEqual(candidate, createCandidateDescriptor({ corpusId: candidate.corpusId, servingChecksum: candidate.servingChecksum, sourceCorpusId: candidate.sourceCorpusId, sourceCorpusChecksum: candidate.sourceCorpusChecksum, governedThrough: candidate.governedThrough, counts: candidate.counts, mandatoryWatermarks: candidate.mandatoryWatermarks, supplementalWatermarks: candidate.supplementalWatermarks, freshness: candidate.freshness, limitations: candidate.limitations, lifecycle: candidate.lifecycle }))

  const manifest = createReleaseManifest({ releaseChannel: "candidate", corpusId: candidate.corpusId, servingChecksum: candidate.servingChecksum, previousManifestId: null, previousServingChecksum: null, sourceCorpusId: candidate.sourceCorpusId, sourceCorpusChecksum: candidate.sourceCorpusChecksum, generatedAt: "2026-07-16T12:00:00.000Z", governedThrough: candidate.governedThrough, counts: candidate.counts, mandatorySourceWatermarks: candidate.mandatoryWatermarks, supplementalSourceWatermarks: candidate.supplementalWatermarks, freshness: candidate.freshness, limitations: candidate.limitations, exposureEligibility: "ELIGIBLE" })
  assert(verifyReleaseManifest(manifest))
  assert.equal(resolveReleaseReference({ mode: "PINNED_CORPUS", pinned: { corpusId: ACTIVE_MVP_SERVING_BASELINE.corpusId, servingChecksum: ACTIVE_MVP_SERVING_BASELINE.servingChecksum } }).corpusId, ACTIVE_MVP_SERVING_BASELINE.corpusId)
  assert.equal(resolveReleaseReference({ mode: "RELEASE_CHANNEL", channel: "candidate", manifest }).corpusId, candidate.corpusId)
  assert.throws(() => resolveReleaseReference({ mode: "RELEASE_CHANNEL", channel: "production", manifest }), /RELEASE_CHANNEL_MANIFEST_INVALID/)

  const comparison = compareCandidateToActive({ active: { corpusId: ACTIVE_MVP_SERVING_BASELINE.corpusId, servingChecksum: ACTIVE_MVP_SERVING_BASELINE.servingChecksum, governedThrough: ACTIVE_MVP_SERVING_BASELINE.governedThrough, counts: ACTIVE_MVP_SERVING_BASELINE.counts, requiredProjectionIds: ["required-a", "required-b"] }, candidate, candidateProjectionIds: ["required-a"], routeProjectionCountImpact: { dashboard: 0, replay: 1 } })
  assert.deepEqual(comparison.unexpectedDeletions, ["required-b"])
  assert(comparison.blockerReasonCodes.includes("CANDIDATE_VALIDATION_FAILED"))

  const localTarget = ["postgresql", "://", "refresh", ":", "test-only", "@", "localhost", ":5432/", "quantterminal_mvp_refresh_isolated"].join("")
  const target = inspectMvpRefreshTarget(localTarget, {})
  assert.equal(target.safe, true)
  const connectionContract = inspectMvpRefreshConnectionContract(localTarget)
  assert.equal(connectionContract.present, true)
  assert.equal(connectionContract.noSurroundingQuotes, true)
  assert.equal(connectionContract.schemePostgresql, true)
  assert.equal(connectionContract.usernamePresent, true)
  assert.equal(connectionContract.passwordPresent, true)
  assert.equal(connectionContract.expectedDatabase, true)
  assert.equal(connectionContract.localHost, true)
  assert.equal(connectionContract.portPresent, true)
  assert.equal(connectionContract.sslNotForced, true)
  assert.equal(connectionContract.reservedCharactersEncodedSafely, true)
  assert.equal(connectionContract.noWhitespaceOrNewline, true)
  assert.equal(connectionContract.originalPassedWithoutReconstruction, true)
  assert.equal(inspectMvpRefreshTarget(localTarget.replace("localhost", "remote.example"), {}).safe, false)
  assert.equal(inspectMvpRefreshTarget(localTarget.replace("mvp_refresh", "mvp_serving"), {}).safe, false)

  const migrations = await discoverMvpRefreshMigrations()
  assert.equal(migrations.length, 1)
  assert.match(migrations[0].checksum, /^[0-9a-f]{64}$/)
  assert.doesNotThrow(() => verifyAppliedMvpRefreshMigrationChecksum(migrations[0].checksum, migrations[0].checksum))
  assert.throws(() => verifyAppliedMvpRefreshMigrationChecksum(checksum("changed"), migrations[0].checksum), /APPLIED_MVP_REFRESH_MIGRATION_CHECKSUM_MISMATCH/)
  assert(planNextMvpRefresh("2026-07-16T12:00:00.000Z"))

  console.log(JSON.stringify({ status: "PASS", assertions: 58, migrationChecksum: migrations[0].checksum, candidateActivation: false, productionMutation: false }))
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_REFRESH_TEST_FAILED"); process.exitCode = 1 })
