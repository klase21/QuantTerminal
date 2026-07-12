import type { D3PostgresClient } from "./client"
export interface D3ResetCommand { readonly explicitOptIn: "RESET_D3_ISOLATED_DATABASE"; readonly auditIdentity: string }
export async function resetD3Schemas(client: D3PostgresClient, command: D3ResetCommand): Promise<void> {
  if (client.roleIntent !== "MIGRATION_OWNER" || command.explicitOptIn !== "RESET_D3_ISOLATED_DATABASE" || !command.auditIdentity.trim()) throw new Error("Explicit D3 isolated reset authorization required")
  await client.transaction(async (sql) => {
    await sql.unsafe("DROP SCHEMA IF EXISTS population CASCADE")
    for (const table of ["watermark_eligibility_decisions"]) await sql.unsafe(`DROP TABLE IF EXISTS coverage.${table} CASCADE`)
    for (const table of ["candidate_evaluation_results","candidate_evaluation_runs","candidate_validation_results"]) await sql.unsafe(`DROP TABLE IF EXISTS quality.${table} CASCADE`)
    for (const table of ["retry_events","population_outcomes","retrieval_attempts","population_checkpoints","population_leases","population_unit_events","population_units","population_run_events","population_runs","population_job_events","population_jobs","population_migration_ledger"]) await sql.unsafe(`DROP TABLE IF EXISTS control.${table} CASCADE`)
    for (const type of ["population_outcome_kind","population_unit_state","population_run_state","population_job_state"]) await sql.unsafe(`DROP TYPE IF EXISTS control.${type} CASCADE`)
    for (const role of ["qt_d3_read_only","qt_d3_worker","qt_d3_coordinator","qt_d3_scheduler"]) await sql.unsafe(`DROP ROLE IF EXISTS ${role}`)
  })
}
