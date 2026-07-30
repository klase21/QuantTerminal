import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type postgres from "postgres"
import type { MvpRefreshPostgresClient } from "./client"
import { ACTIVE_MVP_SERVING_BASELINE, DEFAULT_MVP_REFRESH_POLICY } from "./service"
import { liveResumePlanCounts, verifyCertifiedLiveResumePlan, verifyStageAwareLiveResumePlan, type CertifiedLiveResumePlan, type LiveResumeExecutionIntent, type LiveResumeExecutionSetup, type LiveResumeStage, type LiveResumeStageCheckpoint, type LiveResumeUnitResolution } from "./liveResumeCoordinator"
import { MvpRefreshStore } from "./store"
import type { RefreshLogicalDataset, RefreshLogicalInstrument, RefreshSlotResumePlanEntry } from "./unitReconciliation"

const OWNER_ID = "mvp-live-resume-coordinator"
const LIVE_EXECUTION_PROFILE = "LOCAL_INACTIVE_CANDIDATE" as const
const SOURCE_CONTRACTS: Readonly<Record<RefreshLogicalDataset, string>> = Object.freeze({ ohlcv: "mvp-bounded-ohlcv/1.0.0", "open-interest": "mvp-bounded-open-interest/1.0.0", funding: "binance-official-rest-funding-rate/1.0.0", "agg-trade": "mvp-bounded-agg-trade/1.0.0" })
const RECOVERABLE_RUN_STATES = new Set(["PLANNED", "ACQUIRING", "NORMALIZING", "COMMITTING", "VALIDATING", "MATERIALIZING", "COMPARING"])
const RECOVERABLE_UNIT_STATES = new Set(["PENDING", "LEASED", "ACQUIRED", "NORMALIZED", "COMMITTED", "VALIDATED", "MATERIALIZED"])

export function liveResumeRunIdentity(plan: CertifiedLiveResumePlan): { readonly runId: string; readonly checksum: string } {
  const checksum = canonicalChecksum({ schemaVersion: "mvp-live-resume-run/1.0.0", executionProfile: LIVE_EXECUTION_PROFILE, planIdentity: plan.planIdentity, planChecksum: plan.planChecksum, intervalStart: plan.intervalStart, intervalEnd: plan.intervalEnd })
  return Object.freeze({ runId: `mrlr_${checksum}`, checksum })
}

function checkpointStart(state: string): LiveResumeUnitResolution["checkpointStartStage"] {
  if (state === "COMPLETE") return "COMPLETE"
  if (state === "MATERIALIZED" || state === "VALIDATED") return "VALIDATED"
  if (state === "COMMITTED") return "COMMITTED"
  if (state === "NORMALIZED") return "NORMALIZED"
  if (state === "ACQUIRED") return "ACQUIRED"
  return "PENDING"
}

function createUnitResolution(input: { readonly slot: RefreshSlotResumePlanEntry; readonly runId: string; readonly state: string; readonly created: boolean; readonly unitId: string }): LiveResumeUnitResolution {
  if (input.state !== "COMPLETE" && !RECOVERABLE_UNIT_STATES.has(input.state)) throw new Error("LIVE_RESUME_UNIT_NOT_RECOVERABLE")
  return Object.freeze({ logicalSlotId: input.slot.logicalSlotId, dataset: input.slot.dataset, instrument: input.slot.instrument, action: input.created ? "CREATED_UNIT" : input.state === "COMPLETE" ? "REUSED_UNIT" : "RESUMED_UNIT", unitId: input.unitId, sourceContractId: SOURCE_CONTRACTS[input.slot.dataset], checkpointStartStage: checkpointStart(input.state), fencingToken: null, reason: input.created ? "ATOMIC_EXECUTION_SETUP" : input.state === "COMPLETE" ? "EXISTING_COMPLETE_UNIT" : "EXISTING_RECOVERABLE_UNIT" })
}

export interface LiveResumeStatusSnapshot {
  readonly planId: string
  readonly planChecksum: string
  readonly persistedRunId: string | null
  readonly runState: string | null
  readonly unitCountsByState: Readonly<Record<string, number>>
  readonly unitCountsByDataset: Readonly<Record<string, number>>
  readonly authoritativeReuse: number
  readonly createdSlots: number
  readonly reusedSlots: number
  readonly resumableSlots: number
  readonly missingSlots: number
  readonly currentCoordinatorStage: string | null
  readonly leaseState: "ACTIVE" | "RELEASED" | "EXPIRED" | "ABSENT"
  readonly candidateState: string | null
  readonly commonWatermark: string | null
  readonly blockers: readonly string[]
  readonly persistedUnitCount: number
  readonly recoverableSlots: number
  readonly blockedSlots: number
  readonly retainedArtifacts: number
  readonly retainedCandidates: number
  readonly effectiveExecutionState: "NOT_STARTED" | "ACTIVE" | "BLOCKED" | "COMPLETE"
  readonly disposition: "ACTIVE" | "QUARANTINED" | "SUPERSEDED"
  readonly resumeEligible: boolean
  readonly quarantineReason: string | null
  readonly incidentChecksum: string | null
  readonly quarantineSagaState: "INTENT_RECORDED" | "POPULATION_FENCED" | "COMPLETE" | null
  readonly missingQuarantineSteps: readonly string[]
  readonly quarantineReceiptId: string | null
}

