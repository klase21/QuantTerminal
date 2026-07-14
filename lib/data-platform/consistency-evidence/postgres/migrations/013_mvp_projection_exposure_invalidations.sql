-- MVP-4: immutable correction ledger for malformed exposure decisions.
CREATE TABLE projection.mvp_consumer_exposure_invalidations (
  invalidation_id text PRIMARY KEY,
  decision_id text NOT NULL UNIQUE REFERENCES projection.mvp_consumer_exposure_decisions(decision_id),
  observed_checksum text NOT NULL CHECK (observed_checksum ~ '^[0-9a-f]{64}$'),
  reproduced_checksum text NOT NULL CHECK (reproduced_checksum ~ '^[0-9a-f]{64}$'),
  reason_code text NOT NULL CHECK (reason_code='DECISION_CHECKSUM_MISMATCH'),
  created_at timestamptz NOT NULL,
  CHECK (observed_checksum <> reproduced_checksum)
);
CREATE TRIGGER mvp_consumer_exposure_invalidations_no_mutation BEFORE UPDATE OR DELETE ON projection.mvp_consumer_exposure_invalidations FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
REVOKE ALL ON projection.mvp_consumer_exposure_invalidations FROM PUBLIC;
GRANT SELECT,INSERT ON projection.mvp_consumer_exposure_invalidations TO qt_d4_projection_publisher;
GRANT SELECT ON projection.mvp_consumer_exposure_invalidations TO qt_d4_read_only;
