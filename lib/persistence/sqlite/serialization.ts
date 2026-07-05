import { createStorageError } from "@/lib/persistence/errors"
import {
  createStorageFailure,
  createStorageSuccess,
  type StorageResult,
} from "@/lib/persistence/result"
import type { StorageRecord } from "@/lib/persistence/types"
import { validateStorageRecord } from "@/lib/persistence/validation"

interface SQLiteStorageRecordBaseRow {
  readonly record_id: string
  readonly record_kind: string
  readonly idempotency_key: string
  readonly runtime_version: string
  readonly schema_version: number
  readonly created_at: string
  readonly recorded_at: string
  readonly parent_refs: string
  readonly payload: string
  readonly checksum: string | null
}

export interface SQLiteStorageRecordWriteRow extends SQLiteStorageRecordBaseRow {
  readonly archived: 0
}

export interface SQLiteStorageRecordRow extends SQLiteStorageRecordBaseRow {
  readonly archived: 0 | 1
  readonly cursor_id?: number | bigint
}

export function serializeStorageRecordForSQLite(
  input: StorageRecord,
): StorageResult<SQLiteStorageRecordWriteRow> {
  const validation = validateStorageRecord(input)
  if (validation.status !== "SUCCESS") {
    return createStorageFailure(validation.status, validation.errors)
  }
  const record = validation.value
  try {
    return createStorageSuccess(Object.freeze({
      record_id: record.recordId,
      record_kind: record.recordKind,
      idempotency_key: record.idempotencyKey,
      runtime_version: record.runtimeVersion,
      schema_version: record.schemaVersion,
      created_at: record.createdAt,
      recorded_at: record.recordedAt,
      parent_refs: JSON.stringify(record.parentRefs),
      payload: JSON.stringify(record.payload),
      checksum: record.checksum ?? null,
      archived: 0 as const,
    }))
  } catch (cause) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "serialization_failure",
      "StorageRecord could not be serialized for SQLite.",
      { cause },
    )])
  }
}

export function deserializeStorageRecordFromSQLite(
  input: SQLiteStorageRecordRow,
): StorageResult<StorageRecord> {
  if (input.archived !== 0 && input.archived !== 1) {
    return createStorageFailure("STORAGE_ERROR", [createStorageError(
      "storage_failure",
      "SQLite row has an invalid archived value.",
      { field: "archived" },
    )])
  }

  let parentRefs: unknown
  let payload: unknown
  try {
    parentRefs = JSON.parse(input.parent_refs)
    payload = JSON.parse(input.payload)
  } catch (cause) {
    return createStorageFailure("STORAGE_ERROR", [createStorageError(
      "malformed_json",
      "SQLite row contains malformed JSON metadata or payload.",
      { cause },
    )])
  }

  const validation = validateStorageRecord({
    recordId: input.record_id,
    recordKind: input.record_kind,
    idempotencyKey: input.idempotency_key,
    runtimeVersion: input.runtime_version,
    schemaVersion: input.schema_version,
    createdAt: input.created_at,
    recordedAt: input.recorded_at,
    parentRefs,
    payload,
    ...(input.checksum !== null ? { checksum: input.checksum } : {}),
  })
  return validation.status === "SUCCESS"
    ? validation
    : createStorageFailure("STORAGE_ERROR", [createStorageError(
      "storage_failure",
      "SQLite row does not contain a valid StorageRecord envelope.",
      { cause: validation.errors },
    )])
}
