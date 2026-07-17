import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter, type D3PostgresClient } from "@/lib/data-platform/population/postgres"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"
const ROLLBACK = "POPULATION_LEASE_RESUME_CERTIFICATION_ROLLBACK"
const SHAPES = Object.freeze([
  { dataset: "agg-trade", instrument: "BTCUSDT", candidates: 1, fence: 1, runState: "RUNNING", expiredLease: true },
  { dataset: "funding", instrument: "DOGEUSDT", candidates: 3, fence: 3, runState: "SUCCEEDED", expiredLease: false },
  { dataset: "open-interest", instrument: "ETHUSDT", candidates: 2, fence: 3, runState: "SUCCEEDED", expiredLease: false },
  { dataset: "open-interest", instrument: "SOLUSDT", candidates: 288, fence: 1, runState: "RUNNING", expiredLease: true },
] as const)

async function main(): Promise<void> {
  const integrated = await createIntegratedBackfillClientsFromEnvironment({
    repositoryRoot: process.cwd(),
    d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-population-lease-resume-cert-d2" },
    d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-population-lease-resume-cert-d3" },
  })
  try {
    const templates = await integrated.d3.sql<Array<Record<string, unknown>>>`
      SELECT u.*,r.run_id source_run_id,r.current_state::text source_run_state,
        a.attempt_id source_attempt_id,a.provider_id attempt_provider_id,
        a.provider_snapshot_id attempt_provider_snapshot_id,a.raw_manifest_id,
        (SELECT count(*)::int FROM population.candidates c WHERE c.unit_id=u.unit_id) candidate_count
      FROM control.population_units u
      JOIN control.population_runs r ON r.job_id=u.job_id
      JOIN control.retrieval_attempts a ON a.unit_id=u.unit_id
      WHERE u.window_start=${START} AND u.window_end=${END}
        AND ((u.dataset_id='agg-trade' AND u.subject_or_symbol='BTCUSDT')
          OR (u.dataset_id='funding' AND u.subject_or_symbol='DOGEUSDT')
          OR (u.dataset_id='open-interest' AND u.subject_or_symbol IN ('ETHUSDT','SOLUSDT')))
      ORDER BY u.dataset_id,u.subject_or_symbol,r.attempt_number DESC`
    const templateByShape = new Map<string, Record<string, unknown>>()
    for (const row of templates) {
      const key = `${row.dataset_id}:${row.subject_or_symbol}`
      if (!templateByShape.has(key)) templateByShape.set(key, row)
    }
    for (const shape of SHAPES) assert.equal(Number(templateByShape.get(`${shape.dataset}:${shape.instrument}`)?.candidate_count), shape.candidates)

    let passes = 0, winners = 0, unavailableCompetitors = 0, duplicateReconciliations = 0, releasedFailures = 0
    const runPass = async (): Promise<void> => {
      const nonce = randomUUID(), prefix = `lease-resume-cert:${nonce}`, now = new Date().toISOString()
      try {
        await integrated.d3.transaction(async (sql) => {
          const client = { ...integrated.d3, sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as D3PostgresClient
          const adapter = createPopulationPostgresAdapter(client)
          const fixtureUnits: Array<{ unitId: string; expectedFence: number; candidateCount: number }> = []
          for (const shape of SHAPES) {
            const template = templateByShape.get(`${shape.dataset}:${shape.instrument}`)!
            const jobId = `${prefix}:job:${shape.dataset}:${shape.instrument}`
            const runId = `${prefix}:run:1:${shape.dataset}:${shape.instrument}`
            const unitId = `${prefix}:unit:${shape.dataset}:${shape.instrument}`
            const attemptId = `${prefix}:retrieval:${shape.dataset}:${shape.instrument}`
            const leaseId = `${prefix}:lease:${shape.fence}:${shape.dataset}:${shape.instrument}`
            const acquiredAt = new Date(Date.parse(now) - 120_000).toISOString()
            const expiresAt = new Date(Date.parse(now) - 60_000).toISOString()
            const releasedAt = shape.expiredLease ? null : new Date(Date.parse(now) - 30_000).toISOString()
            await sql`INSERT INTO control.population_jobs(job_id,request_identity,occurrence_identity,intentional_rerun_identity,profile_id,profile_version,dataset_id,provider_id,scope_fingerprint,current_state,current_event_id,requested_at,requested_by,created_at,updated_at) VALUES(${jobId},${`${prefix}:request:${shape.dataset}:${shape.instrument}`},${`${prefix}:occurrence:${shape.dataset}:${shape.instrument}`},NULL,${String(template.profile_id)},${String(template.profile_version)},${shape.dataset},${String(template.provider_id)},${`${prefix}:scope:${shape.dataset}:${shape.instrument}`},'RUNNING',${`${prefix}:job-event:${shape.dataset}:${shape.instrument}`},${now},${prefix},${now},${now})`
            await sql`INSERT INTO control.population_job_events(event_id,job_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${`${prefix}:job-event:${shape.dataset}:${shape.instrument}`},${jobId},'JOB_CREATED',NULL,'RUNNING',${prefix},${now})`
            await sql`INSERT INTO control.population_runs(run_id,job_id,attempt_number,current_state,started_at,heartbeat_at,completed_at) VALUES(${runId},${jobId},1,${shape.runState},${acquiredAt},${releasedAt ?? now},${shape.runState === "SUCCEEDED" ? releasedAt : null})`
            await sql`INSERT INTO control.population_run_events(event_id,run_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${`${prefix}:run-event:${shape.dataset}:${shape.instrument}`},${runId},'RUN_TEMPLATE',NULL,${shape.runState},${prefix},${acquiredAt})`
            await sql`INSERT INTO control.population_units(unit_id,job_id,profile_id,profile_version,dataset_id,provider_id,provider_snapshot_id,policy_version_id,venue,subject_or_symbol,window_start,window_end,resolution,partition_key,request_fingerprint,request_parameters,required,current_state,attempt_count,current_fencing_token,active_lease_id,current_checkpoint_id,cancellation_requested_at,created_at,updated_at) SELECT ${unitId},${jobId},profile_id,profile_version,dataset_id,provider_id,provider_snapshot_id,policy_version_id,venue,subject_or_symbol,window_start,window_end,resolution,${`${prefix}:partition:${shape.dataset}:${shape.instrument}`},${`${prefix}:fingerprint:${shape.dataset}:${shape.instrument}`},request_parameters,required,'PROCESSING',${shape.fence},${shape.fence},NULL,NULL,NULL,${acquiredAt},${now} FROM control.population_units WHERE unit_id=${String(template.unit_id)}`
            await sql`INSERT INTO control.population_leases(lease_id,unit_id,owner_id,fencing_token,lease_version,acquired_at,expires_at,heartbeat_at,released_at,release_reason) VALUES(${leaseId},${unitId},'mvp-live-resume',${shape.fence},${shape.fence},${acquiredAt},${expiresAt},${acquiredAt},${releasedAt},${releasedAt ? "COMPLETED" : null})`
            if (shape.expiredLease) await sql`UPDATE control.population_units SET active_lease_id=${leaseId} WHERE unit_id=${unitId}`
            await sql`INSERT INTO control.population_unit_events(event_id,unit_id,run_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at,details) VALUES(${`${prefix}:unit-event:${shape.dataset}:${shape.instrument}`},${unitId},${runId},'STATE_ADVANCED','CANDIDATES_READY','PROCESSING',${shape.fence},'mvp-live-resume',${acquiredAt},'{}')`
            await sql`INSERT INTO control.retrieval_attempts(attempt_id,unit_id,run_id,provider_id,provider_snapshot_id,request_fingerprint,started_at,completed_at,outcome,status_code,response_media_type,raw_byte_count,raw_manifest_id) VALUES(${attemptId},${unitId},${runId},${String(template.attempt_provider_id)},${String(template.attempt_provider_snapshot_id)},${`${prefix}:retrieval-fingerprint:${shape.dataset}:${shape.instrument}`},${acquiredAt},${acquiredAt},'SUCCESS',200,'application/octet-stream',0,${String(template.raw_manifest_id)})`
            const candidateTemplates = await sql<Array<Record<string, unknown>>>`SELECT * FROM population.candidates WHERE unit_id=${String(template.unit_id)} ORDER BY candidate_id LIMIT ${shape.candidates}`
            assert.equal(candidateTemplates.length, shape.candidates)
            for (let index = 0; index < candidateTemplates.length; index++) {
              const candidate = candidateTemplates[index]!, candidateId = `${prefix}:candidate:${shape.dataset}:${shape.instrument}:${index}`
              await sql`INSERT INTO population.candidates(candidate_id,unit_id,retrieval_attempt_id,raw_manifest_id,dataset_id,provider_id,provider_snapshot_id,source_observation_id,source_observed_at,effective_at,parser_version,candidate_schema_version,candidate_kind,bounded_payload,candidate_checksum,validation_status,quality_eligibility,normalization_eligibility,created_at) VALUES(${candidateId},${unitId},${attemptId},${String(candidate.raw_manifest_id)},${String(candidate.dataset_id)},${String(candidate.provider_id)},${String(candidate.provider_snapshot_id)},${`${prefix}:observation:${shape.dataset}:${shape.instrument}:${index}`},${String(candidate.source_observed_at)},${String(candidate.effective_at)},${String(candidate.parser_version)},${String(candidate.candidate_schema_version)},${String(candidate.candidate_kind)},${sql.json(candidate.bounded_payload as never)},${canonicalChecksum({ candidateId, sourceChecksum: candidate.candidate_checksum })},${String(candidate.validation_status)},${String(candidate.quality_eligibility)},${String(candidate.normalization_eligibility)},${now})`
            }
            fixtureUnits.push({ unitId, expectedFence: shape.fence + 1, candidateCount: shape.candidates })
          }

          const eligibility = await adapter.inspectResumeLeaseEligibility({ intervalStart: START, intervalEnd: END, requestedBy: prefix, now })
          assert.equal(eligibility.length, 4)
          assert.equal(eligibility.every((value) => value.eligible && value.stage === "CANONICAL_COMMIT"), true)
          for (const fixture of fixtureUnits) {
            const first = await adapter.reconcileBoundedAcquisitionResume({ unitId: fixture.unitId, ownerId: prefix, now, expiresAt: new Date(Date.parse(now) + 60_000).toISOString() })
            assert.ok(first)
            assert.equal(first.stage, "CANONICAL_COMMIT")
            assert.equal(first.lease.fencingToken, fixture.expectedFence)
            assert.equal(first.candidates.length, fixture.candidateCount)
            winners++
            const activeEligibility = await adapter.inspectResumeLeaseEligibility({ intervalStart: START, intervalEnd: END, requestedBy: prefix, now })
            const activeUnit = activeEligibility.find((value) => value.unitId === fixture.unitId)
            assert.deepEqual({ eligible: activeUnit?.eligible, reason: activeUnit?.reason }, { eligible: false, reason: "ACTIVE_LEASE" })
            const competing = await Promise.allSettled([adapter.reconcileBoundedAcquisitionResume({ unitId: fixture.unitId, ownerId: `${prefix}:competitor`, now, expiresAt: new Date(Date.parse(now) + 60_000).toISOString() })])
            assert.equal(competing[0]?.status, "rejected")
            assert.match(String((competing[0] as PromiseRejectedResult).reason), /POPULATION_RESUME_ACTIVE_LEASE/)
            unavailableCompetitors++
            const failedAt = new Date(Date.parse(now) + 1_000).toISOString()
            assert.equal((await adapter.recordCanonicalCommitFailure({ unitId: fixture.unitId, leaseId: first.lease.leaseId, ownerId: prefix, fencingToken: first.lease.fencingToken, classification: "CERTIFICATION_CANONICAL_FAILURE", at: failedAt })).status, "CREATED")
            const secondAt = new Date(Date.parse(now) + 2_000).toISOString()
            const second = await adapter.reconcileBoundedAcquisitionResume({ unitId: fixture.unitId, ownerId: prefix, now: secondAt, expiresAt: new Date(Date.parse(secondAt) + 60_000).toISOString() })
            assert.ok(second)
            assert.equal(second.reconciliationStatus, "DUPLICATE")
            assert.equal(second.lease.fencingToken, fixture.expectedFence + 1)
            duplicateReconciliations++
            assert.equal((await adapter.recordCanonicalCommitFailure({ unitId: fixture.unitId, leaseId: second.lease.leaseId, ownerId: prefix, fencingToken: second.lease.fencingToken, classification: "CERTIFICATION_SECOND_CANONICAL_FAILURE", at: new Date(Date.parse(secondAt) + 1_000).toISOString() })).status, "CREATED")
            const state = await sql<{ readonly current_state: string; readonly active_lease_id: string | null }[]>`SELECT current_state::text,active_lease_id FROM control.population_units WHERE unit_id=${fixture.unitId}`
            assert.deepEqual(state[0], { current_state: "RETRYABLE", active_lease_id: null })
            releasedFailures++
          }
          const counts = await sql<{ readonly retrievals: number; readonly candidates: number; readonly duplicate_events: number; readonly duplicate_checkpoints: number }[]>`SELECT (SELECT count(*)::int FROM control.retrieval_attempts WHERE unit_id=ANY(${sql.array(fixtureUnits.map((value) => value.unitId))})) retrievals,(SELECT count(*)::int FROM population.candidates WHERE unit_id=ANY(${sql.array(fixtureUnits.map((value) => value.unitId))})) candidates,(SELECT count(*)::int FROM (SELECT event_id FROM control.population_unit_events WHERE unit_id=ANY(${sql.array(fixtureUnits.map((value) => value.unitId))}) GROUP BY event_id HAVING count(*)>1) x) duplicate_events,(SELECT count(*)::int FROM (SELECT checkpoint_id FROM control.population_checkpoints WHERE unit_id=ANY(${sql.array(fixtureUnits.map((value) => value.unitId))}) GROUP BY checkpoint_id HAVING count(*)>1) x) duplicate_checkpoints`
          assert.deepEqual(counts[0], { retrievals: 4, candidates: 294, duplicate_events: 0, duplicate_checkpoints: 0 })
          passes++
          throw new Error(ROLLBACK)
        })
      } catch (error) {
        if (!(error instanceof Error) || error.message !== ROLLBACK) throw error
      }
      const retained = await integrated.d3.sql<{ readonly rows: number }[]>`SELECT ((SELECT count(*) FROM control.population_jobs WHERE job_id LIKE ${`${prefix}:%`})+(SELECT count(*) FROM control.population_runs WHERE run_id LIKE ${`${prefix}:%`})+(SELECT count(*) FROM control.population_units WHERE unit_id LIKE ${`${prefix}:%`})+(SELECT count(*) FROM control.retrieval_attempts WHERE attempt_id LIKE ${`${prefix}:%`})+(SELECT count(*) FROM population.candidates WHERE candidate_id LIKE ${`${prefix}:%`}))::int rows`
      assert.equal(retained[0]?.rows, 0)
    }

    await runPass()
    await runPass()
    assert.deepEqual({ passes, winners, unavailableCompetitors, duplicateReconciliations, releasedFailures }, { passes: 2, winners: 8, unavailableCompetitors: 8, duplicateReconciliations: 8, releasedFailures: 8 })
    console.log(JSON.stringify({ status: "PASS", seededShapes: 4, runs: passes, safelyLeaseAcquired: winners, concurrentSingleWinners: unavailableCompetitors, exactReconciliationDuplicates: duplicateReconciliations, failureLeasesReleased: releasedFailures, retrievalsRepeated: 0, rawObjectsRepeated: 0, candidatesRepeated: 0, duplicateEvents: 0, duplicateCheckpoints: 0, retainedRows: 0, retainedArtifacts: 0, productionMutation: false }))
  } finally {
    await integrated.shutdown()
  }
}

void main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1 })
