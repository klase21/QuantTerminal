import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type postgres from "postgres"

export const EXECUTION_GENERATION_QUARANTINE_VERSION = "mvp-execution-generation-quarantine/1.0.0" as const
export const LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT = "LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT" as const

export type ExecutionGenerationDisposition = "ACTIVE" | "QUARANTINED" | "SUPERSEDED"
export type ExecutionGenerationQuarantineStatus = "CREATED" | "DUPLICATE" | "CONFLICT"
export type ExecutionGenerationQuarantineSagaState = "INTENT_RECORDED" | "POPULATION_FENCED" | "COMPLETE"
export type ExecutionGenerationQuarantineSagaStep = "POPULATION_FENCING" | "QUARANTINE_COMPLETED_RECEIPT"

type SqlExecutor = postgres.Sql | postgres.TransactionSql

interface TransactionalClient {
  readonly sql: postgres.Sql
  transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T>
}

export interface ExecutionGenerationLineageCounts {
  readonly refreshUnits: number
  readonly populationRunAttempts: number
  readonly populationUnits: number
  readonly retrievalAttempts: number
  readonly rawObjects: number
  readonly candidates: number
  readonly canonicalFacts: number
  readonly downstreamOutputs: number
  readonly replayOutputs: number
  readonly watermarks: number
  readonly manifests: number
}

export interface ExecutionGenerationIncidentSnapshot {
  readonly generationId: string
  readonly planId: string
  readonly planChecksum: string
  readonly runId: string
  readonly runChecksum: string
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly refreshUnitIds: readonly string[]
  readonly populationRunAttemptIds: readonly string[]
  readonly populationUnitIds: readonly string[]
  readonly retrievalAttemptIds: readonly string[]
  readonly rawObjectIdentities: readonly { readonly identity: string; readonly checksum: string }[]
  readonly candidateIds: readonly string[]
  readonly leaseEvidence: readonly {
    readonly leaseId: string
    readonly unitId: string
    readonly ownerId: string
    readonly fence: number
    readonly acquiredAt: string
    readonly expiresAt: string
    readonly releasedAt: string | null
  }[]
  readonly checkpointCount: number
  readonly failureEventCount: number
  readonly activeLeaseCount: number
  readonly unreleasedLeaseCount: number
  readonly lineageCounts: ExecutionGenerationLineageCounts
  readonly commonWatermark: null
  readonly servingCandidate: null
  readonly productionMutation: false
}

export interface ExecutionGenerationQuarantineProposal {
  readonly version: typeof EXECUTION_GENERATION_QUARANTINE_VERSION
  readonly disposition: "QUARANTINED"
  readonly generationId: string
  readonly planId: string
  readonly runId: string
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly reasonCode: typeof LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT
  readonly incidentChecksum: string
  readonly evidenceSummaryChecksum: string
  readonly sourceCommitSha: string
  readonly operatorConfirmationIdentity: string
  readonly snapshot: ExecutionGenerationIncidentSnapshot
}

export interface PersistedExecutionGenerationDisposition {
  readonly disposition: ExecutionGenerationDisposition
  readonly generationId: string
  readonly planId: string
  readonly runId: string
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly reasonCode: string
  readonly incidentChecksum: string
  readonly sourceCommitSha: string
  readonly quarantinedAt: string
  readonly operatorConfirmationIdentity: string
  readonly evidenceSummaryChecksum: string
}

export interface ExecutionGenerationQuarantineReceipt {
  readonly status: Exclude<ExecutionGenerationQuarantineStatus, "CONFLICT">
  readonly disposition: "QUARANTINED"
  readonly record: PersistedExecutionGenerationDisposition
  readonly releasedPopulationLeases: number
  readonly appendedPopulationEvents: number
  readonly quarantineSagaState: ExecutionGenerationQuarantineSagaState
  readonly missingQuarantineSteps: readonly ExecutionGenerationQuarantineSagaStep[]
  readonly quarantineReceiptId: string | null
  readonly resumeEligible: false
  readonly productionMutation: false
}

export interface ExecutionGenerationQuarantineSagaStatus {
  readonly disposition: "QUARANTINED"
  readonly quarantineSagaState: ExecutionGenerationQuarantineSagaState
  readonly missingQuarantineSteps: readonly ExecutionGenerationQuarantineSagaStep[]
  readonly quarantineReceiptId: string | null
  readonly populationUnitCount: number
  readonly populationFencingEventCount: number
  readonly activePopulationLeases: number
  readonly incidentChecksum: string
  readonly resumeEligible: false
}

export type ExecutionGenerationQuarantineFailurePoint = "AFTER_INTENT_RECORDED" | "AFTER_POPULATION_FENCED" | "AFTER_QUARANTINE_COMPLETED"

