CREATE TABLE serving_control.cutover_approval (
  approval_id text PRIMARY KEY,
  request_id text NOT NULL UNIQUE,
  candidate_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  candidate_checksum text NOT NULL CHECK (candidate_checksum ~ '^[0-9a-f]{64}$'),
  member_set_checksum text NOT NULL CHECK (member_set_checksum ~ '^[0-9a-f]{64}$'),
  common_watermark_id text NOT NULL,
  common_watermark_checksum text NOT NULL CHECK (common_watermark_checksum ~ '^[0-9a-f]{64}$'),
  reviewed_commit text NOT NULL CHECK (reviewed_commit ~ '^[0-9a-f]{40}$'),
  review_artifact_checksums jsonb NOT NULL CHECK (jsonb_typeof(review_artifact_checksums) = 'object'),
  target_fingerprint text NOT NULL,
  operator_id text NOT NULL,
  approval_reason text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  approval_checksum text NOT NULL UNIQUE CHECK (approval_checksum ~ '^[0-9a-f]{64}$'),
  CHECK (expires_at > created_at)
);

CREATE TABLE serving_control.cutover_authorization (
  authorization_id text PRIMARY KEY,
  request_id text NOT NULL UNIQUE,
  approval_id text NOT NULL REFERENCES serving_control.cutover_approval(approval_id),
  operation text NOT NULL CHECK (operation IN ('ACTIVATE','ROLLBACK')),
  candidate_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  candidate_checksum text NOT NULL CHECK (candidate_checksum ~ '^[0-9a-f]{64}$'),
  target_fingerprint text NOT NULL,
  expected_current_exposure_id text NOT NULL,
  expected_current_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  expected_current_corpus_checksum text NOT NULL CHECK (expected_current_corpus_checksum ~ '^[0-9a-f]{64}$'),
  rollback_exposure_id text NOT NULL,
  rollback_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  rollback_corpus_checksum text NOT NULL CHECK (rollback_corpus_checksum ~ '^[0-9a-f]{64}$'),
  rollback_pin text NOT NULL,
  rollback_deployment_id text NOT NULL,
  related_activation_event_id text,
  operator_id text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  authorization_checksum text NOT NULL UNIQUE CHECK (authorization_checksum ~ '^[0-9a-f]{64}$'),
  CHECK (expires_at > created_at),
  CHECK ((operation = 'ACTIVATE' AND related_activation_event_id IS NULL) OR (operation = 'ROLLBACK' AND related_activation_event_id IS NOT NULL))
);

CREATE TABLE serving_control.cutover_event (
  event_id text PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN ('ACTIVATION_COMMITTED','ROLLBACK_COMMITTED')),
  request_id text NOT NULL UNIQUE,
  candidate_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  candidate_checksum text NOT NULL CHECK (candidate_checksum ~ '^[0-9a-f]{64}$'),
  target_fingerprint text NOT NULL,
  operator_id text NOT NULL,
  authorization_id text NOT NULL REFERENCES serving_control.cutover_authorization(authorization_id),
  previous_exposure_id text NOT NULL,
  previous_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  new_exposure_id text NOT NULL REFERENCES serving.serving_exposure(exposure_id) DEFERRABLE INITIALLY DEFERRED,
  new_corpus_id text NOT NULL REFERENCES serving.serving_corpus(corpus_id),
  related_activation_event_id text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL,
  event_checksum text NOT NULL UNIQUE CHECK (event_checksum ~ '^[0-9a-f]{64}$'),
  CHECK ((event_type = 'ACTIVATION_COMMITTED' AND related_activation_event_id IS NULL) OR (event_type = 'ROLLBACK_COMMITTED' AND related_activation_event_id IS NOT NULL))
);

ALTER TABLE serving_control.cutover_event
  ADD CONSTRAINT cutover_event_activation_link_fk
  FOREIGN KEY (related_activation_event_id) REFERENCES serving_control.cutover_event(event_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE serving_control.cutover_authorization_consumption (
  authorization_id text PRIMARY KEY REFERENCES serving_control.cutover_authorization(authorization_id),
  event_id text NOT NULL UNIQUE REFERENCES serving_control.cutover_event(event_id) DEFERRABLE INITIALLY DEFERRED,
  request_id text NOT NULL UNIQUE,
  consumed_at timestamptz NOT NULL
);

CREATE TRIGGER cutover_approval_immutable BEFORE UPDATE OR DELETE ON serving_control.cutover_approval FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER cutover_authorization_immutable BEFORE UPDATE OR DELETE ON serving_control.cutover_authorization FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER cutover_event_immutable BEFORE UPDATE OR DELETE ON serving_control.cutover_event FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();
CREATE TRIGGER cutover_authorization_consumption_immutable BEFORE UPDATE OR DELETE ON serving_control.cutover_authorization_consumption FOR EACH ROW EXECUTE FUNCTION serving.reject_immutable_mutation();

CREATE INDEX cutover_approval_candidate_idx ON serving_control.cutover_approval(candidate_id, expires_at, created_at);
CREATE INDEX cutover_authorization_candidate_idx ON serving_control.cutover_authorization(candidate_id, operation, expires_at, created_at);
CREATE INDEX cutover_event_candidate_idx ON serving_control.cutover_event(candidate_id, created_at, event_id);

GRANT SELECT ON serving_control.cutover_approval, serving_control.cutover_authorization, serving_control.cutover_event, serving_control.cutover_authorization_consumption TO mvp_serving_reader;
GRANT USAGE ON SCHEMA serving_control TO mvp_serving_reader;
