-- D2 Phase 1 blueprint only. Unapplied.
CREATE SCHEMA IF NOT EXISTS control;
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS canonical;
CREATE SCHEMA IF NOT EXISTS repository;
CREATE SCHEMA IF NOT EXISTS quality;
CREATE SCHEMA IF NOT EXISTS coverage;
CREATE SCHEMA IF NOT EXISTS projection;
CREATE SCHEMA IF NOT EXISTS evidence;
CREATE SCHEMA IF NOT EXISTS consistency;
CREATE SCHEMA IF NOT EXISTS quarantine;

CREATE TABLE control.registry_snapshots (
  snapshot_id text PRIMARY KEY,
  registry_version text NOT NULL,
  content_checksum text NOT NULL UNIQUE,
  canonical_content jsonb NOT NULL,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK (length(content_checksum) = 64)
);

CREATE TABLE control.provider_snapshots (
  snapshot_id text PRIMARY KEY,
  provider_id text NOT NULL,
  registration_version text NOT NULL,
  certification_status text NOT NULL CHECK (certification_status IN ('CANDIDATE','VALIDATING','CERTIFIED','CERTIFIED_WITH_LIMITATIONS','DEGRADED','SUSPENDED','REVOKED')),
  content_checksum text NOT NULL UNIQUE,
  canonical_content jsonb NOT NULL,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK (length(content_checksum) = 64)
);
CREATE INDEX idx_provider_snapshots_provider_effective ON control.provider_snapshots (provider_id, effective_at DESC);

CREATE TABLE control.policy_versions (
  policy_version_id text PRIMARY KEY,
  dataset_id text NOT NULL,
  policy_version text NOT NULL,
  content_checksum text NOT NULL UNIQUE,
  canonical_content jsonb NOT NULL,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (dataset_id, policy_version),
  CHECK (length(content_checksum) = 64)
);

CREATE TABLE control.migration_ledger (
  migration_id text PRIMARY KEY,
  migration_checksum text NOT NULL UNIQUE,
  applied_at timestamptz NOT NULL,
  applied_by text NOT NULL,
  CHECK (length(migration_checksum) = 64)
);

CREATE TABLE raw.objects (
  object_id text PRIMARY KEY,
  dataset_id text NOT NULL,
  provider_id text NOT NULL,
  venue text NULL,
  symbol_or_subject text NULL,
  window_start timestamptz NULL,
  window_end timestamptz NULL,
  content_hash text NOT NULL UNIQUE,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  media_type text NOT NULL,
  compression text NOT NULL CHECK (compression IN ('NONE','GZIP','ZSTD','ZIP','PARQUET')),
  retrieved_at timestamptz NOT NULL,
  provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  retention_class text NOT NULL CHECK (retention_class IN ('HOT','STANDARD','ARCHIVE','LEGAL_HOLD')),
  verification_state text NOT NULL CHECK (verification_state IN ('PENDING','VERIFIED','FAILED')),
  object_storage_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  CHECK (length(content_hash) = 64),
  CHECK (window_end IS NULL OR window_start IS NULL OR window_end >= window_start)
);
CREATE INDEX idx_raw_objects_dataset_subject_window ON raw.objects (dataset_id, symbol_or_subject, window_start, window_end);
CREATE INDEX idx_raw_objects_provider_retrieved ON raw.objects (provider_id, retrieved_at DESC);

CREATE TABLE raw.retrieval_attempts (
  attempt_id text PRIMARY KEY,
  object_id text NULL REFERENCES raw.objects(object_id),
  dataset_id text NOT NULL,
  provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  attempted_at timestamptz NOT NULL,
  result text NOT NULL CHECK (result IN ('SUCCESS','NOT_FOUND','RETRYABLE_FAILURE','PERMANENT_FAILURE')),
  diagnostic_code text NULL
);
CREATE INDEX idx_retrieval_attempts_dataset_time ON raw.retrieval_attempts (dataset_id, attempted_at DESC);

CREATE TYPE control.canonical_commit_operation AS ENUM ('INITIAL_VERSION','PROVIDER_CORRECTION','GOVERNED_IMPORT');
CREATE TABLE control.canonical_commits (
  commit_id text PRIMARY KEY,
  operation_type control.canonical_commit_operation NOT NULL,
  dataset_id text NOT NULL,
  provider_id text NOT NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id),
  provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL,
  normalization_version text NOT NULL,
  initiated_at timestamptz NOT NULL,
  committed_at timestamptz NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  candidate_count integer NOT NULL CHECK (candidate_count = 1),
  committed_record_count integer NOT NULL CHECK (committed_record_count = 1),
  CHECK (committed_at >= initiated_at)
);
CREATE INDEX idx_canonical_commits_dataset_time ON control.canonical_commits (dataset_id, committed_at DESC);

CREATE TABLE control.outbox (
  event_id text PRIMARY KEY,
  commit_id text NOT NULL REFERENCES control.canonical_commits(commit_id),
  event_type text NOT NULL CHECK (event_type IN ('CANONICAL_RECORD_COMMITTED','PUBLICATION_STATE_CHANGED')),
  payload_version text NOT NULL CHECK (payload_version = '1'),
  canonical_record_id text NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 0),
  publication_decision_id text NULL,
  created_at timestamptz NOT NULL,
  published_at timestamptz NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  CHECK ((event_type = 'CANONICAL_RECORD_COMMITTED' AND publication_decision_id IS NULL) OR
         (event_type = 'PUBLICATION_STATE_CHANGED' AND publication_decision_id IS NOT NULL))
);
CREATE INDEX idx_outbox_unpublished ON control.outbox (created_at, event_id) WHERE published_at IS NULL;
CREATE UNIQUE INDEX idx_one_commit_event ON control.outbox (commit_id) WHERE event_type = 'CANONICAL_RECORD_COMMITTED';
CREATE UNIQUE INDEX idx_one_publication_event ON control.outbox (publication_decision_id) WHERE event_type = 'PUBLICATION_STATE_CHANGED';
