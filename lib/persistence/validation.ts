import { createStorageError, type StorageError } from "@/lib/persistence/errors"
import { validateIdempotencyKey } from "@/lib/persistence/idempotency"
import { isStorageRecordKind } from "@/lib/persistence/recordKind"
import {
  createStorageFailure,
  createStorageSuccess,
  type StorageResult,
} from "@/lib/persistence/result"
import type {
  StorageJsonArray,
  StorageJsonObject,
  StorageJsonValue,
  StorageParentRef,
  StorageRecord,
} from "@/lib/persistence/types"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasOwn(record: UnknownRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, field)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

export function isStorageJsonValue(
  value: unknown,
  seen: Set<object> = new Set<object>(),
): value is StorageJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value !== "object" || seen.has(value)) return false

  seen.add(value)
  let valid: boolean
  if (Array.isArray(value)) {
    valid = value.every((entry) => isStorageJsonValue(entry, seen))
  } else if (isRecord(value)) {
    valid = Object.values(value).every((entry) => isStorageJsonValue(entry, seen))
  } else {
    valid = false
  }
  seen.delete(value)
  return valid
}

function cloneAndFreezeJson(value: StorageJsonValue): StorageJsonValue {
  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((entry) => cloneAndFreezeJson(entry)),
    ) as StorageJsonArray
  }
  if (value !== null && typeof value === "object") {
    const clone: Record<string, StorageJsonValue> = {}
    for (const [key, entry] of Object.entries(value)) {
      clone[key] = cloneAndFreezeJson(entry)
    }
    return Object.freeze(clone) as StorageJsonObject
  }
  return value
}

function validateParentRefs(value: unknown): StorageError[] {
  if (!Array.isArray(value)) {
    return [createStorageError(
      "malformed_parent_refs",
      "parentRefs must be an array.",
      { field: "parentRefs" },
    )]
  }

  const errors: StorageError[] = []
  const seen = new Set<string>()
  value.forEach((parentRef, index) => {
    if (!isRecord(parentRef)
      || !isNonEmptyString(parentRef.recordId)
      || !isStorageRecordKind(parentRef.recordKind)) {
      errors.push(createStorageError(
        "malformed_parent_refs",
        "Each parent reference requires recordId and a canonical recordKind.",
        { field: `parentRefs.${index}` },
      ))
      return
    }
    const identity = `${parentRef.recordKind}:${parentRef.recordId}`
    if (seen.has(identity)) {
      errors.push(createStorageError(
        "malformed_parent_refs",
        "Duplicate parent references are not allowed.",
        { field: `parentRefs.${index}` },
      ))
    }
    seen.add(identity)
  })
  return errors
}

export function validateStorageRecord(input: unknown): StorageResult<StorageRecord> {
  if (!isRecord(input)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "malformed_input",
      "Storage record must be a plain object.",
    )])
  }

  const errors: StorageError[] = []
  if (!isNonEmptyString(input.recordId)) {
    errors.push(createStorageError(
      "missing_record_id",
      "recordId is required.",
      { field: "recordId" },
    ))
  }
  if (!isStorageRecordKind(input.recordKind)) {
    errors.push(createStorageError(
      "missing_record_kind",
      "recordKind must be a canonical storage record kind.",
      { field: "recordKind" },
    ))
  }
  if (!isNonEmptyString(input.idempotencyKey)) {
    errors.push(createStorageError(
      "missing_idempotency_key",
      "idempotencyKey is required.",
      { field: "idempotencyKey" },
    ))
  } else if (isStorageRecordKind(input.recordKind)) {
    const keyValidation = validateIdempotencyKey(input.idempotencyKey, input.recordKind)
    if (keyValidation.status !== "SUCCESS") errors.push(...keyValidation.errors)
  }
  if (!isNonEmptyString(input.runtimeVersion)) {
    errors.push(createStorageError(
      "invalid_runtime_version",
      "runtimeVersion must be a non-empty string.",
      { field: "runtimeVersion" },
    ))
  }
  if (!isPositiveInteger(input.schemaVersion)) {
    errors.push(createStorageError(
      "invalid_schema_version",
      "schemaVersion must be a positive integer.",
      { field: "schemaVersion" },
    ))
  }
  for (const field of ["createdAt", "recordedAt"] as const) {
    if (!isTimestamp(input[field])) {
      errors.push(createStorageError(
        "invalid_timestamp",
        `${field} must be a valid timestamp.`,
        { field },
      ))
    }
  }
  if (isTimestamp(input.createdAt)
    && isTimestamp(input.recordedAt)
    && Date.parse(input.recordedAt) < Date.parse(input.createdAt)) {
    errors.push(createStorageError(
      "invalid_timestamp",
      "recordedAt cannot precede createdAt.",
      { field: "recordedAt" },
    ))
  }

  errors.push(...validateParentRefs(input.parentRefs))

  if (!hasOwn(input, "payload") || !isStorageJsonValue(input.payload)) {
    errors.push(createStorageError(
      "malformed_payload",
      "payload must be an opaque JSON value without cycles or non-finite numbers.",
      { field: "payload" },
    ))
  }
  if (input.checksum !== undefined && !isNonEmptyString(input.checksum)) {
    errors.push(createStorageError(
      "invalid_checksum",
      "checksum must be a non-empty string when provided.",
      { field: "checksum" },
    ))
  }

  if (errors.length > 0) return createStorageFailure("VALIDATION_ERROR", errors)

  const record = input as unknown as StorageRecord
  const parentRefs = record.parentRefs.map((parentRef): StorageParentRef => Object.freeze({
    recordId: parentRef.recordId,
    recordKind: parentRef.recordKind,
  }))
  return createStorageSuccess(Object.freeze({
    recordId: record.recordId,
    recordKind: record.recordKind,
    idempotencyKey: record.idempotencyKey,
    runtimeVersion: record.runtimeVersion,
    schemaVersion: record.schemaVersion,
    createdAt: record.createdAt,
    recordedAt: record.recordedAt,
    parentRefs: Object.freeze(parentRefs),
    payload: cloneAndFreezeJson(record.payload),
    ...(record.checksum !== undefined ? { checksum: record.checksum } : {}),
  }))
}
