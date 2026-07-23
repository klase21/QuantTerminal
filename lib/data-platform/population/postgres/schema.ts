export const D3_POPULATION_MIGRATION_ORDER = ["001_population_control_plane.sql", "002_population_roles.sql", "003_agg_trade_candidates.sql", "004_external_context_candidates.sql", "005_population_pipeline_integrity.sql"] as const
export const D3_POPULATION_TABLES = [
  "control.population_jobs", "control.population_job_events", "control.population_runs", "control.population_run_events",
  "control.population_units", "control.population_unit_events", "control.population_leases", "control.population_checkpoints",
  "control.retrieval_attempts", "control.population_outcomes", "control.retry_events", "coverage.watermark_eligibility_decisions",
  "population.candidates", "population.candidate_conflicts", "population.canonical_submissions", "quality.candidate_validation_results",
  "population.canonical_submission_events",
  "quality.candidate_evaluation_runs", "quality.candidate_evaluation_results",
] as const
