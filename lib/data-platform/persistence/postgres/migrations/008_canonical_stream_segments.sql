-- D2 additive Canonical Stream Segment v2 boundary. Existing stream manifest rows remain valid.
ALTER TABLE canonical.stream_manifests
  ADD COLUMN source_dataset_id text NULL,
  ADD COLUMN canonical_stream_id text NULL,
  ADD COLUMN canonical_instrument_id text NULL,
  ADD COLUMN source_partition_key text NULL,
  ADD COLUMN segment_contract_version text NULL,
  ADD COLUMN segment_object_key text NULL,
  ADD COLUMN segment_content_checksum text NULL,
  ADD COLUMN columnar_format text NULL,
  ADD COLUMN compression_format text NULL,
  ADD COLUMN segment_byte_length bigint NULL,
  ADD COLUMN event_time_min timestamptz NULL,
  ADD COLUMN event_time_max timestamptz NULL,
  ADD COLUMN validation_status text NULL,
  ADD COLUMN event_order_policy text NULL,
  ADD COLUMN source_raw_object_checksum text NULL;

ALTER TABLE canonical.stream_manifests
  ADD CONSTRAINT stream_manifests_segment_v2_complete CHECK (
    (source_dataset_id IS NULL AND canonical_stream_id IS NULL AND canonical_instrument_id IS NULL AND source_partition_key IS NULL AND segment_contract_version IS NULL
      AND segment_object_key IS NULL AND segment_content_checksum IS NULL AND columnar_format IS NULL AND compression_format IS NULL AND segment_byte_length IS NULL
      AND event_time_min IS NULL AND event_time_max IS NULL AND validation_status IS NULL AND event_order_policy IS NULL AND source_raw_object_checksum IS NULL)
    OR
    (
      source_dataset_id IN ('agg-trade','orderbook')
      AND canonical_stream_id ~ '^cstream_[0-9a-f]{64}$'
      AND btrim(canonical_instrument_id) <> ''
      AND btrim(source_partition_key) <> ''
      AND segment_contract_version = '2'
      AND btrim(segment_object_key) <> ''
      AND segment_content_checksum ~ '^[0-9a-f]{64}$'
      AND columnar_format = 'PARQUET'
      AND btrim(compression_format) <> ''
      AND segment_byte_length >= 0
      AND validation_status = 'VALIDATED'
      AND btrim(event_order_policy) <> ''
      AND source_raw_object_checksum ~ '^[0-9a-f]{64}$'
      AND record_count IS NOT NULL
      AND ((record_count = 0 AND event_time_min IS NULL AND event_time_max IS NULL) OR (record_count > 0 AND event_time_min IS NOT NULL AND event_time_max IS NOT NULL AND event_time_max >= event_time_min AND event_time_min >= window_start AND event_time_max <= window_end))
      AND ((source_dataset_id = 'agg-trade' AND stream_kind = 'AGG_TRADE') OR (source_dataset_id = 'orderbook' AND stream_kind = 'ORDERBOOK'))
    )
  );

CREATE UNIQUE INDEX idx_raw_objects_object_checksum
  ON raw.objects (object_id, content_hash);

ALTER TABLE canonical.stream_manifests
  ADD CONSTRAINT stream_manifests_source_raw_object_checksum_fk
  FOREIGN KEY (raw_object_id, source_raw_object_checksum)
  REFERENCES raw.objects (object_id, content_hash);

CREATE INDEX idx_stream_manifests_v2_stream_window
  ON canonical.stream_manifests (canonical_stream_id, window_start, window_end, record_version DESC)
  WHERE segment_contract_version = '2';

CREATE INDEX idx_stream_manifests_v2_instrument_partition
  ON canonical.stream_manifests (source_dataset_id, canonical_instrument_id, source_partition_key, record_version DESC)
  WHERE segment_contract_version = '2';

CREATE INDEX idx_stream_manifests_v2_segment_object
  ON canonical.stream_manifests (segment_content_checksum, segment_object_key)
  WHERE segment_contract_version = '2';

-- Segment payloads and per-event rows remain outside PostgreSQL. raw_object_id remains
-- the immutable source-artifact FK to raw.objects; the normalized Segment object has
-- separate immutable linkage above. Repository lineage/publication stay authoritative.
