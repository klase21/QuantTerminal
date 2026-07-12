-- D3 V1 Phase 2 isolated role blueprint. No credentials are created.
DO $$ BEGIN CREATE ROLE qt_d3_scheduler NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE qt_d3_coordinator NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE qt_d3_worker NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE qt_d3_read_only NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE ALL ON SCHEMA population FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA population FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA control FROM PUBLIC;

GRANT USAGE ON SCHEMA control TO qt_d3_scheduler, qt_d3_coordinator, qt_d3_worker, qt_d3_read_only;
GRANT USAGE ON SCHEMA population, raw, quality, coverage, quarantine TO qt_d3_worker, qt_d3_read_only;

GRANT SELECT ON control.population_jobs, control.population_job_events TO qt_d3_scheduler;
GRANT INSERT ON control.population_jobs, control.population_job_events TO qt_d3_scheduler;

GRANT SELECT, INSERT, UPDATE ON control.population_jobs, control.population_runs, control.population_units TO qt_d3_coordinator;
GRANT SELECT, INSERT ON control.population_job_events, control.population_run_events, control.population_unit_events, control.retry_events TO qt_d3_coordinator;

GRANT SELECT ON control.population_jobs, control.population_runs, control.population_units, control.population_leases TO qt_d3_worker;
GRANT INSERT ON control.retrieval_attempts, control.population_checkpoints, control.population_outcomes, control.retry_events, coverage.watermark_eligibility_decisions TO qt_d3_worker;
GRANT INSERT, SELECT ON population.candidates, population.canonical_submissions TO qt_d3_worker;
GRANT INSERT ON quality.candidate_validation_results, quality.candidate_evaluation_runs, quality.candidate_evaluation_results TO qt_d3_worker;
GRANT EXECUTE ON FUNCTION control.claim_population_unit(text,text,timestamptz,timestamptz) TO qt_d3_worker;
GRANT EXECUTE ON FUNCTION control.heartbeat_population_lease(text,text,bigint,timestamptz,timestamptz) TO qt_d3_worker;
GRANT EXECUTE ON FUNCTION control.advance_population_unit(text,text,bigint,control.population_unit_state,text,timestamptz) TO qt_d3_worker;

GRANT SELECT ON control.population_jobs, control.population_job_events, control.population_runs, control.population_run_events, control.population_units, control.population_unit_events, control.population_leases, control.population_checkpoints, control.retrieval_attempts, control.population_outcomes, control.retry_events TO qt_d3_read_only;
GRANT SELECT ON population.candidates, population.canonical_submissions, quality.candidate_validation_results, quality.candidate_evaluation_runs, quality.candidate_evaluation_results, coverage.watermark_eligibility_decisions TO qt_d3_read_only;
