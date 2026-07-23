import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { expandPopulationUnits, type PopulationCandidate, type PopulationJob } from "@/lib/data-platform/population"
import { fundingCommand } from "@/tests/data-platform/persistence/postgres/fixtures"
import { createD3Harness, d3Url } from "./harness"
import { job, jobRequest, NOW, PROFILE } from "./fixtures"

const OWNER_A = "integrity-worker-a"
const OWNER_B = "integrity-worker-b"

function plus(seconds: number): string {
  return new Date(Date.parse(NOW) + seconds * 1_000).toISOString()
}

async function scenario(label: string, h: Awaited<ReturnType<typeof createD3Harness>>) {
  const request = jobRequest(`integrity-${label}`)
  const created = await h.adapter.createJob(request)
  assert.equal(created.status, "CREATED")
  const populationJob: PopulationJob = { ...job(request), jobId: created.jobId, request }
  const run = await h.adapter.createRun(created.jobId, 1, plus(1))
  const units = expandPopulationUnits(populationJob, [{
    profileId: PROFILE.profileId,
    profileVersion: PROFILE.profileVersion,
    datasetId: "funding",
    providerId: "d2-test-provider",
    providerSnapshotId: "d2-test-provider-registry-v1",
    policyVersionId: "d2-test-funding-policy-v1",
    venue: "BINANCE",
    subjectOrSymbol: `SUBJECT_${label}`,
    windowStart: plus(10),
    windowEnd: plus(20),
    resolution: "8h_event",
    partitionKey: label,
    requestFingerprint: request.requestIdentity,
    requestParameters: { label },
    required: true,
  }], plus(1))
  await h.adapter.expandUnits(units)
  return { jobId: created.jobId, runId: run.runId, unit: units[0]! }
}

function candidate(input: { unitId: string; attemptId: string; rawManifestId: string; candidateId: string }): PopulationCandidate {
  const payload = Object.freeze({
    symbol: "BTCUSDT",
    canonicalInstrumentId: "binance-usdm-perpetual:BTC-USDT",
    marketType: "USD_M_FUTURES" as const,
    fundingRate: "0.0001",
    fundingTime: NOW,
    fundingIntervalHours: 8,
  })
  return Object.freeze({
    kind: "FUNDING" as const,
    candidateId: input.candidateId,
    unitId: input.unitId,
    retrievalAttemptId: input.attemptId,
    rawManifestId: input.rawManifestId,
    datasetId: "funding",
    providerId: "d2-test-provider",
    providerSnapshotId: "d2-test-provider-registry-v1",
    sourceObservationId: `source:${input.candidateId}`,
    sourceObservedAt: NOW,
    effectiveAt: NOW,
    parserVersion: "integrity-fixture-v1",
    candidateSchemaVersion: "1",
    payload,
    candidateChecksum: canonicalChecksum(payload),
    validationStatus: "ELIGIBLE" as const,
    qualityEligibility: "ELIGIBLE" as const,
    normalizationEligibility: "ELIGIBLE" as const,
    createdAt: plus(2),
  })
}

