-- D2 Phase 1 blueprint only. Unapplied.
CREATE TABLE quality.evaluation_runs (
  evaluation_id text PRIMARY KEY, commit_id text NOT NULL REFERENCES control.canonical_commits(commit_id), dataset_id text NOT NULL,
  canonical_record_id text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0), policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  evaluated_at timestamptz NOT NULL, resolution text NOT NULL CHECK (resolution IN ('OPEN','ACCEPTED','REJECTED','REPAIRED')),
  UNIQUE (canonical_record_id, record_version, policy_version_id)
);
CREATE TABLE quality.results (
  result_id text PRIMARY KEY, evaluation_id text NOT NULL REFERENCES quality.evaluation_runs(evaluation_id), rule_id text NOT NULL, rule_version text NOT NULL,
  mandatory boolean NOT NULL, result text NOT NULL CHECK (result IN ('PASS','WARN','FAIL','NOT_APPLICABLE','NOT_EVALUATED')),
  severity text NOT NULL CHECK (severity IN ('INFO','LOW','MEDIUM','HIGH','CRITICAL')), diagnostic_code text NULL,
  UNIQUE (evaluation_id, rule_id, rule_version)
);
CREATE INDEX idx_quality_results_failed ON quality.results (evaluation_id, severity) WHERE result IN ('FAIL','NOT_EVALUATED');

CREATE TABLE coverage.projection_versions (
  coverage_version_id text PRIMARY KEY, dataset_id text NOT NULL, subject text NOT NULL, window_start timestamptz NOT NULL, window_end timestamptz NOT NULL,
  source_watermark text NOT NULL, source_record_set_digest text NOT NULL CHECK (length(source_record_set_digest) = 64), status text NOT NULL CHECK (status IN ('AVAILABLE','PARTIAL','STALE','MISSING')),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id), computed_at timestamptz NOT NULL, UNIQUE (dataset_id, subject, window_start, window_end, source_watermark), CHECK (window_end > window_start)
);
CREATE INDEX idx_coverage_projection_lookup ON coverage.projection_versions (dataset_id, subject, window_start, window_end, computed_at DESC);
CREATE TABLE coverage.dataset_watermarks (
  watermark_id text PRIMARY KEY, dataset_id text NOT NULL, watermark_kind text NOT NULL CHECK (watermark_kind IN ('TIMESTAMP','PROVIDER_CURSOR','ARCHIVE_PARTITION','SEQUENCE','AGG_TRADE_ID','OBJECT_MANIFEST')),
  watermark_value text NOT NULL, observed_at timestamptz NOT NULL, commit_id text NULL REFERENCES control.canonical_commits(commit_id), UNIQUE (dataset_id, watermark_kind, watermark_value)
);

CREATE TABLE projection.versions (
  projection_version_id text PRIMARY KEY, dataset_id text NOT NULL, projection_kind text NOT NULL, model_version text NOT NULL,
  input_watermark text NOT NULL, input_record_set_digest text NOT NULL CHECK (length(input_record_set_digest) = 64), created_at timestamptz NOT NULL,
  publication_state repository.publication_state NOT NULL DEFAULT 'PENDING', UNIQUE (dataset_id, projection_kind, model_version, input_record_set_digest)
);
CREATE TABLE projection.record_inputs (
  projection_version_id text NOT NULL REFERENCES projection.versions(projection_version_id), canonical_record_id text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0),
  PRIMARY KEY (projection_version_id, canonical_record_id, record_version), FOREIGN KEY (canonical_record_id, record_version) REFERENCES repository.record_versions(canonical_record_id, record_version)
);

CREATE TABLE evidence.packets (
  evidence_packet_id text PRIMARY KEY, packet_version text NOT NULL, projection_version_id text NOT NULL REFERENCES projection.versions(projection_version_id),
  input_record_set_digest text NOT NULL CHECK (length(input_record_set_digest) = 64), created_at timestamptz NOT NULL, publication_state repository.publication_state NOT NULL DEFAULT 'PENDING',
  UNIQUE (projection_version_id, packet_version, input_record_set_digest)
);
CREATE TABLE evidence.record_references (
  evidence_packet_id text NOT NULL REFERENCES evidence.packets(evidence_packet_id), canonical_record_id text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0), role text NOT NULL CHECK (role IN ('SUPPORTING','COUNTER','CONTEXT')),
  PRIMARY KEY (evidence_packet_id, canonical_record_id, record_version, role), FOREIGN KEY (canonical_record_id, record_version) REFERENCES repository.record_versions(canonical_record_id, record_version)
);

CREATE TABLE consistency.runs (
  consistency_run_id text PRIMARY KEY, scope text NOT NULL, started_at timestamptz NOT NULL, completed_at timestamptz NULL, status text NOT NULL CHECK (status IN ('RUNNING','PASS','WARN','FAIL')),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);
CREATE TABLE consistency.results (
  consistency_result_id text PRIMARY KEY, consistency_run_id text NOT NULL REFERENCES consistency.runs(consistency_run_id), check_type text NOT NULL,
  object_identity text NOT NULL, result text NOT NULL CHECK (result IN ('PASS','WARN','FAIL','NOT_EVALUATED')), detected_at timestamptz NOT NULL, diagnostic_code text NULL,
  UNIQUE (consistency_run_id, check_type, object_identity)
);
CREATE INDEX idx_consistency_failures ON consistency.results (object_identity, detected_at DESC) WHERE result = 'FAIL';

CREATE TABLE quarantine.candidates (
  quarantine_id text PRIMARY KEY, raw_object_id text NOT NULL REFERENCES raw.objects(object_id), attempted_canonical_record_id text NULL,
  attempted_record_version integer NULL CHECK (attempted_record_version IS NULL OR attempted_record_version > 0), status text NOT NULL CHECK (status IN ('OPEN','RESOLVED','PERMANENTLY_REJECTED')),
  reason_codes text[] NOT NULL, created_at timestamptz NOT NULL
);
CREATE TABLE quarantine.conflicts (
  conflict_id text PRIMARY KEY, quarantine_id text NOT NULL UNIQUE REFERENCES quarantine.candidates(quarantine_id), canonical_record_id text NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 0), existing_checksum text NOT NULL CHECK (length(existing_checksum) = 64), candidate_checksum text NOT NULL CHECK (length(candidate_checksum) = 64),
  detected_at timestamptz NOT NULL, CHECK (existing_checksum <> candidate_checksum)
);
CREATE INDEX idx_quarantine_conflicts_record ON quarantine.conflicts (canonical_record_id, record_version);
CREATE TABLE quarantine.repair_events (
  repair_event_id text PRIMARY KEY, quarantine_id text NOT NULL REFERENCES quarantine.candidates(quarantine_id),
  resolution_type text NOT NULL CHECK (resolution_type IN ('PROVIDER_CORRECTION','PARSER_FIXED','SCHEMA_FIXED','DUPLICATE_CONFIRMED','ACCEPTED_WITH_LIMITATION','PERMANENTLY_REJECTED','PROVIDER_CERTIFICATION_CHANGED')),
  decided_by text NOT NULL, decided_at timestamptz NOT NULL, decision_notes text NOT NULL
);
CREATE INDEX idx_repair_events_candidate ON quarantine.repair_events (quarantine_id, decided_at);

-- Immutability is completed by role grants: canonical runtime roles receive no UPDATE or DELETE on history tables.
-- Only repository.append_publication_decision may update record_versions.current_publication_state.
