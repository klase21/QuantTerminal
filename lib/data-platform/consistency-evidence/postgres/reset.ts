import type { ConsistencyPostgresRuntime } from "./client"

export interface D4ResetCommand { readonly explicitOptIn: "RESET_D4_ISOLATED_DATABASE"; readonly auditIdentity: string }
export interface D4FullResetCommand { readonly explicitOptIn: "RESET_D4_FULL_ISOLATED_REBUILD"; readonly auditIdentity: string }
const D4_TABLES = Object.freeze([
  "projection.mvp_consumer_exposure_invalidations", "projection.mvp_consumer_exposure_decisions",
  "projection.mvp_projection_conflicts", "projection.mvp_projection_dependencies", "projection.mvp_projection_versions", "projection.mvp_projection_definitions",
  "evidence.mvp_market_assessments", "evidence.core_packet_conflicts", "evidence.core_packet_lineage", "evidence.core_packet_requirements", "evidence.core_packet_fact_references", "evidence.core_packet_result_references", "evidence.core_packet_candidates", "evidence.core_packet_versions", "evidence.core_candidates", "evidence.core_packet_identities", "evidence.core_assembly_profiles",
  "consistency.recompute_step_lease_events", "consistency.recompute_step_lease_state",
  "consistency.result_selection_decisions", "consistency.result_dependency_links", "consistency.recompute_step_events", "consistency.recompute_step_claims", "consistency.recompute_plan_steps", "consistency.recompute_plans", "consistency.recompute_conflicts", "consistency.recompute_requests_v2", "consistency.dependency_snapshot_edges", "consistency.dependency_snapshot_nodes", "consistency.dependency_snapshots", "consistency.dependency_edge_conflicts", "consistency.dependency_edges", "consistency.dependency_nodes",
  "projection.evidence_projection_versions", "projection.evidence_projection_definitions",
  "evidence.invalidation_events", "evidence.packet_supersessions", "evidence.explanation_codes", "evidence.confidence_components",
  "evidence.requirements", "evidence.consistency_references", "evidence.fact_references", "evidence.packet_versions",
  "evidence.packet_identities", "evidence.candidates", "evidence.profiles",
  "consistency.result_conflicts", "consistency.immutable_result_diagnostics", "consistency.result_temporal_references",
  "consistency.result_input_references", "consistency.result_run_links", "consistency.immutable_results",
  "consistency.run_creation_conflicts", "consistency.run_completion_summaries", "consistency.run_events", "consistency.run_states", "consistency.run_specifications",
  "consistency.result_diagnostics", "consistency.rule_results", "consistency.inputs", "consistency.rule_runs",
  "consistency.rules", "consistency.rule_sets", "consistency.recompute_requests",
])
export function verifyReset(runtime: ConsistencyPostgresRuntime, command: D4ResetCommand): void {
  if (runtime.roleIntent !== "MIGRATION_OWNER" || command.explicitOptIn !== "RESET_D4_ISOLATED_DATABASE" || !command.auditIdentity.trim()) throw new Error("D4_RESET_AUTHORIZATION_REQUIRED")
}
export async function resetD4Runtime(runtime: ConsistencyPostgresRuntime, command: D4ResetCommand): Promise<void> {
  verifyReset(runtime, command)
  await runtime.transaction(async (sql) => {
    await sql.unsafe("DROP FUNCTION IF EXISTS consistency.close_recompute_step_lease(text,text,bigint,text,timestamptz)")
    await sql.unsafe("DROP FUNCTION IF EXISTS consistency.assert_recompute_step_fence(text,text,bigint,timestamptz)")
    await sql.unsafe("DROP FUNCTION IF EXISTS consistency.heartbeat_recompute_step(text,text,bigint,timestamptz,timestamptz)")
    await sql.unsafe("DROP FUNCTION IF EXISTS consistency.claim_recompute_step(text,text,timestamptz,timestamptz)")
    await sql.unsafe("DROP FUNCTION IF EXISTS consistency.lease_digest(text)")
    for (const table of D4_TABLES) await sql.unsafe("DROP TABLE IF EXISTS " + table + " CASCADE")
    await sql.unsafe("DROP FUNCTION IF EXISTS consistency.reject_immutable_result_mutation()")
    await sql.unsafe("DROP TABLE IF EXISTS d4_control.migration_ledger")
  })
}
export async function resetD4FullIsolated(runtime: ConsistencyPostgresRuntime, command: D4FullResetCommand): Promise<void> {
  if (runtime.roleIntent !== "MIGRATION_OWNER" || command.explicitOptIn !== "RESET_D4_FULL_ISOLATED_REBUILD" || !command.auditIdentity.trim()) throw new Error("D4_FULL_RESET_AUTHORIZATION_REQUIRED")
  await resetD4Runtime(runtime, { explicitOptIn: "RESET_D4_ISOLATED_DATABASE", auditIdentity: command.auditIdentity })
  await runtime.transaction(async (sql) => {
    for (const schema of ["quarantine","consistency","evidence","projection","coverage","quality","repository","canonical","raw","control"]) await sql.unsafe("DROP SCHEMA IF EXISTS " + schema + " CASCADE")
    await sql.unsafe("DROP SCHEMA IF EXISTS d4_control CASCADE")
    await sql.unsafe("DROP ROLE IF EXISTS qt_d4_read_only")
    await sql.unsafe("DROP ROLE IF EXISTS qt_d4_consistency_worker")
    await sql.unsafe("DROP ROLE IF EXISTS qt_d4_evidence_assembler")
    await sql.unsafe("DROP ROLE IF EXISTS qt_d4_projection_publisher")
  })
}
export async function verifyD4Reset(runtime: ConsistencyPostgresRuntime): Promise<boolean> {
  const rows = await runtime.sql.unsafe("SELECT to_regclass('d4_control.migration_ledger') ledger, to_regclass('d4_control.dependency_bootstrap_ledger') dependency_ledger, to_regclass('consistency.rule_sets') rule_sets, to_regclass('evidence.profiles') profiles, to_regclass('projection.evidence_projection_definitions') projections, to_regclass('control.canonical_commits') d2_commits")
  const row = rows[0] as Record<string, string | null> | undefined
  return Boolean(row && !row.ledger && row.dependency_ledger && !row.rule_sets && !row.profiles && !row.projections && row.d2_commits)
}
