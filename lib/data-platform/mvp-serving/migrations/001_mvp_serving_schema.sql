CREATE SCHEMA IF NOT EXISTS serving_control;
CREATE SCHEMA IF NOT EXISTS serving;

CREATE TABLE serving.serving_corpus (
  corpus_id text PRIMARY KEY,
  corpus_version text NOT NULL,
  source_corpus_id text NOT NULL,
  source_corpus_checksum text NOT NULL CHECK (source_corpus_checksum ~ '^[0-9a-f]{64}$'),
  serving_checksum text NOT NULL UNIQUE CHECK (serving_checksum ~ '^[0-9a-f]{64}$'),
  schema_version text NOT NULL,
  generated_at timestamptz NOT NULL,
  governed_through timestamptz NOT NULL,
  lifecycle text NOT NULL CHECK (lifecycle IN ('PUBLISHED','SUPERSEDED','WITHHELD','INVALID')),
  exposure text NOT NULL CHECK (exposure IN ('INTERNAL_ONLY','READY_FOR_CUTOVER','CONSUMER_VISIBLE')),
  projection_count integer NOT NULL CHECK (projection_count >= 0),
  evidence_summary_count integer NOT NULL CHECK (evidence_summary_count >= 0),
  replay_snapshot_count integer NOT NULL CHECK (replay_snapshot_count >= 0),
  demo_profile_count integer NOT NULL CHECK (demo_profile_count >= 0),
  release_inventory_count integer NOT NULL CHECK (release_inventory_count >= 0),
  publication_event_count integer NOT NULL CHECK (publication_event_count >= 0)
);

CREATE TABLE serving.serving_projection (
  projection_version_id text PRIMARY KEY,
  projection_id text NOT NULL,
  projection_version_identity text NOT NULL UNIQUE,
  projection_kind text NOT NULL,
  subject_id text NOT NULL,
  event_time_start timestamptz NOT NULL,
  event_time_end timestamptz NOT NULL,
  knowledge_time_cutoff timestamptz NOT NULL,
  projection_checksum text NOT NULL CHECK (projection_checksum ~ '^[0-9a-f]{64}$'),
  dependency_digest text NOT NULL CHECK (dependency_digest ~ '^[0-9a-f]{64}$'),
  dependencies jsonb NOT NULL CHECK (jsonb_typeof(dependencies) = 'array'),
  generator_id text NOT NULL,
  generator_version text NOT NULL,
  schema_version text NOT NULL,
  source_corpus_id text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  completeness text NOT NULL,
  limitations text[] NOT NULL,
  lifecycle text NOT NULL,
  exposure text NOT NULL,
  supersedes_projection_version_id text,
  source_created_at timestamptz NOT NULL,
  published_at timestamptz NOT NULL,
  serving_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  CHECK (event_time_end > event_time_start)
);

CREATE TABLE serving.serving_evidence_summary (
  evidence_summary_id text PRIMARY KEY,
  evidence_packet_id text NOT NULL,
  instrument text NOT NULL,
  event_time_start timestamptz NOT NULL,
  event_time_end timestamptz NOT NULL,
  assessment_state text NOT NULL,
  confidence jsonb NOT NULL CHECK (jsonb_typeof(confidence) = 'object'),
  coverage jsonb NOT NULL CHECK (jsonb_typeof(coverage) = 'object'),
  verified_facts jsonb NOT NULL CHECK (jsonb_typeof(verified_facts) = 'object'),
  interpretation jsonb NOT NULL CHECK (jsonb_typeof(interpretation) = 'object'),
  supporting_evidence jsonb NOT NULL CHECK (jsonb_typeof(supporting_evidence) = 'array'),
  counter_evidence jsonb NOT NULL CHECK (jsonb_typeof(counter_evidence) = 'array'),
  source_limitations text[] NOT NULL,
  source_projection_identities text[] NOT NULL,
  summary_checksum text NOT NULL CHECK (summary_checksum ~ '^[0-9a-f]{64}$'),
  serving_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  published_at timestamptz NOT NULL,
  UNIQUE (evidence_packet_id, serving_corpus_id)
);

CREATE TABLE serving.serving_replay_sequence (
  replay_snapshot_id text PRIMARY KEY,
  snapshot_identity text NOT NULL UNIQUE,
  source_projection_version_id text NOT NULL,
  source_projection_checksum text NOT NULL CHECK (source_projection_checksum ~ '^[0-9a-f]{64}$'),
  source_dependency_digest text NOT NULL CHECK (source_dependency_digest ~ '^[0-9a-f]{64}$'),
  instrument text NOT NULL,
  event_time_start timestamptz NOT NULL,
  event_time_end timestamptz NOT NULL,
  knowledge_time_cutoff timestamptz NOT NULL,
  model_version text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  model_checksum text NOT NULL CHECK (model_checksum ~ '^[0-9a-f]{64}$'),
  snapshot_checksum text NOT NULL CHECK (snapshot_checksum ~ '^[0-9a-f]{64}$'),
  price_sample_count integer NOT NULL CHECK (price_sample_count >= 0),
  open_interest_sample_count integer NOT NULL CHECK (open_interest_sample_count >= 0),
  funding_sample_count integer NOT NULL CHECK (funding_sample_count >= 0),
  flow_bucket_count integer NOT NULL CHECK (flow_bucket_count >= 0),
  limitations text[] NOT NULL,
  serving_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  published_at timestamptz NOT NULL,
  CHECK (event_time_end > event_time_start)
);

