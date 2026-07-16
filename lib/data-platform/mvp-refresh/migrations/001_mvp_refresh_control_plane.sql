CREATE SCHEMA IF NOT EXISTS refresh_control;

CREATE TABLE refresh_control.refresh_policy (
  policy_id text PRIMARY KEY, policy_version text NOT NULL, policy jsonb NOT NULL,
  checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'), created_at timestamptz NOT NULL
);
CREATE TABLE refresh_control.refresh_plan (
  plan_id text PRIMARY KEY, policy_id text NOT NULL REFERENCES refresh_control.refresh_policy(policy_id),
  active_corpus_id text NOT NULL, active_serving_checksum text NOT NULL CHECK (active_serving_checksum ~ '^[0-9a-f]{64}$'),
  requested_start timestamptz NOT NULL, requested_end timestamptz NOT NULL, state text NOT NULL CHECK (state IN ('DRAFT','READY','SUPERSEDED','CANCELLED')),
  plan jsonb NOT NULL, checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'), created_at timestamptz NOT NULL, CHECK (requested_end > requested_start)
);
CREATE TABLE refresh_control.refresh_run (
  run_id text PRIMARY KEY, plan_id text NOT NULL REFERENCES refresh_control.refresh_plan(plan_id),
  state text NOT NULL CHECK (state IN ('PLANNED','ACQUIRING','NORMALIZING','COMMITTING','VALIDATING','MATERIALIZING','COMPARING','READY_FOR_RELEASE_REVIEW','NOOP','BLOCKED','FAILED','CANCELLED')),
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0), blocker_codes text[] NOT NULL DEFAULT '{}', checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE refresh_control.refresh_unit (
  unit_id text PRIMARY KEY, run_id text NOT NULL REFERENCES refresh_control.refresh_run(run_id), instrument text NOT NULL, dataset_id text NOT NULL,
  interval_start timestamptz NOT NULL, interval_end timestamptz NOT NULL, state text NOT NULL CHECK (state IN ('PENDING','LEASED','ACQUIRED','NORMALIZED','COMMITTED','VALIDATED','MATERIALIZED','COMPLETE','UNAVAILABLE','BLOCKED','FAILED')),
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0), blocker_codes text[] NOT NULL DEFAULT '{}', checkpoint jsonb NOT NULL DEFAULT '{}', checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, UNIQUE(run_id,instrument,dataset_id,interval_start,interval_end), CHECK(interval_end > interval_start)
);
CREATE TABLE refresh_control.source_watermark (
  watermark_id text PRIMARY KEY, run_id text NOT NULL REFERENCES refresh_control.refresh_run(run_id), dataset_id text NOT NULL, source_id text NOT NULL,
  mandatory boolean NOT NULL, observed_through timestamptz, state text NOT NULL CHECK (state IN ('AVAILABLE','DELAYED','UNAVAILABLE','GAP','INCONSISTENT')),
  reason_codes text[] NOT NULL, source_checksum text CHECK (source_checksum IS NULL OR source_checksum ~ '^[0-9a-f]{64}$'), checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'), observed_at timestamptz NOT NULL,
  UNIQUE(run_id,dataset_id,source_id)
);
CREATE TABLE refresh_control.source_availability_observation (
  observation_id text PRIMARY KEY, run_id text NOT NULL REFERENCES refresh_control.refresh_run(run_id), dataset_id text NOT NULL, source_id text NOT NULL,
  interval_start timestamptz NOT NULL, interval_end timestamptz NOT NULL, state text NOT NULL, reason_codes text[] NOT NULL, observation jsonb NOT NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'), observed_at timestamptz NOT NULL
);
CREATE TABLE refresh_control.refresh_artifact (
  artifact_id text PRIMARY KEY, run_id text NOT NULL REFERENCES refresh_control.refresh_run(run_id), unit_id text NOT NULL REFERENCES refresh_control.refresh_unit(unit_id),
  artifact_kind text NOT NULL, content_checksum text NOT NULL CHECK (content_checksum ~ '^[0-9a-f]{64}$'), byte_count bigint NOT NULL CHECK (byte_count >= 0),
  lineage jsonb NOT NULL, created_at timestamptz NOT NULL, UNIQUE(unit_id,artifact_kind,content_checksum)
);
CREATE TABLE refresh_control.refresh_candidate (
  candidate_id text PRIMARY KEY, run_id text NOT NULL REFERENCES refresh_control.refresh_run(run_id), corpus_id text NOT NULL,
  serving_checksum text NOT NULL CHECK (serving_checksum ~ '^[0-9a-f]{64}$'), governed_through timestamptz NOT NULL,
  lifecycle text NOT NULL CHECK (lifecycle IN ('BUILDING','VALIDATING','INVALID','READY_FOR_RELEASE_REVIEW','SUPERSEDED')),
  descriptor jsonb NOT NULL, checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'), created_at timestamptz NOT NULL
);
CREATE TABLE refresh_control.candidate_validation (
  validation_id text PRIMARY KEY, candidate_id text NOT NULL REFERENCES refresh_control.refresh_candidate(candidate_id), validation_kind text NOT NULL,
  result text NOT NULL CHECK (result IN ('PASS','FAIL','BLOCKED')), details jsonb NOT NULL, checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'), created_at timestamptz NOT NULL
);
CREATE TABLE refresh_control.release_manifest (
  release_manifest_id text PRIMARY KEY, candidate_id text NOT NULL REFERENCES refresh_control.refresh_candidate(candidate_id), release_channel text NOT NULL CHECK (release_channel='candidate'),
  corpus_id text NOT NULL, serving_checksum text NOT NULL CHECK (serving_checksum ~ '^[0-9a-f]{64}$'), governed_through timestamptz NOT NULL,
  lifecycle text NOT NULL CHECK (lifecycle='CANDIDATE'), exposure_eligibility text NOT NULL CHECK (exposure_eligibility IN ('ELIGIBLE','INELIGIBLE')),
  manifest jsonb NOT NULL, manifest_checksum text NOT NULL UNIQUE CHECK (manifest_checksum ~ '^[0-9a-f]{64}$'), created_at timestamptz NOT NULL
);
CREATE TABLE refresh_control.release_manifest_entry (
  entry_id text PRIMARY KEY, release_manifest_id text NOT NULL REFERENCES refresh_control.release_manifest(release_manifest_id), entry_kind text NOT NULL,
  entry_identity text NOT NULL, entry_checksum text NOT NULL CHECK (entry_checksum ~ '^[0-9a-f]{64}$'), entry jsonb NOT NULL, UNIQUE(release_manifest_id,entry_kind,entry_identity)
);
CREATE TABLE refresh_control.release_comparison (
  comparison_id text PRIMARY KEY, candidate_id text NOT NULL REFERENCES refresh_control.refresh_candidate(candidate_id), active_corpus_id text NOT NULL,
  comparison jsonb NOT NULL, checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'), created_at timestamptz NOT NULL
);
CREATE TABLE refresh_control.activation_readiness (
  readiness_id text PRIMARY KEY, candidate_id text NOT NULL REFERENCES refresh_control.refresh_candidate(candidate_id), state text NOT NULL CHECK (state IN ('INELIGIBLE','READY_FOR_RELEASE_REVIEW')),
  blocker_codes text[] NOT NULL, details jsonb NOT NULL, checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'), created_at timestamptz NOT NULL
);
CREATE TABLE refresh_control.refresh_event (
  event_id text PRIMARY KEY, run_id text REFERENCES refresh_control.refresh_run(run_id), entity_kind text NOT NULL, entity_id text NOT NULL, event_kind text NOT NULL,
  from_state text, to_state text, payload jsonb NOT NULL, checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'), occurred_at timestamptz NOT NULL
);
CREATE TABLE refresh_control.refresh_lease (
  lease_key text PRIMARY KEY, owner_id text NOT NULL, fencing_token bigint NOT NULL CHECK (fencing_token > 0), acquired_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
  released_at timestamptz, CHECK (expires_at > acquired_at)
);
CREATE INDEX refresh_unit_run_state_idx ON refresh_control.refresh_unit(run_id,state);
CREATE INDEX refresh_event_run_time_idx ON refresh_control.refresh_event(run_id,occurred_at);
CREATE INDEX source_watermark_run_idx ON refresh_control.source_watermark(run_id,dataset_id);

CREATE OR REPLACE FUNCTION refresh_control.reject_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'REFRESH_EVENT_APPEND_ONLY'; END $$;
CREATE TRIGGER refresh_event_no_update_delete BEFORE UPDATE OR DELETE ON refresh_control.refresh_event FOR EACH ROW EXECUTE FUNCTION refresh_control.reject_event_mutation();
