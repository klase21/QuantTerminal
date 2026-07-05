import { createStorageError } from "@/lib/persistence/errors"
import { validateIdempotencyKey } from "@/lib/persistence/idempotency"
import { isStorageRecordKind } from "@/lib/persistence/recordKind"
import {
  createStorageFailure,
  createStorageSuccess,
  type StorageResult,
} from "@/lib/persistence/result"
import type {
  StorageArchiveRequest,
  StorageListQuery,
  StorageRecordLocator,
} from "@/lib/persistence/types"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

export function validatePostgresLocator(
  input: unknown,
): StorageResult<StorageRecordLocator> {
  if (!isRecord(input)
    || !isNonEmptyString(input.recordId)
    || !isStorageRecordKind(input.recordKind)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      !isRecord(input) || input.recordKind === undefined
        ? "missing_record_kind"
        : "missing_record_id",
      "Postgres record locator requires recordId and a canonical recordKind.",
      { field: "locator" },
    )])
  }
  return createStorageSuccess(Object.freeze({
    recordId: input.recordId,
    recordKind: input.recordKind,
  }))
}

export function validatePostgresArchiveRequest(
  input: unknown,
): StorageResult<StorageArchiveRequest> {
  const locator = validatePostgresLocator(input)
  if (locator.status !== "SUCCESS") {
    return createStorageFailure(locator.status, locator.errors)
  }
  if (!isRecord(input) || !isTimestamp(input.archivedAt)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "invalid_timestamp",
      "Postgres archive request requires a valid archivedAt timestamp.",
      { field: "archivedAt" },
    )])
  }
  const key = validateIdempotencyKey(input.idempotencyKey, locator.value.recordKind)
  if (key.status !== "SUCCESS") {
    return createStorageFailure("VALIDATION_ERROR", key.errors)
  }
  return createStorageSuccess(Object.freeze({
    ...locator.value,
    archivedAt: input.archivedAt,
    idempotencyKey: key.value,
  }))
}

export function validatePostgresListQuery(
  input: unknown,
): StorageResult<StorageListQuery | undefined> {
  if (input === undefined) return createStorageSuccess(undefined)
  if (!isRecord(input)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "malformed_input",
      "Postgres list query must be an object.",
      { field: "query" },
    )])
  }
  if (input.recordKinds !== undefined
    && (!Array.isArray(input.recordKinds)
      || input.recordKinds.some((kind) => !isStorageRecordKind(kind))
      || new Set(input.recordKinds).size !== input.recordKinds.length)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "missing_record_kind",
      "recordKinds must contain unique canonical record kinds.",
      { field: "recordKinds" },
    )])
  }
  if (input.parentRef !== undefined) {
    const parent = validatePostgresLocator(input.parentRef)
    if (parent.status !== "SUCCESS") {
      return createStorageFailure("VALIDATION_ERROR", [createStorageError(
        "malformed_parent_refs",
        "Postgres list query parentRef is invalid.",
        { field: "parentRef", cause: parent.errors },
      )])
    }
  }
  for (const field of ["createdAfter", "createdBefore"] as const) {
    if (input[field] !== undefined && !isTimestamp(input[field])) {
      return createStorageFailure("VALIDATION_ERROR", [createStorageError(
        "invalid_timestamp",
        `${field} must be a valid timestamp when provided.`,
        { field },
      )])
    }
  }
  if (isTimestamp(input.createdAfter)
    && isTimestamp(input.createdBefore)
    && Date.parse(input.createdAfter) > Date.parse(input.createdBefore)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "invalid_timestamp",
      "createdAfter cannot be later than createdBefore.",
      { field: "createdAfter" },
    )])
  }
  if (input.limit !== undefined
    && (typeof input.limit !== "number"
      || !Number.isInteger(input.limit)
      || input.limit <= 0)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "malformed_input",
      "limit must be a positive integer when provided.",
      { field: "limit" },
    )])
  }
  if (input.cursor !== undefined && !isNonEmptyString(input.cursor)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "malformed_input",
      "cursor must be a non-empty record cursor when provided.",
      { field: "cursor" },
    )])
  }

  return createStorageSuccess(Object.freeze({ ...input }) as StorageListQuery)
}
