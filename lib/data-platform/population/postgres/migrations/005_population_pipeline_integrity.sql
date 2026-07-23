CREATE TABLE IF NOT EXISTS population.canonical_submission_events (
  event_id text PRIMARY KEY,
  submission_id text NOT NULL REFERENCES population.canonical_submissions(submission_id),
  event_type text NOT NULL CHECK (event_type IN (
    'SUBMISSION_PREPARED',
    'D2_COMMIT_REQUESTED',
    'COMMIT_RESULT_RECONCILED',
    'POPULATION_OUTCOME_RECORDED',
    'CHECKPOINT_RECORDED'
  )),
  event_checksum text NOT NULL CHECK (event_checksum ~ '^[0-9a-f]{64}$'),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  fencing_token bigint NOT NULL CHECK (fencing_token > 0),
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canonical_submission_events_submission
  ON population.canonical_submission_events(submission_id, created_at, event_id);

ALTER TABLE population.canonical_submissions
  ADD COLUMN IF NOT EXISTS unit_id text REFERENCES control.population_units(unit_id),
  ADD COLUMN IF NOT EXISTS retrieval_attempt_id text REFERENCES control.retrieval_attempts(attempt_id),
  ADD COLUMN IF NOT EXISTS raw_manifest_id text REFERENCES raw.objects(object_id),
  ADD COLUMN IF NOT EXISTS expected_canonical_record_id text,
  ADD COLUMN IF NOT EXISTS expected_record_version integer,
  ADD COLUMN IF NOT EXISTS expected_fact_checksum text,
  ADD COLUMN IF NOT EXISTS command_checksum text;

ALTER TABLE population.canonical_submissions
  ADD CONSTRAINT canonical_submissions_expected_fact_checksum_check
  CHECK (expected_fact_checksum IS NULL OR expected_fact_checksum ~ '^[0-9a-f]{64}$');

ALTER TABLE population.canonical_submissions
  ADD CONSTRAINT canonical_submissions_command_checksum_check
  CHECK (command_checksum IS NULL OR command_checksum ~ '^[0-9a-f]{64}$');

GRANT SELECT, INSERT ON population.canonical_submission_events TO qt_d3_worker;
GRANT SELECT ON population.canonical_submission_events TO qt_d3_read_only;
GRANT UPDATE (
  result_status,
  canonical_commit_id,
  canonical_record_id,
  record_version,
  resolved_at
) ON population.canonical_submissions TO qt_d3_worker;
