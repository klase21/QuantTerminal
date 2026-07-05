import { createStorageError } from "@/lib/persistence/errors"
import {
  createStorageFailure,
  createStorageSuccess,
  type StorageResult,
} from "@/lib/persistence/result"
import type {
  StorageJsonArray,
  StorageJsonObject,
  StorageJsonValue,
  StorageRecord,
} from "@/lib/persistence/types"
import { validateStorageRecord } from "@/lib/persistence/validation"

export interface PostgresStorageRecordWriteRow {
  readonly record_id: string
  readonly record_kind: string
  readonly idempotency_key: string
  readonly runtime_version: string
  readonly schema_version: string
  readonly created_at: string
  readonly recorded_at: string
  readonly parent_refs: StorageJsonArray
  readonly payload: StorageJsonValue
  readonly checksum: string | null
  readonly archived: false
}

export interface PostgresStorageRecordRow {
  readonly record_id: string
  readonly record_kind: string
  readonly idempotency_key: string
  readonly runtime_version: string
  readonly schema_version: string
  readonly created_at: string | Date
  readonly recorded_at: string | Date
  readonly parent_refs: unknown
  readonly payload: unknown
  readonly checksum: string | null
  readonly archived: boolean
}

function timestampFromPostgres(value: string | Date): string | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null
  }
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null
}

export function serializeStorageRecordForPostgres(
  input: StorageRecord,
): StorageResult<PostgresStorageRecordWriteRow> {
  const validation = validateStorageRecord(input)
  if (validation.status !== "SUCCESS") {
    return createStorageFailure(validation.status, validation.errors)
  }
  const record = validation.value
  const parentRefs = record.parentRefs.map((parentRef): StorageJsonObject => Object.freeze({
    recordId: parentRef.recordId,
    recordKind: parentRef.recordKind,
  }))
  return createStorageSuccess(Object.freeze({
    record_id: record.recordId,
    record_kind: record.recordKind,
    idempotency_key: record.idempotencyKey,
    runtime_version: record.runtimeVersion,
    schema_version: String(record.schemaVersion),
    created_at: record.createdAt,
    recorded_at: record.recordedAt,
    parent_refs: Object.freeze(parentRefs),
    payload: record.payload,
    checksum: record.checksum ?? null,
    archived: false as const,
  }))
}

export function deserializeStorageRecordFromPostgres(
  input: PostgresStorageRecordRow,
): StorageResult<StorageRecord> {
  if (typeof input.schema_version !== "string"
    || !/^[1-9]\d*$/.test(input.schema_version)) {
    return createStorageFailure("STORAGE_ERROR", [createStorageError(
      "invalid_schema_version",
      "Postgres row contains an invalid schema version.",
      { field: "schema_version" },
    )])
  }
  if (typeof input.archived !== "boolean") {
    return createStorageFailure("STORAGE_ERROR", [createStorageError(
      "storage_failure",
      "Postgres row contains an invalid archived value.",
      { field: "archived" },
    )])
  }
  const createdAt = timestampFromPostgres(input.created_at)
  const recordedAt = timestampFromPostgres(input.recorded_at)
  if (!createdAt || !recordedAt) {
    return createStorageFailure("STORAGE_ERROR", [createStorageError(
      "invalid_timestamp",
      "Postgres row contains invalid timestamp metadata.",
    )])
  }

  const validation = validateStorageRecord({
    recordId: input.record_id,
    recordKind: input.record_kind,
    idempotencyKey: input.idempotency_key,
    runtimeVersion: input.runtime_version,
    schemaVersion: Number(input.schema_version),
    createdAt,
    recordedAt,
    parentRefs: input.parent_refs,
    payload: input.payload,
    ...(input.checksum !== null ? { checksum: input.checksum } : {}),
  })
  return validation.status === "SUCCESS"
    ? validation
    : createStorageFailure("STORAGE_ERROR", [createStorageError(
      "storage_failure",
      "Postgres row does not contain a valid StorageRecord envelope.",
      { cause: validation.errors },
    )])
}