export interface CleanGenerationInputManifest {
  readonly schemaVersion: "mvp-clean-generation-input/1.0.0"
  readonly sourceGenerationId: string
  readonly certifiedPlanContext: { readonly planId: string; readonly planChecksum: string }
  readonly targetInterval: { readonly start: string; readonly end: string }
  readonly logicalSlotIds: readonly string[]
  readonly reusableRawPayloadBytes: readonly { readonly identity: string; readonly checksum: string }[]
  readonly excludedExecutionIdentities: {
    readonly populationRunAttempts: readonly string[]
    readonly retrievalAttempts: readonly string[]
    readonly candidates: readonly string[]
    readonly checkpoints: readonly string[]
  }
  readonly freshLineagePolicy: "FRESH_RETRIEVAL_CANDIDATE_FACT_DOWNSTREAM_WATERMARK_REPLAY_MANIFEST"
  readonly checksum: string
}

const asIso = (value: string): string => new Date(value).toISOString()
const sorted = (values: readonly string[]): readonly string[] => Object.freeze([...values].sort())
function parsedJson(value: unknown): unknown { let parsed = value; for (let index = 0; index < 2 && typeof parsed === "string"; index++) parsed = JSON.parse(parsed); return parsed }

function quarantinePopulationEventId(runId: string, unitId: string): string {
  return `population-generation-quarantine:${canonicalChecksum({ generationId: runId, unitId })}`
}

function quarantineReceiptId(runId: string, incidentChecksum: string): string {
  return `mre_${canonicalChecksum({ kind: "EXECUTION_GENERATION_QUARANTINE_COMPLETED", runId, incidentChecksum })}`
}

function dispositionPayload(value: unknown): PersistedExecutionGenerationDisposition {
  const parsed = parsedJson(value)
  if (!parsed || typeof parsed !== "object") throw new Error("EXECUTION_GENERATION_DISPOSITION_INVALID:OBJECT")
  const row = parsed as Partial<PersistedExecutionGenerationDisposition>
  if (row.disposition !== "QUARANTINED" && row.disposition !== "SUPERSEDED") throw new Error("EXECUTION_GENERATION_DISPOSITION_INVALID:DISPOSITION")
  for (const key of ["generationId", "planId", "runId", "intervalStart", "intervalEnd", "reasonCode", "incidentChecksum", "sourceCommitSha", "quarantinedAt", "operatorConfirmationIdentity", "evidenceSummaryChecksum"] as const) if (typeof row[key] !== "string" || !row[key]) throw new Error(`EXECUTION_GENERATION_DISPOSITION_INVALID:${key.toUpperCase()}`)
  return Object.freeze(row as PersistedExecutionGenerationDisposition)
}

function equivalentDisposition(existing: PersistedExecutionGenerationDisposition, proposal: ExecutionGenerationQuarantineProposal): boolean {
  return existing.disposition === proposal.disposition
    && existing.generationId === proposal.generationId
    && existing.planId === proposal.planId
    && existing.runId === proposal.runId
    && existing.intervalStart === proposal.intervalStart
    && existing.intervalEnd === proposal.intervalEnd
    && existing.reasonCode === proposal.reasonCode
    && existing.incidentChecksum === proposal.incidentChecksum
    && existing.sourceCommitSha === proposal.sourceCommitSha
    && existing.operatorConfirmationIdentity === proposal.operatorConfirmationIdentity
    && existing.evidenceSummaryChecksum === proposal.evidenceSummaryChecksum
}

export async function readExecutionGenerationDisposition(refresh: Pick<TransactionalClient, "sql">, runId: string): Promise<PersistedExecutionGenerationDisposition | null> {
  const rows = await refresh.sql.unsafe<Array<{ payload: unknown }>>("SELECT payload FROM refresh_control.refresh_event WHERE run_id=$1 AND entity_kind='execution_generation' AND entity_id=$1 AND event_kind='EXECUTION_GENERATION_DISPOSITION' ORDER BY occurred_at,event_id", [runId])
  if (rows.length > 1) throw new Error("EXECUTION_GENERATION_DISPOSITION_MULTIPLE")
  return rows[0] ? dispositionPayload(rows[0].payload) : null
}

export function createExecutionGenerationQuarantineProposal(input: {
  readonly snapshot: ExecutionGenerationIncidentSnapshot
  readonly reasonCode: typeof LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT
  readonly sourceCommitSha: string
  readonly operatorConfirmationIdentity: string
}): ExecutionGenerationQuarantineProposal {
  if (!/^[0-9a-f]{7,40}$/.test(input.sourceCommitSha)) throw new Error("QUARANTINE_SOURCE_COMMIT_INVALID")
  if (!/^[A-Za-z0-9._:@/-]{3,128}$/.test(input.operatorConfirmationIdentity)) throw new Error("QUARANTINE_OPERATOR_IDENTITY_INVALID")
  const incidentChecksum = canonicalChecksum(input.snapshot)
  const evidenceSummaryChecksum = canonicalChecksum({
    generationId: input.snapshot.generationId,
    planId: input.snapshot.planId,
    runId: input.snapshot.runId,
    intervalStart: input.snapshot.intervalStart,
    intervalEnd: input.snapshot.intervalEnd,
    lineageCounts: input.snapshot.lineageCounts,
    activeLeaseCount: input.snapshot.activeLeaseCount,
    unreleasedLeaseCount: input.snapshot.unreleasedLeaseCount,
    commonWatermark: input.snapshot.commonWatermark,
    servingCandidate: input.snapshot.servingCandidate,
  })
  return Object.freeze({ version: EXECUTION_GENERATION_QUARANTINE_VERSION, disposition: "QUARANTINED", generationId: input.snapshot.generationId, planId: input.snapshot.planId, runId: input.snapshot.runId, intervalStart: input.snapshot.intervalStart, intervalEnd: input.snapshot.intervalEnd, reasonCode: input.reasonCode, incidentChecksum, evidenceSummaryChecksum, sourceCommitSha: input.sourceCommitSha, operatorConfirmationIdentity: input.operatorConfirmationIdentity, snapshot: input.snapshot })
}

