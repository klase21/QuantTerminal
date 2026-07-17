import type postgres from "postgres"
import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { CanonicalCommitResult } from "@/lib/data-platform/persistence"
import { aggregateJobState, createPopulationJobId, createPopulationRunId, mapCommitResult, watermarkResultForOutcome, type CandidateQualityResult, type CandidateValidationResult, type PopulationCandidate, type PopulationCheckpoint, type PopulationJob, type PopulationJobRequest, type PopulationLease, type PopulationOutcome, type PopulationRun, type PopulationUnit, type PopulationWatermarkEligibility, type RetrievalAttempt } from "@/lib/data-platform/population"
import type { D3PostgresClient } from "./client"

export type CreateJobResult = { readonly status: "CREATED" | "DUPLICATE"; readonly jobId: string }
export type CandidateWriteResult = { readonly status: "CREATED" | "DUPLICATE"; readonly candidateId: string } | { readonly status: "CONFLICT"; readonly candidateId: string }
export type PopulationCandidateWithoutRetrievalAttempt = PopulationCandidate extends infer Candidate ? Candidate extends PopulationCandidate ? Omit<Candidate, "retrievalAttemptId"> : never : never
export interface PersistBoundedAcquisitionInput {
  readonly retrievalAttempt: RetrievalAttempt
  readonly rawObjectChecksum: string
  readonly candidates: readonly PopulationCandidateWithoutRetrievalAttempt[]
}
export interface PersistBoundedAcquisitionResult {
  readonly persistedRetrievalAttemptId: string
  readonly retrievalAttemptStatus: "CREATED" | "DUPLICATE" | "CONFLICT"
  readonly persistedObjectId: string
  readonly objectStatus: "ATTRIBUTED"
  readonly candidates: readonly CandidateWriteResult[]
  readonly lineageChecksum: string
  readonly transactionOutcome: "CREATED" | "DUPLICATE" | "CONFLICT"
}
export interface PopulationLineageAudit {
  readonly units: readonly { readonly unitId: string; readonly runId: string; readonly dataset: string; readonly instrument: string; readonly state: string; readonly resumeStage: PopulationResumeStage; readonly fencingToken: number; readonly activeLease: boolean; readonly leaseExpired: boolean; readonly checkpointId: string | null; readonly retrievalAttempts: number; readonly candidates: number }[]
  readonly retrievalAttempts: number
  readonly rawObjects: number
  readonly candidates: number
  readonly unattributedRawObjects: number
}
export type PopulationResumeStage = "SOURCE_ACQUISITION" | "CANDIDATE_LINEAGE" | "CANONICAL_COMMIT" | "COMPLETE"
export interface PopulationUnitEventInput {
  readonly eventId: string
  readonly unitId: string
  readonly runId: string | null
  readonly eventType: string
  readonly previousState: string | null
  readonly nextState: string | null
  readonly fencingToken: number | null
  readonly actorId: string
  readonly occurredAt: string
  readonly details: Readonly<Record<string, unknown>>
}
export interface PopulationResumeResolution {
  readonly stage: PopulationResumeStage
  readonly jobId: string
  readonly runId: string
  readonly unitId: string
  readonly lease: LeaseClaim
  readonly retrievalAttempt: RetrievalAttempt | null
  readonly rawObjectId: string | null
  readonly candidates: readonly PopulationCandidate[]
  readonly checkpointId: string | null
  readonly lineageChecksum: string
}
export interface PopulationUnitEventResult { readonly status: "CREATED" | "DUPLICATE" | "CONFLICT"; readonly checksum: string }
export interface LeaseClaim { readonly unitId: string; readonly leaseId: string; readonly fencingToken: number }
export interface ReconciliationRead { readonly consistent: boolean; readonly reasons: readonly string[] }
export interface RecordD2ResultInput { readonly jobId: string; readonly runId: string; readonly unitId: string; readonly candidateId: string; readonly retrievalAttemptId: string; readonly rawManifestId: string; readonly submissionId: string; readonly leaseId: string; readonly ownerId: string; readonly fencingToken: number; readonly result: CanonicalCommitResult; readonly outcomeId: string; readonly createdAt: string }
export interface SegmentFinalizationInput { readonly leaseId: string; readonly ownerId: string; readonly fencingToken: number; readonly outcomeId: string; readonly decision: PopulationWatermarkEligibility; readonly checkpoint: PopulationCheckpoint; readonly completedAt: string }

function eventId(kind: string, identity: string) { return `population-event:${kind}:${identity}` }
function json(value: unknown): string { return JSON.stringify(value) }

export interface PopulationPostgresAdapter {
  createJob(request: PopulationJobRequest): Promise<CreateJobResult>
  createRun(jobId: string, attemptNumber: number, createdAt: string): Promise<PopulationRun>
  completeRun(runId: string, state: "SUCCEEDED" | "PARTIAL" | "FAILED" | "CANCELLED" | "EXPIRED", at: string): Promise<void>
  expandUnits(units: readonly PopulationUnit[]): Promise<number>
  claimUnit(ownerId: string, runId: string, now: string, expiresAt: string): Promise<LeaseClaim | null>
  heartbeat(unitId: string, leaseId: string, ownerId: string, fencingToken: number, now: string, expiresAt: string): Promise<void>
  advanceUnit(unitId: string, leaseId: string, ownerId: string, fencingToken: number, nextState: "RETRIEVING" | "RAW_PERSISTED" | "CANDIDATES_READY" | "PROCESSING" | "COMPLETED" | "RETRYABLE" | "QUARANTINED" | "FAILED" | "CANCELLED", eventIdentity: string, at: string): Promise<void>
  expireLease(unitId: string, leaseId: string, fencingToken: number, at: string): Promise<void>
  releaseLease(unitId: string, leaseId: string, ownerId: string, fencingToken: number, at: string, reason: "COMPLETED" | "FAILED" | "CANCELLED"): Promise<void>
  checkpoint(checkpoint: PopulationCheckpoint, leaseId: string, ownerId: string): Promise<"CREATED" | "DUPLICATE">
  appendRetrievalAttempt(attempt: RetrievalAttempt): Promise<void>
  persistCandidate(candidate: PopulationCandidate): Promise<CandidateWriteResult>
  persistBoundedAcquisitionResult(input: PersistBoundedAcquisitionInput): Promise<PersistBoundedAcquisitionResult>
  transitionUnitIdempotently(input: PopulationUnitEventInput & { readonly leaseId: string; readonly ownerId: string }): Promise<PopulationUnitEventResult>
  reconcileBoundedAcquisitionResume(input: { readonly unitId: string; readonly ownerId: string; readonly now: string; readonly expiresAt: string }): Promise<PopulationResumeResolution | null>
  recoverPopulationUnitLease(input: { readonly unitId: string; readonly runId: string; readonly ownerId: string; readonly now: string; readonly expiresAt: string }): Promise<LeaseClaim | null>
  recordRecoverableLineageFailure(input: { readonly unitId: string; readonly leaseId: string; readonly ownerId: string; readonly fencingToken: number; readonly classification: string; readonly at: string }): Promise<PopulationUnitEventResult>
  probeBoundedAcquisitionLineage(input: PersistBoundedAcquisitionInput): Promise<{ readonly passed: true; readonly retainedRows: 0 }>
  auditBoundedAcquisitionLineage(intervalStart: string, intervalEnd: string, requestedBy: string): Promise<PopulationLineageAudit>
  appendValidation(result: CandidateValidationResult): Promise<void>
  appendQuality(result: CandidateQualityResult): Promise<void>
  createSubmission(submissionId: string, candidateId: string, idempotencyKey: string, submittedAt: string): Promise<"CREATED" | "DUPLICATE">
  recordD2Result(input: RecordD2ResultInput): Promise<PopulationOutcome>
  recordIntermediateD2Result(input: RecordD2ResultInput): Promise<PopulationOutcome>
  finalizeSegment(input: SegmentFinalizationInput): Promise<void>
  scheduleRetry(input: { readonly retryEventId: string; readonly jobId: string; readonly runId: string; readonly unitId: string; readonly candidateId: string | null; readonly classificationId: string; readonly policyId: string; readonly policyVersion: string; readonly retryAfter: string | null; readonly createdAt: string }): Promise<void>
  requestCancellation(jobId: string, eventIdentity: string, actorId: string, at: string): Promise<void>
  aggregateJob(jobId: string, at: string): Promise<string>
  writeWatermarkDecision(decision: PopulationWatermarkEligibility): Promise<void>
  readResumableUnits(jobId: string): Promise<readonly string[]>
  reconcileJob(jobId: string): Promise<ReconciliationRead>
  reconcileRun(runId: string): Promise<ReconciliationRead>
  reconcileUnit(unitId: string): Promise<ReconciliationRead>
}

