import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  PostgresLiveResumeCoordinatorControlPlane,
  PostgresLiveResumeExecutionStore,
  createCertifiedLiveResumePlan,
  createCleanCertifiedLiveResumePlan,
  createCleanExecutionGenerationContext,
  createCurrentCatchupDayPlan,
  createMandatoryRefreshLogicalSlots,
  createMvpRefreshClientFromEnvironment,
  currentCatchupIdentity,
  liveResumeRunIdentity,
  liveResumeStageOutput,
  type LiveResumeStageCheckpoint,
  type MvpRefreshPostgresClient,
} from "@/lib/data-platform/mvp-refresh"

const start = "2025-01-15T00:00:00.000Z", end = "2025-01-16T00:00:00.000Z"

function certifiedPlan() {
  const slots = createMandatoryRefreshLogicalSlots(start, end).map((slot) => Object.freeze({
    ...slot,
    action: slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT" ? "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT" as const : "CREATE_NEW_ON_LIVE_RESUME" as const,
    authoritativeUnitId: slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT" ? "authoritative-recovery-unit" : null,
    reason: "CERTIFIED_AUTHORITATIVE_RECOVERY",
    checkpointStartStage: slot.dataset === "ohlcv" && slot.instrument === "BTCUSDT" ? "VALIDATED" as const : "PENDING" as const,
    blockers: Object.freeze([]),
    sourceFinalizationState: "SOURCE_AVAILABLE" as const,
    ignoredAttemptIds: Object.freeze([]),
  }))
  return createCertifiedLiveResumePlan({ intervalStart: start, intervalEnd: end, slots })
}

