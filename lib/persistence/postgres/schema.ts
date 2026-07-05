export const POSTGRES_STORAGE_TABLE = "storage_records" as const

export const POSTGRES_STORAGE_SCHEMA = `
CREATE TABLE IF NOT EXISTS storage_records (
  record_id text PRIMARY KEY,
  record_kind text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  runtime_version text NOT NULL,
  schema_version text NOT NULL,
  created_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL,
  parent_refs jsonb NOT NULL,
  payload jsonb NOT NULL,
  checksum text NULL,
  archived boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_storage_records_record_id
  ON storage_records (record_id);

CREATE INDEX IF NOT EXISTS idx_storage_records_idempotency_key
  ON storage_records (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_storage_records_record_kind
  ON storage_records (record_kind);

CREATE INDEX IF NOT EXISTS idx_storage_records_archived
  ON storage_records (archived);
`
