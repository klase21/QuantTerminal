import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { PopulationCandidate, RetrievalAttempt } from "@/lib/data-platform/population"
import { createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter, type D3PostgresClient, type PopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"
const ROLLBACK = "LINEAGE_CERTIFICATION_ROLLBACK"

async function main() {
  const integrated = await createIntegratedBackfillClientsFromEnvironment({
    repositoryRoot: process.cwd(),
    d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-lineage-certification-d2" },
    d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-lineage-certification-d3" },
  })
  try {
    const templateRows = await integrated.d3.sql<Array<Record<string, unknown>>>`
      SELECT c.*,a.run_id,a.provider_id attempt_provider_id,a.provider_snapshot_id attempt_provider_snapshot_id
      FROM population.candidates c
      JOIN control.retrieval_attempts a ON a.attempt_id=c.retrieval_attempt_id
      JOIN control.population_units u ON u.unit_id=c.unit_id
      WHERE u.window_start=${START} AND u.window_end=${END}
      ORDER BY c.created_at,c.candidate_id LIMIT 1`
    const template = templateRows[0]
    assert.ok(template, "an attributable target-window Candidate is required for rollback certification")
    const nonce = randomUUID(), attemptId = `retrieval-attempt-certification:${nonce}`, candidateId = `population-candidate-certification:${nonce}`, at = new Date().toISOString()
    const retrievalAttempt: RetrievalAttempt = Object.freeze({ attemptId, unitId: String(template.unit_id), runId: String(template.run_id), providerId: String(template.attempt_provider_id), providerSnapshotId: String(template.attempt_provider_snapshot_id), requestFingerprint: `lineage-certification:${nonce}`, startedAt: at, completedAt: at, outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: "application/octet-stream", rawByteCount: 0, rawManifestId: String(template.raw_manifest_id), errorClass: null, errorCode: null, retryClassificationId: null })
    const candidate = Object.freeze({ kind: String(template.candidate_kind), candidateId, unitId: String(template.unit_id), retrievalAttemptId: `caller-supplied-id-must-be-ignored:${nonce}`, rawManifestId: String(template.raw_manifest_id), datasetId: String(template.dataset_id), providerId: String(template.provider_id), providerSnapshotId: String(template.provider_snapshot_id), sourceObservationId: `lineage-certification:${nonce}`, sourceObservedAt: at, effectiveAt: at, parserVersion: String(template.parser_version), candidateSchemaVersion: String(template.candidate_schema_version), payload: Object.freeze({ lineageCertification: true }), candidateChecksum: canonicalChecksum({ candidateId, attemptId }), validationStatus: "NOT_EVALUATED", qualityEligibility: "NOT_EVALUATED", normalizationEligibility: "NOT_EVALUATED", createdAt: at }) as unknown as PopulationCandidate
    const input = Object.freeze({ retrievalAttempt, rawObjectChecksum: String(template.candidate_checksum), candidates: Object.freeze([candidate]) })

    let created = false, duplicate = false, persistedParentUsed = false, conflictClosed = false
    try {
      await integrated.d3.transaction(async (sql) => {
        const transactionClient = { ...integrated.d3, sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as D3PostgresClient
        const adapter: PopulationPostgresAdapter = createPopulationPostgresAdapter(transactionClient)
        const first = await adapter.persistBoundedAcquisitionResult(input)
        const second = await adapter.persistBoundedAcquisitionResult({ ...input, retrievalAttempt: { ...retrievalAttempt, startedAt: new Date(Date.parse(at) + 1_000).toISOString(), completedAt: new Date(Date.parse(at) + 1_000).toISOString() } })
        created = first.transactionOutcome === "CREATED"
        duplicate = second.transactionOutcome === "DUPLICATE"
        const rows = await sql<{ readonly retrieval_attempt_id: string }[]>`SELECT retrieval_attempt_id FROM population.candidates WHERE candidate_id=${candidateId}`
        persistedParentUsed = rows[0]?.retrieval_attempt_id === attemptId
        const conflict = await adapter.persistBoundedAcquisitionResult({ ...input, candidates: Object.freeze([{ ...candidate, candidateChecksum: "f".repeat(64) }]) })
        conflictClosed = conflict.transactionOutcome === "CONFLICT"
        throw new Error(ROLLBACK)
      })
    } catch (error) {
      if (!(error instanceof Error) || error.message !== ROLLBACK) throw error
    }

    const retained = await integrated.d3.sql<{ readonly attempts: number; readonly candidates: number }[]>`SELECT (SELECT count(*)::int FROM control.retrieval_attempts WHERE attempt_id=${attemptId}) attempts,(SELECT count(*)::int FROM population.candidates WHERE candidate_id=${candidateId}) candidates`
    assert.deepEqual(retained[0], { attempts: 0, candidates: 0 })
    assert.equal(created, true)
    assert.equal(duplicate, true)
    assert.equal(persistedParentUsed, true)
    assert.equal(conflictClosed, true)

    const probeNonce = randomUUID(), probeAttemptId = `retrieval-attempt-probe-suite:${probeNonce}`, probeCandidateId = `population-candidate-probe-suite:${probeNonce}`
    const probe = await createPopulationPostgresAdapter(integrated.d3).probeBoundedAcquisitionLineage({
      retrievalAttempt: { ...retrievalAttempt, attemptId: probeAttemptId, requestFingerprint: `lineage-probe-suite:${probeNonce}` },
      rawObjectChecksum: input.rawObjectChecksum,
      candidates: Object.freeze([{ ...candidate, candidateId: probeCandidateId, candidateChecksum: canonicalChecksum({ probeCandidateId, probeAttemptId }) }]),
    })
    assert.deepEqual(probe, { passed: true, retainedRows: 0 })

    const missingNonce = randomUUID(), missingUnitId = `missing-population-unit:${missingNonce}`, missingAttemptId = `missing-retrieval-attempt:${missingNonce}`, missingCandidateId = `missing-candidate:${missingNonce}`
    await assert.rejects(createPopulationPostgresAdapter(integrated.d3).persistBoundedAcquisitionResult({
      retrievalAttempt: { ...retrievalAttempt, attemptId: missingAttemptId, unitId: missingUnitId },
      rawObjectChecksum: input.rawObjectChecksum,
      candidates: Object.freeze([{ ...candidate, candidateId: missingCandidateId, unitId: missingUnitId, candidateChecksum: canonicalChecksum({ missingCandidateId }) }]),
    }), /foreign key|violates/i)
    const missingChildren = await integrated.d3.sql<{ readonly count: number }[]>`SELECT count(*)::int count FROM population.candidates WHERE candidate_id=${missingCandidateId}`
    assert.equal(missingChildren[0]?.count, 0)

    const adapter = createPopulationPostgresAdapter(integrated.d3)
    const beforeRecovery = await adapter.auditBoundedAcquisitionLineage(START, END, "mvp-live-resume")
    const doge = beforeRecovery.units.find((unit) => unit.dataset === "funding" && unit.instrument === "DOGEUSDT")
    const eth = beforeRecovery.units.find((unit) => unit.dataset === "open-interest" && unit.instrument === "ETHUSDT")
    assert.ok(doge && !doge.activeLease && doge.retrievalAttempts === 1 && doge.candidates === 3)
    assert.ok(eth && !eth.activeLease && eth.retrievalAttempts === 1 && eth.candidates === 2)
    const beforeCounts = await integrated.d3.sql<{ readonly events: number; readonly checkpoints: number; readonly attempts: number; readonly candidates: number }[]>`SELECT (SELECT count(*)::int FROM control.population_unit_events WHERE unit_id=ANY(${integrated.d3.sql.array([doge.unitId,eth.unitId])})) events,(SELECT count(*)::int FROM control.population_checkpoints WHERE unit_id=ANY(${integrated.d3.sql.array([doge.unitId,eth.unitId])})) checkpoints,(SELECT count(*)::int FROM control.retrieval_attempts WHERE unit_id=ANY(${integrated.d3.sql.array([doge.unitId,eth.unitId])})) attempts,(SELECT count(*)::int FROM population.candidates WHERE unit_id=ANY(${integrated.d3.sql.array([doge.unitId,eth.unitId])})) candidates`
    let duplicateEvents = 0, conflictEvents = 0, failureDuplicates = 0, releasedLeases = 0, dogeStage = "", ethStage = "", dogeFence = 0, ethFence = 0, secondDogeFence = 0, secondEthFence = 0
    try {
      await integrated.d3.transaction(async (sql) => {
        const transactionClient = { ...integrated.d3, sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as D3PostgresClient
        const transactionAdapter = createPopulationPostgresAdapter(transactionClient)
        const reconcileTwice = async (unit: typeof doge, expectedStage: "CANDIDATE_LINEAGE" | "CANONICAL_COMMIT") => {
          assert.ok(unit)
          const firstAt = new Date().toISOString()
          const first = await transactionAdapter.reconcileBoundedAcquisitionResume({ unitId: unit.unitId, ownerId: "mvp-lineage-certification", now: firstAt, expiresAt: new Date(Date.parse(firstAt) + 60_000).toISOString() })
          assert.ok(first); assert.equal(first.stage, expectedStage)
          const nextState = expectedStage === "CANDIDATE_LINEAGE" ? "RAW_PERSISTED" : "CANDIDATES_READY"
          const eventInput = { eventId: `population-event:resume-stage:${unit.unitId}:${first.lease.fencingToken}:${expectedStage}:${first.lineageChecksum}`, unitId: unit.unitId, runId: first.runId, eventType: "RESUME_STAGE_RESTORED", previousState: "LEASED", nextState, fencingToken: first.lease.fencingToken, actorId: "mvp-lineage-certification", occurredAt: firstAt, details: { stage: expectedStage, lineageChecksum: first.lineageChecksum }, leaseId: first.lease.leaseId, ownerId: "mvp-lineage-certification" }
          const exact = await transactionAdapter.transitionUnitIdempotently(eventInput)
          const conflict = await transactionAdapter.transitionUnitIdempotently({ ...eventInput, details: { ...eventInput.details, altered: true } })
          if (exact.status === "DUPLICATE") duplicateEvents++
          if (conflict.status === "CONFLICT") conflictEvents++
          const failedAt = new Date(Date.parse(firstAt) + 1_000).toISOString()
          const failed = await transactionAdapter.recordRecoverableLineageFailure({ unitId: unit.unitId, leaseId: first.lease.leaseId, ownerId: "mvp-lineage-certification", fencingToken: first.lease.fencingToken, classification: "CERTIFICATION_LINEAGE_FAILURE", at: failedAt })
          const failedAgain = await transactionAdapter.recordRecoverableLineageFailure({ unitId: unit.unitId, leaseId: first.lease.leaseId, ownerId: "mvp-lineage-certification", fencingToken: first.lease.fencingToken, classification: "CERTIFICATION_LINEAGE_FAILURE", at: failedAt })
          assert.equal(failed.status, "CREATED"); if (failedAgain.status === "DUPLICATE") failureDuplicates++
          const secondAt = new Date(Date.parse(firstAt) + 2_000).toISOString()
          const second = await transactionAdapter.reconcileBoundedAcquisitionResume({ unitId: unit.unitId, ownerId: "mvp-lineage-certification", now: secondAt, expiresAt: new Date(Date.parse(secondAt) + 60_000).toISOString() })
          assert.ok(second); assert.equal(second.stage, expectedStage); assert.equal(second.lease.fencingToken > first.lease.fencingToken, true)
          await transactionAdapter.recordRecoverableLineageFailure({ unitId: unit.unitId, leaseId: second.lease.leaseId, ownerId: "mvp-lineage-certification", fencingToken: second.lease.fencingToken, classification: "CERTIFICATION_SECOND_FAILURE", at: new Date(Date.parse(secondAt) + 1_000).toISOString() })
          const state = await sql<{ readonly current_state: string; readonly active_lease_id: string | null }[]>`SELECT current_state::text,active_lease_id FROM control.population_units WHERE unit_id=${unit.unitId}`
          if (state[0]?.current_state === "RETRYABLE" && state[0]?.active_lease_id === null) releasedLeases++
          return [first, second] as const
        }
        const dogeRuns = await reconcileTwice(doge, "CANONICAL_COMMIT"), ethRuns = await reconcileTwice(eth, "CANONICAL_COMMIT")
        dogeStage = dogeRuns[0].stage; ethStage = ethRuns[0].stage; dogeFence = dogeRuns[0].lease.fencingToken; secondDogeFence = dogeRuns[1].lease.fencingToken; ethFence = ethRuns[0].lease.fencingToken; secondEthFence = ethRuns[1].lease.fencingToken
        const durable = await sql<{ readonly attempts: number; readonly candidates: number }[]>`SELECT (SELECT count(*)::int FROM control.retrieval_attempts WHERE unit_id=ANY(${sql.array([doge.unitId,eth.unitId])})) attempts,(SELECT count(*)::int FROM population.candidates WHERE unit_id=ANY(${sql.array([doge.unitId,eth.unitId])})) candidates`
        assert.deepEqual(durable[0], { attempts: 2, candidates: 5 })
        throw new Error(ROLLBACK)
      })
    } catch (error) { if (!(error instanceof Error) || error.message !== ROLLBACK) throw error }
    const afterCounts = await integrated.d3.sql<{ readonly events: number; readonly checkpoints: number; readonly attempts: number; readonly candidates: number }[]>`SELECT (SELECT count(*)::int FROM control.population_unit_events WHERE unit_id=ANY(${integrated.d3.sql.array([doge.unitId,eth.unitId])})) events,(SELECT count(*)::int FROM control.population_checkpoints WHERE unit_id=ANY(${integrated.d3.sql.array([doge.unitId,eth.unitId])})) checkpoints,(SELECT count(*)::int FROM control.retrieval_attempts WHERE unit_id=ANY(${integrated.d3.sql.array([doge.unitId,eth.unitId])})) attempts,(SELECT count(*)::int FROM population.candidates WHERE unit_id=ANY(${integrated.d3.sql.array([doge.unitId,eth.unitId])})) candidates`
    assert.deepEqual(afterCounts[0], beforeCounts[0])
    assert.deepEqual({ duplicateEvents, conflictEvents, failureDuplicates, releasedLeases }, { duplicateEvents: 2, conflictEvents: 2, failureDuplicates: 2, releasedLeases: 2 })
    assert.equal(dogeStage, "CANONICAL_COMMIT"); assert.equal(ethStage, "CANONICAL_COMMIT")
    assert.equal(secondDogeFence > dogeFence && secondEthFence > ethFence, true)

    console.log(JSON.stringify({ status: "PASS", retrievalBeforeCandidate: true, callerRetrievalIdIgnored: true, retrievalFailurePreventedCandidate: true, exactDuplicate: true, immutableConflict: "CLOSED", rollbackRetainedRows: 0, preflightProbeRetainedRows: 0, dogeResumeStage: dogeStage, ethResumeStage: ethStage, resumeReconciliationRuns: 2, duplicateEventException: false, eventDuplicates: duplicateEvents, eventConflicts: conflictEvents, retrievalObjectCandidateDuplicates: 0, failureLeasesReleased: releasedLeases, staleFenceAdvanced: true, productionMutation: false }))
  } finally {
    await integrated.shutdown()
  }
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
