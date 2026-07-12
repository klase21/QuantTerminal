-- D2 Phase 1 blueprint only. Unapplied.
CREATE TYPE repository.publication_state AS ENUM ('PENDING','CERTIFIED','PUBLISHED','SUPERSEDED','REJECTED','REVOKED');

CREATE TABLE repository.envelopes (
  envelope_id text PRIMARY KEY,
  commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id),
  dataset_id text NOT NULL,
  canonical_record_id text NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 0),
  fact_table text NOT NULL CHECK (fact_table IN ('OHLCV','FUNDING','OPEN_INTEREST','LIQUIDATION','PREDICTION_SNAPSHOT','ETF_OBSERVATION','RESERVE_OBSERVATION','MACRO_OBSERVATION','STREAM_MANIFEST')),
  checksum text NOT NULL CHECK (length(checksum) = 64),
  provider_id text NOT NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id),
  provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL,
  normalization_version text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version)
);
CREATE INDEX idx_envelopes_dataset_record ON repository.envelopes (dataset_id, canonical_record_id, record_version DESC);

CREATE TABLE repository.record_versions (
  version_id text PRIMARY KEY,
  commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id),
  envelope_id text NOT NULL UNIQUE REFERENCES repository.envelopes(envelope_id),
  dataset_id text NOT NULL,
  business_identity text NOT NULL,
  canonical_record_id text NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 0),
  checksum text NOT NULL CHECK (length(checksum) = 64),
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id),
  provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL,
  normalization_version text NOT NULL,
  current_publication_state repository.publication_state NOT NULL DEFAULT 'PENDING',
  current_decision_id text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version),
  UNIQUE (dataset_id, business_identity, record_version)
);
CREATE INDEX idx_record_versions_current ON repository.record_versions (dataset_id, canonical_record_id, record_version DESC);
CREATE UNIQUE INDEX idx_one_published_version ON repository.record_versions (canonical_record_id) WHERE current_publication_state = 'PUBLISHED';

CREATE TABLE repository.publication_decisions (
  decision_id text PRIMARY KEY,
  commit_id text NOT NULL REFERENCES control.canonical_commits(commit_id),
  canonical_record_id text NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 0),
  sequence_number integer NOT NULL CHECK (sequence_number > 0),
  previous_state repository.publication_state NULL,
  next_state repository.publication_state NOT NULL,
  decision_type text NOT NULL CHECK (decision_type IN ('INITIAL_PENDING','CERTIFY','PUBLISH','SUPERSEDE','REJECT','REVOKE')),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  decided_at timestamptz NOT NULL,
  reason_codes text[] NOT NULL,
  UNIQUE (canonical_record_id, record_version, sequence_number),
  FOREIGN KEY (canonical_record_id, record_version) REFERENCES repository.record_versions(canonical_record_id, record_version),
  CHECK ((sequence_number = 1 AND previous_state IS NULL AND next_state = 'PENDING' AND decision_type = 'INITIAL_PENDING') OR sequence_number > 1)
);
CREATE INDEX idx_publication_decisions_history ON repository.publication_decisions (canonical_record_id, record_version, sequence_number);

CREATE FUNCTION repository.append_initial_publication_decision(
  p_decision_id text, p_commit_id text, p_record_id text, p_record_version integer,
  p_policy_version_id text, p_decided_at timestamptz, p_reason_codes text[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, repository, control AS $$
DECLARE v_state repository.publication_state; v_existing integer;
BEGIN
  SELECT current_publication_state INTO v_state FROM repository.record_versions
    WHERE canonical_record_id=p_record_id AND record_version=p_record_version FOR UPDATE;
  IF NOT FOUND OR v_state <> 'PENDING' THEN RAISE EXCEPTION 'initial publication target is not pending'; END IF;
  SELECT count(*)::int INTO v_existing FROM repository.publication_decisions
    WHERE canonical_record_id=p_record_id AND record_version=p_record_version;
  IF v_existing <> 0 THEN RAISE EXCEPTION 'initial publication decision already exists'; END IF;
  INSERT INTO repository.publication_decisions (
    decision_id,commit_id,canonical_record_id,record_version,sequence_number,previous_state,next_state,
    decision_type,policy_version_id,decided_at,reason_codes
  ) VALUES (p_decision_id,p_commit_id,p_record_id,p_record_version,1,NULL,'PENDING','INITIAL_PENDING',p_policy_version_id,p_decided_at,p_reason_codes);
END $$;

CREATE TABLE repository.supersessions (
  supersession_id text PRIMARY KEY,
  canonical_record_id text NOT NULL,
  predecessor_version integer NOT NULL CHECK (predecessor_version > 0),
  successor_version integer NOT NULL CHECK (successor_version > predecessor_version),
  successor_commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id),
  created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, predecessor_version),
  UNIQUE (canonical_record_id, successor_version),
  FOREIGN KEY (canonical_record_id, predecessor_version) REFERENCES repository.record_versions(canonical_record_id, record_version),
  FOREIGN KEY (canonical_record_id, successor_version) REFERENCES repository.record_versions(canonical_record_id, record_version)
);