async function main() {
  const client = createMvpRefreshClientFromEnvironment()
  await client.verify()
  const plan = certifiedPlan(), identity = liveResumeRunIdentity(plan)
  let setupVerified = false, checkpointVerified = false, statusVerified = false, appendOnlyMutationRejected = false
  try {
    await client.sql.begin(async (sql) => {
      const transactionClient = { sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as MvpRefreshPostgresClient
      const execution = new PostgresLiveResumeExecutionStore(transactionClient)
      const setup = await execution.resolveOrCreate({ plan, mode: "CERTIFICATION", intent: "RESUME" })
      assert.equal(setup.persistedPlanId, plan.planIdentity)
      assert.equal(setup.persistedRunId, identity.runId)
      assert.equal(setup.unitOutcomes.length, 23)
      assert.equal(setup.unitOutcomes.filter((unit) => unit.dataset === "ohlcv" && unit.instrument === "BTCUSDT").length, 0)

      const parentOrder = await sql.unsafe<Array<{ plan_exists: boolean; run_exists: boolean; unit_count: number; distinct_run_ids: number }>>("SELECT EXISTS(SELECT 1 FROM refresh_control.refresh_plan WHERE plan_id=$1) plan_exists,EXISTS(SELECT 1 FROM refresh_control.refresh_run WHERE run_id=$2 AND plan_id=$1) run_exists,(SELECT count(*)::int FROM refresh_control.refresh_unit WHERE run_id=$2) unit_count,(SELECT count(DISTINCT run_id)::int FROM refresh_control.refresh_unit WHERE run_id=$2) distinct_run_ids", [plan.planIdentity, setup.persistedRunId])
      assert.deepEqual(parentOrder[0], { plan_exists: true, run_exists: true, unit_count: 23, distinct_run_ids: 1 })

      const repeat = await execution.resolveOrCreate({ plan, mode: "CERTIFICATION", intent: "RESUME" })
      assert.equal(repeat.runStatus, "DUPLICATE")
      assert.equal(repeat.persistedRunId, setup.persistedRunId)
      assert.ok(repeat.unitOutcomes.every((unit) => unit.action === "RESUMED_UNIT"))
      assert.deepEqual(repeat.unitOutcomes.map((unit) => unit.unitId), setup.unitOutcomes.map((unit) => unit.unitId))
      const concurrent = await Promise.all([
        execution.resolveOrCreate({ plan, mode: "CERTIFICATION", intent: "RESUME" }),
        execution.resolveOrCreate({ plan, mode: "CERTIFICATION", intent: "RESUME" }),
      ])
      assert.ok(concurrent.every((value) => value.persistedRunId === setup.persistedRunId && value.unitOutcomes.length === 23))
      await assert.rejects(execution.resolveOrCreate({ plan, mode: "CERTIFICATION", intent: "RUN" }), /LIVE_RESUME_EXECUTION_ALREADY_EXISTS_USE_RESUME/)

      const status = await execution.status(plan)
      assert.equal(status.persistedRunId, setup.persistedRunId)
      assert.equal(status.runState, "PLANNED")
      assert.equal(status.authoritativeReuse, 1)
      assert.equal(status.missingSlots, 0)
      assert.equal(status.unitCountsByState.PENDING, 23)
      assert.equal(status.persistedUnitCount, 23)
      assert.equal(status.recoverableSlots, 23)
      assert.equal(status.createdSlots, 0)
      assert.equal(status.resumableSlots, 23)
      assert.equal(status.effectiveExecutionState, "ACTIVE")
      const persisted = await execution.readPersistedExecution(start, end)
      assert.equal(persisted?.runId, setup.persistedRunId)
      assert.equal(persisted?.units.length, 23)
      assert.equal((await execution.statusForWindow(start, end))?.persistedRunId, setup.persistedRunId)
      statusVerified = true

      const control = new PostgresLiveResumeCoordinatorControlPlane(transactionClient, 300)
      const lease = await control.acquire(setup.persistedRunId)
      const output = liveResumeStageOutput({ logicalSlots: 24 }, [plan.planChecksum])
      const basis: Omit<LiveResumeStageCheckpoint, "checksum"> = { coordinatorRunId: setup.persistedRunId, stage: "PLAN_VERIFIED", intervalStart: start, intervalEnd: end, plannerIdentity: plan.planIdentity, plannerChecksum: plan.planChecksum, inputChecksum: canonicalChecksum({ input: "certification" }), output, previousStage: null, previousStageChecksum: null, fencingToken: lease.fencingToken, state: "COMPLETE", failureClassification: null, resumeEligible: true }
      const checkpoint = Object.freeze({ ...basis, checksum: canonicalChecksum(basis) })
      assert.equal(await control.append(checkpoint), "CREATED")
      assert.equal(await control.append(checkpoint), "DUPLICATE")
      assert.equal((await control.read(setup.persistedRunId, "PLAN_VERIFIED"))?.checksum, checkpoint.checksum)
      await control.release(setup.persistedRunId, lease.fencingToken)
      setupVerified = true
      checkpointVerified = true

      await sql.unsafe("UPDATE refresh_control.refresh_event SET payload='{}'::jsonb WHERE entity_kind='live_resume_coordinator' AND entity_id=$1", [setup.persistedRunId])
      throw new Error("APPEND_ONLY_MUTATION_NOT_REJECTED")
    })
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("REFRESH_EVENT_APPEND_ONLY")) throw error
    appendOnlyMutationRejected = true
  }

  const retained = await client.sql.unsafe<Array<{ plans: number; runs: number; units: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_plan WHERE plan_id=$1) plans,(SELECT count(*)::int FROM refresh_control.refresh_run WHERE run_id=$2) runs,(SELECT count(*)::int FROM refresh_control.refresh_unit WHERE run_id=$2) units", [plan.planIdentity, identity.runId])
  assert.deepEqual(retained[0], { plans: 0, runs: 0, units: 0 })

  const freshStart = "2026-07-16T00:00:00.000Z", freshEnd = "2026-07-17T00:00:00.000Z"
  const freshPlan = createCurrentCatchupDayPlan({
    catchupId: currentCatchupIdentity(freshStart, freshEnd).catchupId,
    window: { ordinal: 0, intervalStart: freshStart, intervalEnd: freshEnd },
    reconciliation: { attempts: Object.freeze([]), authorities: Object.freeze([]) },
  })
  const freshIdentity = liveResumeRunIdentity(freshPlan)
  try {
    await client.sql.begin(async (sql) => {
      const transactionClient = { sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as MvpRefreshPostgresClient
      const execution = new PostgresLiveResumeExecutionStore(transactionClient)
      const setup = await execution.resolveOrCreate({ plan: freshPlan, mode: "CERTIFICATION", intent: "RUN" })
      assert.equal(setup.unitOutcomes.length, 24)
      assert.equal(setup.unitOutcomes.filter((unit) => unit.dataset === "ohlcv" && unit.instrument === "BTCUSDT").length, 1)
      const status = await execution.status(freshPlan)
      assert.equal(status.authoritativeReuse, 0)
      assert.equal(status.persistedUnitCount, 24)
      assert.equal(status.missingSlots, 0)
      const persisted = await sql.unsafe<Array<{ active_corpus_id: string; active_serving_checksum: string; units: number; btc_ohlcv: number }>>("SELECT p.active_corpus_id,p.active_serving_checksum,(SELECT count(*)::int FROM refresh_control.refresh_unit WHERE run_id=$2) units,(SELECT count(*)::int FROM refresh_control.refresh_unit WHERE run_id=$2 AND dataset_id='ohlcv' AND instrument='BTCUSDT') btc_ohlcv FROM refresh_control.refresh_plan p WHERE p.plan_id=$1", [freshPlan.planIdentity, freshIdentity.runId])
      assert.deepEqual(persisted[0], { active_corpus_id: freshPlan.currentCatchup!.baseline.candidateId, active_serving_checksum: freshPlan.currentCatchup!.baseline.candidateChecksum, units: 24, btc_ohlcv: 1 })
      throw new Error("FRESH_CURRENT_CATCHUP_CERTIFICATION_ROLLBACK")
    })
  } catch (error) { if (!(error instanceof Error) || error.message !== "FRESH_CURRENT_CATCHUP_CERTIFICATION_ROLLBACK") throw error }
  const freshRetained = await client.sql.unsafe<Array<{ plans: number; runs: number; units: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_plan WHERE plan_id=$1) plans,(SELECT count(*)::int FROM refresh_control.refresh_run WHERE run_id=$2) runs,(SELECT count(*)::int FROM refresh_control.refresh_unit WHERE run_id=$2) units", [freshPlan.planIdentity, freshIdentity.runId])
  assert.deepEqual(freshRetained[0], { plans: 0, runs: 0, units: 0 })

  const manifestBasis = { schemaVersion: "mvp-clean-generation-input/1.0.0" as const, sourceGenerationId: `mrlr_${"a".repeat(64)}`, certifiedPlanContext: { planId: plan.planIdentity, planChecksum: plan.planChecksum }, targetInterval: { start, end }, logicalSlotIds: plan.slots.map((slot) => slot.logicalSlotId).sort(), reusableRawPayloadBytes: Object.freeze([]), excludedExecutionIdentities: { populationRunAttempts: Object.freeze([]), retrievalAttempts: Object.freeze([]), candidates: Object.freeze([]), checkpoints: Object.freeze([]) }, freshLineagePolicy: "FRESH_RETRIEVAL_CANDIDATE_FACT_DOWNSTREAM_WATERMARK_REPLAY_MANIFEST" as const }
  const manifest = Object.freeze({ ...manifestBasis, checksum: canonicalChecksum(manifestBasis) })
  const context = createCleanExecutionGenerationContext({ manifest, predecessorQuarantineReceiptId: `mre_${"b".repeat(64)}`, sourceCommitSha: "abcdef1", operatorConfirmationIdentity: "certification-operator" })
  const cleanPlan = createCleanCertifiedLiveResumePlan({ predecessorPlan: plan, context })
  const cleanIdentity = liveResumeRunIdentity(cleanPlan)
  try {
    await client.sql.begin(async (sql) => {
      const transactionClient = { sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as MvpRefreshPostgresClient
      const execution = new PostgresLiveResumeExecutionStore(transactionClient)
      const created = await execution.resolveOrCreate({ plan: cleanPlan, mode: "CERTIFICATION", intent: "RUN" })
      assert.equal(created.runStatus, "CREATED")
      assert.equal(created.unitOutcomes.length, 23)
      const duplicate = await execution.resolveOrCreate({ plan: cleanPlan, mode: "CERTIFICATION", intent: "RUN" })
      assert.equal(duplicate.runStatus, "DUPLICATE")
      const receipt = await sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM refresh_control.refresh_event WHERE run_id=$1 AND entity_kind='clean_execution_generation' AND entity_id=$2 AND event_kind='CLEAN_EXECUTION_GENERATION_CREATED'", [cleanIdentity.runId, context.executionGenerationId])
      assert.equal(receipt[0]?.count, 1)
      throw new Error("CLEAN_CERTIFICATION_ROLLBACK")
    })
  } catch (error) { if (!(error instanceof Error) || error.message !== "CLEAN_CERTIFICATION_ROLLBACK") throw error }
  const cleanRetained = await client.sql.unsafe<Array<{ plans: number; runs: number; units: number; receipts: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_plan WHERE plan_id=$1) plans,(SELECT count(*)::int FROM refresh_control.refresh_run WHERE run_id=$2) runs,(SELECT count(*)::int FROM refresh_control.refresh_unit WHERE run_id=$2) units,(SELECT count(*)::int FROM refresh_control.refresh_event WHERE entity_kind='clean_execution_generation' AND entity_id=$3) receipts", [cleanPlan.planIdentity, cleanIdentity.runId, context.executionGenerationId])
  assert.deepEqual(cleanRetained[0], { plans: 0, runs: 0, units: 0, receipts: 0 })

  for (const failurePoint of ["AFTER_PLAN", "AFTER_RUN", "AFTER_FIRST_UNIT"] as const) {
    await assert.rejects(new PostgresLiveResumeExecutionStore(client).resolveOrCreate({ plan, mode: "CERTIFICATION", intent: "RESUME", certificationFailurePoint: failurePoint }), new RegExp(`CERTIFICATION_FAILURE_${failurePoint}`))
    const rows = await client.sql.unsafe<Array<{ plans: number; runs: number; units: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_plan WHERE plan_id=$1) plans,(SELECT count(*)::int FROM refresh_control.refresh_run WHERE run_id=$2) runs,(SELECT count(*)::int FROM refresh_control.refresh_unit WHERE run_id=$2) units", [plan.planIdentity, identity.runId])
    assert.deepEqual(rows[0], { plans: 0, runs: 0, units: 0 })
  }

  await client.shutdown()
  console.log(JSON.stringify({ status: "PASS", setupVerified, checkpointVerified, statusVerified, appendOnlyMutationRejected, exactResume: "DUPLICATE", persistedRunIdPropagated: true, atomicRollback: true, retainedRows: 0 }))
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
