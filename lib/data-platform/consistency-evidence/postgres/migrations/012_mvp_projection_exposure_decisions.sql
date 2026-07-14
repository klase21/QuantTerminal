-- MVP-4: append-only, corpus-scoped consumer cutover and rollback decisions.
CREATE TABLE projection.mvp_consumer_exposure_decisions (
  decision_id text PRIMARY KEY,
  projection_corpus_id text NOT NULL,
  projection_corpus_checksum text NOT NULL CHECK (projection_corpus_checksum ~ '^[0-9a-f]{64}$'),
  action text NOT NULL CHECK (action IN ('CUTOVER','ROLLBACK')),
  effective_exposure text NOT NULL CHECK (effective_exposure IN ('CONSUMER_VISIBLE','READY_FOR_CUTOVER')),
  previous_decision_id text REFERENCES projection.mvp_consumer_exposure_decisions(decision_id),
  reason_code text NOT NULL,
  actor_id text NOT NULL,
  decision_checksum text NOT NULL CHECK (decision_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  CHECK ((action='CUTOVER' AND effective_exposure='CONSUMER_VISIBLE') OR (action='ROLLBACK' AND effective_exposure='READY_FOR_CUTOVER'))
);

CREATE INDEX mvp_consumer_exposure_latest_idx ON projection.mvp_consumer_exposure_decisions(projection_corpus_id,created_at DESC,decision_id DESC);
CREATE TRIGGER mvp_consumer_exposure_no_mutation BEFORE UPDATE OR DELETE ON projection.mvp_consumer_exposure_decisions FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();

DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qt_d4_projection_publisher') THEN CREATE ROLE qt_d4_projection_publisher NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT; END IF; END $$;
GRANT qt_d4_projection_publisher TO CURRENT_USER;
REVOKE ALL ON projection.mvp_consumer_exposure_decisions FROM PUBLIC;
GRANT USAGE ON SCHEMA projection TO qt_d4_projection_publisher;
GRANT SELECT,INSERT ON projection.mvp_consumer_exposure_decisions TO qt_d4_projection_publisher;
GRANT SELECT ON projection.mvp_consumer_exposure_decisions TO qt_d4_read_only;
