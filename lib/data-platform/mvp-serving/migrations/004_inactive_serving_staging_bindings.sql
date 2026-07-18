ALTER TABLE serving.serving_candidate_manifest
  ADD COLUMN common_watermark_id text,
  ADD COLUMN common_watermark_value timestamptz,
  ADD COLUMN common_watermark_checksum text,
  ADD COLUMN member_set_checksum text;

ALTER TABLE serving.serving_candidate_manifest
  ADD CONSTRAINT serving_candidate_manifest_staging_bindings_complete CHECK (
    (common_watermark_id IS NULL
      AND common_watermark_value IS NULL
      AND common_watermark_checksum IS NULL
      AND member_set_checksum IS NULL)
    OR
    (length(common_watermark_id) > 0
      AND common_watermark_value IS NOT NULL
      AND common_watermark_checksum ~ '^[0-9a-f]{64}$'
      AND member_set_checksum ~ '^[0-9a-f]{64}$')
  ),
  ADD CONSTRAINT serving_candidate_manifest_mvp8i_bindings_required CHECK (
    schema_version <> 'mvp-inactive-serving-stage/1.0.0'
    OR (common_watermark_id IS NOT NULL
      AND common_watermark_value IS NOT NULL
      AND common_watermark_checksum IS NOT NULL
      AND member_set_checksum IS NOT NULL)
  );

CREATE INDEX serving_candidate_manifest_watermark_idx ON serving.serving_candidate_manifest
  (common_watermark_value, common_watermark_id, corpus_id)
  WHERE common_watermark_id IS NOT NULL;
