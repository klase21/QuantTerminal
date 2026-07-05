import { validateIdempotencyKey } from "@/lib/persistence/idempotency"
import {
  isStorageRecordKind,
  OPERATIONAL_RECORD_KINDS,
  type OperationalRecordKind,
} from "@/lib/persistence/recordKind"
import { STORAGE_RESULT_STATUSES, type StorageResult } from "@/lib/persistence/result"
import type {
  StorageArchiveRequest,
  StorageListQuery,
  StorageRecord,
  StorageRecordLocator,
} from "@/lib/persistence/types"
import { validateStorageRecord } from "@/lib/persistence/validation"
import { createRepositoryError } from "@/lib/persistence/repository/errors"
import {
  createRepositoryFailure,
  createRepositorySuccess,
  type RepositoryResult,
} from "@/lib/persistence/repository/result"
import {
  isSupportedRuntimeRecordKind,
  type OperationalRecordListQuery,
  type OperationalRecordLocator,
  type RuntimeRecordPersistenceIntent,
} from "@/lib/persistence/repository/types"

type UnknownRecord = Record<string, unknown>
const STORAGE_STATUS_SET = new Set<string>(STORAGE_RESULT_STATUSES)
const OPERATIONAL_KIND_SET = new Set<string>(OPERATIONAL_RECORD_KINDS)

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function isAdapterError(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.code)
    && isNonEmptyString(value.message)
    && typeof value.retryable === "boolean"
}

export function validateRepositoryIntent(
  input: unknown,
): RepositoryResult<RuntimeRecordPersistenceIntent> {
  if (!isRecord(input)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "unsupported_runtime_record",
      "Persistence intent must be an object.",
    )])
  }
  if (!isSupportedRuntimeRecordKind(input.recordKind)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      input.recordKind === undefined ? "missing_record_kind" : "unsupported_runtime_record",
      input.recordKind === undefined
        ? "Persistence intent requires recordKind."
        : "Persistence intent uses an unsupported runtime record kind.",
      { field: "recordKind" },
    )])
  }
  if (!isRecord(input.runtimeRecord)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Persistence intent requires an immutable runtime record object.",
      { field: "runtimeRecord" },
    )])
  }
  if (!isTimestamp(input.recordedAt)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_timestamp_metadata",
      "recordedAt must be a valid timestamp.",
      { field: "recordedAt" },
    )])
  }
  if (input.checksum !== undefined && !isNonEmptyString(input.checksum)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "malformed_storage_record",
      "checksum must be a non-empty string when provided.",
      { field: "checksum" },
    )])
  }

  return createRepositorySuccess(input as unknown as RuntimeRecordPersistenceIntent)
}

export function validateMappedStorageRecord(
  input: unknown,
): RepositoryResult<StorageRecord> {
  const validation = validateStorageRecord(input)
  if (validation.status === "SUCCESS") {
    return createRepositorySuccess(validation.value)
  }

  const invalidParents = validation.errors.some(
    (error) => error.code === "malformed_parent_refs",
  )
  const invalidTimestamp = validation.errors.some(
    (error) => error.code === "invalid_timestamp",
  )
  return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
    invalidParents
      ? "invalid_parent_refs"
      : invalidTimestamp
        ? "invalid_timestamp_metadata"
        : "malformed_storage_record",
    "Runtime record could not be mapped to a valid StorageRecord.",
    { cause: validation.errors },
  )])
}

export function validateRepositoryLocator(
  input: unknown,
): RepositoryResult<StorageRecordLocator> {
  if (!isRecord(input)
    || !isNonEmptyString(input.recordId)
    || !isStorageRecordKind(input.recordKind)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      !isRecord(input) || input.recordKind === undefined
        ? "missing_record_kind"
        : "missing_runtime_identity",
      "Storage record locator requires recordId and a canonical recordKind.",
      { field: "locator" },
    )])
  }
  return createRepositorySuccess(Object.freeze({
    recordId: input.recordId,
    recordKind: input.recordKind,
  }))
}

export function validateOperationalRecordLocator(
  input: unknown,
): RepositoryResult<OperationalRecordLocator> {
  const locator = validateRepositoryLocator(input)
  if (locator.status !== "SUCCESS") {
    return createRepositoryFailure(locator.status, locator.errors)
  }
  if (!OPERATIONAL_KIND_SET.has(locator.value.recordKind)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_operational_type",
      "Operational lookup requires an operational record kind.",
      { field: "locator.recordKind" },
    )])
  }
  return createRepositorySuccess(Object.freeze({
    recordId: locator.value.recordId,
    recordKind: locator.value.recordKind as OperationalRecordKind,
  }))
}

