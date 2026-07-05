import { createStorageError } from "@/lib/persistence/errors"
import {
  createStorageFailure,
  createStorageSuccess,
  type StorageResult,
} from "@/lib/persistence/result"
import type { StorageRecord } from "@/lib/persistence/types"
import { validateStorageRecord } from "@/lib/persistence/validation"

export function serializeStorageRecord(
  record: StorageRecord,
): StorageResult<string> {
  const validation = validateStorageRecord(record)
  if (validation.status !== "SUCCESS") {
    return createStorageFailure(validation.status, validation.errors)
  }

  try {
    return createStorageSuccess(JSON.stringify(validation.value))
  } catch (cause) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "serialization_failure",
      "Storage record could not be serialized.",
      { cause },
    )])
  }
}

export function deserializeStorageRecord(raw: string): StorageResult<StorageRecord> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "malformed_json",
      "Serialized storage record is empty.",
    )])
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "malformed_json",
      "Serialized storage record is not valid JSON.",
      { cause },
    )])
  }

  return validateStorageRecord(parsed)
}
