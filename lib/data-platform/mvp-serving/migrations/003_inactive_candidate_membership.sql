CREATE TABLE serving.serving_corpus_member (
  corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  member_kind text NOT NULL CHECK (member_kind IN ('PROJECTION','EVIDENCE_SUMMARY','REPLAY_SNAPSHOT','DEMO_PROFILE','SUPPLEMENTAL_CONTEXT','RELEASE_INVENTORY','RELEASE_MANIFEST')),
  member_id text NOT NULL,
  member_checksum text NOT NULL CHECK (member_checksum ~ '^[0-9a-f]{64}$'),
  canonical_sort_key text NOT NULL,
  inherited_source_corpus_id text,
  schema_version text NOT NULL,
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (corpus_id, member_kind, member_id),
  UNIQUE (corpus_id, canonical_sort_key)
);

CREATE TABLE serving.serving_candidate_manifest (
  manifest_id text PRIMARY KEY,
  corpus_id text NOT NULL UNIQUE REFERENCES serving.serving_corpus(corpus_id),
  previous_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  previous_serving_checksum text NOT NULL CHECK (previous_serving_checksum ~ '^[0-9a-f]{64}$'),
  manifest_checksum text NOT NULL UNIQUE CHECK (manifest_checksum ~ '^[0-9a-f]{64}$'),
  schema_version text NOT NULL,
  lifecycle text NOT NULL CHECK (lifecycle = 'CANDIDATE'),
  exposure_eligibility text NOT NULL CHECK (exposure_eligibility IN ('ELIGIBLE','INELIGIBLE')),
  manifest jsonb NOT NULL CHECK (jsonb_typeof(manifest) = 'object'),
  created_at timestamptz NOT NULL
);

CREATE INDEX serving_corpus_member_kind_idx ON serving.serving_corpus_member
  (corpus_id, member_kind, canonical_sort_key);

CREATE TRIGGER serving_corpus_member_immutable BEFORE UPDATE OR DELETE ON serving.serving_corpus_member FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER serving_candidate_manifest_immutable BEFORE UPDATE OR DELETE ON serving.serving_candidate_manifest FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();

GRANT SELECT ON serving.serving_corpus_member, serving.serving_candidate_manifest TO mvp_serving_reader;