export function createCleanGenerationInputManifest(input: { readonly proposal: ExecutionGenerationQuarantineProposal; readonly logicalSlotIds: readonly string[]; readonly checkpointIds: readonly string[] }): CleanGenerationInputManifest {
  const basis = {
    schemaVersion: "mvp-clean-generation-input/1.0.0" as const,
    sourceGenerationId: input.proposal.generationId,
    certifiedPlanContext: { planId: input.proposal.planId, planChecksum: input.proposal.snapshot.planChecksum },
    targetInterval: { start: input.proposal.intervalStart, end: input.proposal.intervalEnd },
    logicalSlotIds: sorted(input.logicalSlotIds),
    reusableRawPayloadBytes: Object.freeze([...input.proposal.snapshot.rawObjectIdentities].sort((a, b) => a.identity.localeCompare(b.identity))),
    excludedExecutionIdentities: {
      populationRunAttempts: sorted(input.proposal.snapshot.populationRunAttemptIds),
      retrievalAttempts: sorted(input.proposal.snapshot.retrievalAttemptIds),
      candidates: sorted(input.proposal.snapshot.candidateIds),
      checkpoints: sorted(input.checkpointIds),
    },
    freshLineagePolicy: "FRESH_RETRIEVAL_CANDIDATE_FACT_DOWNSTREAM_WATERMARK_REPLAY_MANIFEST" as const,
  }
  return Object.freeze({ ...basis, checksum: canonicalChecksum(basis) })
}

export class PostgresExecutionGenerationQuarantineStore {
  constructor(private readonly refresh: TransactionalClient, private readonly population: TransactionalClient, private readonly truth: Pick<TransactionalClient, "sql"> = population) {}

  async readDisposition(runId: string): Promise<PersistedExecutionGenerationDisposition | null> {
    return readExecutionGenerationDisposition(this.refresh, runId)
  }

  async assertResumeEligible(runId: string): Promise<void> {
    const disposition = await this.readDisposition(runId)
    if (disposition?.disposition === "QUARANTINED") throw new Error("EXECUTION_GENERATION_QUARANTINED")
    if (disposition?.disposition === "SUPERSEDED") throw new Error("EXECUTION_GENERATION_SUPERSEDED")
  }

