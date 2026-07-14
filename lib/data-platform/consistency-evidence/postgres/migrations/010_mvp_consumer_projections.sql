-- MVP-3: immutable, consumer-neutral page projection versions.
CREATE TABLE projection.mvp_projection_definitions (
  projection_kind text PRIMARY KEY,
  consumer text NOT NULL,
  schema_version text NOT NULL,
  generator_id text NOT NULL,
  generator_version text NOT NULL,
  definition_checksum text NOT NULL CHECK (definition_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL
);

CREATE TABLE projection.mvp_projection_versions (
  projection_version_id text PRIMARY KEY,
  projection_version_identity text NOT NULL UNIQUE CHECK (projection_version_identity ~ '^[0-9a-f]{64}$'),
  projection_id text NOT NULL,
  projection_kind text NOT NULL REFERENCES projection.mvp_projection_definitions(projection_kind),
  subject_id text NOT NULL,
  event_time_start timestamptz NOT NULL,
  event_time_end timestamptz NOT NULL,
  knowledge_time_cutoff timestamptz NOT NULL,
  dependency_digest text NOT NULL CHECK (dependency_digest ~ '^[0-9a-f]{64}$'),
  generator_id text NOT NULL,
  generator_version text NOT NULL,
  schema_version text NOT NULL,
  structured_payload jsonb NOT NULL CHECK (jsonb_typeof(structured_payload) = 'object'),
  completeness text NOT NULL CHECK (completeness IN ('COMPLETE','COMPLETE_WITH_LIMITATION','WITHHELD')),
  limitations text[] NOT NULL,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('GENERATED','SUPERSEDED','WITHHELD','INVALID')),
  consumer_exposure_state text NOT NULL CHECK (consumer_exposure_state IN ('INTERNAL_ONLY','READY_FOR_CUTOVER','CONSUMER_VISIBLE')),
  supersedes_projection_version_id text REFERENCES projection.mvp_projection_versions(projection_version_id),
  projection_checksum text NOT NULL CHECK (projection_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  CHECK (event_time_end > event_time_start),
  CHECK (consumer_exposure_state <> 'CONSUMER_VISIBLE')
);

CREATE TABLE projection.mvp_projection_dependencies (
  projection_version_id text NOT NULL REFERENCES projection.mvp_projection_versions(projection_version_id),
  dependency_type text NOT NULL CHECK (dependency_type IN ('EVIDENCE_PACKET','CONSISTENCY_RESULT','CANONICAL_FACT','STREAM_SEGMENT','COVERAGE_DECISION','PROJECTION')),
  dependency_id text NOT NULL,
  dependency_version text,
  dependency_checksum text,
  PRIMARY KEY (projection_version_id,dependency_type,dependency_id,dependency_version)
);

CREATE TABLE projection.mvp_projection_conflicts (
  conflict_id text PRIMARY KEY,
  projection_version_identity text NOT NULL CHECK (projection_version_identity ~ '^[0-9a-f]{64}$'),
  existing_projection_version_id text NOT NULL REFERENCES projection.mvp_projection_versions(projection_version_id),
  existing_checksum text NOT NULL CHECK (existing_checksum ~ '^[0-9a-f]{64}$'),
  incoming_checksum text NOT NULL CHECK (incoming_checksum ~ '^[0-9a-f]{64}$'),
  detected_at timestamptz NOT NULL,
  reason_code text NOT NULL CHECK (reason_code = 'IMMUTABLE_PROJECTION_CONTENT_MISMATCH'),
  CHECK (existing_checksum <> incoming_checksum),
  UNIQUE (projection_version_identity,existing_checksum,incoming_checksum)
);

CREATE INDEX mvp_projection_kind_subject_time_idx ON projection.mvp_projection_versions(projection_kind,subject_id,event_time_end DESC,projection_version_id);
CREATE INDEX mvp_projection_exposure_idx ON projection.mvp_projection_versions(consumer_exposure_state,lifecycle_state,projection_kind,event_time_end DESC);
CREATE INDEX mvp_projection_dependency_idx ON projection.mvp_projection_dependencies(dependency_type,dependency_id,projection_version_id);
CREATE TRIGGER mvp_projection_definitions_no_mutation BEFORE UPDATE OR DELETE ON projection.mvp_projection_definitions FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER mvp_projection_versions_no_mutation BEFORE UPDATE OR DELETE ON projection.mvp_projection_versions FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER mvp_projection_dependencies_no_mutation BEFORE UPDATE OR DELETE ON projection.mvp_projection_dependencies FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER mvp_projection_conflicts_no_mutation BEFORE UPDATE OR DELETE ON projection.mvp_projection_conflicts FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();

DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qt_d4_projection_builder') THEN CREATE ROLE qt_d4_projection_builder NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT; END IF; END $$;
GRANT qt_d4_projection_builder TO CURRENT_USER;
REVOKE ALL ON projection.mvp_projection_definitions,projection.mvp_projection_versions,projection.mvp_projection_dependencies,projection.mvp_projection_conflicts FROM PUBLIC;
GRANT USAGE ON SCHEMA projection,evidence,consistency TO qt_d4_projection_builder;
GRANT SELECT ON projection.mvp_projection_definitions,projection.mvp_projection_versions,projection.mvp_projection_dependencies,projection.mvp_projection_conflicts,evidence.mvp_market_assessments,evidence.core_packet_versions,evidence.core_packet_result_references,evidence.core_packet_fact_references,consistency.immutable_results TO qt_d4_projection_builder;
GRANT INSERT ON projection.mvp_projection_versions,projection.mvp_projection_dependencies,projection.mvp_projection_conflicts TO qt_d4_projection_builder;
GRANT SELECT ON projection.mvp_projection_definitions,projection.mvp_projection_versions,projection.mvp_projection_dependencies,projection.mvp_projection_conflicts TO qt_d4_read_only;
