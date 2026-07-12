-- D3 V1 Phase 1 blueprint only. This migration is not part of the D2 runner and is unapplied.
CREATE SCHEMA IF NOT EXISTS population;

CREATE TABLE control.population_migration_ledger (
  migration_id text PRIMARY KEY,
  migration_checksum text NOT NULL CHECK (migration_checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL,
  applied_by text NOT NULL
);

CREATE TYPE control.population_job_state AS ENUM ('QUEUED','RUNNING','PARTIAL','SUCCEEDED','FAILED','CANCELLED','PAUSED','EXPIRED');
CREATE TYPE control.population_run_state AS ENUM ('CREATED','RUNNING','SUCCEEDED','PARTIAL','FAILED','CANCELLED','EXPIRED');
CREATE TYPE control.population_unit_state AS ENUM ('PENDING','LEASED','RETRIEVING','RAW_PERSISTED','CANDIDATES_READY','PROCESSING','COMPLETED','RETRYABLE','QUARANTINED','FAILED','CANCELLED');
CREATE TYPE control.population_outcome_kind AS ENUM ('COMMITTED','DUPLICATE','CONFLICT','QUARANTINED','EMPTY','UNSUPPORTED','RETRYABLE_FAILURE','PERMANENT_FAILURE','CANCELLED','SKIPPED_BY_POLICY');

CREATE TABLE control.population_jobs (
  job_id text PRIMARY KEY,
  request_identity text NOT NULL,
  occurrence_identity text NOT NULL,
  intentional_rerun_identity text,
  profile_id text NOT NULL,
  profile_version text NOT NULL,
  dataset_id text NOT NULL,
  provider_id text NOT NULL,
  scope_fingerprint text NOT NULL,
  current_state control.population_job_state NOT NULL DEFAULT 'QUEUED',
  current_event_id text NOT NULL,
  requested_at timestamptz NOT NULL,
  requested_by text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (request_identity, occurrence_identity, intentional_rerun_identity),
  CHECK (length(request_identity) > 0 AND length(scope_fingerprint) > 0),
  CHECK (updated_at >= created_at)
);
CREATE UNIQUE INDEX population_jobs_delivery_identity_uq ON control.population_jobs (request_identity, occurrence_identity, COALESCE(intentional_rerun_identity,''));

CREATE TABLE control.population_job_events (
  event_id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES control.population_jobs(job_id),
  event_type text NOT NULL,
  previous_state control.population_job_state,
  next_state control.population_job_state NOT NULL,
  actor_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (jsonb_typeof(details) = 'object')
);

CREATE TABLE control.population_runs (
  run_id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES control.population_jobs(job_id),
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  current_state control.population_run_state NOT NULL DEFAULT 'CREATED',
  worker_pool_id text,
  started_at timestamptz,
  heartbeat_at timestamptz,
  completed_at timestamptz,
  retry_classification_id text,
  current_checkpoint_id text,
  UNIQUE (job_id, attempt_number),
  CHECK (completed_at IS NULL OR started_at IS NOT NULL),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE control.population_run_events (
  event_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES control.population_runs(run_id),
  event_type text NOT NULL,
  previous_state control.population_run_state,
  next_state control.population_run_state NOT NULL,
  actor_id text NOT NULL,
  occurred_at timestamptz NOT NULL
);

CREATE TABLE control.population_units (
  unit_id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES control.population_jobs(job_id),
  profile_id text NOT NULL,
  profile_version text NOT NULL,
  dataset_id text NOT NULL,
  provider_id text NOT NULL,
  provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  venue text,
  subject_or_symbol text,
  window_start timestamptz,
  window_end timestamptz,
  resolution text,
  partition_key text,
  request_fingerprint text NOT NULL,
  request_parameters jsonb NOT NULL,
  required boolean NOT NULL,
  current_state control.population_unit_state NOT NULL DEFAULT 'PENDING',
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  current_fencing_token bigint NOT NULL DEFAULT 0 CHECK (current_fencing_token >= 0),
  active_lease_id text,
  current_checkpoint_id text,
  cancellation_requested_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (job_id, profile_id, profile_version, dataset_id, provider_id, venue, subject_or_symbol, window_start, window_end, resolution, partition_key),
  CHECK (window_end IS NULL OR window_start IS NOT NULL),
  CHECK (window_end IS NULL OR window_end > window_start),
  CHECK (jsonb_typeof(request_parameters) = 'object')
);

CREATE TABLE control.population_unit_events (
  event_id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES control.population_units(unit_id),
  run_id text REFERENCES control.population_runs(run_id),
  event_type text NOT NULL,
  previous_state control.population_unit_state,
  next_state control.population_unit_state NOT NULL,
  fencing_token bigint CHECK (fencing_token IS NULL OR fencing_token > 0),
  actor_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (jsonb_typeof(details) = 'object')
);

CREATE TABLE control.population_leases (
  lease_id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES control.population_units(unit_id),
  owner_id text NOT NULL,
  fencing_token bigint NOT NULL CHECK (fencing_token > 0),
  lease_version bigint NOT NULL CHECK (lease_version > 0),
  acquired_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL,
  released_at timestamptz,
  release_reason text,
  UNIQUE (unit_id, fencing_token),
  CHECK (expires_at > acquired_at),
  CHECK (heartbeat_at >= acquired_at),
  CHECK (released_at IS NULL OR released_at >= acquired_at)
);

ALTER TABLE control.population_units ADD CONSTRAINT population_units_active_lease_fk
  FOREIGN KEY (active_lease_id) REFERENCES control.population_leases(lease_id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE control.population_checkpoints (
  checkpoint_id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES control.population_jobs(job_id),
  run_id text NOT NULL REFERENCES control.population_runs(run_id),
  unit_id text NOT NULL REFERENCES control.population_units(unit_id),
  fencing_token bigint NOT NULL CHECK (fencing_token > 0),
  checkpoint_type text NOT NULL CHECK (checkpoint_type IN ('RAW_BOUNDARY','CANDIDATE_BOUNDARY','CANONICAL_BOUNDARY')),
  completed_stage control.population_unit_state NOT NULL,
  raw_manifest_id text REFERENCES raw.objects(object_id),
  candidate_cursor text,
  canonical_submission_id text,
  last_outcome_id text,
  created_at timestamptz NOT NULL
);

ALTER TABLE control.population_runs ADD CONSTRAINT population_runs_checkpoint_fk
  FOREIGN KEY (current_checkpoint_id) REFERENCES control.population_checkpoints(checkpoint_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE control.population_units ADD CONSTRAINT population_units_checkpoint_fk
  FOREIGN KEY (current_checkpoint_id) REFERENCES control.population_checkpoints(checkpoint_id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE control.retrieval_attempts (
  attempt_id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES control.population_units(unit_id),
  run_id text NOT NULL REFERENCES control.population_runs(run_id),
  provider_id text NOT NULL,
  provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  request_fingerprint text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  outcome text CHECK (outcome IS NULL OR outcome IN ('SUCCESS','EMPTY','UNSUPPORTED','RATE_LIMITED','RETRYABLE_FAILURE','PERMANENT_FAILURE','MALFORMED_RESPONSE','CANCELLED')),
  status_code integer,
  retry_after text,
  response_media_type text,
  raw_byte_count bigint CHECK (raw_byte_count IS NULL OR raw_byte_count >= 0),
  raw_manifest_id text REFERENCES raw.objects(object_id),
  error_class text,
  error_code text,
  retry_classification_id text,
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE population.candidates (
  candidate_id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES control.population_units(unit_id),
  retrieval_attempt_id text NOT NULL REFERENCES control.retrieval_attempts(attempt_id),
  raw_manifest_id text NOT NULL REFERENCES raw.objects(object_id),
  dataset_id text NOT NULL,
  provider_id text NOT NULL,
  provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  source_observation_id text NOT NULL,
  source_observed_at timestamptz NOT NULL,
  effective_at timestamptz,
  parser_version text NOT NULL,
  candidate_schema_version text NOT NULL,
  candidate_kind text NOT NULL CHECK (candidate_kind IN ('OHLCV','FUNDING','OPEN_INTEREST','LIQUIDATION','STREAM_MANIFEST')),
  bounded_payload jsonb NOT NULL,
  candidate_checksum text NOT NULL CHECK (candidate_checksum ~ '^[0-9a-f]{64}$'),
  validation_status text NOT NULL CHECK (validation_status IN ('ELIGIBLE','BLOCKED','NOT_EVALUATED')),
  quality_eligibility text NOT NULL CHECK (quality_eligibility IN ('ELIGIBLE','BLOCKED','NOT_EVALUATED')),
  normalization_eligibility text NOT NULL CHECK (normalization_eligibility IN ('ELIGIBLE','BLOCKED','NOT_EVALUATED')),
  created_at timestamptz NOT NULL,
  UNIQUE (raw_manifest_id, source_observation_id, parser_version, candidate_id),
  CHECK (jsonb_typeof(bounded_payload) = 'object')
);

CREATE TABLE quality.candidate_validation_results (
  validation_run_id text PRIMARY KEY,
  candidate_id text REFERENCES population.candidates(candidate_id),
  retrieval_attempt_id text REFERENCES control.retrieval_attempts(attempt_id),
  validation_layer text NOT NULL CHECK (validation_layer IN ('TRANSPORT','STRUCTURAL','PROVIDER_SEMANTIC','CANONICAL_ELIGIBILITY','CROSS_RECORD')),
  rule_id text NOT NULL,
  rule_version text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('PASSED','FAILED','NOT_EVALUATED')),
  blocking boolean NOT NULL,
  failure_routing text CHECK (failure_routing IS NULL OR failure_routing IN ('RETRYABLE','PERMANENT','QUARANTINE','UNSUPPORTED','POLICY_REJECTED')),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  CHECK (candidate_id IS NOT NULL OR retrieval_attempt_id IS NOT NULL)
);

CREATE TABLE quality.candidate_evaluation_runs (
  evaluation_run_id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES control.population_units(unit_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  created_at timestamptz NOT NULL
);

CREATE TABLE quality.candidate_evaluation_results (
  quality_result_id text PRIMARY KEY,
  evaluation_run_id text NOT NULL REFERENCES quality.candidate_evaluation_runs(evaluation_run_id),
  candidate_id text REFERENCES population.candidates(candidate_id),
  result_level text NOT NULL CHECK (result_level IN ('CANDIDATE','UNIT')),
  rule_id text NOT NULL,
  rule_version text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('PASSED','ADVISORY','BLOCKED','NOT_EVALUATED')),
  created_at timestamptz NOT NULL
);

CREATE TABLE population.canonical_submissions (
  submission_id text PRIMARY KEY,
  candidate_id text NOT NULL UNIQUE REFERENCES population.candidates(candidate_id),
  idempotency_key text NOT NULL UNIQUE,
  canonical_commit_id text REFERENCES control.canonical_commits(commit_id),
  canonical_record_id text,
  record_version integer CHECK (record_version IS NULL OR record_version > 0),
  result_status text NOT NULL CHECK (result_status IN ('PENDING','SUCCESS','DUPLICATE','CONFLICT','REJECTED','RETRYABLE_FAILURE')),
  submitted_at timestamptz NOT NULL,
  resolved_at timestamptz
);

CREATE TABLE control.population_outcomes (
  outcome_id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES control.population_jobs(job_id),
  run_id text NOT NULL REFERENCES control.population_runs(run_id),
  unit_id text NOT NULL REFERENCES control.population_units(unit_id),
  candidate_id text REFERENCES population.candidates(candidate_id),
  retrieval_attempt_id text REFERENCES control.retrieval_attempts(attempt_id),
  raw_manifest_id text REFERENCES raw.objects(object_id),
  submission_id text REFERENCES population.canonical_submissions(submission_id),
  outcome_kind control.population_outcome_kind NOT NULL,
  d2_result_status text NOT NULL CHECK (d2_result_status IN ('SUCCESS','DUPLICATE','CONFLICT','REJECTED','RETRYABLE_FAILURE')),
  canonical_commit_id text REFERENCES control.canonical_commits(commit_id),
  conflict_id text REFERENCES quarantine.conflicts(conflict_id),
  quarantine_id text REFERENCES quarantine.candidates(quarantine_id),
  fencing_token bigint NOT NULL CHECK (fencing_token > 0),
  reason_codes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL,
  UNIQUE (candidate_id, outcome_kind, submission_id)
);

CREATE TABLE control.retry_events (
  retry_event_id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES control.population_jobs(job_id),
  run_id text REFERENCES control.population_runs(run_id),
  unit_id text NOT NULL REFERENCES control.population_units(unit_id),
  retrieval_attempt_id text REFERENCES control.retrieval_attempts(attempt_id),
  candidate_id text REFERENCES population.candidates(candidate_id),
  classification_id text NOT NULL,
  retry_policy_id text NOT NULL,
  retry_policy_version text NOT NULL,
  retry_after timestamptz,
  created_at timestamptz NOT NULL
);

CREATE TABLE coverage.watermark_eligibility_decisions (
  decision_id text PRIMARY KEY,
  unit_id text NOT NULL REFERENCES control.population_units(unit_id),
  dataset_id text NOT NULL,
  provider_id text NOT NULL,
  bounded_dimensions jsonb NOT NULL,
  outcome_ids text[] NOT NULL,
  required_unit_policy_id text NOT NULL,
  eligibility_result text NOT NULL CHECK (eligibility_result IN ('ELIGIBLE','BLOCKED_CONFLICT','BLOCKED_MISSING','BLOCKED_QUALITY','BLOCKED_RETRY','BLOCKED_CANCELLED','UNSUPPORTED','NOT_APPLICABLE')),
  blocking_reasons text[] NOT NULL DEFAULT '{}',
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  created_at timestamptz NOT NULL,
  CHECK (jsonb_typeof(bounded_dimensions) = 'object')
);

CREATE INDEX population_units_claim_idx ON control.population_units (current_state, updated_at, unit_id)
  WHERE current_state IN ('PENDING','RETRYABLE');
CREATE INDEX population_leases_expiry_idx ON control.population_leases (expires_at, unit_id) WHERE released_at IS NULL;
CREATE INDEX population_runs_resume_idx ON control.population_runs (job_id, current_state, attempt_number);
CREATE INDEX retrieval_attempts_unit_idx ON control.retrieval_attempts (unit_id, started_at);
CREATE INDEX population_outcomes_unit_idx ON control.population_outcomes (unit_id, created_at);
CREATE INDEX population_candidate_source_idx ON population.candidates (raw_manifest_id, source_observation_id, parser_version);
CREATE INDEX population_submissions_unresolved_idx ON population.canonical_submissions (submitted_at, candidate_id) WHERE resolved_at IS NULL;
CREATE INDEX population_retry_ready_idx ON control.retry_events (retry_after, unit_id) WHERE retry_after IS NOT NULL;
CREATE INDEX population_unit_events_reconcile_idx ON control.population_unit_events (unit_id, occurred_at, event_id);

CREATE FUNCTION control.claim_population_unit(p_owner_id text, p_run_id text, p_now timestamptz, p_expires_at timestamptz)
RETURNS TABLE (unit_id text, lease_id text, fencing_token bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = control, pg_temp AS $$
DECLARE v_unit control.population_units%ROWTYPE; v_lease_id text; v_event_id text;
BEGIN
  IF p_expires_at <= p_now THEN RAISE EXCEPTION 'INVALID_LEASE_WINDOW'; END IF;
  SELECT * INTO v_unit FROM control.population_units u
    WHERE u.current_state IN ('PENDING','RETRYABLE') AND u.cancellation_requested_at IS NULL
    ORDER BY u.updated_at, u.unit_id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  v_lease_id := 'population-lease:' || v_unit.unit_id || ':' || (v_unit.current_fencing_token + 1)::text;
  v_event_id := 'population-unit-event:lease:' || v_unit.unit_id || ':' || (v_unit.current_fencing_token + 1)::text;
  INSERT INTO control.population_leases (lease_id,unit_id,owner_id,fencing_token,lease_version,acquired_at,expires_at,heartbeat_at)
    VALUES (v_lease_id,v_unit.unit_id,p_owner_id,v_unit.current_fencing_token + 1,v_unit.current_fencing_token + 1,p_now,p_expires_at,p_now);
  UPDATE control.population_units SET current_state='LEASED',current_fencing_token=current_fencing_token+1,active_lease_id=v_lease_id,attempt_count=attempt_count+1,updated_at=p_now WHERE population_units.unit_id=v_unit.unit_id;
  INSERT INTO control.population_unit_events (event_id,unit_id,run_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at)
    VALUES (v_event_id,v_unit.unit_id,p_run_id,'LEASE_ACQUIRED',v_unit.current_state,'LEASED',v_unit.current_fencing_token+1,p_owner_id,p_now);
  RETURN QUERY SELECT v_unit.unit_id,v_lease_id,v_unit.current_fencing_token+1;
END $$;

CREATE FUNCTION control.heartbeat_population_lease(p_unit_id text, p_owner_id text, p_fencing_token bigint, p_now timestamptz, p_expires_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = control, pg_temp AS $$
BEGIN
  UPDATE control.population_leases SET heartbeat_at=p_now,expires_at=p_expires_at
    WHERE unit_id=p_unit_id AND owner_id=p_owner_id AND fencing_token=p_fencing_token AND released_at IS NULL AND expires_at>p_now;
  IF NOT FOUND THEN RAISE EXCEPTION 'STALE_FENCING_TOKEN'; END IF;
END $$;

CREATE FUNCTION control.advance_population_unit(p_unit_id text,p_owner_id text,p_fencing_token bigint,p_next_state control.population_unit_state,p_event_id text,p_now timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = control, pg_temp AS $$
DECLARE v_previous control.population_unit_state;
BEGIN
  SELECT current_state INTO v_previous FROM control.population_units
    WHERE unit_id=p_unit_id AND current_fencing_token=p_fencing_token AND cancellation_requested_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'STALE_FENCING_TOKEN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM control.population_leases WHERE unit_id=p_unit_id AND owner_id=p_owner_id AND fencing_token=p_fencing_token AND released_at IS NULL AND expires_at>p_now) THEN RAISE EXCEPTION 'LEASE_NOT_CURRENT'; END IF;
  UPDATE control.population_units SET current_state=p_next_state,updated_at=p_now WHERE unit_id=p_unit_id;
  INSERT INTO control.population_unit_events(event_id,unit_id,event_type,previous_state,next_state,fencing_token,actor_id,occurred_at)
    VALUES(p_event_id,p_unit_id,'STATE_ADVANCED',v_previous,p_next_state,p_fencing_token,p_owner_id,p_now);
END $$;

REVOKE ALL ON FUNCTION control.claim_population_unit(text,text,timestamptz,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION control.heartbeat_population_lease(text,text,bigint,timestamptz,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION control.advance_population_unit(text,text,bigint,control.population_unit_state,text,timestamptz) FROM PUBLIC;