  async inspect(runId: string): Promise<ExecutionGenerationIncidentSnapshot> {
    const runRows = await this.refresh.sql.unsafe<Array<{ run_id: string; run_checksum: string; plan_id: string; plan_checksum: string; requested_start: string; requested_end: string }>>("SELECT r.run_id,r.checksum run_checksum,p.plan_id,p.checksum plan_checksum,p.requested_start::text,p.requested_end::text FROM refresh_control.refresh_run r JOIN refresh_control.refresh_plan p ON p.plan_id=r.plan_id WHERE r.run_id=$1", [runId])
    const run = runRows[0]
    if (!run) throw new Error("EXECUTION_GENERATION_NOT_FOUND")
    const refreshUnits = await this.refresh.sql.unsafe<Array<{ unit_id: string }>>("SELECT unit_id FROM refresh_control.refresh_unit WHERE run_id=$1 ORDER BY unit_id", [runId])
    const refreshCounts = await this.refresh.sql.unsafe<Array<{ artifacts: number; watermarks: number; candidates: number; manifests: number; failures: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_artifact WHERE run_id=$1) artifacts,(SELECT count(*)::int FROM refresh_control.source_watermark WHERE run_id=$1) watermarks,(SELECT count(*)::int FROM refresh_control.refresh_candidate WHERE run_id=$1) candidates,(SELECT count(*)::int FROM refresh_control.release_manifest m JOIN refresh_control.refresh_candidate c ON c.candidate_id=m.candidate_id WHERE c.run_id=$1) manifests,(SELECT count(*)::int FROM refresh_control.refresh_event WHERE run_id=$1 AND event_kind LIKE 'STAGE_FAILURE_%') failures", [runId])
    const jobs = await this.population.sql.unsafe<Array<{ job_id: string }>>("SELECT j.job_id FROM control.population_jobs j WHERE j.intentional_rerun_identity=$1 OR (j.intentional_rerun_identity IS NULL AND j.requested_by='mvp-live-resume' AND EXISTS(SELECT 1 FROM control.population_units u WHERE u.job_id=j.job_id AND u.window_start=$2 AND u.window_end=$3)) ORDER BY j.job_id", [runId, run.requested_start, run.requested_end])
    const jobIds = jobs.map((row) => row.job_id)
    const emptyCounts: ExecutionGenerationLineageCounts = Object.freeze({ refreshUnits: refreshUnits.length, populationRunAttempts: 0, populationUnits: 0, retrievalAttempts: 0, rawObjects: 0, candidates: 0, canonicalFacts: 0, downstreamOutputs: 0, replayOutputs: 0, watermarks: Number(refreshCounts[0]?.watermarks ?? 0), manifests: Number(refreshCounts[0]?.manifests ?? 0) })
    if (!jobIds.length) return Object.freeze({ generationId: runId, planId: run.plan_id, planChecksum: run.plan_checksum, runId, runChecksum: run.run_checksum, intervalStart: asIso(run.requested_start), intervalEnd: asIso(run.requested_end), refreshUnitIds: Object.freeze(refreshUnits.map((row) => row.unit_id)), populationRunAttemptIds: Object.freeze([]), populationUnitIds: Object.freeze([]), retrievalAttemptIds: Object.freeze([]), rawObjectIdentities: Object.freeze([]), candidateIds: Object.freeze([]), leaseEvidence: Object.freeze([]), checkpointCount: 0, failureEventCount: Number(refreshCounts[0]?.failures ?? 0), activeLeaseCount: 0, unreleasedLeaseCount: 0, lineageCounts: emptyCounts, commonWatermark: null, servingCandidate: null, productionMutation: false })
    const populationRuns = await this.population.sql.unsafe<Array<{ run_id: string }>>("SELECT run_id FROM control.population_runs WHERE job_id=ANY($1::text[]) ORDER BY run_id", [jobIds])
    const units = await this.population.sql.unsafe<Array<{ unit_id: string }>>("SELECT unit_id FROM control.population_units WHERE job_id=ANY($1::text[]) ORDER BY unit_id", [jobIds])
    const unitIds = units.map((row) => row.unit_id)
    const retrievals = await this.population.sql.unsafe<Array<{ attempt_id: string; raw_manifest_id: string | null }>>("SELECT attempt_id,raw_manifest_id FROM control.retrieval_attempts WHERE unit_id=ANY($1::text[]) ORDER BY attempt_id", [unitIds])
    const candidates = await this.population.sql.unsafe<Array<{ candidate_id: string }>>("SELECT candidate_id FROM population.candidates WHERE unit_id=ANY($1::text[]) ORDER BY candidate_id", [unitIds])
    const rawIds = sorted(retrievals.flatMap((row) => row.raw_manifest_id ? [row.raw_manifest_id] : []))
    const rawObjects = rawIds.length ? await this.truth.sql.unsafe<Array<{ object_id: string; content_hash: string }>>("SELECT object_id,content_hash FROM raw.objects WHERE object_id=ANY($1::text[]) ORDER BY object_id", [rawIds]) : []
    const leases = await this.population.sql.unsafe<Array<{ lease_id: string; unit_id: string; owner_id: string; fencing_token: number; acquired_at: string; expires_at: string; released_at: string | null; active: boolean }>>("SELECT lease_id,unit_id,owner_id,fencing_token,acquired_at::text,expires_at::text,released_at::text,(released_at IS NULL AND expires_at>now()) active FROM control.population_leases WHERE unit_id=ANY($1::text[]) ORDER BY unit_id,fencing_token", [unitIds])
    const populationCounts = await this.population.sql.unsafe<Array<{ checkpoints: number; failures: number; facts: number; downstream: number }>>("SELECT (SELECT count(*)::int FROM control.population_checkpoints WHERE unit_id=ANY($1::text[])) checkpoints,(SELECT count(*)::int FROM control.population_unit_events WHERE unit_id=ANY($1::text[]) AND event_type LIKE '%FAIL%') failures,(SELECT count(*)::int FROM control.population_outcomes WHERE unit_id=ANY($1::text[]) AND outcome_kind IN ('COMMITTED','DUPLICATE')) facts,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions WHERE unit_id=ANY($1::text[])) downstream", [unitIds])
    const lineageCounts: ExecutionGenerationLineageCounts = Object.freeze({ refreshUnits: refreshUnits.length, populationRunAttempts: populationRuns.length, populationUnits: units.length, retrievalAttempts: retrievals.length, rawObjects: rawObjects.length, candidates: candidates.length, canonicalFacts: Number(populationCounts[0]?.facts ?? 0), downstreamOutputs: Number(populationCounts[0]?.downstream ?? 0), replayOutputs: 0, watermarks: Number(refreshCounts[0]?.watermarks ?? 0), manifests: Number(refreshCounts[0]?.manifests ?? 0) })
    return Object.freeze({ generationId: runId, planId: run.plan_id, planChecksum: run.plan_checksum, runId, runChecksum: run.run_checksum, intervalStart: asIso(run.requested_start), intervalEnd: asIso(run.requested_end), refreshUnitIds: Object.freeze(refreshUnits.map((row) => row.unit_id)), populationRunAttemptIds: Object.freeze(populationRuns.map((row) => row.run_id)), populationUnitIds: Object.freeze(unitIds), retrievalAttemptIds: Object.freeze(retrievals.map((row) => row.attempt_id)), rawObjectIdentities: Object.freeze(rawObjects.map((row) => Object.freeze({ identity: row.object_id, checksum: row.content_hash }))), candidateIds: Object.freeze(candidates.map((row) => row.candidate_id)), leaseEvidence: Object.freeze(leases.map((row) => Object.freeze({ leaseId: row.lease_id, unitId: row.unit_id, ownerId: row.owner_id, fence: Number(row.fencing_token), acquiredAt: asIso(row.acquired_at), expiresAt: asIso(row.expires_at), releasedAt: row.released_at ? asIso(row.released_at) : null }))), checkpointCount: Number(populationCounts[0]?.checkpoints ?? 0), failureEventCount: Number(populationCounts[0]?.failures ?? 0) + Number(refreshCounts[0]?.failures ?? 0), activeLeaseCount: leases.filter((row) => row.active).length, unreleasedLeaseCount: leases.filter((row) => !row.released_at).length, lineageCounts, commonWatermark: null, servingCandidate: null, productionMutation: false })
  }

