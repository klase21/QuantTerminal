export type StorageErrorCode =
  | "duplicate_record"
  | "invalid_checksum"
  | "invalid_idempotency_key"
  | "invalid_runtime_version"
  | "invalid_schema_version"
  | "invalid_timestamp"
  | "malformed_input"
  | "malformed_json"
  | "malformed_parent_refs"
  | "malformed_payload"
  | "missing_idempotency_key"
  | "missing_record_id"
  | "missing_record_kind"
  | "not_found"
  | "record_conflict"
  | "serialization_failure"
  | "storage_failure"
  | "storage_unavailable"

export interface StorageError {
  readonly code: StorageErrorCode
  readonly message: string
  readonly field?: string
  readonly retryable: boolean
  readonly cause?: unknown
}

export function createStorageError(
  code: StorageErrorCode,
  message: string,
  options: {
    readonly field?: string
    readonly retryable?: boolean
    readonly cause?: unknown
  } = {},
): StorageError {
  return Object.freeze({
    code,
    message,
    retryable: options.retryable ?? false,
    ...(options.field !== undefined ? { field: options.field } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
  })
}
