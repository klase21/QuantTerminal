import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  PostgresLiveResumeCoordinatorControlPlane,
  PostgresLiveResumeExecutionStore,
  createCertifiedLiveResumePlan,
  createMandatoryRefreshLogicalSlots,
  createMvpRefreshClientFromEnvironment,
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

  for (const failurePoint of ["AFTER_PLAN", "AFTER_RUN", "AFTER_FIRST_UNIT"] as const) {
    await assert.rejects(new PostgresLiveResumeExecutionStore(client).resolveOrCreate({ plan, mode: "CERTIFICATION", intent: "RESUME", certificationFailurePoint: failurePoint }), new RegExp(`CERTIFICATION_FAILURE_${failurePoint}`))
    const rows = await client.sql.unsafe<Array<{ plans: number; runs: number; units: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_plan WHERE plan_id=$1) plans,(SELECT count(*)::int FROM refresh_control.refresh_run WHERE run_id=$2) runs,(SELECT count(*)::int FROM refresh_control.refresh_unit WHERE run_id=$2) units", [plan.planIdentity, identity.runId])
    assert.deepEqual(rows[0], { plans: 0, runs: 0, units: 0 })
  }

  await client.shutdown()
  console.log(JSON.stringify({ status: "PASS", setupVerified, checkpointVerified, statusVerified, appendOnlyMutationRejected, exactResume: "DUPLICATE", persistedRunIdPropagated: true, atomicRollback: true, retainedRows: 0 }))
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