  async quarantine(input: { readonly proposal: ExecutionGenerationQuarantineProposal; readonly expectedIncidentChecksum: string; readonly quarantinedAt: string; readonly failurePoint?: ExecutionGenerationQuarantineFailurePoint }): Promise<ExecutionGenerationQuarantineReceipt | { readonly status: "CONFLICT" }> {
    if (input.expectedIncidentChecksum !== input.proposal.incidentChecksum) return Object.freeze({ status: "CONFLICT" })
    const existing = await this.readDisposition(input.proposal.runId)
    if (existing && !equivalentDisposition(existing, input.proposal)) return Object.freeze({ status: "CONFLICT" })
    const persisted = existing ?? Object.freeze({ disposition: input.proposal.disposition, generationId: input.proposal.generationId, planId: input.proposal.planId, runId: input.proposal.runId, intervalStart: input.proposal.intervalStart, intervalEnd: input.proposal.intervalEnd, reasonCode: input.proposal.reasonCode, incidentChecksum: input.proposal.incidentChecksum, sourceCommitSha: input.proposal.sourceCommitSha, quarantinedAt: asIso(input.quarantinedAt), operatorConfirmationIdentity: input.proposal.operatorConfirmationIdentity, evidenceSummaryChecksum: input.proposal.evidenceSummaryChecksum })
    const refreshStatus = await this.persistIntent(input.proposal, persisted)
    if (input.failurePoint === "AFTER_INTENT_RECORDED") throw new Error("CERTIFICATION_FAILURE_AFTER_INTENT_RECORDED")
    return this.completeSaga({ record: persisted, status: refreshStatus, actorId: persisted.operatorConfirmationIdentity, completedAt: asIso(input.quarantinedAt), failurePoint: input.failurePoint })
  }

  async reconcile(input: { readonly runId: string; readonly expectedIncidentChecksum: string; readonly operatorConfirmationIdentity: string; readonly reconciledAt: string; readonly failurePoint?: ExecutionGenerationQuarantineFailurePoint }): Promise<ExecutionGenerationQuarantineReceipt | { readonly status: "CONFLICT" }> {
    const record = await this.readDisposition(input.runId)
    if (!record || record.disposition !== "QUARANTINED") throw new Error("EXECUTION_GENERATION_QUARANTINE_INTENT_MISSING")
    if (record.incidentChecksum !== input.expectedIncidentChecksum) return Object.freeze({ status: "CONFLICT" })
    if (!/^[A-Za-z0-9._:@/-]{3,128}$/.test(input.operatorConfirmationIdentity)) throw new Error("QUARANTINE_OPERATOR_IDENTITY_INVALID")
    return this.completeSaga({ record, status: "DUPLICATE", actorId: input.operatorConfirmationIdentity, completedAt: asIso(input.reconciledAt), failurePoint: input.failurePoint })
  }

