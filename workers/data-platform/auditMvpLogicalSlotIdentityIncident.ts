import postgres from "postgres"

import { ControlledOhlcvRecoveryStore, createMvpRefreshClientFromEnvironment, createMandatoryRefreshLogicalSlots } from "@/lib/data-platform/mvp-refresh"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"

async function main(): Promise<void> {
  const d3Url = process.env.D3_POPULATION_POSTGRES_URL
  if (!d3Url) throw new Error("D3_POPULATION_POSTGRES_URL_VARIABLE_MISSING")
  const refresh = createMvpRefreshClientFromEnvironment()
  const d3 = postgres(d3Url, { max: 1, prepare: false })
  try {
    await refresh.verify()
    const slots = createMandatoryRefreshLogicalSlots(START, END)
    const authorities = await new ControlledOhlcvRecoveryStore(refresh).readAuthoritiesForWindow(START, END)
    const attempts = await d3.unsafe<Array<Record<string, unknown>>>(`
      SELECT u.partition_key AS logical_slot_id,u.unit_id,ra.run_id,u.dataset_id,u.subject_or_symbol AS instrument,
        u.window_start::text AS interval_start,u.window_end::text AS interval_end,
        u.request_parameters->>'sourceContractId' AS source_contract_id,
        u.provider_snapshot_id,u.current_state::text AS state,u.current_fencing_token::int AS fence,
        u.current_checkpoint_id,ra.attempt_id AS retrieval_attempt_id,ra.raw_manifest_id AS raw_object_id,
        ra.started_at::text AS retrieval_started_at,count(DISTINCT c.candidate_id)::int AS candidate_count,
        min(c.created_at)::text AS candidate_created_at
      FROM control.population_units u
      JOIN control.population_jobs j ON j.job_id=u.job_id
      JOIN control.retrieval_attempts ra ON ra.unit_id=u.unit_id
      LEFT JOIN population.candidates c ON c.unit_id=u.unit_id AND c.retrieval_attempt_id=ra.attempt_id
      WHERE u.window_start=$1 AND u.window_end=$2 AND j.requested_by='mvp-live-resume'
      GROUP BY u.partition_key,u.unit_id,ra.run_id,u.dataset_id,u.subject_or_symbol,u.window_start,u.window_end,u.request_parameters,u.provider_snapshot_id,u.current_state,u.current_fencing_token,u.current_checkpoint_id,ra.attempt_id,ra.raw_manifest_id,ra.started_at
      ORDER BY ra.started_at,u.unit_id,ra.run_id`, [START, END])
    const leases = await d3.unsafe<Array<Record<string, unknown>>>(`
      SELECT u.partition_key AS logical_slot_id,u.unit_id,u.dataset_id,u.subject_or_symbol AS instrument,
        l.lease_id,l.owner_id,l.fencing_token::int AS fence,l.acquired_at::text,l.expires_at::text,l.released_at::text,l.release_reason
      FROM control.population_units u JOIN control.population_jobs j ON j.job_id=u.job_id
      JOIN control.population_leases l ON l.unit_id=u.unit_id
      WHERE u.window_start=$1 AND u.window_end=$2 AND j.requested_by='mvp-live-resume'
      ORDER BY l.acquired_at,u.unit_id`, [START, END])
    const failures = await d3.unsafe<Array<Record<string, unknown>>>(`
      SELECT e.event_id,e.unit_id,e.run_id,e.event_type,e.previous_state::text,e.next_state::text,
        e.fencing_token::int AS fence,e.occurred_at::text,e.details
      FROM control.population_unit_events e
      JOIN control.population_units u ON u.unit_id=e.unit_id
      WHERE u.window_start=$1 AND u.window_end=$2
        AND (e.event_type='STAGE_FAILURE' OR e.details::text ILIKE '%IDENTITY%')
      ORDER BY e.occurred_at,e.event_id`, [START, END])
    const expected = slots.map((slot) => ({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, sourceContract: slot.contractVersion, providerBinding: slot.provider }))
    const lineage = attempts.map((row) => ({
      logicalSlotId: row.logical_slot_id,
      runAttemptId: row.run_id,
      unitAttemptId: row.unit_id,
      dataset: row.dataset_id,
      instrument: row.instrument,
      intervalStart: row.interval_start,
      intervalEnd: row.interval_end,
      sourceContract: row.source_contract_id,
      providerSnapshot: row.provider_snapshot_id,
      state: row.state,
      fence: row.fence,
      checkpointId: row.current_checkpoint_id,
      retrievalAttemptId: row.retrieval_attempt_id,
      rawObjectId: row.raw_object_id,
      candidateCount: row.candidate_count,
      retrievalStartedAt: row.retrieval_started_at,
      candidateCreatedAt: row.candidate_created_at,
    }))
    console.log(JSON.stringify({ interval: { start: START, end: END }, expected, authorities, lineage, leases, failures }, null, 2))
  } finally {
    await Promise.allSettled([refresh.shutdown(), d3.end({ timeout: 5 })])
  }
}

void main().catch((error: unknown) => {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : error instanceof Error ? error.message : "READ_ONLY_AUDIT_FAILED"
  console.error(JSON.stringify({ classification: /^[A-Z0-9_]+$/.test(code) ? code : "READ_ONLY_AUDIT_FAILED" }))
  process.exitCode = 1
})
