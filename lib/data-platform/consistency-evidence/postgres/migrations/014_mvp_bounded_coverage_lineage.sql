-- MVP-8D: bounded Coverage lineage consumed by MVP projections.
ALTER TABLE coverage.projection_versions
  ADD COLUMN venue text NOT NULL,
  ADD COLUMN provider_id text NOT NULL,
  ADD COLUMN provider_snapshot_ids text[] NOT NULL,
  ADD COLUMN input_commit_ids text[] NOT NULL,
  ADD COLUMN coverage_checksum text NOT NULL CHECK (coverage_checksum ~ '^[0-9a-f]{64}$');

CREATE UNIQUE INDEX coverage_projection_bounded_identity_idx
  ON coverage.projection_versions(dataset_id,venue,subject,window_start,window_end);
CREATE TRIGGER coverage_projection_versions_no_mutation
  BEFORE UPDATE OR DELETE ON coverage.projection_versions
  FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();

REVOKE ALL ON coverage.projection_versions FROM PUBLIC;
GRANT USAGE ON SCHEMA coverage TO qt_d4_consistency_worker,qt_d4_evidence_assembler,qt_d4_projection_builder,qt_d4_read_only;
GRANT SELECT,INSERT ON coverage.projection_versions TO qt_d4_consistency_worker;
GRANT SELECT ON coverage.projection_versions TO qt_d4_evidence_assembler,qt_d4_projection_builder,qt_d4_read_only;