  async readSagaStatus(runId: string): Promise<ExecutionGenerationQuarantineSagaStatus | null> {
    const record = await this.readDisposition(runId)
    if (!record || record.disposition !== "QUARANTINED") return null
    const units = await this.readPopulationUnits(this.population.sql, record, false)
    const unitIds = units.map((row) => row.unit_id)
    const eventIds = units.map((row) => quarantinePopulationEventId(record.runId, row.unit_id))
    const populationEvents = eventIds.length ? await this.population.sql.unsafe<Array<{ event_id: string }>>("SELECT event_id FROM control.population_unit_events WHERE event_id=ANY($1::text[])", [eventIds]) : []
    const activeRows = unitIds.length ? await this.population.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM control.population_leases WHERE unit_id=ANY($1::text[]) AND released_at IS NULL AND expires_at>now()", [unitIds]) : [{ count: 0 }]
    const activePopulationLeases = Number(activeRows[0]?.count ?? 0)
    const receipts = await this.refresh.sql.unsafe<Array<{ event_id: string; payload: unknown }>>("SELECT event_id,payload FROM refresh_control.refresh_event WHERE run_id=$1 AND entity_kind='execution_generation' AND entity_id=$1 AND event_kind='EXECUTION_GENERATION_QUARANTINE_COMPLETED' ORDER BY occurred_at,event_id", [runId])
    if (receipts.length > 1) throw new Error("EXECUTION_GENERATION_QUARANTINE_RECEIPT_MULTIPLE")
    const populationFenced = populationEvents.length === units.length && activePopulationLeases === 0
    const receipt = receipts[0]
    if (receipt) {
      const payload = parsedJson(receipt.payload) as { incidentChecksum?: string }
      if (payload?.incidentChecksum !== record.incidentChecksum || !populationFenced) throw new Error("EXECUTION_GENERATION_QUARANTINE_SAGA_INCONSISTENT")
    }
    const quarantineSagaState: ExecutionGenerationQuarantineSagaState = receipt ? "COMPLETE" : populationFenced ? "POPULATION_FENCED" : "INTENT_RECORDED"
    const missingQuarantineSteps: ExecutionGenerationQuarantineSagaStep[] = []
    if (!populationFenced) missingQuarantineSteps.push("POPULATION_FENCING")
    if (!receipt) missingQuarantineSteps.push("QUARANTINE_COMPLETED_RECEIPT")
    return Object.freeze({ disposition: "QUARANTINED", quarantineSagaState, missingQuarantineSteps: Object.freeze(missingQuarantineSteps), quarantineReceiptId: receipt?.event_id ?? null, populationUnitCount: units.length, populationFencingEventCount: populationEvents.length, activePopulationLeases, incidentChecksum: record.incidentChecksum, resumeEligible: false })
  }

  private async persistIntent(proposal: ExecutionGenerationQuarantineProposal, persisted: PersistedExecutionGenerationDisposition): Promise<"CREATED" | "DUPLICATE"> {
    return this.refresh.transaction(async (sql) => {
      const run = await sql.unsafe<Array<{ plan_id: string }>>("SELECT plan_id FROM refresh_control.refresh_run WHERE run_id=$1 FOR SHARE", [proposal.runId])
      if (run[0]?.plan_id !== proposal.planId) throw new Error("QUARANTINE_REFRESH_RUN_MISMATCH")
      const current = await sql.unsafe<Array<{ payload: unknown }>>("SELECT payload FROM refresh_control.refresh_event WHERE run_id=$1 AND entity_kind='execution_generation' AND entity_id=$1 AND event_kind='EXECUTION_GENERATION_DISPOSITION' FOR SHARE", [proposal.runId])
      if (current[0]) {
        if (!equivalentDisposition(dispositionPayload(current[0].payload), proposal)) throw new Error("EXECUTION_GENERATION_QUARANTINE_CONFLICT")
        return "DUPLICATE" as const
      }
      const eventIdentity = canonicalChecksum({ kind: "EXECUTION_GENERATION_DISPOSITION", runId: proposal.runId })
      const checksum = canonicalChecksum(persisted)
      await sql`INSERT INTO refresh_control.refresh_event(event_id,run_id,entity_kind,entity_id,event_kind,from_state,to_state,payload,checksum,occurred_at) VALUES(${`mre_${eventIdentity}`},${proposal.runId},'execution_generation',${proposal.runId},'EXECUTION_GENERATION_DISPOSITION','ACTIVE','QUARANTINED',${sql.json({ ...persisted })},${checksum},${persisted.quarantinedAt})`
      await sql.unsafe("UPDATE refresh_control.refresh_lease SET released_at=$2 WHERE lease_key=$1 AND released_at IS NULL", [`live-resume:${proposal.runId}`, persisted.quarantinedAt])
      return "CREATED" as const
    })
  }