export function validateRepositoryArchiveRequest(
  input: unknown,
): RepositoryResult<StorageArchiveRequest> {
  const locator = validateRepositoryLocator(input)
  if (locator.status !== "SUCCESS") {
    return createRepositoryFailure(locator.status, locator.errors)
  }
  if (!isRecord(input) || !isTimestamp(input.archivedAt)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_timestamp_metadata",
      "Archive request requires a valid archivedAt timestamp.",
      { field: "archivedAt" },
    )])
  }
  const key = validateIdempotencyKey(input.idempotencyKey, locator.value.recordKind)
  if (key.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "malformed_storage_record",
      "Archive request requires a record-kind-aware idempotency key.",
      { field: "idempotencyKey", cause: key.errors },
    )])
  }
  return createRepositorySuccess(Object.freeze({
    ...locator.value,
    archivedAt: input.archivedAt,
    idempotencyKey: key.value,
  }))
}

export function validateRepositoryListQuery(
  input: unknown,
): RepositoryResult<StorageListQuery | undefined> {
  if (input === undefined) return createRepositorySuccess(undefined)
  if (!isRecord(input)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "malformed_storage_record",
      "Storage list query must be an object.",
      { field: "query" },
    )])
  }
  if (input.recordKinds !== undefined
    && (!Array.isArray(input.recordKinds)
      || input.recordKinds.some((kind) => !isStorageRecordKind(kind))
      || new Set(input.recordKinds).size !== input.recordKinds.length)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_record_kind",
      "recordKinds must contain unique canonical record kinds.",
      { field: "recordKinds" },
    )])
  }
  if (input.parentRef !== undefined) {
    const parent = validateRepositoryLocator(input.parentRef)
    if (parent.status !== "SUCCESS") {
      return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
        "invalid_parent_refs",
        "Storage list query parentRef is invalid.",
        { field: "parentRef", cause: parent.errors },
      )])
    }
  }
  for (const field of ["createdAfter", "createdBefore"] as const) {
    if (input[field] !== undefined && !isTimestamp(input[field])) {
      return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
        "invalid_timestamp_metadata",
        `${field} must be a valid timestamp when provided.`,
        { field },
      )])
    }
  }
  if (isTimestamp(input.createdAfter)
    && isTimestamp(input.createdBefore)
    && Date.parse(input.createdAfter) > Date.parse(input.createdBefore)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_timestamp_metadata",
      "createdAfter cannot be later than createdBefore.",
      { field: "createdAfter" },
    )])
  }
  if (input.limit !== undefined
    && (typeof input.limit !== "number"
      || !Number.isInteger(input.limit)
      || input.limit <= 0)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "malformed_storage_record",
      "limit must be a positive integer when provided.",
      { field: "limit" },
    )])
  }
  if (input.cursor !== undefined && !isNonEmptyString(input.cursor)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "malformed_storage_record",
      "cursor must be a non-empty string when provided.",
      { field: "cursor" },
    )])
  }

  return createRepositorySuccess(Object.freeze({ ...input }) as StorageListQuery)
}

export function validateOperationalRecordListQuery(
  input: unknown,
): RepositoryResult<StorageListQuery> {
  const validation = validateRepositoryListQuery(input)
  if (validation.status !== "SUCCESS") return validation
  const query = validation.value as OperationalRecordListQuery | undefined
  if (query?.recordKinds !== undefined
    && query.recordKinds.some((kind) => !OPERATIONAL_KIND_SET.has(kind))) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_operational_type",
      "Operational list queries may include operational record kinds only.",
      { field: "query.recordKinds" },
    )])
  }
  return createRepositorySuccess(Object.freeze({
    ...(query ?? {}),
    recordKinds: Object.freeze([
      ...(query?.recordKinds ?? OPERATIONAL_RECORD_KINDS),
    ]) as readonly OperationalRecordKind[],
  }))
}

export function validateAdapterResult<T>(input: unknown): RepositoryResult<StorageResult<T>> {
  if (!isRecord(input)
    || typeof input.status !== "string"
    || !STORAGE_STATUS_SET.has(input.status)
    || !Array.isArray(input.errors)
    || !input.errors.every(isAdapterError)
    || (input.status === "SUCCESS" && input.errors.length > 0)
    || (input.status === "SUCCESS" && !Object.prototype.hasOwnProperty.call(input, "value"))) {
    return createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "invalid_adapter_result",
      "StorageAdapter returned a malformed result.",
      { cause: input },
    )])
  }

  return createRepositorySuccess(input as unknown as StorageResult<T>)
}