export interface PersistedLiveResumeExecution {
  readonly plan: CertifiedLiveResumePlan
  readonly runId: string
  readonly runState: string
  readonly runChecksum: string
  readonly blockerCodes: readonly string[]
  readonly units: readonly { readonly unitId: string; readonly logicalSlotId: string; readonly dataset: RefreshLogicalDataset; readonly instrument: RefreshLogicalInstrument; readonly state: string; readonly checkpoint: Readonly<Record<string, unknown>> }[]
}

function parsePlanPayload(value: unknown): { readonly certifiedPlan: CertifiedLiveResumePlan } {
  let parsed = value
  for (let index = 0; index < 2 && typeof parsed === "string"; index += 1) parsed = JSON.parse(parsed)
  if (!parsed || typeof parsed !== "object" || !("certifiedPlan" in parsed)) throw new Error("LIVE_RESUME_PERSISTED_PLAN_INVALID")
  const payload = parsed as { readonly certifiedPlan: CertifiedLiveResumePlan }
  verifyCertifiedLiveResumePlan(payload.certifiedPlan)
  return payload
}

function checkpointRecord(value: unknown): Readonly<Record<string, unknown>> {
  let parsed = value
  if (typeof parsed === "string") parsed = JSON.parse(parsed)
  return Object.freeze(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {})
}

export class PostgresLiveResumeExecutionStore {
  constructor(private readonly client: MvpRefreshPostgresClient) {}