  private async completeSaga(input: { readonly record: PersistedExecutionGenerationDisposition; readonly status: "CREATED" | "DUPLICATE"; readonly actorId: string; readonly completedAt: string; readonly failurePoint?: ExecutionGenerationQuarantineFailurePoint }): Promise<ExecutionGenerationQuarantineReceipt> {
    if (input.failurePoint === "AFTER_INTENT_RECORDED") throw new Error("CERTIFICATION_FAILURE_AFTER_INTENT_RECORDED")
    const initial = await this.readSagaStatus(input.record.runId)
    if (!initial) throw new Error("EXECUTION_GENERATION_QUARANTINE_INTENT_MISSING")
    if (initial.quarantineSagaState === "COMPLETE") return Object.freeze({ status: "DUPLICATE", disposition: "QUARANTINED", record: input.record, releasedPopulationLeases: 0, appendedPopulationEvents: 0, quarantineSagaState: "COMPLETE", missingQuarantineSteps: Object.freeze([]), quarantineReceiptId: initial.quarantineReceiptId, resumeEligible: false, productionMutation: false })
    const population = initial.quarantineSagaState === "INTENT_RECORDED" ? await this.fencePopulation(input.record, input.actorId, input.completedAt) : Object.freeze({ releasedLeases: 0, appendedEvents: 0 })
    if (input.failurePoint === "AFTER_POPULATION_FENCED") throw new Error("CERTIFICATION_FAILURE_AFTER_POPULATION_FENCED")
    const beforeReceipt = await this.readSagaStatus(input.record.runId)
    if (!beforeReceipt || beforeReceipt.quarantineSagaState !== "POPULATION_FENCED") throw new Error(`EXECUTION_GENERATION_POPULATION_FENCING_INCOMPLETE:${beforeReceipt?.quarantineSagaState ?? "ABSENT"}:${beforeReceipt?.populationFencingEventCount ?? 0}:${beforeReceipt?.activePopulationLeases ?? 0}`)
    const receipt = await this.appendCompletionReceipt(input.record, input.completedAt, beforeReceipt.populationFencingEventCount)
    if (input.failurePoint === "AFTER_QUARANTINE_COMPLETED") throw new Error("CERTIFICATION_FAILURE_AFTER_QUARANTINE_COMPLETED")
    const completed = await this.readSagaStatus(input.record.runId)
    if (!completed || completed.quarantineSagaState !== "COMPLETE" || completed.activePopulationLeases !== 0) throw new Error("EXECUTION_GENERATION_QUARANTINE_COMPLETION_INVALID")
    return Object.freeze({ status: input.status, disposition: "QUARANTINED", record: input.record, releasedPopulationLeases: population.releasedLeases, appendedPopulationEvents: population.appendedEvents, quarantineSagaState: completed.quarantineSagaState, missingQuarantineSteps: completed.missingQuarantineSteps, quarantineReceiptId: receipt.receiptId, resumeEligible: false, productionMutation: false })
  }

  private async readPopulationUnits(sql: SqlExecutor, record: Pick<PersistedExecutionGenerationDisposition, "runId" | "intervalStart" | "intervalEnd">, forUpdate: boolean): Promise<Array<{ unit_id: string; current_state: string; current_fencing_token: number; active_lease_id: string | null; run_id: string }>> {
    return sql.unsafe<Array<{ unit_id: string; current_state: string; current_fencing_token: number; active_lease_id: string | null; run_id: string }>>(`SELECT u.unit_id,u.current_state::text,u.current_fencing_token,u.active_lease_id,(SELECT r.run_id FROM control.population_runs r WHERE r.job_id=j.job_id ORDER BY r.attempt_number DESC,r.run_id DESC LIMIT 1) run_id FROM control.population_units u JOIN control.population_jobs j ON j.job_id=u.job_id WHERE j.intentional_rerun_identity=$1 OR (j.intentional_rerun_identity IS NULL AND j.requested_by='mvp-live-resume' AND u.window_start=$2 AND u.window_end=$3) ORDER BY u.unit_id${forUpdate ? " FOR UPDATE OF u" : ""}`, [record.runId, record.intervalStart, record.intervalEnd])
  }

