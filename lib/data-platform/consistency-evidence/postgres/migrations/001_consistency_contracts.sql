-- Unapplied D4 V1 Phase 1 blueprint. Requires certified D2 schemas first.
CREATE TABLE consistency.rule_sets (
  rule_set_id text NOT NULL,
  rule_set_version text NOT NULL,
  policy_version_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('PROPOSED','APPROVED','SUSPENDED')),
  definition_checksum text NOT NULL CHECK (definition_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (rule_set_id, rule_set_version)
);

CREATE TABLE consistency.rules (
  rule_id text NOT NULL,
  rule_version text NOT NULL,
  rule_set_id text NOT NULL,
  rule_set_version text NOT NULL,
  category text NOT NULL CHECK (category IN ('TEMPORAL_ALIGNMENT','IDENTITY_ALIGNMENT','PROVIDER_AGREEMENT','DATASET_AGREEMENT','VALUE_DOMAIN_COMPATIBILITY','CADENCE_COMPATIBILITY','RESOLUTION_COMPATIBILITY','DIRECTIONAL_AGREEMENT','MAGNITUDE_AGREEMENT','PUBLICATION_STATE_COMPATIBILITY','CORRECTION_STATE_COMPATIBILITY')),
  semantic_class text NOT NULL CHECK (semantic_class IN ('FACTUAL','DIRECTIONAL','STRUCTURAL','CONTEXTUAL','HYPOTHESIS')),
  diagnostics_schema_version text NOT NULL,
  policy_version_id text NOT NULL,
  default_severity text NOT NULL CHECK (default_severity IN ('ADVISORY','BLOCKING')),
  definition_checksum text NOT NULL CHECK (definition_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (rule_id, rule_version),
  FOREIGN KEY (rule_set_id, rule_set_version) REFERENCES consistency.rule_sets(rule_set_id, rule_set_version)
);

CREATE TABLE consistency.rule_runs (
  run_id text PRIMARY KEY,
  rule_set_id text NOT NULL,
  rule_set_version text NOT NULL,
  subject_id text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  knowledge_cutoff timestamptz NOT NULL,
  policy_version_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('PENDING','RUNNING','COMPLETED','PARTIAL','BLOCKED','FAILED')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  retry_classification text NOT NULL CHECK (retry_classification IN ('NOT_RETRYABLE','RETRYABLE_DEPENDENCY','RETRYABLE_STORAGE')),
  CHECK (window_end > window_start),
  CHECK (completed_at IS NULL OR completed_at >= started_at),
  FOREIGN KEY (rule_set_id, rule_set_version) REFERENCES consistency.rule_sets(rule_set_id, rule_set_version)
);

CREATE TABLE consistency.inputs (
  input_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES consistency.rule_runs(run_id),
  input_ordinal integer NOT NULL CHECK (input_ordinal >= 0),
  role_id text NOT NULL,
  canonical_record_id text NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 0),
  physical_fact_id text NOT NULL,
  dataset_id text NOT NULL,
  provider_id text NOT NULL,
  effective_at timestamptz,
  observed_at timestamptz NOT NULL,
  knowledge_available_at timestamptz NOT NULL,
  publication_state repository.publication_state NOT NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  lineage_node_id text NOT NULL,
  dataset_registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id),
  provider_registry_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL,
  normalization_version text NOT NULL,
  UNIQUE (run_id, input_ordinal),
  UNIQUE (run_id, role_id, canonical_record_id, record_version),
  FOREIGN KEY (canonical_record_id, record_version) REFERENCES repository.record_versions(canonical_record_id, record_version)
);

CREATE TABLE consistency.rule_results (
  result_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES consistency.rule_runs(run_id),
  rule_id text NOT NULL,
  rule_version text NOT NULL,
  ordered_input_digest text NOT NULL CHECK (ordered_input_digest ~ '^[0-9a-f]{64}$'),
  outcome text NOT NULL CHECK (outcome IN ('CONSISTENT','INCONSISTENT','PARTIAL','INDETERMINATE','NOT_APPLICABLE','BLOCKED_MISSING_INPUT','BLOCKED_INVALID_INPUT','BLOCKED_SUPERSEDED_INPUT')),
  severity text NOT NULL CHECK (severity IN ('ADVISORY','BLOCKING')),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  created_at timestamptz NOT NULL,
  FOREIGN KEY (rule_id, rule_version) REFERENCES consistency.rules(rule_id, rule_version),
  UNIQUE (run_id, rule_id, rule_version, ordered_input_digest)
);

CREATE TABLE consistency.result_diagnostics (
  diagnostic_id text PRIMARY KEY,
  result_id text NOT NULL REFERENCES consistency.rule_results(result_id),
  code text NOT NULL,
  schema_version text NOT NULL,
  explanation_code text NOT NULL,
  bounded_values jsonb NOT NULL CHECK (jsonb_typeof(bounded_values) = 'array'),
  created_at timestamptz NOT NULL
);

CREATE TABLE consistency.recompute_requests (
  request_id text PRIMARY KEY,
  trigger_type text NOT NULL CHECK (trigger_type IN ('NEW_FACT','CORRECTED_FACT','REVOKED_FACT','QUALITY_CHANGE','COVERAGE_CHANGE','POLICY_CHANGE','PROFILE_CHANGE')),
  triggering_object_id text NOT NULL,
  triggering_object_version text NOT NULL,
  dependency_graph_version text NOT NULL,
  requested_at timestamptz NOT NULL,
  UNIQUE (trigger_type, triggering_object_id, triggering_object_version, dependency_graph_version)
);

CREATE INDEX consistency_rule_runs_scope_idx ON consistency.rule_runs (subject_id, window_start, window_end, knowledge_cutoff);
CREATE INDEX consistency_inputs_fact_idx ON consistency.inputs (canonical_record_id, record_version);
CREATE INDEX consistency_rule_results_run_idx ON consistency.rule_results (run_id, created_at, result_id);
