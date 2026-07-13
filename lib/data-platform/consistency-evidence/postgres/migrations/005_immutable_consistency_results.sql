-- D4 Phase 2B immutable Consistency Results. Logical Fact references avoid cross-platform D2 coupling.
CREATE TABLE consistency.immutable_results (
  result_id text PRIMARY KEY,
  result_identity text NOT NULL UNIQUE CHECK (result_identity ~ '^[0-9a-f]{64}$'),
  input_set_identity text NOT NULL CHECK (input_set_identity ~ '^crin_[0-9a-f]{64}$'),
  rule_id text NOT NULL,
  rule_version text NOT NULL,
  rule_set_id text NOT NULL,
  rule_set_version text NOT NULL,
  temporal_alignment_id text NOT NULL,
  temporal_alignment_checksum text NOT NULL CHECK (temporal_alignment_checksum ~ '^[0-9a-f]{64}$'),
  outcome text NOT NULL CHECK (outcome IN ('CONSISTENT','INCONSISTENT','PARTIAL','INDETERMINATE','NOT_APPLICABLE','BLOCKED_MISSING_INPUT','BLOCKED_INVALID_INPUT','BLOCKED_SUPERSEDED_INPUT','BLOCKED_FUTURE_KNOWLEDGE')),
  severity text NOT NULL CHECK (severity IN ('ADVISORY','BLOCKING')),
  blocking boolean NOT NULL,
  event_time_start timestamptz NOT NULL,
  event_time_end timestamptz NOT NULL,
  knowledge_mode text NOT NULL CHECK (knowledge_mode IN ('AS_KNOWN_THEN','LATEST_CORRECTED','RETROSPECTIVE')),
  knowledge_time_cutoff timestamptz NOT NULL,
  temporal_policy_id text NOT NULL,
  temporal_policy_version text NOT NULL,
  comparison_policy_references jsonb NOT NULL CHECK (jsonb_typeof(comparison_policy_references)='array'),
  severity_policy_id text NOT NULL,
  severity_policy_version text NOT NULL,
  diagnostic_schema_version text NOT NULL,
  result_schema_version text NOT NULL,
  result_checksum text NOT NULL CHECK (result_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  CHECK (event_time_end > event_time_start),
  FOREIGN KEY (rule_id, rule_version) REFERENCES consistency.rules(rule_id, rule_version),
  FOREIGN KEY (rule_set_id, rule_set_version) REFERENCES consistency.rule_sets(rule_set_id, rule_set_version)
);

CREATE TABLE consistency.result_run_links (
  result_id text NOT NULL REFERENCES consistency.immutable_results(result_id),
  run_id text NOT NULL REFERENCES consistency.run_specifications(run_id),
  run_specification_checksum text NOT NULL CHECK (run_specification_checksum ~ '^[0-9a-f]{64}$'),
  source_alignment_id text NOT NULL,
  source_alignment_checksum text NOT NULL CHECK (source_alignment_checksum ~ '^[0-9a-f]{64}$'),
  linked_at timestamptz NOT NULL,
  PRIMARY KEY (result_id, run_id)
);

CREATE TABLE consistency.result_input_references (
  result_id text NOT NULL REFERENCES consistency.immutable_results(result_id),
  role_id text NOT NULL,
  canonical_record_id text NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 0),
  dataset_id text NOT NULL,
  provider_id text NOT NULL,
  provider_snapshot_id text NOT NULL,
  effective_at timestamptz,
  observed_at timestamptz NOT NULL,
  knowledge_available_at timestamptz NOT NULL,
  publication_state repository.publication_state NOT NULL,
  supersession_state text NOT NULL CHECK (supersession_state IN ('ACTIVE','SUPERSEDED','CORRECTION')),
  input_checksum text NOT NULL CHECK (input_checksum ~ '^[0-9a-f]{64}$'),
  lineage_node_id text NOT NULL,
  PRIMARY KEY (result_id, role_id, canonical_record_id, record_version)
);

CREATE TABLE consistency.result_temporal_references (
  result_id text PRIMARY KEY REFERENCES consistency.immutable_results(result_id),
  alignment_id text NOT NULL,
  alignment_checksum text NOT NULL CHECK (alignment_checksum ~ '^[0-9a-f]{64}$'),
  alignment_mode text NOT NULL CHECK (alignment_mode IN ('EXACT_TIMESTAMP','WINDOW_CONTAINMENT','NEAREST_PRIOR','NEAREST_OBSERVATION','INTERVAL_OVERLAP','AS_OF','EVENT_TO_WINDOW')),
  alignment_status text NOT NULL,
  no_lookahead_decisions jsonb NOT NULL CHECK (jsonb_typeof(no_lookahead_decisions)='array')
);

CREATE TABLE consistency.immutable_result_diagnostics (
  result_id text NOT NULL REFERENCES consistency.immutable_results(result_id),
  diagnostic_id text NOT NULL,
  code text NOT NULL,
  schema_version text NOT NULL,
  input_role_ids text[] NOT NULL,
  bounded_values jsonb NOT NULL CHECK (jsonb_typeof(bounded_values)='array'),
  explanation_code text NOT NULL,
  PRIMARY KEY (result_id, diagnostic_id)
);

CREATE TABLE consistency.result_conflicts (
  conflict_id text PRIMARY KEY,
  result_identity text NOT NULL CHECK (result_identity ~ '^[0-9a-f]{64}$'),
  existing_result_id text NOT NULL REFERENCES consistency.immutable_results(result_id),
  existing_checksum text NOT NULL CHECK (existing_checksum ~ '^[0-9a-f]{64}$'),
  incoming_checksum text NOT NULL CHECK (incoming_checksum ~ '^[0-9a-f]{64}$'),
  rule_id text NOT NULL,
  rule_version text NOT NULL,
  input_set_identity text NOT NULL CHECK (input_set_identity ~ '^crin_[0-9a-f]{64}$'),
  detected_at timestamptz NOT NULL,
  reason_code text NOT NULL CHECK (reason_code='IMMUTABLE_CONTENT_MISMATCH'),
  CHECK (existing_checksum <> incoming_checksum),
  UNIQUE (result_identity, existing_checksum, incoming_checksum)
);

CREATE INDEX consistency_result_inputs_fact_lookup_idx ON consistency.result_input_references(canonical_record_id, record_version, result_id);
CREATE INDEX consistency_result_run_lookup_idx ON consistency.result_run_links(run_id, result_id);
CREATE INDEX consistency_result_conflict_lookup_idx ON consistency.result_conflicts(result_identity, detected_at, conflict_id);

CREATE FUNCTION consistency.reject_immutable_result_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_CONSISTENCY_RESULT_HISTORY' USING ERRCODE='55000';
END;
$$;

CREATE TRIGGER immutable_results_no_mutation BEFORE UPDATE OR DELETE ON consistency.immutable_results FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER result_run_links_no_mutation BEFORE UPDATE OR DELETE ON consistency.result_run_links FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER result_input_references_no_mutation BEFORE UPDATE OR DELETE ON consistency.result_input_references FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER result_temporal_references_no_mutation BEFORE UPDATE OR DELETE ON consistency.result_temporal_references FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER immutable_result_diagnostics_no_mutation BEFORE UPDATE OR DELETE ON consistency.immutable_result_diagnostics FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER result_conflicts_no_mutation BEFORE UPDATE OR DELETE ON consistency.result_conflicts FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();

-- No UPDATE or DELETE helper exists. Runtime writes are append-only through the bounded store.