async function main() {
  if (!d3Url()) {
    console.log("MVP PIPELINE INTEGRITY POSTGRES SUITE: BLOCKED")
    console.log("[BLOCKED] D3_ISOLATED_POSTGRES_URL is not configured.")
    process.exitCode = 2
    return
  }
  const h = await createD3Harness()
  try {
    await h.resetAll()
    await h.migrateAll()
    await h.seed()

    const fixture = await scenario("stale-fence", h)
    const command = fundingCommand({ suffix: "pipeline-integrity" })
    await h.d2Adapter.registerRawObjectManifest(command.rawObject)
    const first = await h.adapter.claimUnit(OWNER_A, fixture.runId, plus(30), plus(40))
    assert.ok(first)
    await h.adapter.advanceUnit(first.unitId, first.leaseId, OWNER_A, first.fencingToken, "RETRIEVING", "integrity-retrieving-a", plus(31))
    await h.adapter.expireLease(first.unitId, first.leaseId, first.fencingToken, plus(41))
    const second = await h.adapter.claimUnit(OWNER_B, fixture.runId, plus(42), plus(120))
    assert.ok(second)
    assert.ok(second.fencingToken > first.fencingToken)

    const attemptId = "integrity-attempt"
    const value = candidate({ unitId: first.unitId, attemptId, rawManifestId: command.rawObject.objectId, candidateId: "integrity-candidate" })
    const staleLease = { leaseId: first.leaseId, ownerId: OWNER_A, fencingToken: first.fencingToken, occurredAt: plus(43) }
    const staleWrites = [
      () => h.adapter.heartbeat(first.unitId, first.leaseId, OWNER_A, first.fencingToken, plus(43), plus(130)),
      () => h.adapter.persistBoundedAcquisitionResult({
        retrievalAttempt: { attemptId, unitId: first.unitId, runId: fixture.runId, providerId: "d2-test-provider", providerSnapshotId: "d2-test-provider-registry-v1", requestFingerprint: "integrity", startedAt: plus(31), completedAt: plus(32), outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: "application/json", rawByteCount: 1, rawManifestId: command.rawObject.objectId, errorClass: null, errorCode: null, retryClassificationId: null },
        rawObjectChecksum: command.rawObject.contentHash,
        candidates: [value],
        lease: staleLease,
      }),
      () => h.adapter.prepareCanonicalSubmission({
        submissionId: "stale-submission",
        candidateId: value.candidateId,
        idempotencyKey: command.idempotencyKey,
        unitId: first.unitId,
        retrievalAttemptId: attemptId,
        rawManifestId: command.rawObject.objectId,
        expectedCanonicalRecordId: command.fact.identity.canonicalRecordId,
        expectedRecordVersion: command.targetRecordVersion,
        expectedFactChecksum: command.fact.checksum,
        commandChecksum: canonicalChecksum(command),
        lease: staleLease,
      }),
      () => h.adapter.checkpoint({ checkpointId: "stale-checkpoint", jobId: fixture.jobId, runId: fixture.runId, unitId: first.unitId, fencingToken: first.fencingToken, checkpointType: "CANONICAL_BOUNDARY", completedStage: "COMPLETED", rawManifestId: command.rawObject.objectId, candidateCursor: value.candidateId, canonicalSubmissionId: "stale-submission", lastOutcomeId: "stale-outcome", createdAt: plus(43) }, first.leaseId, OWNER_A),
      () => h.adapter.advanceUnit(first.unitId, first.leaseId, OWNER_A, first.fencingToken, "COMPLETED", "stale-complete", plus(43)),
    ]
    for (const write of staleWrites) await assert.rejects(write, /STALE_FENCING_TOKEN/)
    const unauthorized = await h.d3.sql<{ readonly attempts: number; readonly candidates: number; readonly submissions: number; readonly outcomes: number; readonly checkpoints: number }[]>`
      SELECT
        (SELECT count(*)::int FROM control.retrieval_attempts WHERE attempt_id=${attemptId}) attempts,
        (SELECT count(*)::int FROM population.candidates WHERE candidate_id=${value.candidateId}) candidates,
        (SELECT count(*)::int FROM population.canonical_submissions WHERE submission_id='stale-submission') submissions,
        (SELECT count(*)::int FROM control.population_outcomes WHERE outcome_id='stale-outcome') outcomes,
        (SELECT count(*)::int FROM control.population_checkpoints WHERE checkpoint_id='stale-checkpoint') checkpoints`
    assert.deepEqual(unauthorized[0], { attempts: 0, candidates: 0, submissions: 0, outcomes: 0, checkpoints: 0 })

    const currentLease = { leaseId: second.leaseId, ownerId: OWNER_B, fencingToken: second.fencingToken, occurredAt: plus(44) }
    await h.adapter.advanceUnit(second.unitId, second.leaseId, OWNER_B, second.fencingToken, "RETRIEVING", "integrity-retrieving-b", plus(44))
    await h.adapter.persistBoundedAcquisitionResult({
      retrievalAttempt: { attemptId, unitId: second.unitId, runId: fixture.runId, providerId: "d2-test-provider", providerSnapshotId: "d2-test-provider-registry-v1", requestFingerprint: "integrity", startedAt: plus(31), completedAt: plus(32), outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: "application/json", rawByteCount: 1, rawManifestId: command.rawObject.objectId, errorClass: null, errorCode: null, retryClassificationId: null },
      rawObjectChecksum: command.rawObject.contentHash,
      candidates: [value],
      lease: currentLease,
    })
    await h.adapter.advanceUnit(second.unitId, second.leaseId, OWNER_B, second.fencingToken, "RAW_PERSISTED", "integrity-raw-b", plus(45))
    await h.adapter.advanceUnit(second.unitId, second.leaseId, OWNER_B, second.fencingToken, "CANDIDATES_READY", "integrity-candidate-b", plus(46))
    await h.adapter.advanceUnit(second.unitId, second.leaseId, OWNER_B, second.fencingToken, "PROCESSING", "integrity-processing-b", plus(47))

    const submissionId = "integrity-submission"
    const outcomeId = "integrity-outcome"
    await h.adapter.prepareCanonicalSubmission({
      submissionId,
      candidateId: value.candidateId,
      idempotencyKey: command.idempotencyKey,
      unitId: second.unitId,
      retrievalAttemptId: attemptId,
      rawManifestId: command.rawObject.objectId,
      expectedCanonicalRecordId: command.fact.identity.canonicalRecordId,
      expectedRecordVersion: command.targetRecordVersion,
      expectedFactChecksum: command.fact.checksum,
      commandChecksum: canonicalChecksum(command),
      lease: { ...currentLease, occurredAt: plus(48) },
    })
    await h.adapter.markCanonicalCommitRequested(submissionId, second.unitId, { ...currentLease, occurredAt: plus(49) })
    const result = await h.d2Adapter.executeCanonicalCommit(command)
    assert.equal(result.status, "SUCCESS")
    const recordInput = { jobId: fixture.jobId, runId: fixture.runId, unitId: second.unitId, candidateId: value.candidateId, retrievalAttemptId: attemptId, rawManifestId: command.rawObject.objectId, submissionId, leaseId: second.leaseId, ownerId: OWNER_B, fencingToken: second.fencingToken, result, outcomeId, createdAt: plus(50) }
    await h.adapter.recordIntermediateD2Result(recordInput)
    await h.adapter.recordIntermediateD2Result(recordInput)
    const beforeCheckpoint = await h.adapter.inspectCanonicalConsistency(submissionId)
    assert.deepEqual(beforeCheckpoint.reasons, ["OUTCOME_WITHOUT_CHECKPOINT"])

    const checkpointId = "integrity-canonical-checkpoint"
    await h.adapter.checkpoint({ checkpointId, jobId: fixture.jobId, runId: fixture.runId, unitId: second.unitId, fencingToken: second.fencingToken, checkpointType: "CANONICAL_BOUNDARY", completedStage: "COMPLETED", rawManifestId: command.rawObject.objectId, candidateCursor: value.candidateId, canonicalSubmissionId: submissionId, lastOutcomeId: outcomeId, createdAt: plus(51) }, second.leaseId, OWNER_B)
    const complete = await h.adapter.inspectCanonicalConsistency(submissionId)
    assert.equal(complete.consistent, true)
    assert.equal(complete.submissionState, "CHECKPOINT_RECORDED")
    const counts = await h.d3.sql<{ readonly events: number; readonly outcomes: number; readonly checkpoints: number }[]>`
      SELECT
        (SELECT count(*)::int FROM population.canonical_submission_events WHERE submission_id=${submissionId}) events,
        (SELECT count(*)::int FROM control.population_outcomes WHERE submission_id=${submissionId}) outcomes,
        (SELECT count(*)::int FROM control.population_checkpoints WHERE canonical_submission_id=${submissionId}) checkpoints`
    assert.deepEqual(counts[0], { events: 5, outcomes: 1, checkpoints: 1 })

    const missingSnapshot = { ...command.rawObject, objectId: "integrity-missing-snapshot-object", providerSnapshotId: "missing-provider-snapshot", contentHash: "a".repeat(64) }
    const missingSnapshotResult = await h.d2Adapter.registerRawObjectManifest(missingSnapshot)
    assert.ok(missingSnapshotResult.status === "REJECTED" || missingSnapshotResult.status === "CONFLICT")
    const missingRaw = await h.d2.sql<{ readonly count: number }[]>`SELECT count(*)::int count FROM raw.objects WHERE object_id=${missingSnapshot.objectId}`
    assert.equal(missingRaw[0]?.count, 0)

    console.log("MVP PIPELINE INTEGRITY POSTGRES SUITE: PASS")
    console.log("[PASS] stale lease blocked heartbeat, lineage, submission, checkpoint, and completion")
    console.log("[PASS] expired worker produced 0 unauthorized canonical effects")
    console.log("[PASS] reclaim fencing token increased monotonically")
    console.log("[PASS] D2 result and Population outcome reconciled idempotently")
    console.log("[PASS] checkpoint followed durable outcome")
    console.log("[PASS] missing provider snapshot blocked dependent raw persistence")
  } finally {
    try { await h.resetAll() } finally { await h.shutdown() }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