CREATE TABLE serving.serving_demo_profile (
  profile_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('PRIMARY','BACKUP')),
  instrument text NOT NULL,
  event_time_start timestamptz NOT NULL,
  event_time_end timestamptz NOT NULL,
  evidence_identity text NOT NULL,
  replay_identity text NOT NULL,
  research_identity text NOT NULL,
  initial_cursor_timestamp timestamptz NOT NULL,
  profile_payload jsonb NOT NULL CHECK (jsonb_typeof(profile_payload) = 'object'),
  profile_checksum text NOT NULL CHECK (profile_checksum ~ '^[0-9a-f]{64}$'),
  serving_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  published_at timestamptz NOT NULL,
  PRIMARY KEY (serving_corpus_id, role),
  UNIQUE (serving_corpus_id, profile_id)
);

CREATE TABLE serving.serving_exposure (
  exposure_id text PRIMARY KEY,
  corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  exposure_state text NOT NULL CHECK (exposure_state IN ('READY_FOR_CUTOVER','CONSUMER_VISIBLE')),
  effective_from timestamptz NOT NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  publication_note text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE serving.serving_release_inventory (
  inventory_id text PRIMARY KEY,
  source_projection_version_id text NOT NULL,
  projection_kind text NOT NULL,
  subject_id text NOT NULL,
  source_checksum text NOT NULL CHECK (source_checksum ~ '^[0-9a-f]{64}$'),
  checksum_valid boolean NOT NULL,
  lifecycle text NOT NULL,
  exposure text NOT NULL,
  supersession_identity text,
  eligibility text NOT NULL CHECK (eligibility IN ('ELIGIBLE','INELIGIBLE')),
  disposition text NOT NULL CHECK (disposition IN ('INCLUDED','EXCLUDED')),
  disposition_reason text NOT NULL,
  serving_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  created_at timestamptz NOT NULL,
  UNIQUE (serving_corpus_id, source_projection_version_id)
);

CREATE TABLE serving.serving_publication_event (
  publication_event_id text PRIMARY KEY,
  corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  event_type text NOT NULL CHECK (event_type IN ('PUBLISHED','DUPLICATE','VERIFIED','WITHHELD')),
  event_state text NOT NULL,
  source_checksum text NOT NULL CHECK (source_checksum ~ '^[0-9a-f]{64}$'),
  serving_checksum text NOT NULL CHECK (serving_checksum ~ '^[0-9a-f]{64}$'),
  record_counts jsonb NOT NULL CHECK (jsonb_typeof(record_counts) = 'object'),
  reason text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX serving_projection_lookup_idx ON serving.serving_projection
  (serving_corpus_id, projection_kind, subject_id, event_time_end DESC, projection_version_id);
CREATE INDEX serving_projection_window_idx ON serving.serving_projection
  (serving_corpus_id, projection_kind, subject_id, event_time_start, event_time_end);
CREATE INDEX serving_evidence_packet_idx ON serving.serving_evidence_summary
  (serving_corpus_id, evidence_packet_id);
CREATE INDEX serving_replay_window_idx ON serving.serving_replay_sequence
  (serving_corpus_id, instrument, event_time_start, event_time_end);
CREATE INDEX serving_exposure_latest_idx ON serving.serving_exposure
  (effective_from DESC, exposure_id DESC);
CREATE INDEX serving_release_inventory_idx ON serving.serving_release_inventory
  (serving_corpus_id, disposition, projection_kind, source_projection_version_id);
CREATE INDEX serving_publication_event_idx ON serving.serving_publication_event
  (corpus_id, created_at, publication_event_id);

CREATE OR REPLACE FUNCTION serving.reject_immutable_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SERVING_RECORD_IMMUTABLE'; END $$;

CREATE TRIGGER serving_corpus_immutable BEFORE UPDATE OR DELETE ON serving.serving_corpus FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER serving_projection_immutable BEFORE UPDATE OR DELETE ON serving.serving_projection FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER serving_evidence_summary_immutable BEFORE UPDATE OR DELETE ON serving.serving_evidence_summary FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER serving_replay_sequence_immutable BEFORE UPDATE OR DELETE ON serving.serving_replay_sequence FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER serving_demo_profile_immutable BEFORE UPDATE OR DELETE ON serving.serving_demo_profile FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER serving_exposure_immutable BEFORE UPDATE OR DELETE ON serving.serving_exposure FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER serving_release_inventory_immutable BEFORE UPDATE OR DELETE ON serving.serving_release_inventory FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER serving_publication_event_immutable BEFORE UPDATE OR DELETE ON serving.serving_publication_event FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();

REVOKE ALL ON SCHEMA serving, serving_control FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA serving, serving_control FROM PUBLIC;
GRANT USAGE ON SCHEMA serving TO mvp_serving_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA serving TO mvp_serving_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA serving GRANT SELECT ON TABLES TO mvp_serving_reader;

