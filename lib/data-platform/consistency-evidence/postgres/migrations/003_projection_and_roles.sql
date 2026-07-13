-- Unapplied D4 V1 Phase 1 blueprint.
CREATE TABLE projection.evidence_projection_definitions (
  projection_id text NOT NULL,
  projection_version text NOT NULL,
  consumer text NOT NULL CHECK (consumer IN ('DASHBOARD','REPLAY','RESEARCH','MARKETS','SCANNER','TRADE')),
  output_schema_version text NOT NULL,
  explainability_required boolean NOT NULL CHECK (explainability_required),
  may_reclassify_evidence boolean NOT NULL CHECK (NOT may_reclassify_evidence),
  may_reconstruct_evidence boolean NOT NULL CHECK (NOT may_reconstruct_evidence),
  state text NOT NULL CHECK (state IN ('PROPOSED','APPROVED','SUSPENDED')),
  definition_checksum text NOT NULL CHECK (definition_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (projection_id, projection_version)
);

CREATE TABLE projection.evidence_projection_versions (
  projection_record_id text PRIMARY KEY,
  projection_id text NOT NULL,
  projection_version text NOT NULL,
  packet_id text NOT NULL REFERENCES evidence.packet_identities(packet_id),
  packet_version integer NOT NULL CHECK (packet_version > 0),
  projection_checksum text NOT NULL CHECK (projection_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  FOREIGN KEY (projection_id, projection_version) REFERENCES projection.evidence_projection_definitions(projection_id, projection_version),
  UNIQUE (projection_id, projection_version, packet_id, packet_version)
);

-- Role names are blueprint-only. Phase 2 must create them only in quantterminal_d4_isolated.
-- qt_d4_consistency_worker: read eligible D2 facts; append consistency runs/results.
-- qt_d4_evidence_assembler: read facts/results/evaluations; append candidates/packets.
-- qt_d4_publication_coordinator: append publication handoffs/decisions only.
-- qt_d4_read_only: read published projections only.
-- qt_d4_migration_owner: schema and migration ownership.
-- Runtime roles receive no DELETE on D4 audit history and no UPDATE on canonical D2 facts.
