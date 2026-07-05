export type RepositoryErrorCode =
  | "adapter_error"
  | "conflict"
  | "duplicate"
  | "invalid_adapter_result"
  | "invalid_operational_type"
  | "invalid_parent_refs"
  | "invalid_timestamp_metadata"
  | "duplicate_operational_identity"
  | "malformed_operational_payload"
  | "malformed_storage_record"
  | "missing_record_kind"
  | "missing_runtime_identity"
  | "not_found"
  | "runtime_validation_failed"
  | "unavailable"
  | "unsupported_runtime_record"

export interface RepositoryError {
  readonly code: RepositoryErrorCode
  readonly message: string
  readonly field?: string
  readonly retryable: boolean
  readonly cause?: unknown
}

export function createRepositoryError(
  code: RepositoryErrorCode,
  message: string,
  options: {
    readonly field?: string
    readonly retryable?: boolean
    readonly cause?: unknown
  } = {},
): RepositoryError {
  return Object.freeze({
    code,
    message,
    retryable: options.retryable ?? false,
    ...(options.field !== undefined ? { field: options.field } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
  })
}
