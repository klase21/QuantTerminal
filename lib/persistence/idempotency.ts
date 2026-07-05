import { createStorageError } from "@/lib/persistence/errors"
import {
  isStorageRecordKind,
  type StorageRecordKind,
} from "@/lib/persistence/recordKind"
import {
  createStorageFailure,
  createStorageSuccess,
  type StorageResult,
} from "@/lib/persistence/result"

function isIdentityPart(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value === value.trim()
}

function decodeIdentityPart(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value)
    return isIdentityPart(decoded) && encodeURIComponent(decoded) === value
      ? decoded
      : null
  } catch {
    return null
  }
}

function parseIdempotencyKey(
  key: unknown,
): { readonly recordKind: StorageRecordKind; readonly identityParts: readonly string[] } | null {
  if (typeof key !== "string" || key.length === 0 || key !== key.trim()) return null

  const [recordKindValue, ...encodedParts] = key.split(":")
  if (!isStorageRecordKind(recordKindValue) || encodedParts.length === 0) return null

  const identityParts = encodedParts.map(decodeIdentityPart)
  if (identityParts.some((part) => part === null)) return null

  return Object.freeze({
    recordKind: recordKindValue,
    identityParts: Object.freeze(identityParts as string[]),
  })
}

export function createIdempotencyKey(
  recordKind: StorageRecordKind,
  identityParts: readonly string[],
): StorageResult<string> {
  if (!isStorageRecordKind(recordKind)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "missing_record_kind",
      "A canonical record kind is required to create an idempotency key.",
      { field: "recordKind" },
    )])
  }
  if (!Array.isArray(identityParts)
    || identityParts.length === 0
    || !identityParts.every(isIdentityPart)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "invalid_idempotency_key",
      "Idempotency identity parts must be non-empty canonical strings.",
      { field: "identityParts" },
    )])
  }

  return createStorageSuccess(
    `${recordKind}:${identityParts.map(encodeURIComponent).join(":")}`,
  )
}

export function validateIdempotencyKey(
  key: unknown,
  expectedRecordKind?: StorageRecordKind,
): StorageResult<string> {
  const parsed = parseIdempotencyKey(key)
  if (!parsed || (expectedRecordKind !== undefined
    && parsed.recordKind !== expectedRecordKind)) {
    return createStorageFailure("VALIDATION_ERROR", [createStorageError(
      "invalid_idempotency_key",
      expectedRecordKind === undefined
        ? "Idempotency key is malformed or uses an unknown record kind."
        : `Idempotency key must belong to ${expectedRecordKind}.`,
      { field: "idempotencyKey" },
    )])
  }

  return createStorageSuccess(key as string)
}

export function compareIdempotencyKey(left: unknown, right: unknown): boolean {
  const leftParsed = parseIdempotencyKey(left)
  const rightParsed = parseIdempotencyKey(right)
  if (!leftParsed || !rightParsed) return false
  if (leftParsed.recordKind !== rightParsed.recordKind) return false
  if (leftParsed.identityParts.length !== rightParsed.identityParts.length) return false
  return leftParsed.identityParts.every(
    (part, index) => part === rightParsed.identityParts[index],
  )
}
