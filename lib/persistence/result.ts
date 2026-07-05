import type { StorageError } from "@/lib/persistence/errors"

export const STORAGE_RESULT_STATUSES = [
  "SUCCESS",
  "DUPLICATE",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "STORAGE_ERROR",
  "CONFLICT",
  "UNAVAILABLE",
] as const

export type StorageResultStatus = typeof STORAGE_RESULT_STATUSES[number]
export type StorageFailureStatus = Exclude<StorageResultStatus, "SUCCESS">

export interface StorageSuccess<T> {
  readonly status: "SUCCESS"
  readonly value: T
  readonly errors: readonly StorageError[]
}

export interface StorageFailure<T = never> {
  readonly status: StorageFailureStatus
  readonly value?: T
  readonly errors: readonly StorageError[]
}

export type StorageResult<T> = StorageSuccess<T> | StorageFailure<T>

export function createStorageSuccess<T>(value: T): StorageSuccess<T> {
  return Object.freeze({
    status: "SUCCESS",
    value,
    errors: Object.freeze([]) as readonly StorageError[],
  })
}

export function createStorageFailure<T = never>(
  status: StorageFailureStatus,
  errors: readonly StorageError[],
  value?: T,
): StorageFailure<T> {
  return Object.freeze({
    status,
    ...(value !== undefined ? { value } : {}),
    errors: Object.freeze([...errors]),
  })
}

export function isStorageSuccess<T>(
  result: StorageResult<T>,
): result is StorageSuccess<T> {
  return result.status === "SUCCESS"
}
