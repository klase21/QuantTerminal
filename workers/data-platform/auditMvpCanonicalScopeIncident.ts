import postgres from "postgres"

const start = "2026-07-15T00:00:00.000Z"
const end = "2026-07-16T00:00:00.000Z"

async function main(): Promise<void> {
  const connectionString = process.env.D3_POPULATION_POSTGRES_URL
  const d2ConnectionString = process.env.D2_CANONICAL_POSTGRES_URL
  if (!connectionString || !d2ConnectionString) throw new Error("INTEGRATED_POSTGRES_URLS_REQUIRED")
  const sql = postgres(connectionString, { max: 1, prepare: false })
  const d2 = postgres(d2ConnectionString, { max: 1, prepare: false })
  try {
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(`
      SELECT u.unit_id,pr.run_id,u.dataset_id,u.subject_or_symbol instrument,
        u.request_parameters->>'sourceContractId' unit_source_contract,
        u.current_state::text unit_state,u.current_fencing_token::text fence,u.current_checkpoint_id,
        l.lease_id,l.owner_id,l.expires_at::text,l.released_at::text,l.release_reason,
        c.raw_manifest_id,
        c.candidate_id,c.dataset_id candidate_dataset,c.provider_id candidate_provider,
        c.provider_snapshot_id candidate_provider_snapshot,c.parser_version,
        c.candidate_schema_version,c.candidate_kind,c.source_observation_id,
        c.source_observed_at::text,c.effective_at::text,c.candidate_checksum,c.bounded_payload
      FROM control.population_units u
      JOIN control.population_runs pr ON pr.job_id=u.job_id
      LEFT JOIN control.population_leases l ON l.lease_id=u.active_lease_id
      LEFT JOIN population.candidates c ON c.unit_id=u.unit_id
      WHERE u.window_start=$1 AND u.window_end=$2
        AND u.dataset_id='agg-trade'
        AND (c.candidate_id IS NOT NULL OR u.active_lease_id IS NOT NULL)
      ORDER BY u.dataset_id,u.subject_or_symbol,c.created_at,c.candidate_id`, [start, end])
    const shapes = await sql.unsafe<Array<Record<string, unknown>>>(`
      SELECT u.unit_id,u.dataset_id,u.subject_or_symbol instrument,u.current_state::text unit_state,
        u.current_fencing_token::text fence,l.lease_id,l.expires_at::text,l.released_at::text,
        count(DISTINCT c.raw_manifest_id)::int raw_objects,count(DISTINCT c.candidate_id)::int candidates,
        count(DISTINCT o.candidate_id)::int committed_candidates
      FROM control.population_units u
      LEFT JOIN control.population_leases l ON l.lease_id=u.active_lease_id
      LEFT JOIN population.candidates c ON c.unit_id=u.unit_id
      LEFT JOIN control.population_outcomes o ON o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE')
      WHERE u.window_start=$1 AND u.window_end=$2
      GROUP BY u.unit_id,u.dataset_id,u.subject_or_symbol,u.current_state,u.current_fencing_token,l.lease_id,l.expires_at,l.released_at
      HAVING count(DISTINCT c.raw_manifest_id)>0 OR l.lease_id IS NOT NULL
      ORDER BY u.dataset_id,u.subject_or_symbol,u.unit_id`, [start, end])
    const events = await sql.unsafe<Array<Record<string, unknown>>>(`
      SELECT e.unit_id,e.event_id,e.event_type,e.previous_state::text,e.next_state::text,
        e.fencing_token::text,e.occurred_at::text,e.details
      FROM control.population_unit_events e
      JOIN control.population_units u ON u.unit_id=e.unit_id
      WHERE u.window_start=$1 AND u.window_end=$2
        AND (e.event_type='STAGE_FAILURE' OR e.details::text ILIKE '%CANONICAL%' OR e.details::text ILIKE '%SCOPE%')
      ORDER BY e.occurred_at DESC,e.event_id`, [start, end])
    const rawIds = [...new Set(rows.map((row) => String(row.raw_manifest_id)).filter(Boolean))]
    const rawObjects = rawIds.length ? await d2.unsafe<Array<Record<string, unknown>>>(`
      SELECT object_id,dataset_id raw_dataset,provider_id raw_provider,
        provider_snapshot_id raw_provider_snapshot,venue raw_venue,
        symbol_or_subject raw_instrument,window_start::text raw_start,
        window_end::text raw_end,content_hash raw_checksum
      FROM raw.objects WHERE object_id=ANY($1::text[]) ORDER BY object_id`, [rawIds]) : []
    const failingAggTrades = rows.map((row) => {
      const payload = row.bounded_payload as Record<string, unknown>
      return {
        unit_id: row.unit_id,
        run_id: row.run_id,
        dataset_id: row.dataset_id,
        instrument: row.instrument,
        unit_source_contract: row.unit_source_contract,
        unit_state: row.unit_state,
        fence: row.fence,
        current_checkpoint_id: row.current_checkpoint_id,
        lease_id: row.lease_id,
        owner_id: row.owner_id,
        expires_at: row.expires_at,
        released_at: row.released_at,
        release_reason: row.release_reason,
        raw_manifest_id: row.raw_manifest_id,
        candidate_id: row.candidate_id,
        candidate_dataset: row.candidate_dataset,
        candidate_provider: row.candidate_provider,
        candidate_provider_snapshot: row.candidate_provider_snapshot,
        parser_version: row.parser_version,
        candidate_schema_version: row.candidate_schema_version,
        candidate_kind: row.candidate_kind,
        source_observation_id: row.source_observation_id,
        source_observed_at: row.source_observed_at,
        effective_at: row.effective_at,
        candidate_checksum: row.candidate_checksum,
        candidate_scope: {
          symbol: payload.symbol,
          windowStart: payload.windowStart,
          windowEnd: payload.windowEnd,
          eventTimeMin: payload.eventTimeMin,
          eventTimeMax: payload.eventTimeMax,
          segmentContractVersion: payload.segmentContractVersion,
        },
      }
    })
    console.log(JSON.stringify({ shapes, failingAggTrades, rawObjects, events }, null, 2))
  } finally {
    await Promise.all([sql.end({ timeout: 5 }), d2.end({ timeout: 5 })])
  }
}

void main().catch((error) => {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "READ_ONLY_AUDIT_FAILED"
  console.error(JSON.stringify({ classification: /^[0-9A-Z_]+$/.test(code) ? code : "READ_ONLY_AUDIT_FAILED" }))
  process.exitCode = 1
})