export function createPopulationPostgresAdapter(client: D3PostgresClient): PopulationPostgresAdapter {
  const assertLease = async (sql: postgres.TransactionSql, unitId: string, leaseId: string, ownerId: string, token: number, now: string) => {
    const rows = await sql<{ readonly ok: boolean }[]>`SELECT EXISTS(SELECT 1 FROM control.population_units u JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE u.unit_id=${unitId} AND l.lease_id=${leaseId} AND l.owner_id=${ownerId} AND u.current_fencing_token=${token} AND l.fencing_token=${token} AND l.released_at IS NULL AND l.expires_at>${now} AND u.cancellation_requested_at IS NULL) ok`
    if (!rows[0]?.ok) throw new Error("STALE_FENCING_TOKEN")
  }
  const normalizedEvent = (value: PopulationUnitEventInput | Record<string, unknown>) => {
    const occurredAt = String("occurredAt" in value ? value.occurredAt : value.occurred_at)
    return Object.freeze({
      eventId: String("eventId" in value ? value.eventId : value.event_id),
      unitId: String("unitId" in value ? value.unitId : value.unit_id),
      runId: ("runId" in value ? value.runId : value.run_id) == null ? null : String("runId" in value ? value.runId : value.run_id),
      eventType: String("eventType" in value ? value.eventType : value.event_type),
      previousState: ("previousState" in value ? value.previousState : value.previous_state) == null ? null : String("previousState" in value ? value.previousState : value.previous_state),
      nextState: ("nextState" in value ? value.nextState : value.next_state) == null ? null : String("nextState" in value ? value.nextState : value.next_state),
      fencingToken: ("fencingToken" in value ? value.fencingToken : value.fencing_token) == null ? null : Number("fencingToken" in value ? value.fencingToken : value.fencing_token),
      actorId: String("actorId" in value ? value.actorId : value.actor_id),
      occurredAt: new Date(Math.floor(Date.parse(occurredAt) / 1_000) * 1_000).toISOString(),
      details: ("details" in value ? value.details : {}) ?? {},
    })
  }
  const appendImmutableUnitEvent = async (sql: postgres.TransactionSql, input: PopulationUnitEventInput): Promise<PopulationUnitEventResult> => {
    const incoming = normalizedEvent(input), checksum = canonicalChecksum(incoming)
    const rows = await sql<Record<string, unknown>[]>`SELECT event_id,unit_id,run_id,event_type,previous_state::text,next_state::text,fencing_token,actor_id,occurred_at,details FROM control.population_unit_events WHERE event_id=${input.eventId} FOR UPDATE`
    if (rows[0]) return Object.freeze({ status: canonicalChecksum(normalizedEvent(rows[0])) === checksum ? "DUPLICATE" as const : "CONFLICT" as const, checksum })
    await sql`INSERT INTO control.population_unit_events(event_id,unit_id,run_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at,details) VALUES(${incoming.eventId},${incoming.unitId},${incoming.runId},${incoming.eventType},${incoming.previousState},${incoming.nextState},${incoming.fencingToken},${incoming.actorId},${incoming.occurredAt},${sql.json(JSON.parse(json(incoming.details)))})`
    return Object.freeze({ status: "CREATED" as const, checksum })
  }
  const retrievalComparable = (value: RetrievalAttempt | Record<string, unknown>) => Object.freeze({
    attemptId: String("attemptId" in value ? value.attemptId : value.attempt_id),
    unitId: String("unitId" in value ? value.unitId : value.unit_id),
    runId: String("runId" in value ? value.runId : value.run_id),
    providerId: String("providerId" in value ? value.providerId : value.provider_id),
    providerSnapshotId: String("providerSnapshotId" in value ? value.providerSnapshotId : value.provider_snapshot_id),
    requestFingerprint: String("requestFingerprint" in value ? value.requestFingerprint : value.request_fingerprint),
    startedAt: String("startedAt" in value ? value.startedAt : value.started_at),
    completedAt: ("completedAt" in value ? value.completedAt : value.completed_at) == null ? null : String("completedAt" in value ? value.completedAt : value.completed_at),
    outcome: ("outcome" in value ? value.outcome : value.outcome) == null ? null : String("outcome" in value ? value.outcome : value.outcome),
    statusCode: ("statusCode" in value ? value.statusCode : value.status_code) == null ? null : Number("statusCode" in value ? value.statusCode : value.status_code),
    retryAfter: ("retryAfter" in value ? value.retryAfter : value.retry_after) == null ? null : String("retryAfter" in value ? value.retryAfter : value.retry_after),
    responseMediaType: ("responseMediaType" in value ? value.responseMediaType : value.response_media_type) == null ? null : String("responseMediaType" in value ? value.responseMediaType : value.response_media_type),
    rawByteCount: ("rawByteCount" in value ? value.rawByteCount : value.raw_byte_count) == null ? null : Number("rawByteCount" in value ? value.rawByteCount : value.raw_byte_count),
    rawManifestId: ("rawManifestId" in value ? value.rawManifestId : value.raw_manifest_id) == null ? null : String("rawManifestId" in value ? value.rawManifestId : value.raw_manifest_id),
    errorClass: ("errorClass" in value ? value.errorClass : value.error_class) == null ? null : String("errorClass" in value ? value.errorClass : value.error_class),
    errorCode: ("errorCode" in value ? value.errorCode : value.error_code) == null ? null : String("errorCode" in value ? value.errorCode : value.error_code),
    retryClassificationId: ("retryClassificationId" in value ? value.retryClassificationId : value.retry_classification_id) == null ? null : String("retryClassificationId" in value ? value.retryClassificationId : value.retry_classification_id),
  })
  const retrievalIdentityComparable = (value: RetrievalAttempt | Record<string, unknown>) => {
    const { startedAt: _startedAt, completedAt: _completedAt, ...stable } = retrievalComparable(value)
    return Object.freeze(stable)
  }
  const persistBounded = async (sql: postgres.TransactionSql, input: PersistBoundedAcquisitionInput): Promise<PersistBoundedAcquisitionResult> => {
    const attempt = input.retrievalAttempt
    if (!attempt.rawManifestId || !/^[0-9a-f]{64}$/.test(input.rawObjectChecksum)) throw new Error("BOUNDED_LINEAGE_INPUT_INVALID")
    if (input.candidates.some((candidate) => candidate.unitId !== attempt.unitId || candidate.rawManifestId !== attempt.rawManifestId || candidate.providerSnapshotId !== attempt.providerSnapshotId)) throw new Error("BOUNDED_LINEAGE_PARENT_MISMATCH")
    const existingAttempts = await sql<Record<string, unknown>[]>`SELECT * FROM control.retrieval_attempts WHERE attempt_id=${attempt.attemptId} FOR UPDATE`
    const retrievalStatus = existingAttempts[0] ? canonicalChecksum(retrievalIdentityComparable(existingAttempts[0])) === canonicalChecksum(retrievalIdentityComparable(attempt)) ? "DUPLICATE" as const : "CONFLICT" as const : "CREATED" as const
    if (retrievalStatus === "CONFLICT") return Object.freeze({ persistedRetrievalAttemptId: attempt.attemptId, retrievalAttemptStatus: retrievalStatus, persistedObjectId: attempt.rawManifestId, objectStatus: "ATTRIBUTED" as const, candidates: Object.freeze([]), lineageChecksum: canonicalChecksum({ attemptId: attempt.attemptId, rawObjectId: attempt.rawManifestId, conflict: true }), transactionOutcome: "CONFLICT" as const })
    const existingCandidates = new Map<string, { readonly candidate_checksum: string; readonly retrieval_attempt_id: string; readonly raw_manifest_id: string; readonly unit_id: string; readonly dataset_id: string; readonly provider_id: string; readonly provider_snapshot_id: string; readonly source_observation_id: string; readonly parser_version: string; readonly candidate_schema_version: string; readonly candidate_kind: string }>()
    if (input.candidates.length) {
      const rows = await sql<{ readonly candidate_id: string; readonly candidate_checksum: string; readonly retrieval_attempt_id: string; readonly raw_manifest_id: string; readonly unit_id: string; readonly dataset_id: string; readonly provider_id: string; readonly provider_snapshot_id: string; readonly source_observation_id: string; readonly parser_version: string; readonly candidate_schema_version: string; readonly candidate_kind: string }[]>`SELECT candidate_id,candidate_checksum,retrieval_attempt_id,raw_manifest_id,unit_id,dataset_id,provider_id,provider_snapshot_id,source_observation_id,parser_version,candidate_schema_version,candidate_kind FROM population.candidates WHERE candidate_id=ANY(${sql.array(input.candidates.map((candidate) => candidate.candidateId))}) FOR UPDATE`
      for (const row of rows) existingCandidates.set(row.candidate_id, row)
    }
    const conflict = input.candidates.find((candidate) => { const existing = existingCandidates.get(candidate.candidateId); return existing && (existing.candidate_checksum !== candidate.candidateChecksum || existing.retrieval_attempt_id !== attempt.attemptId || existing.raw_manifest_id !== attempt.rawManifestId || existing.unit_id !== attempt.unitId || existing.dataset_id !== candidate.datasetId || existing.provider_id !== candidate.providerId || existing.provider_snapshot_id !== candidate.providerSnapshotId || existing.source_observation_id !== candidate.sourceObservationId || existing.parser_version !== candidate.parserVersion || existing.candidate_schema_version !== candidate.candidateSchemaVersion || existing.candidate_kind !== candidate.kind) })
    if (conflict) return Object.freeze({ persistedRetrievalAttemptId: attempt.attemptId, retrievalAttemptStatus: retrievalStatus, persistedObjectId: attempt.rawManifestId, objectStatus: "ATTRIBUTED" as const, candidates: Object.freeze([{ status: "CONFLICT" as const, candidateId: conflict.candidateId }]), lineageChecksum: canonicalChecksum({ attemptId: attempt.attemptId, rawObjectId: attempt.rawManifestId, candidateId: conflict.candidateId, conflict: true }), transactionOutcome: "CONFLICT" as const })
    if (retrievalStatus === "CREATED") await sql`INSERT INTO control.retrieval_attempts(attempt_id,unit_id,run_id,provider_id,provider_snapshot_id,request_fingerprint,started_at,completed_at,outcome,status_code,retry_after,response_media_type,raw_byte_count,raw_manifest_id,error_class,error_code,retry_classification_id) VALUES(${attempt.attemptId},${attempt.unitId},${attempt.runId},${attempt.providerId},${attempt.providerSnapshotId},${attempt.requestFingerprint},${attempt.startedAt},${attempt.completedAt},${attempt.outcome},${attempt.statusCode},${attempt.retryAfter},${attempt.responseMediaType},${attempt.rawByteCount},${attempt.rawManifestId},${attempt.errorClass},${attempt.errorCode},${attempt.retryClassificationId})`
    const candidateResults: CandidateWriteResult[] = []
    for (const candidate of input.candidates) {
      if (existingCandidates.has(candidate.candidateId)) { candidateResults.push({ status: "DUPLICATE", candidateId: candidate.candidateId }); continue }
      await sql`INSERT INTO population.candidates(candidate_id,unit_id,retrieval_attempt_id,raw_manifest_id,dataset_id,provider_id,provider_snapshot_id,source_observation_id,source_observed_at,effective_at,parser_version,candidate_schema_version,candidate_kind,bounded_payload,candidate_checksum,validation_status,quality_eligibility,normalization_eligibility,created_at) VALUES(${candidate.candidateId},${candidate.unitId},${attempt.attemptId},${candidate.rawManifestId},${candidate.datasetId},${candidate.providerId},${candidate.providerSnapshotId},${candidate.sourceObservationId},${candidate.sourceObservedAt},${candidate.effectiveAt},${candidate.parserVersion},${candidate.candidateSchemaVersion},${candidate.kind},${sql.json(candidate.payload)},${candidate.candidateChecksum},${candidate.validationStatus},${candidate.qualityEligibility},${candidate.normalizationEligibility},${candidate.createdAt})`
      candidateResults.push({ status: "CREATED", candidateId: candidate.candidateId })
    }
    const transactionOutcome = retrievalStatus === "CREATED" || candidateResults.some((result) => result.status === "CREATED") ? "CREATED" as const : "DUPLICATE" as const
    return Object.freeze({ persistedRetrievalAttemptId: attempt.attemptId, retrievalAttemptStatus: retrievalStatus, persistedObjectId: attempt.rawManifestId, objectStatus: "ATTRIBUTED" as const, candidates: Object.freeze(candidateResults), lineageChecksum: canonicalChecksum({ attempt: retrievalIdentityComparable(attempt), rawObjectChecksum: input.rawObjectChecksum, candidates: input.candidates.map((candidate) => [candidate.candidateId, candidate.candidateChecksum]) }), transactionOutcome })
  }
  return Object.freeze({
    async createJob(request) {
      const jobId = createPopulationJobId(request.requestIdentity, request.occurrenceIdentity, request.intentionalRerunIdentity)
      return client.transaction(async (sql) => {
        const existing = await sql<{ readonly job_id: string }[]>`SELECT job_id FROM control.population_jobs WHERE request_identity=${request.requestIdentity} AND occurrence_identity=${request.occurrenceIdentity} AND COALESCE(intentional_rerun_identity,'')=COALESCE(${request.intentionalRerunIdentity},'') FOR UPDATE`
        if (existing[0]) return { status: "DUPLICATE" as const, jobId: existing[0].job_id }
        const currentEventId = eventId("job-created", jobId)
        await sql`INSERT INTO control.population_jobs(job_id,request_identity,occurrence_identity,intentional_rerun_identity,profile_id,profile_version,dataset_id,provider_id,scope_fingerprint,current_state,current_event_id,requested_at,requested_by,created_at,updated_at) VALUES(${jobId},${request.requestIdentity},${request.occurrenceIdentity},${request.intentionalRerunIdentity},${request.profile.profileId},${request.profile.profileVersion},${request.datasetId},${request.providerId},${request.requestIdentity},'QUEUED',${currentEventId},${request.requestedAt},${request.requestedBy},${request.requestedAt},${request.requestedAt})`
        await sql`INSERT INTO control.population_job_events(event_id,job_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${currentEventId},${jobId},'JOB_CREATED',NULL,'QUEUED',${request.requestedBy},${request.requestedAt})`
        return { status: "CREATED" as const, jobId }
      })
    },
    async createRun(jobId, attemptNumber, createdAt) {
      const runId = createPopulationRunId(jobId, attemptNumber); const createdEvent = eventId("run-created", runId); const startedEvent = eventId("run-started", runId)
      await client.transaction(async (sql) => {
        await sql`INSERT INTO control.population_runs(run_id,job_id,attempt_number,current_state,started_at,heartbeat_at) VALUES(${runId},${jobId},${attemptNumber},'RUNNING',${createdAt},${createdAt}) ON CONFLICT(run_id) DO NOTHING`
        await sql`INSERT INTO control.population_run_events(event_id,run_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${createdEvent},${runId},'RUN_CREATED',NULL,'CREATED','coordinator',${createdAt}) ON CONFLICT DO NOTHING`
        await sql`INSERT INTO control.population_run_events(event_id,run_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${startedEvent},${runId},'RUN_STARTED','CREATED','RUNNING','coordinator',${createdAt}) ON CONFLICT DO NOTHING`
        const jobStartedEvent = eventId("job-running", `${jobId}:${runId}`)
        const transitioned = await sql<{ readonly previous_state: string }[]>`UPDATE control.population_jobs SET current_state='RUNNING',current_event_id=${jobStartedEvent},updated_at=${createdAt} WHERE job_id=${jobId} AND current_state IN ('QUEUED','PAUSED') RETURNING 'QUEUED'::text previous_state`
        if (transitioned.length) await sql`INSERT INTO control.population_job_events(event_id,job_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${jobStartedEvent},${jobId},'RUN_STARTED','QUEUED','RUNNING','coordinator',${createdAt}) ON CONFLICT DO NOTHING`
      })
      const run: PopulationRun = { runId, jobId, attemptNumber, currentState: "RUNNING", workerPoolId: null, startedAt: createdAt, heartbeatAt: createdAt, completedAt: null, retryClassificationId: null, currentCheckpointId: null }
      return run
    },
    async completeRun(runId,state,at) { await client.transaction(async(sql)=>{ const rows=await sql<{readonly current_state:string}[]>`SELECT current_state::text FROM control.population_runs WHERE run_id=${runId} FOR UPDATE`;if(!rows[0]||rows[0].current_state!=="RUNNING")throw new Error("RUN_NOT_ACTIVE");const id=eventId("run-terminal",`${runId}:${state}`);await sql`UPDATE control.population_runs SET current_state=${state},completed_at=${at},heartbeat_at=${at} WHERE run_id=${runId}`;await sql`INSERT INTO control.population_run_events(event_id,run_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${id},${runId},'RUN_COMPLETED','RUNNING',${state},'coordinator',${at})` }) },
    async expandUnits(units) {
      return client.transaction(async (sql) => { let inserted = 0; for (const unit of units) { const rows = await sql`INSERT INTO control.population_units(unit_id,job_id,profile_id,profile_version,dataset_id,provider_id,provider_snapshot_id,policy_version_id,venue,subject_or_symbol,window_start,window_end,resolution,partition_key,request_fingerprint,request_parameters,required,current_state,attempt_count,created_at,updated_at) VALUES(${unit.unitId},${unit.jobId},${unit.identity.profileId},${unit.identity.profileVersion},${unit.identity.datasetId},${unit.identity.providerId},${unit.providerSnapshotId},${unit.policyVersionId},${unit.identity.venue},${unit.identity.subjectOrSymbol},${unit.identity.windowStart},${unit.identity.windowEnd},${unit.identity.resolution},${unit.identity.partitionKey},${unit.requestFingerprint},${sql.json(unit.requestParameters)},${unit.required},'PENDING',0,${unit.createdAt},${unit.updatedAt}) ON CONFLICT(unit_id) DO NOTHING RETURNING unit_id`; if (rows.length) { inserted++; await sql`INSERT INTO control.population_unit_events(event_id,unit_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${eventId("unit-created",unit.unitId)},${unit.unitId},'UNIT_CREATED',NULL,'PENDING','coordinator',${unit.createdAt})` } }; return inserted })
    },
    async claimUnit(ownerId, runId, now, expiresAt) { const rows = await client.sql<{ readonly unit_id: string; readonly lease_id: string; readonly fencing_token: number }[]>`SELECT * FROM control.claim_population_unit(${ownerId},${runId},${now},${expiresAt})`; return rows[0] ? { unitId: rows[0].unit_id, leaseId: rows[0].lease_id, fencingToken: Number(rows[0].fencing_token) } : null },
    async heartbeat(unitId, leaseId, ownerId, fencingToken, now, expiresAt) { await client.transaction(async (sql) => { await assertLease(sql,unitId,leaseId,ownerId,fencingToken,now); await sql`SELECT control.heartbeat_population_lease(${unitId},${leaseId},${ownerId},${fencingToken},${now},${expiresAt})`; await sql`INSERT INTO control.population_unit_events(event_id,unit_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at) SELECT ${eventId("heartbeat",`${unitId}:${fencingToken}:${now}`)},unit_id,'HEARTBEAT',current_state,current_state,${fencingToken},${ownerId},${now} FROM control.population_units WHERE unit_id=${unitId}` }) },
    async advanceUnit(unitId,leaseId,ownerId,fencingToken,nextState,eventIdentity,at){await client.sql`SELECT control.advance_population_unit(${unitId},${leaseId},${ownerId},${fencingToken},${nextState},${eventIdentity},${at})`},
    async expireLease(unitId,leaseId,fencingToken,at) { await client.transaction(async (sql)=>{ const rows=await sql<{readonly expires_at:string;readonly released_at:string|null}[]>`SELECT expires_at,released_at FROM control.population_leases WHERE lease_id=${leaseId} AND unit_id=${unitId} AND fencing_token=${fencingToken} FOR UPDATE`; if(!rows[0]||rows[0].released_at||Date.parse(rows[0].expires_at)>Date.parse(at))throw new Error("LEASE_NOT_EXPIRED"); await sql`UPDATE control.population_leases SET released_at=${at},release_reason='EXPIRED' WHERE lease_id=${leaseId}`; await sql`UPDATE control.population_units SET current_state='RETRYABLE',active_lease_id=NULL,updated_at=${at} WHERE unit_id=${unitId} AND current_fencing_token=${fencingToken}`; await sql`INSERT INTO control.population_unit_events(event_id,unit_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at) VALUES(${eventId("lease-expired",`${leaseId}:${at}`)},${unitId},'LEASE_EXPIRED','LEASED','RETRYABLE',${fencingToken},'coordinator',${at})` }) },
    async releaseLease(unitId,leaseId,ownerId,fencingToken,at,reason) { await client.transaction(async(sql)=>{ await assertLease(sql,unitId,leaseId,ownerId,fencingToken,at); await sql`UPDATE control.population_leases SET released_at=${at},release_reason=${reason} WHERE lease_id=${leaseId}`; await sql`UPDATE control.population_units SET active_lease_id=NULL,updated_at=${at} WHERE unit_id=${unitId}`; await sql`INSERT INTO control.population_unit_events(event_id,unit_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at) SELECT ${eventId("lease-released",`${leaseId}:${at}`)},unit_id,'LEASE_RELEASED',current_state,current_state,${fencingToken},${ownerId},${at} FROM control.population_units WHERE unit_id=${unitId}` }) },
    async checkpoint(checkpoint, leaseId, ownerId) { return client.transaction(async (sql) => { await assertLease(sql,checkpoint.unitId,leaseId,ownerId,checkpoint.fencingToken,checkpoint.createdAt); if (checkpoint.checkpointType === "RAW_BOUNDARY" && !checkpoint.rawManifestId) throw new Error("RAW_MANIFEST_REQUIRED"); if (checkpoint.checkpointType === "CANDIDATE_BOUNDARY") { if(!checkpoint.candidateCursor)throw new Error("CANDIDATE_BOUNDARY_REQUIRED"); const durable=await sql`SELECT 1 FROM population.candidates WHERE candidate_id=${checkpoint.candidateCursor}`;if(!durable.length)throw new Error("CANDIDATE_NOT_DURABLE") } if (checkpoint.checkpointType === "CANONICAL_BOUNDARY") { if(!checkpoint.canonicalSubmissionId||!checkpoint.lastOutcomeId)throw new Error("CANONICAL_OUTCOME_REQUIRED"); const durable=await sql`SELECT 1 FROM population.canonical_submissions s JOIN control.population_outcomes o ON o.submission_id=s.submission_id WHERE s.submission_id=${checkpoint.canonicalSubmissionId} AND o.outcome_id=${checkpoint.lastOutcomeId}`;if(!durable.length)throw new Error("CANONICAL_OUTCOME_NOT_DURABLE") } const rows = await sql`INSERT INTO control.population_checkpoints(checkpoint_id,job_id,run_id,unit_id,fencing_token,checkpoint_type,completed_stage,raw_manifest_id,candidate_cursor,canonical_submission_id,last_outcome_id,created_at) VALUES(${checkpoint.checkpointId},${checkpoint.jobId},${checkpoint.runId},${checkpoint.unitId},${checkpoint.fencingToken},${checkpoint.checkpointType},${checkpoint.completedStage},${checkpoint.rawManifestId},${checkpoint.candidateCursor},${checkpoint.canonicalSubmissionId},${checkpoint.lastOutcomeId},${checkpoint.createdAt}) ON CONFLICT(checkpoint_id) DO NOTHING RETURNING checkpoint_id`; if (!rows.length) return "DUPLICATE" as const; await sql`UPDATE control.population_units SET current_checkpoint_id=${checkpoint.checkpointId},updated_at=${checkpoint.createdAt} WHERE unit_id=${checkpoint.unitId}`; await sql`INSERT INTO control.population_unit_events(event_id,unit_id,run_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at) SELECT ${eventId("checkpoint",checkpoint.checkpointId)},unit_id,${checkpoint.runId},'CHECKPOINT_ADVANCED',current_state,current_state,${checkpoint.fencingToken},${ownerId},${checkpoint.createdAt} FROM control.population_units WHERE unit_id=${checkpoint.unitId}`; return "CREATED" as const }) },
    async appendRetrievalAttempt(a) { await client.sql`INSERT INTO control.retrieval_attempts(attempt_id,unit_id,run_id,provider_id,provider_snapshot_id,request_fingerprint,started_at,completed_at,outcome,status_code,retry_after,response_media_type,raw_byte_count,raw_manifest_id,error_class,error_code,retry_classification_id) VALUES(${a.attemptId},${a.unitId},${a.runId},${a.providerId},${a.providerSnapshotId},${a.requestFingerprint},${a.startedAt},${a.completedAt},${a.outcome},${a.statusCode},${a.retryAfter},${a.responseMediaType},${a.rawByteCount},${a.rawManifestId},${a.errorClass},${a.errorCode},${a.retryClassificationId}) ON CONFLICT(attempt_id) DO NOTHING` },
    async persistCandidate(c) { return client.transaction(async (sql) => { const existing = await sql<{ readonly candidate_checksum: string }[]>`SELECT candidate_checksum FROM population.candidates WHERE candidate_id=${c.candidateId} FOR UPDATE`; if (existing[0]) { if(existing[0].candidate_checksum===c.candidateChecksum)return {status:"DUPLICATE" as const,candidateId:c.candidateId}; const conflictId=`candidate-conflict:${c.candidateId}:${c.candidateChecksum}`; await sql`INSERT INTO population.candidate_conflicts(conflict_id,candidate_id,existing_checksum,incoming_checksum,detected_at) VALUES(${conflictId},${c.candidateId},${existing[0].candidate_checksum},${c.candidateChecksum},${c.createdAt}) ON CONFLICT DO NOTHING`; return {status:"CONFLICT" as const,candidateId:c.candidateId} }; await sql`INSERT INTO population.candidates(candidate_id,unit_id,retrieval_attempt_id,raw_manifest_id,dataset_id,provider_id,provider_snapshot_id,source_observation_id,source_observed_at,effective_at,parser_version,candidate_schema_version,candidate_kind,bounded_payload,candidate_checksum,validation_status,quality_eligibility,normalization_eligibility,created_at) VALUES(${c.candidateId},${c.unitId},${c.retrievalAttemptId},${c.rawManifestId},${c.datasetId},${c.providerId},${c.providerSnapshotId},${c.sourceObservationId},${c.sourceObservedAt},${c.effectiveAt},${c.parserVersion},${c.candidateSchemaVersion},${c.kind},${sql.json(c.payload)},${c.candidateChecksum},${c.validationStatus},${c.qualityEligibility},${c.normalizationEligibility},${c.createdAt})`; return { status: "CREATED" as const, candidateId: c.candidateId } }) },
    async persistBoundedAcquisitionResult(input) { return client.transaction((sql) => persistBounded(sql, input)) },
    async transitionUnitIdempotently(input) {
      return client.transaction(async (sql) => {
        await assertLease(sql, input.unitId, input.leaseId, input.ownerId, input.fencingToken ?? 0, input.occurredAt)
        const unit = await sql<{ readonly current_state: string }[]>`SELECT current_state::text FROM control.population_units WHERE unit_id=${input.unitId} FOR UPDATE`
        if (!unit[0]) throw new Error("POPULATION_UNIT_MISSING")
        const event = await appendImmutableUnitEvent(sql, input)
        if (event.status === "CONFLICT") return event
        if (event.status === "DUPLICATE") {
          if (unit[0].current_state !== input.nextState) throw new Error("POPULATION_EVENT_STATE_CONFLICT")
          return event
        }
        if (unit[0].current_state !== input.previousState) throw new Error("POPULATION_EVENT_PREVIOUS_STATE_CONFLICT")
        await sql`UPDATE control.population_units SET current_state=${input.nextState},updated_at=${normalizedEvent(input).occurredAt} WHERE unit_id=${input.unitId}`
        return event
      })
    },
    async reconcileBoundedAcquisitionResume(input) {
      return client.transaction(async (sql) => {
        const units = await sql<{ readonly job_id: string; readonly run_id: string; readonly current_state: string; readonly current_fencing_token: number; readonly active_lease_id: string | null; readonly expires_at: string | null; readonly released_at: string | null }[]>`
          SELECT u.job_id,r.run_id,u.current_state::text,u.current_fencing_token,u.active_lease_id,l.expires_at,l.released_at
          FROM control.population_units u JOIN control.population_runs r ON r.job_id=u.job_id
          LEFT JOIN control.population_leases l ON l.lease_id=u.active_lease_id
          WHERE u.unit_id=${input.unitId} AND r.current_state='RUNNING' FOR UPDATE OF u`
        const unit = units[0]
        if (!unit) return null
        const attempts = await sql<Record<string, unknown>[]>`SELECT * FROM control.retrieval_attempts WHERE unit_id=${input.unitId} ORDER BY started_at,attempt_id FOR UPDATE`
        if (attempts.length > 1) throw new Error("POPULATION_RESUME_MULTIPLE_RETRIEVAL_ATTEMPTS")
        const attempt = attempts[0] ? retrievalComparable(attempts[0]) as RetrievalAttempt : null
        const candidateRows = await sql<Record<string, unknown>[]>`SELECT * FROM population.candidates WHERE unit_id=${input.unitId} ORDER BY candidate_id FOR UPDATE`
        const candidates = Object.freeze(candidateRows.map((row) => Object.freeze({
          kind: String(row.candidate_kind), candidateId: String(row.candidate_id), unitId: String(row.unit_id), retrievalAttemptId: String(row.retrieval_attempt_id), rawManifestId: String(row.raw_manifest_id), datasetId: String(row.dataset_id), providerId: String(row.provider_id), providerSnapshotId: String(row.provider_snapshot_id), sourceObservationId: String(row.source_observation_id), sourceObservedAt: String(row.source_observed_at), effectiveAt: String(row.effective_at), parserVersion: String(row.parser_version), candidateSchemaVersion: String(row.candidate_schema_version), payload: row.bounded_payload, candidateChecksum: String(row.candidate_checksum), validationStatus: String(row.validation_status), qualityEligibility: String(row.quality_eligibility), normalizationEligibility: String(row.normalization_eligibility), createdAt: String(row.created_at),
        }) as unknown as PopulationCandidate))
        if (candidates.some((candidate) => candidate.retrievalAttemptId !== attempt?.attemptId || candidate.rawManifestId !== attempt?.rawManifestId)) throw new Error("POPULATION_RESUME_CANDIDATE_LINEAGE_CONFLICT")
        const outcomes = await sql<{ readonly count: number }[]>`SELECT count(DISTINCT candidate_id)::int count FROM control.population_outcomes WHERE unit_id=${input.unitId} AND outcome_kind IN ('COMMITTED','DUPLICATE')`
        const stage: PopulationResumeStage = !attempt ? "SOURCE_ACQUISITION" : candidates.length === 0 ? "CANDIDATE_LINEAGE" : Number(outcomes[0]?.count ?? 0) >= candidates.length ? "COMPLETE" : "CANONICAL_COMMIT"
        const rawObjectId = attempt?.rawManifestId ?? null
        const lineageChecksum = canonicalChecksum({ unitId: input.unitId, stage, attemptId: attempt?.attemptId ?? null, rawObjectId, candidates: candidates.map((candidate) => [candidate.candidateId, candidate.candidateChecksum]), committedOutcomes: Number(outcomes[0]?.count ?? 0) })
        if (stage === "COMPLETE") throw new Error("POPULATION_RESUME_ALREADY_COMPLETE")
        if (unit.active_lease_id && !unit.released_at && unit.expires_at && Date.parse(unit.expires_at) > Date.parse(input.now)) throw new Error("POPULATION_RESUME_ACTIVE_LEASE")
        if (unit.active_lease_id && !unit.released_at) await sql`UPDATE control.population_leases SET released_at=${input.now},release_reason='EXPIRED' WHERE lease_id=${unit.active_lease_id} AND released_at IS NULL`
        if (unit.current_state !== "PENDING" && unit.current_state !== "RETRYABLE") {
          const readyEvent: PopulationUnitEventInput = { eventId: eventId("resume-ready", `${input.unitId}:${unit.current_fencing_token}:${stage}:${lineageChecksum}`), unitId: input.unitId, runId: unit.run_id, eventType: "RESUME_RECONCILED", previousState: unit.current_state, nextState: "RETRYABLE", fencingToken: unit.current_fencing_token || null, actorId: input.ownerId, occurredAt: input.now, details: { stage, lineageChecksum } }
          const appended = await appendImmutableUnitEvent(sql, readyEvent)
          if (appended.status === "CONFLICT") throw new Error("POPULATION_RESUME_EVENT_CONFLICT")
          await sql`UPDATE control.population_units SET current_state='RETRYABLE',active_lease_id=NULL,updated_at=${input.now} WHERE unit_id=${input.unitId}`
        } else if (unit.active_lease_id) await sql`UPDATE control.population_units SET active_lease_id=NULL,updated_at=${input.now} WHERE unit_id=${input.unitId}`
        const claimed = await sql<{ readonly unit_id: string; readonly lease_id: string; readonly fencing_token: number }[]>`SELECT * FROM control.claim_population_unit(${input.ownerId},${unit.run_id},${input.now},${input.expiresAt})`
        const leaseRow = claimed.find((value) => value.unit_id === input.unitId)
        if (!leaseRow) throw new Error("POPULATION_RESUME_UNIT_NOT_CLAIMED")
        const lease = Object.freeze({ unitId: leaseRow.unit_id, leaseId: leaseRow.lease_id, fencingToken: Number(leaseRow.fencing_token) })
        const resumedState = stage === "SOURCE_ACQUISITION" ? "RETRIEVING" : stage === "CANDIDATE_LINEAGE" ? "RAW_PERSISTED" : "CANDIDATES_READY"
        const stageEvent: PopulationUnitEventInput = { eventId: eventId("resume-stage", `${input.unitId}:${lease.fencingToken}:${stage}:${lineageChecksum}`), unitId: input.unitId, runId: unit.run_id, eventType: "RESUME_STAGE_RESTORED", previousState: "LEASED", nextState: resumedState, fencingToken: lease.fencingToken, actorId: input.ownerId, occurredAt: input.now, details: { stage, lineageChecksum } }
        const stageAppend = await appendImmutableUnitEvent(sql, stageEvent)
        if (stageAppend.status === "CONFLICT") throw new Error("POPULATION_RESUME_STAGE_EVENT_CONFLICT")
        await sql`UPDATE control.population_units SET current_state=${resumedState},updated_at=${input.now} WHERE unit_id=${input.unitId}`
        let checkpointId: string | null = null
        if (stage !== "SOURCE_ACQUISITION") {
          checkpointId = eventId("resume-checkpoint", `${input.unitId}:${lease.fencingToken}:${stage}:${lineageChecksum}`)
          const checkpointType = stage === "CANDIDATE_LINEAGE" ? "RAW_BOUNDARY" : "CANDIDATE_BOUNDARY"
          const candidateCursor = stage === "CANONICAL_COMMIT" ? candidates.at(-1)?.candidateId ?? null : null
          await sql`INSERT INTO control.population_checkpoints(checkpoint_id,job_id,run_id,unit_id,fencing_token,checkpoint_type,completed_stage,raw_manifest_id,candidate_cursor,canonical_submission_id,last_outcome_id,created_at) VALUES(${checkpointId},${unit.job_id},${unit.run_id},${input.unitId},${lease.fencingToken},${checkpointType},${resumedState},${rawObjectId},${candidateCursor},NULL,NULL,${input.now}) ON CONFLICT(checkpoint_id) DO NOTHING`
          await sql`UPDATE control.population_units SET current_checkpoint_id=${checkpointId} WHERE unit_id=${input.unitId}`
        }
        return Object.freeze({ stage, jobId: unit.job_id, runId: unit.run_id, unitId: input.unitId, lease, retrievalAttempt: attempt, rawObjectId, candidates, checkpointId, lineageChecksum })
      })
    },
    async recoverPopulationUnitLease(input) {
      return client.transaction(async (sql) => {
        const rows = await sql<{ readonly current_state: string; readonly current_fencing_token: number; readonly active_lease_id: string | null; readonly expires_at: string | null; readonly released_at: string | null }[]>`SELECT u.current_state::text,u.current_fencing_token,u.active_lease_id,l.expires_at,l.released_at FROM control.population_units u JOIN control.population_runs r ON r.job_id=u.job_id LEFT JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE u.unit_id=${input.unitId} AND r.run_id=${input.runId} AND r.current_state='RUNNING' FOR UPDATE OF u`
        const row = rows[0]
        if (!row || ["COMPLETED", "FAILED", "QUARANTINED", "CANCELLED"].includes(row.current_state)) return null
        if (row.active_lease_id && !row.released_at && row.expires_at && Date.parse(row.expires_at) > Date.parse(input.now)) return null
        if (row.active_lease_id && !row.released_at) await sql`UPDATE control.population_leases SET released_at=${input.now},release_reason='EXPIRED' WHERE lease_id=${row.active_lease_id} AND released_at IS NULL`
        if (row.current_state !== "PENDING" && row.current_state !== "RETRYABLE") {
          await sql`UPDATE control.population_units SET current_state='RETRYABLE',active_lease_id=NULL,updated_at=${input.now} WHERE unit_id=${input.unitId}`
          await sql`INSERT INTO control.population_unit_events(event_id,unit_id,run_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at,details) VALUES(${eventId("lineage-resume",`${input.unitId}:${row.current_fencing_token}:${input.now}`)},${input.unitId},${input.runId},'LINEAGE_RESUME_READY',${row.current_state},'RETRYABLE',${row.current_fencing_token || null},${input.ownerId},${input.now},${sql.json({ reason: "RECOVER_DURABLE_LINEAGE" })})`
        }
        const claimed = await sql<{ readonly unit_id: string; readonly lease_id: string; readonly fencing_token: number }[]>`SELECT * FROM control.claim_population_unit(${input.ownerId},${input.runId},${input.now},${input.expiresAt})`
        const value = claimed.find((candidate) => candidate.unit_id === input.unitId)
        if (!value) throw new Error("RECOVERED_POPULATION_UNIT_NOT_CLAIMED")
        return Object.freeze({ unitId: value.unit_id, leaseId: value.lease_id, fencingToken: Number(value.fencing_token) })
      })
    },
    async recordRecoverableLineageFailure(input) {
      return client.transaction(async (sql) => {
        const failureId = eventId("lineage-failure", `${input.unitId}:${input.fencingToken}:${input.classification}`)
        const existing = await sql<Record<string, unknown>[]>`SELECT event_id,unit_id,run_id,event_type,previous_state::text,next_state::text,fencing_token,actor_id,occurred_at,details FROM control.population_unit_events WHERE event_id=${failureId} FOR UPDATE`
        if (existing[0]) {
          const stable = normalizedEvent(existing[0]), expectedSubset = { unitId: input.unitId, eventType: "STAGE_FAILURE", nextState: "RETRYABLE", fencingToken: input.fencingToken, actorId: input.ownerId, classification: input.classification }
          const actualSubset = { unitId: stable.unitId, eventType: stable.eventType, nextState: stable.nextState, fencingToken: stable.fencingToken, actorId: stable.actorId, classification: (stable.details as Record<string, unknown>).classification }
          return Object.freeze({ status: canonicalChecksum(actualSubset) === canonicalChecksum(expectedSubset) ? "DUPLICATE" as const : "CONFLICT" as const, checksum: canonicalChecksum(stable) })
        }
        await assertLease(sql, input.unitId, input.leaseId, input.ownerId, input.fencingToken, input.at)
        const current = await sql<{ readonly job_id: string; readonly current_state: string; readonly run_id: string; readonly raw_manifest_id: string | null; readonly candidate_cursor: string | null }[]>`
          SELECT u.job_id,u.current_state::text,r.run_id,
            (SELECT a.raw_manifest_id FROM control.retrieval_attempts a WHERE a.unit_id=u.unit_id ORDER BY a.started_at,a.attempt_id LIMIT 1) raw_manifest_id,
            (SELECT c.candidate_id FROM population.candidates c WHERE c.unit_id=u.unit_id ORDER BY c.candidate_id DESC LIMIT 1) candidate_cursor
          FROM control.population_units u JOIN control.population_runs r ON r.job_id=u.job_id WHERE u.unit_id=${input.unitId} FOR UPDATE OF u`
        if (!current[0]) throw new Error("POPULATION_UNIT_MISSING")
        const row = current[0], checkpointType = row.candidate_cursor ? "CANDIDATE_BOUNDARY" : row.raw_manifest_id ? "RAW_BOUNDARY" : null
        const completedStage = row.candidate_cursor ? "CANDIDATES_READY" : row.raw_manifest_id ? "RAW_PERSISTED" : row.current_state
        let checkpointId: string | null = null
        if (checkpointType) {
          checkpointId = eventId("failure-checkpoint", `${input.unitId}:${input.fencingToken}:${input.classification}:${row.raw_manifest_id}:${row.candidate_cursor ?? "none"}`)
          await sql`INSERT INTO control.population_checkpoints(checkpoint_id,job_id,run_id,unit_id,fencing_token,checkpoint_type,completed_stage,raw_manifest_id,candidate_cursor,canonical_submission_id,last_outcome_id,created_at) VALUES(${checkpointId},${row.job_id},${row.run_id},${input.unitId},${input.fencingToken},${checkpointType},${completedStage},${row.raw_manifest_id},${row.candidate_cursor},NULL,NULL,${input.at}) ON CONFLICT(checkpoint_id) DO NOTHING`
        }
        const failureEvent: PopulationUnitEventInput = { eventId: failureId, unitId: input.unitId, runId: row.run_id, eventType: "STAGE_FAILURE", previousState: row.current_state, nextState: "RETRYABLE", fencingToken: input.fencingToken, actorId: input.ownerId, occurredAt: input.at, details: { classification: input.classification, checkpointId, completedStage } }
        const appended = await appendImmutableUnitEvent(sql, failureEvent)
        if (appended.status === "CONFLICT") return appended
        await sql`UPDATE control.population_leases SET released_at=${input.at},release_reason='FAILED' WHERE lease_id=${input.leaseId} AND released_at IS NULL`
        await sql`UPDATE control.population_units SET current_state='RETRYABLE',active_lease_id=NULL,current_checkpoint_id=COALESCE(${checkpointId},current_checkpoint_id),updated_at=${input.at} WHERE unit_id=${input.unitId}`
        return appended
      })
    },
    async probeBoundedAcquisitionLineage(input) {
      const attemptId = input.retrievalAttempt.attemptId
      const candidateIds = input.candidates.map((candidate) => candidate.candidateId)
      try {
        await client.transaction(async (sql) => {
          const result = await persistBounded(sql, input)
          if (result.transactionOutcome === "CONFLICT") throw new Error("BOUNDED_LINEAGE_PROBE_CONFLICT")
          const verified = await sql<{ readonly count: number }[]>`SELECT count(*)::int count FROM population.candidates WHERE retrieval_attempt_id=${result.persistedRetrievalAttemptId} AND candidate_id=ANY(${sql.array(candidateIds)})`
          if (verified[0]?.count !== candidateIds.length) throw new Error("BOUNDED_LINEAGE_PROBE_NOT_ATTRIBUTABLE")
          throw new Error("BOUNDED_LINEAGE_PROBE_ROLLBACK")
        })
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "BOUNDED_LINEAGE_PROBE_ROLLBACK") throw error
      }
      const retained = await client.sql<{ readonly count: number }[]>`SELECT ((SELECT count(*) FROM control.retrieval_attempts WHERE attempt_id=${attemptId})+(SELECT count(*) FROM population.candidates WHERE candidate_id=ANY(${client.sql.array(candidateIds)})))::int count`
      if (retained[0]?.count !== 0) throw new Error("BOUNDED_LINEAGE_PROBE_RETAINED_ROWS")
      return Object.freeze({ passed: true as const, retainedRows: 0 as const })
    },
    async auditBoundedAcquisitionLineage(intervalStart, intervalEnd, requestedBy) {
      const units = await client.sql<{ readonly unit_id: string; readonly run_id: string; readonly dataset_id: string; readonly subject_or_symbol: string; readonly current_state: string; readonly current_fencing_token: number; readonly active_lease_id: string | null; readonly expires_at: string | null; readonly released_at: string | null; readonly current_checkpoint_id: string | null; readonly retrieval_attempts: number; readonly candidates: number; readonly committed_outcomes: number }[]>`SELECT u.unit_id,r.run_id,u.dataset_id,u.subject_or_symbol,u.current_state::text,u.current_fencing_token,u.active_lease_id,l.expires_at,l.released_at,u.current_checkpoint_id,(SELECT count(*)::int FROM control.retrieval_attempts a WHERE a.unit_id=u.unit_id) retrieval_attempts,(SELECT count(*)::int FROM population.candidates c WHERE c.unit_id=u.unit_id) candidates,(SELECT count(DISTINCT o.candidate_id)::int FROM control.population_outcomes o WHERE o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE')) committed_outcomes FROM control.population_units u JOIN control.population_jobs j ON j.job_id=u.job_id JOIN control.population_runs r ON r.job_id=j.job_id LEFT JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE j.requested_by=${requestedBy} AND u.window_start=${intervalStart} AND u.window_end=${intervalEnd} ORDER BY u.dataset_id,u.subject_or_symbol,u.unit_id`
      const mapped = Object.freeze(units.map((row) => { const attempts = Number(row.retrieval_attempts), candidates = Number(row.candidates), outcomes = Number(row.committed_outcomes); const resumeStage: PopulationResumeStage = attempts === 0 ? "SOURCE_ACQUISITION" : candidates === 0 ? "CANDIDATE_LINEAGE" : outcomes >= candidates ? "COMPLETE" : "CANONICAL_COMMIT"; return Object.freeze({ unitId: row.unit_id, runId: row.run_id, dataset: row.dataset_id, instrument: row.subject_or_symbol, state: row.current_state, resumeStage, fencingToken: Number(row.current_fencing_token), activeLease: Boolean(row.active_lease_id && !row.released_at && row.expires_at && Date.parse(row.expires_at) > Date.now()), leaseExpired: Boolean(row.active_lease_id && !row.released_at && row.expires_at && Date.parse(row.expires_at) <= Date.now()), checkpointId: row.current_checkpoint_id, retrievalAttempts: attempts, candidates }) }))
      const retrievalAttempts = mapped.reduce((sum, row) => sum + row.retrievalAttempts, 0), candidates = mapped.reduce((sum, row) => sum + row.candidates, 0)
      const rawObjects = await client.sql<{ readonly count: number }[]>`SELECT count(DISTINCT raw_manifest_id)::int count FROM control.retrieval_attempts a JOIN control.population_units u ON u.unit_id=a.unit_id JOIN control.population_jobs j ON j.job_id=u.job_id WHERE j.requested_by=${requestedBy} AND u.window_start=${intervalStart} AND u.window_end=${intervalEnd} AND raw_manifest_id IS NOT NULL`
      return Object.freeze({ units: mapped, retrievalAttempts, rawObjects: Number(rawObjects[0]?.count ?? 0), candidates, unattributedRawObjects: 0 })
    },
    async appendValidation(v) { await client.sql`INSERT INTO quality.candidate_validation_results(validation_run_id,candidate_id,retrieval_attempt_id,validation_layer,rule_id,rule_version,outcome,blocking,failure_routing,policy_version_id,diagnostics,created_at) VALUES(${v.validationRunId},${v.candidateId},${v.retrievalAttemptId},${v.layer},${v.ruleId},${v.ruleVersion},${v.outcome},${v.blocking},${v.failureRouting},${v.policyVersionId},${client.sql.json(v.diagnostics)},${v.createdAt})` },
    async appendQuality(q) { await client.transaction(async (sql) => { await sql`INSERT INTO quality.candidate_evaluation_runs(evaluation_run_id,unit_id,policy_version_id,provider_certification_snapshot_id,created_at) VALUES(${q.evaluationRunId},${q.unitId},${q.policyVersionId},${q.providerCertificationSnapshotId},${q.createdAt}) ON CONFLICT DO NOTHING`; await sql`INSERT INTO quality.candidate_evaluation_results(quality_result_id,evaluation_run_id,candidate_id,result_level,rule_id,rule_version,outcome,created_at) VALUES(${q.qualityResultId},${q.evaluationRunId},${q.candidateId},${q.level},${q.ruleId},${q.ruleVersion},${q.outcome},${q.createdAt})` }) },
    async createSubmission(submissionId,candidateId,idempotencyKey,submittedAt) { const rows = await client.sql`INSERT INTO population.canonical_submissions(submission_id,candidate_id,idempotency_key,result_status,submitted_at) VALUES(${submissionId},${candidateId},${idempotencyKey},'PENDING',${submittedAt}) ON CONFLICT(candidate_id) DO NOTHING RETURNING submission_id`; return rows.length ? "CREATED" : "DUPLICATE" },
    async recordD2Result(input) { const outcome = mapCommitResult(input.result,input.candidateId,input.outcomeId,input.createdAt); await client.transaction(async (sql) => { await assertLease(sql,input.unitId,input.leaseId,input.ownerId,input.fencingToken,input.createdAt); const commitId = outcome.kind === "COMMITTED" ? outcome.commitId : null; const recordId = outcome.kind === "COMMITTED" || outcome.kind === "DUPLICATE" ? outcome.canonicalRecordId : null; const version = outcome.kind === "COMMITTED" || outcome.kind === "DUPLICATE" ? outcome.recordVersion : null; await sql`UPDATE population.canonical_submissions SET result_status=${input.result.status},canonical_commit_id=${commitId},canonical_record_id=${recordId},record_version=${version},resolved_at=${input.createdAt} WHERE submission_id=${input.submissionId}`; await sql`INSERT INTO control.population_outcomes(outcome_id,job_id,run_id,unit_id,candidate_id,retrieval_attempt_id,raw_manifest_id,submission_id,outcome_kind,d2_result_status,canonical_commit_id,conflict_id,quarantine_id,fencing_token,reason_codes,created_at) VALUES(${input.outcomeId},${input.jobId},${input.runId},${input.unitId},${input.candidateId},${input.retrievalAttemptId},${input.rawManifestId},${input.submissionId},${outcome.kind},${input.result.status},${commitId},${outcome.kind === "CONFLICT" ? outcome.conflictId : null},${outcome.kind === "CONFLICT" ? outcome.quarantineId : null},${input.fencingToken},${sql.array(outcome.kind === "PERMANENT_FAILURE" || outcome.kind === "QUARANTINED" || outcome.kind === "EMPTY" || outcome.kind === "UNSUPPORTED" || outcome.kind === "CANCELLED" || outcome.kind === "SKIPPED_BY_POLICY" ? [...outcome.reasonCodes] : [])},${input.createdAt})`; const next = outcome.kind === "COMMITTED" || outcome.kind === "DUPLICATE" ? "COMPLETED" : outcome.kind === "CONFLICT" || outcome.kind === "QUARANTINED" ? "QUARANTINED" : outcome.kind === "RETRYABLE_FAILURE" ? "RETRYABLE" : "FAILED"; await sql`UPDATE control.population_units SET current_state=${next},updated_at=${input.createdAt} WHERE unit_id=${input.unitId}`; await sql`INSERT INTO control.population_unit_events(event_id,unit_id,run_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at,details) VALUES(${eventId("outcome",input.outcomeId)},${input.unitId},${input.runId},'UNIT_OUTCOME','PROCESSING',${next},${input.fencingToken},${input.ownerId},${input.createdAt},${sql.json({ outcomeId: input.outcomeId })})` }); return outcome },
    async recordIntermediateD2Result(input) { const outcome = mapCommitResult(input.result,input.candidateId,input.outcomeId,input.createdAt); if (outcome.kind !== "COMMITTED" && outcome.kind !== "DUPLICATE") throw new Error("INTERMEDIATE_RESULT_NOT_AUTHORITATIVE"); await client.transaction(async (sql) => { await assertLease(sql,input.unitId,input.leaseId,input.ownerId,input.fencingToken,input.createdAt); const commitId = outcome.kind === "COMMITTED" ? outcome.commitId : null; await sql`UPDATE population.canonical_submissions SET result_status=${input.result.status},canonical_commit_id=${commitId},canonical_record_id=${outcome.canonicalRecordId},record_version=${outcome.recordVersion},resolved_at=${input.createdAt} WHERE submission_id=${input.submissionId}`; await sql`INSERT INTO control.population_outcomes(outcome_id,job_id,run_id,unit_id,candidate_id,retrieval_attempt_id,raw_manifest_id,submission_id,outcome_kind,d2_result_status,canonical_commit_id,conflict_id,quarantine_id,fencing_token,reason_codes,created_at) VALUES(${input.outcomeId},${input.jobId},${input.runId},${input.unitId},${input.candidateId},${input.retrievalAttemptId},${input.rawManifestId},${input.submissionId},${outcome.kind},${input.result.status},${commitId},NULL,NULL,${input.fencingToken},${sql.array([])},${input.createdAt})` }); return outcome },
    async finalizeSegment(input) { await client.transaction(async (sql) => { const { checkpoint, decision } = input; if (checkpoint.unitId !== decision.unitId || checkpoint.fencingToken !== input.fencingToken || checkpoint.checkpointType !== "CANONICAL_BOUNDARY" || checkpoint.completedStage !== "COMPLETED" || checkpoint.lastOutcomeId !== input.outcomeId || decision.outcomeIds.length !== 1 || decision.outcomeIds[0] !== input.outcomeId || decision.result !== "ELIGIBLE" || decision.blockingReasons.length) throw new Error("SEGMENT_FINALIZATION_INVALID"); await assertLease(sql,checkpoint.unitId,input.leaseId,input.ownerId,input.fencingToken,input.completedAt); const outcomes = await sql`SELECT 1 FROM control.population_outcomes WHERE outcome_id=${input.outcomeId} AND job_id=${checkpoint.jobId} AND run_id=${checkpoint.runId} AND unit_id=${checkpoint.unitId} AND fencing_token=${input.fencingToken} AND submission_id=${checkpoint.canonicalSubmissionId} AND raw_manifest_id IS NOT DISTINCT FROM ${checkpoint.rawManifestId} AND outcome_kind IN ('COMMITTED','DUPLICATE') FOR KEY SHARE`; if (!outcomes.length) throw new Error("SEGMENT_OUTCOME_NOT_FINALIZABLE"); await sql`INSERT INTO coverage.watermark_eligibility_decisions(decision_id,unit_id,dataset_id,provider_id,bounded_dimensions,outcome_ids,required_unit_policy_id,eligibility_result,blocking_reasons,policy_version_id,created_at) VALUES(${decision.decisionId},${decision.unitId},${decision.datasetId},${decision.providerId},${sql.json(decision.dimensions)},${sql.array([...decision.outcomeIds])},${decision.requiredUnitPolicyId},${decision.result},${sql.array([...decision.blockingReasons])},${decision.policyVersionId},${decision.createdAt})`; await sql`INSERT INTO control.population_checkpoints(checkpoint_id,job_id,run_id,unit_id,fencing_token,checkpoint_type,completed_stage,raw_manifest_id,candidate_cursor,canonical_submission_id,last_outcome_id,created_at) VALUES(${checkpoint.checkpointId},${checkpoint.jobId},${checkpoint.runId},${checkpoint.unitId},${checkpoint.fencingToken},${checkpoint.checkpointType},${checkpoint.completedStage},${checkpoint.rawManifestId},${checkpoint.candidateCursor},${checkpoint.canonicalSubmissionId},${checkpoint.lastOutcomeId},${checkpoint.createdAt})`; const completed = await sql`UPDATE control.population_units SET current_state='COMPLETED',current_checkpoint_id=${checkpoint.checkpointId},active_lease_id=NULL,updated_at=${input.completedAt} WHERE unit_id=${checkpoint.unitId} AND current_state='PROCESSING' RETURNING unit_id`; if (!completed.length) throw new Error("SEGMENT_UNIT_NOT_PROCESSING"); await sql`UPDATE control.population_leases SET released_at=${input.completedAt},release_reason='COMPLETED' WHERE lease_id=${input.leaseId} AND unit_id=${checkpoint.unitId} AND owner_id=${input.ownerId} AND fencing_token=${input.fencingToken} AND released_at IS NULL`; await sql`INSERT INTO control.population_unit_events(event_id,unit_id,run_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at,details) VALUES(${eventId("segment-completed",input.outcomeId)},${checkpoint.unitId},${checkpoint.runId},'UNIT_COMPLETED','PROCESSING','COMPLETED',${input.fencingToken},${input.ownerId},${input.completedAt},${sql.json({ checkpointId: checkpoint.checkpointId, decisionId: decision.decisionId, outcomeId: input.outcomeId })})` }) },
    async scheduleRetry(i) { await client.sql`INSERT INTO control.retry_events(retry_event_id,job_id,run_id,unit_id,candidate_id,classification_id,retry_policy_id,retry_policy_version,retry_after,created_at) VALUES(${i.retryEventId},${i.jobId},${i.runId},${i.unitId},${i.candidateId},${i.classificationId},${i.policyId},${i.policyVersion},${i.retryAfter},${i.createdAt})` },
    async requestCancellation(jobId,eventIdentity,actorId,at) { await client.transaction(async (sql) => { const jobs=await sql<{readonly current_state:string}[]>`SELECT current_state::text FROM control.population_jobs WHERE job_id=${jobId} FOR UPDATE`;if(!jobs[0]||["SUCCEEDED","FAILED","CANCELLED","EXPIRED"].includes(jobs[0].current_state))return; const affected=await sql<{readonly unit_id:string;readonly current_state:string}[]>`SELECT unit_id,current_state::text FROM control.population_units WHERE job_id=${jobId} AND current_state NOT IN ('COMPLETED','FAILED','QUARANTINED','CANCELLED') FOR UPDATE`; await sql`UPDATE control.population_jobs SET current_state='CANCELLED',current_event_id=${eventIdentity},updated_at=${at} WHERE job_id=${jobId}`; await sql`UPDATE control.population_units SET cancellation_requested_at=${at},current_state=CASE WHEN current_state IN ('PENDING','RETRYABLE') THEN 'CANCELLED' ELSE current_state END,updated_at=${at} WHERE job_id=${jobId} AND current_state NOT IN ('COMPLETED','FAILED','QUARANTINED','CANCELLED')`; for(const unit of affected){const next=unit.current_state==="PENDING"||unit.current_state==="RETRYABLE"?"CANCELLED":unit.current_state;await sql`INSERT INTO control.population_unit_events(event_id,unit_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${eventId("unit-cancel",`${eventIdentity}:${unit.unit_id}`)},${unit.unit_id},'CANCELLATION_REQUESTED',${unit.current_state},${next},${actorId},${at})`} await sql`INSERT INTO control.population_job_events(event_id,job_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${eventIdentity},${jobId},'CANCELLATION_REQUESTED',${jobs[0].current_state},'CANCELLED',${actorId},${at}) ON CONFLICT DO NOTHING` }) },
    async aggregateJob(jobId,at) { return client.transaction(async(sql)=>{const rows=await sql<{ readonly current_state: PopulationUnit["currentState"]; readonly required: boolean }[]>`SELECT current_state,required FROM control.population_units WHERE job_id=${jobId} ORDER BY unit_id`; const state=aggregateJobState(rows.map(r=>r.current_state),rows.map(r=>r.required));const job=await sql<{readonly current_state:string}[]>`SELECT current_state::text FROM control.population_jobs WHERE job_id=${jobId} FOR UPDATE`;if(!job[0])throw new Error("JOB_MISSING");if(job[0].current_state!==state){const id=eventId("job-aggregate",`${jobId}:${state}:${at}`);await sql`UPDATE control.population_jobs SET current_state=${state},current_event_id=${id},updated_at=${at} WHERE job_id=${jobId}`;await sql`INSERT INTO control.population_job_events(event_id,job_id,event_type,previous_state,next_state,actor_id,occurred_at) VALUES(${id},${jobId},'JOB_AGGREGATED',${job[0].current_state},${state},'coordinator',${at})`}return state}) },
    async writeWatermarkDecision(d) { await client.sql`INSERT INTO coverage.watermark_eligibility_decisions(decision_id,unit_id,dataset_id,provider_id,bounded_dimensions,outcome_ids,required_unit_policy_id,eligibility_result,blocking_reasons,policy_version_id,created_at) VALUES(${d.decisionId},${d.unitId},${d.datasetId},${d.providerId},${client.sql.json(d.dimensions)},${client.sql.array([...d.outcomeIds])},${d.requiredUnitPolicyId},${d.result},${client.sql.array([...d.blockingReasons])},${d.policyVersionId},${d.createdAt})` },
    async readResumableUnits(jobId) { const rows = await client.sql<{ readonly unit_id: string }[]>`SELECT unit_id FROM control.population_units WHERE job_id=${jobId} AND current_state IN ('PENDING','RETRYABLE') AND cancellation_requested_at IS NULL ORDER BY unit_id`; return rows.map(r=>r.unit_id) },
    async reconcileJob(jobId) { const rows = await client.sql<{ readonly current_state: string; readonly event_state: string | null }[]>`SELECT j.current_state::text current_state,(SELECT next_state::text FROM control.population_job_events e WHERE e.job_id=j.job_id ORDER BY occurred_at DESC,event_id DESC LIMIT 1) event_state FROM control.population_jobs j WHERE j.job_id=${jobId}`; const reasons = !rows[0] ? ["JOB_MISSING"] : rows[0].current_state !== rows[0].event_state ? ["JOB_STATE_EVENT_MISMATCH"] : []; return { consistent: reasons.length===0,reasons } },
    async reconcileRun(runId) { const rows=await client.sql<{readonly current_state:string;readonly event_state:string|null}[]>`SELECT r.current_state::text current_state,(SELECT next_state::text FROM control.population_run_events e WHERE e.run_id=r.run_id ORDER BY occurred_at DESC,event_id DESC LIMIT 1) event_state FROM control.population_runs r WHERE r.run_id=${runId}`;const reasons=!rows[0]?["RUN_MISSING"]:rows[0].current_state!==rows[0].event_state?["RUN_STATE_EVENT_MISMATCH"]:[];return{consistent:reasons.length===0,reasons} },
    async reconcileUnit(unitId) { const rows = await client.sql<{ readonly current_state: string; readonly event_state: string | null }[]>`SELECT u.current_state::text current_state,(SELECT next_state::text FROM control.population_unit_events e WHERE e.unit_id=u.unit_id ORDER BY occurred_at DESC,event_id DESC LIMIT 1) event_state FROM control.population_units u WHERE u.unit_id=${unitId}`; const reasons = !rows[0] ? ["UNIT_MISSING"] : rows[0].current_state !== rows[0].event_state ? ["UNIT_STATE_EVENT_MISMATCH"] : []; return { consistent: reasons.length===0,reasons } },
  })
}
