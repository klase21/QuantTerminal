CREATE TABLE refresh_control.source_contract (
  source_contract_id text PRIMARY KEY,
  provider text NOT NULL,
  dataset_id text NOT NULL,
  instrument text NOT NULL,
  interval_start timestamptz NOT NULL,
  interval_end timestamptz NOT NULL,
  contract_version text NOT NULL,
  contract jsonb NOT NULL,
  checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  CHECK (interval_end > interval_start)
);

CREATE TABLE refresh_control.controlled_retrieval (
  retrieval_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES refresh_control.refresh_run(run_id),
  unit_id text NOT NULL REFERENCES refresh_control.refresh_unit(unit_id),
  source_contract_id text NOT NULL REFERENCES refresh_control.source_contract(source_contract_id),
  artifact_id text NOT NULL REFERENCES refresh_control.refresh_artifact(artifact_id),
  source_object_identity text NOT NULL,
  source_classification text NOT NULL CHECK (source_classification = 'HTTP_SUCCESS'),
  content_type text NOT NULL,
  byte_count bigint NOT NULL CHECK (byte_count > 0),
  raw_checksum text NOT NULL CHECK (raw_checksum ~ '^[0-9a-f]{64}$'),
  finalized boolean NOT NULL CHECK (finalized),
  retrieval jsonb NOT NULL,
  checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  UNIQUE (unit_id, source_contract_id)
);

CREATE TABLE refresh_control.controlled_candidate_set (
  candidate_set_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES refresh_control.refresh_run(run_id),
  unit_id text NOT NULL REFERENCES refresh_control.refresh_unit(unit_id),
  retrieval_id text NOT NULL REFERENCES refresh_control.controlled_retrieval(retrieval_id),
  source_contract_id text NOT NULL REFERENCES refresh_control.source_contract(source_contract_id),
  candidate_count integer NOT NULL CHECK (candidate_count = 288),
  candidate_identities jsonb NOT NULL,
  checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  UNIQUE (unit_id, retrieval_id)
);

CREATE TABLE refresh_control.controlled_canonical_commit_set (
  commit_set_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES refresh_control.refresh_run(run_id),
  unit_id text NOT NULL REFERENCES refresh_control.refresh_unit(unit_id),
  candidate_set_id text NOT NULL REFERENCES refresh_control.controlled_candidate_set(candidate_set_id),
  status text NOT NULL CHECK (status IN ('CREATED','DUPLICATE','CONFLICT')),
  fact_count integer NOT NULL CHECK (fact_count >= 0),
  canonical_facts jsonb NOT NULL,
  canonical_stable_domain_digest text,
  checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  UNIQUE (unit_id, candidate_set_id)
);

CREATE TABLE refresh_control.logical_slot_reconciliation (
  reconciliation_id text PRIMARY KEY,
  logical_slot_id text NOT NULL UNIQUE,
  authoritative_unit_id text NOT NULL REFERENCES refresh_control.refresh_unit(unit_id),
  source_contract_id text NOT NULL REFERENCES refresh_control.source_contract(source_contract_id),
  retrieval_id text NOT NULL REFERENCES refresh_control.controlled_retrieval(retrieval_id),
  artifact_id text NOT NULL REFERENCES refresh_control.refresh_artifact(artifact_id),
  candidate_set_id text NOT NULL REFERENCES refresh_control.controlled_candidate_set(candidate_set_id),
  commit_set_id text NOT NULL REFERENCES refresh_control.controlled_canonical_commit_set(commit_set_id),
  canonical_fact_set_digest text NOT NULL CHECK (canonical_fact_set_digest ~ '^[0-9a-f]{64}$'),
  fact_count integer NOT NULL CHECK (fact_count = 288),
  interval_start timestamptz NOT NULL,
  interval_end timestamptz NOT NULL,
  authority_reason text NOT NULL CHECK (authority_reason = 'CONTROLLED_REACQUISITION_WITH_COMPLETE_PROVENANCE'),
  certification_version text NOT NULL,
  legacy_dispositions jsonb NOT NULL,
  checksum text NOT NULL UNIQUE CHECK (checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  CHECK (interval_end > interval_start)
);

CREATE INDEX controlled_retrieval_unit_idx ON refresh_control.controlled_retrieval(unit_id);
CREATE INDEX controlled_candidate_set_unit_idx ON refresh_control.controlled_candidate_set(unit_id);
CREATE INDEX controlled_commit_set_unit_idx ON refresh_control.controlled_canonical_commit_set(unit_id);
CREATE INDEX logical_slot_reconciliation_unit_idx ON refresh_control.logical_slot_reconciliation(authoritative_unit_id);

CREATE OR REPLACE FUNCTION refresh_control.reject_provenance_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'REFRESH_PROVENANCE_APPEND_ONLY';
END
$$;

CREATE TRIGGER source_contract_no_update_delete BEFORE UPDATE OR DELETE ON refresh_control.source_contract FOR EACH ROW EXECUTE FUNCTION refresh_control.reject_provenance_mutation();
CREATE TRIGGER controlled_retrieval_no_update_delete BEFORE UPDATE OR DELETE ON refresh_control.controlled_retrieval FOR EACH ROW EXECUTE FUNCTION refresh_control.reject_provenance_mutation();
CREATE TRIGGER controlled_candidate_set_no_update_delete BEFORE UPDATE OR DELETE ON refresh_control.controlled_candidate_set FOR EACH ROW EXECUTE FUNCTION refresh_control.reject_provenance_mutation();
CREATE TRIGGER controlled_commit_set_no_update_delete BEFORE UPDATE OR DELETE ON refresh_control.controlled_canonical_commit_set FOR EACH ROW EXECUTE FUNCTION refresh_control.reject_provenance_mutation();
CREATE TRIGGER logical_slot_reconciliation_no_update_delete BEFORE UPDATE OR DELETE ON refresh_control.logical_slot_reconciliation FOR EACH ROW EXECUTE FUNCTION refresh_control.reject_provenance_mutation();
