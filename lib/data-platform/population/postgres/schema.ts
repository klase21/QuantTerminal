export const D3_POPULATION_MIGRATION_ORDER = ["001_population_control_plane.sql", "002_population_roles.sql", "003_agg_trade_candidates.sql"] as const
export const D3_POPULATION_TABLES = [
  "control.population_jobs", "control.population_job_events", "control.population_runs", "control.population_run_events",
  "control.population_units", "control.population_unit_events", "control.population_leases", "control.population_checkpoints",
  "control.retrieval_attempts", "control.population_outcomes", "control.retry_events", "coverage.watermark_eligibility_decisions",
  "population.candidates", "population.candidate_conflicts", "population.canonical_submissions", "quality.candidate_validation_results",
  "quality.candidate_evaluation_runs", "quality.candidate_evaluation_results",
] as const