CREATE TABLE repository.lineage_edges (
  edge_id text PRIMARY KEY,
  source_node_type text NOT NULL CHECK (source_node_type IN ('RAW_OBJECT','CANONICAL_FACT','PROJECTION_VERSION')),
  source_node_id text NOT NULL,
  source_node_version text NOT NULL,
  destination_node_type text NOT NULL CHECK (destination_node_type IN ('CANONICAL_FACT','PROJECTION_VERSION','EVIDENCE_PACKET')),
  destination_node_id text NOT NULL,
  destination_node_version text NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('NORMALIZED_FROM','PROJECTED_FROM','EVIDENCED_BY')),
  commit_id text NOT NULL REFERENCES control.canonical_commits(commit_id),
  created_at timestamptz NOT NULL,
  digest text NULL,
  UNIQUE (source_node_type, source_node_id, source_node_version, destination_node_type, destination_node_id, destination_node_version, relationship_type),
  CHECK (ROW(source_node_type, source_node_id, source_node_version) <> ROW(destination_node_type, destination_node_id, destination_node_version)),
  CHECK ((source_node_type = 'RAW_OBJECT' AND destination_node_type = 'CANONICAL_FACT' AND relationship_type = 'NORMALIZED_FROM') OR
         (source_node_type = 'CANONICAL_FACT' AND destination_node_type = 'PROJECTION_VERSION' AND relationship_type = 'PROJECTED_FROM') OR
         (source_node_type = 'PROJECTION_VERSION' AND destination_node_type = 'EVIDENCE_PACKET' AND relationship_type = 'EVIDENCED_BY'))
);
CREATE INDEX idx_lineage_source ON repository.lineage_edges (source_node_type, source_node_id, source_node_version);
CREATE INDEX idx_lineage_destination ON repository.lineage_edges (destination_node_type, destination_node_id, destination_node_version);

CREATE FUNCTION repository.append_publication_decision(
  p_decision_id text, p_commit_id text, p_record_id text, p_record_version integer,
  p_next_state repository.publication_state, p_policy_version_id text, p_decided_at timestamptz, p_reason_codes text[],
  p_outbox_event_id text, p_predecessor_decision_id text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, repository, control AS $$
DECLARE
  v_current repository.publication_state; v_sequence integer; v_type text;
  v_predecessor_version integer; v_predecessor_state repository.publication_state; v_predecessor_sequence integer;
BEGIN
  SELECT current_publication_state INTO v_current FROM repository.record_versions
    WHERE canonical_record_id = p_record_id AND record_version = p_record_version FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'record version not found'; END IF;
  IF NOT ((v_current = 'PENDING' AND p_next_state IN ('CERTIFIED','REJECTED')) OR
          (v_current = 'CERTIFIED' AND p_next_state IN ('PUBLISHED','REJECTED')) OR
          (v_current = 'PUBLISHED' AND p_next_state IN ('SUPERSEDED','REVOKED'))) THEN
    RAISE EXCEPTION 'illegal publication transition';
  END IF;
  v_type := CASE p_next_state WHEN 'CERTIFIED' THEN 'CERTIFY' WHEN 'PUBLISHED' THEN 'PUBLISH' WHEN 'SUPERSEDED' THEN 'SUPERSEDE' WHEN 'REJECTED' THEN 'REJECT' WHEN 'REVOKED' THEN 'REVOKE' END;

  IF v_current = 'CERTIFIED' AND p_next_state = 'PUBLISHED' THEN
    SELECT predecessor_version INTO v_predecessor_version FROM repository.supersessions
      WHERE canonical_record_id = p_record_id AND successor_version = p_record_version;
    IF FOUND THEN
      IF p_predecessor_decision_id IS NULL THEN RAISE EXCEPTION 'replacement publication requires predecessor decision identity'; END IF;
      SELECT current_publication_state INTO v_predecessor_state FROM repository.record_versions
        WHERE canonical_record_id = p_record_id AND record_version = v_predecessor_version FOR UPDATE;
      IF v_predecessor_state <> 'PUBLISHED' THEN RAISE EXCEPTION 'replacement predecessor is not published'; END IF;
      SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_predecessor_sequence FROM repository.publication_decisions
        WHERE canonical_record_id = p_record_id AND record_version = v_predecessor_version;
      INSERT INTO repository.publication_decisions (
        decision_id, commit_id, canonical_record_id, record_version, sequence_number, previous_state, next_state,
        decision_type, policy_version_id, decided_at, reason_codes
      ) VALUES (
        p_predecessor_decision_id, p_commit_id, p_record_id, v_predecessor_version, v_predecessor_sequence,
        'PUBLISHED', 'SUPERSEDED', 'SUPERSEDE', p_policy_version_id, p_decided_at, ARRAY['REPLACEMENT_PUBLISHED']
      );
      UPDATE repository.record_versions SET current_publication_state = 'SUPERSEDED', current_decision_id = p_predecessor_decision_id
        WHERE canonical_record_id = p_record_id AND record_version = v_predecessor_version;
    END IF;
  END IF;

  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_sequence FROM repository.publication_decisions WHERE canonical_record_id = p_record_id AND record_version = p_record_version;
  INSERT INTO repository.publication_decisions (
    decision_id, commit_id, canonical_record_id, record_version, sequence_number, previous_state, next_state,
    decision_type, policy_version_id, decided_at, reason_codes
  ) VALUES (p_decision_id, p_commit_id, p_record_id, p_record_version, v_sequence, v_current, p_next_state, v_type, p_policy_version_id, p_decided_at, p_reason_codes);
  UPDATE repository.record_versions SET current_publication_state = p_next_state, current_decision_id = p_decision_id
    WHERE canonical_record_id = p_record_id AND record_version = p_record_version;
  INSERT INTO control.outbox (
    event_id, commit_id, event_type, payload_version, canonical_record_id, record_version,
    publication_decision_id, created_at, published_at, attempt_count
  ) VALUES (
    p_outbox_event_id, p_commit_id, 'PUBLICATION_STATE_CHANGED', '1', p_record_id, p_record_version,
    p_decision_id, p_decided_at, NULL, 0
  );
END $$;
