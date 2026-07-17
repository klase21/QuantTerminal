import postgres from "postgres"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"

async function main(): Promise<void> {
  const connectionString = process.env.D3_POPULATION_POSTGRES_URL
  if (!connectionString) throw new Error("D3_POPULATION_POSTGRES_URL_REQUIRED")
  const sql = postgres(connectionString, { max: 1, prepare: false })
  try {
    const units = await sql<Array<Record<string, unknown>>>`
      SELECT u.unit_id,u.dataset_id,u.subject_or_symbol instrument,u.current_state::text unit_state,
        u.current_fencing_token::int fence,u.active_lease_id,u.cancellation_requested_at::text,r.run_id,r.current_state::text run_state,
        l.lease_id,l.owner_id,l.fencing_token::int lease_fence,l.acquired_at::text,
        l.released_at::text,l.expires_at::text,l.release_reason,
        cp.checkpoint_id,cp.checkpoint_type,cp.completed_stage,cp.fencing_token::int checkpoint_fence,
        cp.created_at::text checkpoint_created_at,
        ev.event_id,ev.event_type,ev.previous_state::text event_previous_state,
        ev.next_state::text event_next_state,ev.fencing_token::int event_fence,
        ev.occurred_at::text event_occurred_at,ev.details event_details,
        (SELECT count(*)::int FROM control.retrieval_attempts a WHERE a.unit_id=u.unit_id) retrieval_attempts,
        (SELECT count(*)::int FROM population.candidates c WHERE c.unit_id=u.unit_id) candidates,
        (SELECT count(DISTINCT o.candidate_id)::int FROM control.population_outcomes o
          WHERE o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE')) committed_candidates
      FROM control.population_units u
      JOIN control.population_runs r ON r.job_id=u.job_id
      LEFT JOIN LATERAL (
        SELECT * FROM control.population_leases x WHERE x.unit_id=u.unit_id
        ORDER BY x.fencing_token DESC,x.acquired_at DESC,x.lease_id DESC LIMIT 1
      ) l ON true
      LEFT JOIN LATERAL (
        SELECT * FROM control.population_checkpoints x WHERE x.unit_id=u.unit_id
        ORDER BY x.created_at DESC,x.checkpoint_id DESC LIMIT 1
      ) cp ON true
      LEFT JOIN LATERAL (
        SELECT * FROM control.population_unit_events x WHERE x.unit_id=u.unit_id
        ORDER BY x.occurred_at DESC,x.event_id DESC LIMIT 1
      ) ev ON true
      WHERE u.window_start=${START} AND u.window_end=${END}
        AND u.current_state='PROCESSING'
        AND EXISTS (SELECT 1 FROM population.candidates c WHERE c.unit_id=u.unit_id)
        AND NOT EXISTS (SELECT 1 FROM control.population_outcomes o WHERE o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE'))
      ORDER BY u.updated_at,u.unit_id`
    const sanitized = units.map((row) => ({
      unitId: row.unit_id,
      dataset: row.dataset_id,
      instrument: row.instrument,
      unitState: row.unit_state,
      runId: row.run_id,
      runState: row.run_state,
      fence: row.fence,
      activeLeaseId: row.active_lease_id,
      latestLease: {
        leaseId: row.lease_id,
        owner: row.owner_id,
        fence: row.lease_fence,
        acquiredAt: row.acquired_at,
        releasedAt: row.released_at,
        expiresAt: row.expires_at,
        releaseReason: row.release_reason,
      },
      latestCheckpoint: row.checkpoint_id ? {
        checkpointId: row.checkpoint_id,
        type: row.checkpoint_type,
        completedStage: row.completed_stage,
        fence: row.checkpoint_fence,
        createdAt: row.checkpoint_created_at,
      } : null,
      latestEvent: row.event_id ? {
        eventId: row.event_id,
        type: row.event_type,
        previousState: row.event_previous_state,
        nextState: row.event_next_state,
        fence: row.event_fence,
        occurredAt: row.event_occurred_at,
        details: row.event_details,
      } : null,
      durableLineage: {
        retrievalAttempts: Number(row.retrieval_attempts),
        candidates: Number(row.candidates),
        committedCandidates: Number(row.committed_candidates),
        resumeStage: "CANONICAL_COMMIT",
      },
      leaseEligibility: {
        runRunning: row.run_state === "RUNNING",
        unitClaimableState: row.unit_state === "PENDING" || row.unit_state === "RETRYABLE",
        noActiveUnexpiredLease: row.active_lease_id === null,
        cancellationClear: row.cancellation_requested_at === null,
      },
    }))
    console.log(JSON.stringify({ firstRejectedByDurableOrder: sanitized[0] ?? null, units: sanitized }, null, 2))
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main().catch((error) => {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "READ_ONLY_AUDIT_FAILED"
  console.error(JSON.stringify({ classification: /^[0-9A-Z_]+$/.test(code) ? code : "READ_ONLY_AUDIT_FAILED" }))
  process.exitCode = 1
})