  async resolveOrCreate(input: { readonly plan: CertifiedLiveResumePlan; readonly mode: "DRY_RUN" | "CERTIFICATION" | "LIVE"; readonly intent: LiveResumeExecutionIntent; readonly certificationFailurePoint?: "AFTER_PLAN" | "AFTER_RUN" | "AFTER_FIRST_UNIT" }): Promise<LiveResumeExecutionSetup> {
    verifyCertifiedLiveResumePlan(input.plan)
    if (input.certificationFailurePoint && input.mode !== "CERTIFICATION") throw new Error("LIVE_RESUME_FAILURE_INJECTION_CERTIFICATION_ONLY")
    const identity = liveResumeRunIdentity(input.plan)
    if (input.mode === "DRY_RUN" || input.intent === "DRY_RUN") return createDryRunLiveResumeExecutionSetup(input.plan)
    let attempts = 0
    const intent: Exclude<LiveResumeExecutionIntent, "DRY_RUN"> = input.intent
    while (true) {
      try { return await this.client.transaction((sql) => this.resolveSql(sql, input.plan, identity, intent, input.certificationFailurePoint)) }
      catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : null
        if ((code === "40001" || code === "23505") && attempts++ < 2) continue
        throw error
      }
    }
  }

  async status(plan: CertifiedLiveResumePlan): Promise<LiveResumeStatusSnapshot> {
    verifyCertifiedLiveResumePlan(plan)
    const planCounts = liveResumePlanCounts(plan)
    const { runId } = liveResumeRunIdentity(plan)
    const runs = await this.client.sql.unsafe<Array<{ state: string; blocker_codes: string[] }>>("SELECT state,blocker_codes FROM refresh_control.refresh_run WHERE run_id=$1 AND plan_id=$2", [runId, plan.planIdentity])
    const run = runs[0]
    const units = run ? await this.client.sql.unsafe<Array<{ dataset_id: string; state: string }>>("SELECT dataset_id,state FROM refresh_control.refresh_unit WHERE run_id=$1 ORDER BY dataset_id,instrument", [runId]) : []
    const stageRows = run ? await this.client.sql.unsafe<Array<{ event_kind: string }>>("SELECT event_kind FROM refresh_control.refresh_event WHERE run_id=$1 AND entity_kind='live_resume_coordinator' AND event_kind LIKE 'STAGE_%' AND event_kind NOT LIKE 'STAGE_FAILURE_%' ORDER BY occurred_at DESC,event_id DESC LIMIT 1", [runId]) : []
    const leases = run ? await this.client.sql.unsafe<Array<{ active: boolean; released: boolean }>>("SELECT expires_at>now() AND released_at IS NULL active,released_at IS NOT NULL released FROM refresh_control.refresh_lease WHERE lease_key=$1", [`live-resume:${runId}`]) : []
    const candidates = run ? await this.client.sql.unsafe<Array<{ lifecycle: string }>>("SELECT lifecycle FROM refresh_control.refresh_candidate WHERE run_id=$1 ORDER BY created_at DESC LIMIT 1", [runId]) : []
    const watermarks = run ? await this.client.sql.unsafe<Array<{ common_watermark: string | null }>>("SELECT min(observed_through)::text common_watermark FROM refresh_control.source_watermark WHERE run_id=$1 AND mandatory", [runId]) : []
    const retained = run ? await this.client.sql.unsafe<Array<{ artifacts: number; candidates: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_artifact a JOIN refresh_control.refresh_unit u ON u.unit_id=a.unit_id WHERE u.run_id=$1) artifacts,(SELECT count(*)::int FROM refresh_control.refresh_candidate WHERE run_id=$1) candidates", [runId]) : []
    const failures = run ? await this.client.sql.unsafe<Array<{ event_kind: string }>>("SELECT event_kind FROM refresh_control.refresh_event WHERE run_id=$1 AND entity_kind='live_resume_coordinator' AND event_kind LIKE 'STAGE_FAILURE_%' ORDER BY occurred_at DESC,event_id DESC LIMIT 1", [runId]) : []
    const dispositions = run ? await this.client.sql.unsafe<Array<{ to_state: string; payload: { reasonCode?: string; incidentChecksum?: string } | string }>>("SELECT to_state,payload FROM refresh_control.refresh_event WHERE run_id=$1 AND entity_kind='execution_generation' AND entity_id=$1 AND event_kind='EXECUTION_GENERATION_DISPOSITION' ORDER BY occurred_at,event_id", [runId]) : []
    const quarantineReceipts = run ? await this.client.sql.unsafe<Array<{ event_id: string }>>("SELECT event_id FROM refresh_control.refresh_event WHERE run_id=$1 AND entity_kind='execution_generation' AND entity_id=$1 AND event_kind='EXECUTION_GENERATION_QUARANTINE_COMPLETED' ORDER BY occurred_at,event_id", [runId]) : []
    if (dispositions.length > 1) throw new Error("EXECUTION_GENERATION_DISPOSITION_MULTIPLE")
    const dispositionRow = dispositions[0]
    const dispositionPayload = typeof dispositionRow?.payload === "string" ? JSON.parse(dispositionRow.payload) as { reasonCode?: string; incidentChecksum?: string } : dispositionRow?.payload
    const disposition = dispositionRow?.to_state === "QUARANTINED" ? "QUARANTINED" as const : dispositionRow?.to_state === "SUPERSEDED" ? "SUPERSEDED" as const : "ACTIVE" as const
    const byState: Record<string, number> = {}, byDataset: Record<string, number> = {}
    for (const unit of units) { byState[unit.state] = (byState[unit.state] ?? 0) + 1; byDataset[unit.dataset_id] = (byDataset[unit.dataset_id] ?? 0) + 1 }
    const createdSlots = 0
    const reusedSlots = units.filter((unit) => unit.state === "COMPLETE").length
    const resumableSlots = disposition === "ACTIVE" ? units.filter((unit) => unit.state !== "COMPLETE" && RECOVERABLE_UNIT_STATES.has(unit.state)).length : 0
    const terminalBlockers = units.filter((unit) => !RECOVERABLE_UNIT_STATES.has(unit.state) && unit.state !== "COMPLETE").map((unit) => `UNIT_${unit.dataset_id}_${unit.state}`)
    const lease = leases[0]
    const blockedSlots = units.filter((unit) => ["BLOCKED", "FAILED", "UNAVAILABLE"].includes(unit.state)).length
    const effectiveExecutionState = !run ? "NOT_STARTED" : disposition !== "ACTIVE" ? "BLOCKED" : run.state === "READY_FOR_RELEASE_REVIEW" ? "COMPLETE" : failures.length || blockedSlots ? "BLOCKED" : "ACTIVE"
    const dispositionBlocker = disposition === "QUARANTINED" ? ["EXECUTION_GENERATION_QUARANTINED"] : disposition === "SUPERSEDED" ? ["EXECUTION_GENERATION_SUPERSEDED"] : []
    const quarantineReceiptId = quarantineReceipts[0]?.event_id ?? null
    return Object.freeze({ planId: plan.planIdentity, planChecksum: plan.planChecksum, persistedRunId: run ? runId : null, runState: run?.state ?? null, unitCountsByState: Object.freeze(byState), unitCountsByDataset: Object.freeze(byDataset), authoritativeReuse: planCounts.reuseAuthoritative, createdSlots, reusedSlots, resumableSlots, missingSlots: Math.max(0, planCounts.executableUnits - units.length), currentCoordinatorStage: stageRows[0]?.event_kind.replace(/^STAGE_/, "") ?? null, leaseState: !lease ? "ABSENT" : lease.active ? "ACTIVE" : lease.released ? "RELEASED" : "EXPIRED", candidateState: candidates[0]?.lifecycle ?? null, commonWatermark: watermarks[0]?.common_watermark ? new Date(watermarks[0].common_watermark).toISOString() : null, blockers: Object.freeze([...(run?.blocker_codes ?? []), ...terminalBlockers, ...failures.map((value) => value.event_kind.replace(/^STAGE_FAILURE_/, "STAGE_FAILURE:")), ...dispositionBlocker].sort()), persistedUnitCount: units.length, recoverableSlots: disposition === "ACTIVE" ? units.filter((unit) => RECOVERABLE_UNIT_STATES.has(unit.state)).length : 0, blockedSlots, retainedArtifacts: retained[0]?.artifacts ?? 0, retainedCandidates: retained[0]?.candidates ?? 0, effectiveExecutionState, disposition, resumeEligible: disposition === "ACTIVE" && Boolean(run) && run.state !== "READY_FOR_RELEASE_REVIEW", quarantineReason: disposition === "QUARANTINED" ? dispositionPayload?.reasonCode ?? null : null, incidentChecksum: disposition === "QUARANTINED" ? dispositionPayload?.incidentChecksum ?? null : null, quarantineSagaState: disposition === "QUARANTINED" ? quarantineReceiptId ? "COMPLETE" : "INTENT_RECORDED" : null, missingQuarantineSteps: disposition === "QUARANTINED" && !quarantineReceiptId ? Object.freeze(["POPULATION_FENCING", "QUARANTINE_COMPLETED_RECEIPT"]) : Object.freeze([]), quarantineReceiptId })
  }

  async readPersistedExecution(intervalStart: string, intervalEnd: string): Promise<PersistedLiveResumeExecution | null> {
    const rows = await this.client.sql.unsafe<Array<{ plan_id: string; plan: unknown; plan_checksum: string; run_id: string; run_state: string; run_checksum: string; blocker_codes: string[] }>>("SELECT p.plan_id,p.plan,p.checksum plan_checksum,r.run_id,r.state run_state,r.checksum run_checksum,r.blocker_codes FROM refresh_control.refresh_plan p JOIN refresh_control.refresh_run r ON r.plan_id=p.plan_id WHERE p.requested_start=$1 AND p.requested_end=$2 ORDER BY r.created_at DESC", [intervalStart, intervalEnd])
    const candidates: PersistedLiveResumeExecution[] = []
    for (const row of rows) {
      let payload: { readonly certifiedPlan: CertifiedLiveResumePlan }
      try { payload = parsePlanPayload(row.plan) } catch { continue }
      const expected = liveResumeRunIdentity(payload.certifiedPlan)
      if (row.plan_id !== payload.certifiedPlan.planIdentity || row.plan_checksum !== payload.certifiedPlan.planChecksum || row.run_id !== expected.runId || row.run_checksum !== expected.checksum) continue
      const unitRows = await this.client.sql.unsafe<Array<{ unit_id: string; dataset_id: RefreshLogicalDataset; instrument: RefreshLogicalInstrument; state: string; interval_start: string; interval_end: string; checkpoint: unknown }>>("SELECT unit_id,dataset_id,instrument,state,interval_start::text,interval_end::text,checkpoint FROM refresh_control.refresh_unit WHERE run_id=$1 ORDER BY dataset_id,instrument", [row.run_id])
      const units = Object.freeze(unitRows.map((unit) => {
        const slot = payload.certifiedPlan.slots.find((value) => value.dataset === unit.dataset_id && value.instrument === unit.instrument && value.intervalStart === new Date(unit.interval_start).toISOString() && value.intervalEnd === new Date(unit.interval_end).toISOString())
        if (!slot || slot.action !== "CREATE_NEW_ON_LIVE_RESUME") throw new Error("LIVE_RESUME_PERSISTED_UNIT_GRAPH_INVALID")
        return Object.freeze({ unitId: unit.unit_id, logicalSlotId: slot.logicalSlotId, dataset: unit.dataset_id, instrument: unit.instrument, state: unit.state, checkpoint: checkpointRecord(unit.checkpoint) })
      }))
      const expectedUnits = liveResumePlanCounts(payload.certifiedPlan).executableUnits
      verifyStageAwareLiveResumePlan({ plan: payload.certifiedPlan, stage: units.length === expectedUnits ? "AFTER_EXECUTION_SETUP" : "DURING_EXECUTION", persistedUnits: units })
      candidates.push(Object.freeze({ plan: payload.certifiedPlan, runId: row.run_id, runState: row.run_state, runChecksum: row.run_checksum, blockerCodes: Object.freeze(row.blocker_codes ?? []), units }))
    }
    if (candidates.length > 1) throw new Error("LIVE_RESUME_MULTIPLE_PERSISTED_EXECUTIONS")
    return candidates[0] ?? null
  }

  async statusForWindow(intervalStart: string, intervalEnd: string): Promise<LiveResumeStatusSnapshot | null> {
    const execution = await this.readPersistedExecution(intervalStart, intervalEnd)
    return execution ? this.status(execution.plan) : null
  }

  private async resolveSql(sql: postgres.TransactionSql, plan: CertifiedLiveResumePlan, identity: { readonly runId: string; readonly checksum: string }, intent: Exclude<LiveResumeExecutionIntent, "DRY_RUN">, failurePoint?: "AFTER_PLAN" | "AFTER_RUN" | "AFTER_FIRST_UNIT"): Promise<LiveResumeExecutionSetup> {
    const createSlots = plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME")
    const planCounts = liveResumePlanCounts(plan)
    if (createSlots.length !== planCounts.executableUnits || (plan.executionProfile !== "CURRENT_CANDIDATE_CATCHUP" && createSlots.some((slot) => slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT"))) throw new Error("LIVE_RESUME_EXECUTION_SLOT_SET_INVALID")
    const dispositions = await sql.unsafe<Array<{ to_state: string }>>("SELECT to_state FROM refresh_control.refresh_event WHERE run_id=$1 AND entity_kind='execution_generation' AND entity_id=$1 AND event_kind='EXECUTION_GENERATION_DISPOSITION' FOR SHARE", [identity.runId])
    if (dispositions.length > 1) throw new Error("EXECUTION_GENERATION_DISPOSITION_MULTIPLE")
    if (dispositions[0]?.to_state === "QUARANTINED") throw new Error("EXECUTION_GENERATION_QUARANTINED")
    if (dispositions[0]?.to_state === "SUPERSEDED") throw new Error("EXECUTION_GENERATION_SUPERSEDED")
    await sql.unsafe("INSERT INTO refresh_control.refresh_policy(policy_id,policy_version,policy,checksum,created_at) VALUES($1,$2,$3::jsonb,$4,now()) ON CONFLICT (policy_id) DO NOTHING", [DEFAULT_MVP_REFRESH_POLICY.policyId, DEFAULT_MVP_REFRESH_POLICY.policyVersion, JSON.stringify(DEFAULT_MVP_REFRESH_POLICY), DEFAULT_MVP_REFRESH_POLICY.checksum])
    const policies = await sql.unsafe<Array<{ checksum: string }>>("SELECT checksum FROM refresh_control.refresh_policy WHERE policy_id=$1", [DEFAULT_MVP_REFRESH_POLICY.policyId])
    if (policies[0]?.checksum !== DEFAULT_MVP_REFRESH_POLICY.checksum) throw new Error("LIVE_RESUME_POLICY_IMMUTABLE_CONFLICT")

    const planPayload = Object.freeze({ schemaVersion: "mvp-live-resume-plan/1.0.0", executionProfile: LIVE_EXECUTION_PROFILE, certifiedPlan: plan })
    const baselineCorpusId = plan.currentCatchup?.baseline.candidateId ?? ACTIVE_MVP_SERVING_BASELINE.corpusId
    const baselineServingChecksum = plan.currentCatchup?.baseline.candidateChecksum ?? ACTIVE_MVP_SERVING_BASELINE.servingChecksum
    const existingPlans = await sql.unsafe<Array<{ checksum: string; requested_start: string; requested_end: string; active_corpus_id: string; active_serving_checksum: string; plan: typeof planPayload | string }>>("SELECT checksum,requested_start::text,requested_end::text,active_corpus_id,active_serving_checksum,plan FROM refresh_control.refresh_plan WHERE plan_id=$1 FOR UPDATE", [plan.planIdentity])
    const existingPlan = existingPlans[0]
    let planStatus: LiveResumeExecutionSetup["planStatus"] = "DUPLICATE"
    if (!existingPlan) {
      await sql.unsafe("INSERT INTO refresh_control.refresh_plan(plan_id,policy_id,active_corpus_id,active_serving_checksum,requested_start,requested_end,state,plan,checksum,created_at) VALUES($1,$2,$3,$4,$5,$6,'READY',$7::jsonb,$8,now())", [plan.planIdentity, DEFAULT_MVP_REFRESH_POLICY.policyId, baselineCorpusId, baselineServingChecksum, plan.intervalStart, plan.intervalEnd, JSON.stringify(planPayload), plan.planChecksum])
      planStatus = "CREATED"
    } else if (existingPlan.checksum !== plan.planChecksum || new Date(existingPlan.requested_start).toISOString() !== plan.intervalStart || new Date(existingPlan.requested_end).toISOString() !== plan.intervalEnd || existingPlan.active_corpus_id !== baselineCorpusId || existingPlan.active_serving_checksum !== baselineServingChecksum) throw new Error("LIVE_RESUME_PLAN_IMMUTABLE_CONFLICT")
    if (failurePoint === "AFTER_PLAN") throw new Error("CERTIFICATION_FAILURE_AFTER_PLAN")

    const existingRuns = await sql.unsafe<Array<{ run_id: string; plan_id: string; state: string; checksum: string }>>("SELECT run_id,plan_id,state,checksum FROM refresh_control.refresh_run WHERE run_id=$1 FOR UPDATE", [identity.runId])
    const existingRun = existingRuns[0]
    if (existingRun && intent === "RUN" && !plan.executionGeneration) throw new Error("LIVE_RESUME_EXECUTION_ALREADY_EXISTS_USE_RESUME")
    let runStatus: LiveResumeExecutionSetup["runStatus"] = "DUPLICATE", runState = existingRun?.state ?? "PLANNED"
    if (!existingRun) {
      await sql.unsafe("INSERT INTO refresh_control.refresh_run(run_id,plan_id,state,checksum,created_at,updated_at) VALUES($1,$2,'PLANNED',$3,now(),now())", [identity.runId, plan.planIdentity, identity.checksum])
      runStatus = "CREATED"
    } else if (existingRun.plan_id !== plan.planIdentity || existingRun.checksum !== identity.checksum) throw new Error("LIVE_RESUME_RUN_IMMUTABLE_CONFLICT")
    else if (!RECOVERABLE_RUN_STATES.has(existingRun.state) && existingRun.state !== "READY_FOR_RELEASE_REVIEW") throw new Error("LIVE_RESUME_RUN_NOT_RECOVERABLE")
    if (failurePoint === "AFTER_RUN") throw new Error("CERTIFICATION_FAILURE_AFTER_RUN")

    const outcomes: LiveResumeUnitResolution[] = []
    for (const slot of createSlots) {
      const unitChecksum = canonicalChecksum({ runId: identity.runId, logicalSlotId: slot.logicalSlotId, sourceContractId: SOURCE_CONTRACTS[slot.dataset] })
      const unitId = `mru_${unitChecksum}`
      const rows = await sql.unsafe<Array<{ unit_id: string; run_id: string; state: string; checksum: string }>>("SELECT unit_id,run_id,state,checksum FROM refresh_control.refresh_unit WHERE run_id=$1 AND instrument=$2 AND dataset_id=$3 AND interval_start=$4 AND interval_end=$5 FOR UPDATE", [identity.runId, slot.instrument, slot.dataset, slot.intervalStart, slot.intervalEnd])
      const existing = rows[0]
      if (!existing) await sql.unsafe("INSERT INTO refresh_control.refresh_unit(unit_id,run_id,instrument,dataset_id,interval_start,interval_end,state,checksum,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,'PENDING',$7,now(),now())", [unitId, identity.runId, slot.instrument, slot.dataset, slot.intervalStart, slot.intervalEnd, unitChecksum])
      else if (existing.run_id !== identity.runId || existing.unit_id !== unitId || existing.checksum !== unitChecksum) throw new Error("LIVE_RESUME_UNIT_IMMUTABLE_CONFLICT")
      outcomes.push(createUnitResolution({ slot, runId: identity.runId, state: existing?.state ?? "PENDING", created: !existing, unitId }))
      if (failurePoint === "AFTER_FIRST_UNIT") throw new Error("CERTIFICATION_FAILURE_AFTER_FIRST_UNIT")
    }
    const persisted = await sql.unsafe<Array<{ count: number; run_ids: number; btc_ohlcv: number }>>("SELECT count(*)::int count,count(DISTINCT run_id)::int run_ids,count(*) FILTER (WHERE dataset_id='ohlcv' AND instrument='BTCUSDT')::int btc_ohlcv FROM refresh_control.refresh_unit WHERE run_id=$1", [identity.runId])
    const expectedBtcOhlcvUnits = plan.executionProfile === "CURRENT_CANDIDATE_CATCHUP" ? 1 : 0
    if (persisted[0]?.count !== planCounts.executableUnits || persisted[0]?.run_ids !== 1 || persisted[0]?.btc_ohlcv !== expectedBtcOhlcvUnits || outcomes.some((unit) => unit.unitId === null)) throw new Error("LIVE_RESUME_EXECUTION_UNIT_VERIFICATION_FAILED")
    const transactionChecksum = canonicalChecksum({ planId: plan.planIdentity, runId: identity.runId, units: outcomes.map((unit) => unit.unitId) })
    if (runStatus === "CREATED") {
      const eventChecksum = canonicalChecksum({ kind: "LIVE_RESUME_EXECUTION_SETUP", runId: identity.runId, planId: plan.planIdentity, transactionChecksum })
      await sql.unsafe("INSERT INTO refresh_control.refresh_event(event_id,run_id,entity_kind,entity_id,event_kind,from_state,to_state,payload,checksum,occurred_at) VALUES($1,$2,'refresh_run',$2,'LIVE_EXECUTION_SETUP',NULL,'PLANNED',$3::jsonb,$4,now())", [`mre_${eventChecksum}`, identity.runId, JSON.stringify({ executionProfile: plan.executionProfile ?? LIVE_EXECUTION_PROFILE, unitCount: planCounts.executableUnits, transactionChecksum }), eventChecksum])
    }
    if (plan.executionGeneration) {
      const generation = plan.executionGeneration
      const authority = plan.slots.find((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT")
      if (!authority) throw new Error("CLEAN_GENERATION_AUTHORITY_MISSING")
      const payload = Object.freeze({ ...generation, planId: plan.planIdentity, runId: identity.runId, intervalStart: plan.intervalStart, intervalEnd: plan.intervalEnd, authoritativeLogicalSlotId: authority.logicalSlotId, executableUnitCount: 23, transactionChecksum, activationAvailable: false })
      const checksum = canonicalChecksum({ kind: "CLEAN_EXECUTION_GENERATION_CREATED", payload })
      const eventId = `mre_${checksum}`
      await sql.unsafe("INSERT INTO refresh_control.refresh_event(event_id,run_id,entity_kind,entity_id,event_kind,from_state,to_state,payload,checksum,occurred_at) VALUES($1,$2,'clean_execution_generation',$3,'CLEAN_EXECUTION_GENERATION_CREATED',NULL,'ACTIVE',$4::jsonb,$5,now()) ON CONFLICT (event_id) DO NOTHING", [eventId, identity.runId, generation.executionGenerationId, JSON.stringify(payload), checksum])
      const rows = await sql.unsafe<Array<{ checksum: string; payload: unknown }>>("SELECT checksum,payload FROM refresh_control.refresh_event WHERE entity_kind='clean_execution_generation' AND entity_id=$1 AND event_kind='CLEAN_EXECUTION_GENERATION_CREATED'", [generation.executionGenerationId])
      if (rows.length !== 1 || rows[0]!.checksum !== checksum) throw new Error("CLEAN_GENERATION_RECEIPT_CONFLICT")
    }
    return Object.freeze({ planStatus, persistedPlanId: plan.planIdentity, runStatus, persistedRunId: identity.runId, unitOutcomes: Object.freeze(outcomes), transactionChecksum, resumeClassification: runStatus === "CREATED" ? "NEW_EXECUTION" : runState === "READY_FOR_RELEASE_REVIEW" ? "EXISTING_COMPLETE_EXECUTION" : "EXISTING_INCOMPLETE_EXECUTION" })
  }
}

export function createDryRunLiveResumeExecutionSetup(plan: CertifiedLiveResumePlan): LiveResumeExecutionSetup {
  verifyCertifiedLiveResumePlan(plan)
  const identity = liveResumeRunIdentity(plan)
  const outcomes = plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME").map((slot) => {
    const unitChecksum = canonicalChecksum({ runId: identity.runId, logicalSlotId: slot.logicalSlotId, sourceContractId: SOURCE_CONTRACTS[slot.dataset] })
    return createUnitResolution({ slot, runId: identity.runId, state: "PENDING", created: true, unitId: `mru_${unitChecksum}` })
  })
  const transactionChecksum = canonicalChecksum({ planId: plan.planIdentity, runId: identity.runId, units: outcomes.map((unit) => unit.unitId) })
  return Object.freeze({ planStatus: "DRY_RUN", persistedPlanId: plan.planIdentity, runStatus: "DRY_RUN", persistedRunId: identity.runId, unitOutcomes: Object.freeze(outcomes), transactionChecksum, resumeClassification: "DRY_RUN" })
}

function checkpointFromJson(value: LiveResumeStageCheckpoint | string): LiveResumeStageCheckpoint {
  const checkpoint = typeof value === "string" ? JSON.parse(value) as LiveResumeStageCheckpoint : value
  const { checksum, ...basis } = checkpoint
  if (canonicalChecksum(basis) !== checksum) throw new Error("LIVE_RESUME_CHECKPOINT_CHECKSUM_INVALID")
  return Object.freeze(checkpoint)
}

export class PostgresLiveResumeCoordinatorControlPlane {
  private readonly store: MvpRefreshStore

  constructor(private readonly client: MvpRefreshPostgresClient, private readonly leaseSeconds = 300) {
    this.store = new MvpRefreshStore(client)
  }

  async acquire(runId: string): Promise<{ readonly fencingToken: number }> {
    const lease = await this.store.acquireLease(this.leaseKey(runId), OWNER_ID, this.leaseSeconds)
    if (!lease.acquired) throw new Error("LIVE_RESUME_COORDINATOR_LEASE_UNAVAILABLE")
    return Object.freeze({ fencingToken: lease.fencingToken })
  }

  assert(runId: string, fencingToken: number): Promise<void> {
    return this.store.assertFence(this.leaseKey(runId), OWNER_ID, fencingToken)
  }

  release(runId: string, fencingToken: number): Promise<void> {
    return this.store.releaseLease(this.leaseKey(runId), OWNER_ID, fencingToken)
  }

  async read(runId: string, stage: LiveResumeStage): Promise<LiveResumeStageCheckpoint | null> {
    const rows = await this.client.sql.unsafe<Array<{ event_kind: string; payload: LiveResumeStageCheckpoint | string }>>("SELECT event_kind,payload FROM refresh_control.refresh_event WHERE entity_kind='live_resume_coordinator' AND entity_id=$1 AND event_kind IN ($2,$3) ORDER BY occurred_at DESC,event_id DESC", [runId, `STAGE_${stage}`, `STAGE_FAILURE_${stage}`])
    const checkpoints = rows.map((row) => {
      const checkpoint = checkpointFromJson(row.payload)
      const expectedEventKind = checkpoint.state === "COMPLETE" ? `STAGE_${stage}` : `STAGE_FAILURE_${stage}`
      if (checkpoint.coordinatorRunId !== runId || checkpoint.stage !== stage || row.event_kind !== expectedEventKind) throw new Error("LIVE_RESUME_CHECKPOINT_IDENTITY_INVALID")
      return checkpoint
    })
    const complete = checkpoints.filter((checkpoint) => checkpoint.state === "COMPLETE")
    if (complete.length > 1) throw new Error("LIVE_RESUME_CHECKPOINT_MULTIPLE_EVENTS")
    return complete[0] ?? checkpoints.find((checkpoint) => checkpoint.state === "FAILED") ?? null
  }

  async append(checkpoint: LiveResumeStageCheckpoint): Promise<"CREATED" | "DUPLICATE"> {
    if (checkpoint.state !== "COMPLETE") throw new Error("LIVE_RESUME_COMPLETE_CHECKPOINT_REQUIRED")
    return this.appendEvent(checkpoint, `STAGE_${checkpoint.stage}`)
  }

  async appendFailure(checkpoint: LiveResumeStageCheckpoint): Promise<"CREATED" | "DUPLICATE"> {
    if (checkpoint.state !== "FAILED" || !checkpoint.failureClassification) throw new Error("LIVE_RESUME_FAILURE_CHECKPOINT_REQUIRED")
    return this.appendEvent(checkpoint, `STAGE_FAILURE_${checkpoint.stage}`)
  }

  private async appendEvent(checkpoint: LiveResumeStageCheckpoint, eventKind: string): Promise<"CREATED" | "DUPLICATE"> {
    const verified = checkpointFromJson(checkpoint)
    await this.assert(verified.coordinatorRunId, verified.fencingToken)
    const eventChecksum = canonicalChecksum({ kind: "LIVE_RESUME_STAGE_CHECKPOINT", coordinatorRunId: verified.coordinatorRunId, stage: verified.stage, checkpointChecksum: verified.checksum })
    const eventId = `mre_${eventChecksum}`
    const result = await this.client.sql.unsafe("INSERT INTO refresh_control.refresh_event(event_id,run_id,entity_kind,entity_id,event_kind,from_state,to_state,payload,checksum,occurred_at) VALUES($1,$2,'live_resume_coordinator',$2,$3,$4,$5,$6::jsonb,$7,now()) ON CONFLICT (event_id) DO NOTHING", [eventId, verified.coordinatorRunId, eventKind, verified.previousStage, verified.stage, JSON.stringify(verified), eventChecksum])
    const rows = await this.client.sql.unsafe<Array<{ payload: LiveResumeStageCheckpoint | string }>>("SELECT payload FROM refresh_control.refresh_event WHERE event_id=$1", [eventId])
    const persisted = rows[0] ? checkpointFromJson(rows[0].payload) : null
    if (!persisted || persisted.checksum !== verified.checksum) throw new Error("LIVE_RESUME_CHECKPOINT_IMMUTABLE_CONFLICT")
    return result.count === 1 ? "CREATED" : "DUPLICATE"
  }

  private leaseKey(runId: string): string { return `live-resume:${runId}` }
}
