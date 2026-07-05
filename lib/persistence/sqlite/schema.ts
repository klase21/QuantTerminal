export const SQLITE_STORAGE_TABLE = "storage_records" as const

export const SQLITE_STORAGE_SCHEMA = `
CREATE TABLE IF NOT EXISTS storage_records (
  record_id TEXT PRIMARY KEY,
  record_kind TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  runtime_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  created_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  parent_refs TEXT NOT NULL,
  payload TEXT NOT NULL,
  checksum TEXT,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_storage_records_record_id
  ON storage_records (record_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_records_idempotency_key
  ON storage_records (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_storage_records_record_kind
  ON storage_records (record_kind);

CREATE INDEX IF NOT EXISTS idx_storage_records_archived
  ON storage_records (archived);
`