  private async fencePopulation(record: PersistedExecutionGenerationDisposition, actorId: string, at: string): Promise<{ readonly releasedLeases: number; readonly appendedEvents: number }> {
    return this.population.transaction(async (sql) => {
      const units = await this.readPopulationUnits(sql, record, true)
      const unitIds = units.map((row) => row.unit_id)
      if (!unitIds.length) return Object.freeze({ releasedLeases: 0, appendedEvents: 0 })
      const allLeases = await sql.unsafe<Array<{ lease_id: string; unit_id: string; owner_id: string; fencing_token: number; released_at: string | null; release_reason: string | null; active: boolean }>>("SELECT lease_id,unit_id,owner_id,fencing_token,released_at::text,release_reason,(released_at IS NULL AND expires_at>$2) active FROM control.population_leases WHERE unit_id=ANY($1::text[]) ORDER BY unit_id,fencing_token FOR UPDATE", [unitIds, at])
      const activeLeases = allLeases.filter((value) => value.active)
      let appendedEvents = 0
      for (const unit of units) {
        const lease = [...allLeases].reverse().find((value) => value.unit_id === unit.unit_id)
        const eventId = quarantinePopulationEventId(record.runId, unit.unit_id)
        const details = { schemaVersion: "mvp-execution-generation-quarantine-population-event/1.0.0", disposition: "QUARANTINED", generationId: record.runId, reasonCode: record.reasonCode, incidentChecksum: record.incidentChecksum, evidenceSummaryChecksum: record.evidenceSummaryChecksum, observedLeaseId: lease?.lease_id ?? null, leaseAction: lease?.active || lease?.release_reason === "EXECUTION_GENERATION_QUARANTINED" ? "RELEASED_BY_QUARANTINE" : "NO_ACTIVE_LEASE" }
        const existing = await sql.unsafe<Array<{ event_type: string; previous_state: string | null; next_state: string | null; fencing_token: number | null; details: unknown }>>("SELECT event_type,previous_state::text,next_state::text,fencing_token,details FROM control.population_unit_events WHERE event_id=$1", [eventId])
        if (existing[0]) {
          if (existing[0].event_type !== "EXECUTION_GENERATION_QUARANTINED" || existing[0].previous_state !== unit.current_state || existing[0].next_state !== unit.current_state || Number(existing[0].fencing_token ?? 0) !== Number(unit.current_fencing_token) || canonicalChecksum(parsedJson(existing[0].details)) !== canonicalChecksum(details)) throw new Error("POPULATION_GENERATION_QUARANTINE_CONFLICT")
        } else {
          await sql`INSERT INTO control.population_unit_events(event_id,unit_id,run_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at,details) VALUES(${eventId},${unit.unit_id},${unit.run_id},'EXECUTION_GENERATION_QUARANTINED',${unit.current_state},${unit.current_state},${unit.current_fencing_token || null},${actorId},${at},${sql.json(details)})`
          appendedEvents++
        }
      }
      if (activeLeases.length) {
        const activeLeaseIds = activeLeases.map((value) => value.lease_id)
        await sql.unsafe("UPDATE control.population_leases SET released_at=$2,release_reason='EXECUTION_GENERATION_QUARANTINED' WHERE lease_id=ANY($1::text[]) AND released_at IS NULL", [activeLeaseIds, at])
        await sql.unsafe("UPDATE control.population_units SET active_lease_id=NULL,updated_at=$2 WHERE active_lease_id=ANY($1::text[])", [activeLeaseIds, at])
      }
      const verification = await sql.unsafe<Array<{ events: number; active: number }>>("SELECT (SELECT count(*)::int FROM control.population_unit_events WHERE event_id=ANY($1::text[])) events,(SELECT count(*)::int FROM control.population_leases WHERE unit_id=ANY($2::text[]) AND released_at IS NULL AND expires_at>$3) active", [units.map((unit) => quarantinePopulationEventId(record.runId, unit.unit_id)), unitIds, at])
      if (Number(verification[0]?.events ?? 0) !== units.length || Number(verification[0]?.active ?? 0) !== 0) throw new Error("EXECUTION_GENERATION_POPULATION_FENCING_INCOMPLETE")
      return Object.freeze({ releasedLeases: activeLeases.length, appendedEvents })
    })
  }

  private async appendCompletionReceipt(record: PersistedExecutionGenerationDisposition, at: string, populationFencingEventCount: number): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly receiptId: string }> {
    return this.refresh.transaction(async (sql) => {
      const receiptId = quarantineReceiptId(record.runId, record.incidentChecksum)
      const payload = { schemaVersion: "mvp-execution-generation-quarantine-receipt/2.0.0", generationId: record.runId, disposition: "QUARANTINED", incidentChecksum: record.incidentChecksum, evidenceSummaryChecksum: record.evidenceSummaryChecksum, populationFencingEventCount, activePopulationLeases: 0, operatorConfirmationIdentity: record.operatorConfirmationIdentity }
      const checksum = canonicalChecksum(payload)
      const existing = await sql.unsafe<Array<{ payload: unknown; checksum: string }>>("SELECT payload,checksum FROM refresh_control.refresh_event WHERE event_id=$1 FOR SHARE", [receiptId])
      if (existing[0]) {
        if (existing[0].checksum !== checksum || canonicalChecksum(parsedJson(existing[0].payload)) !== canonicalChecksum(payload)) throw new Error("EXECUTION_GENERATION_QUARANTINE_RECEIPT_CONFLICT")
        return Object.freeze({ status: "DUPLICATE" as const, receiptId })
      }
      await sql`INSERT INTO refresh_control.refresh_event(event_id,run_id,entity_kind,entity_id,event_kind,from_state,to_state,payload,checksum,occurred_at) VALUES(${receiptId},${record.runId},'execution_generation',${record.runId},'EXECUTION_GENERATION_QUARANTINE_COMPLETED','QUARANTINED','QUARANTINED',${sql.json(payload)},${checksum},${at})`
      return Object.freeze({ status: "CREATED" as const, receiptId })
    })
  }
}

export function assertExpectedExecutionGenerationIncident(snapshot: ExecutionGenerationIncidentSnapshot, expected: { readonly runId: string; readonly planId: string; readonly planChecksum: string; readonly intervalStart: string; readonly intervalEnd: string; readonly counts: ExecutionGenerationLineageCounts }): void {
  if (snapshot.runId !== expected.runId || snapshot.generationId !== expected.runId || snapshot.planId !== expected.planId || snapshot.planChecksum !== expected.planChecksum || snapshot.intervalStart !== expected.intervalStart || snapshot.intervalEnd !== expected.intervalEnd || canonicalChecksum(snapshot.lineageCounts) !== canonicalChecksum(expected.counts) || snapshot.commonWatermark !== null || snapshot.servingCandidate !== null || snapshot.productionMutation) throw new Error("EXECUTION_GENERATION_INCIDENT_STATE_MISMATCH")
}
