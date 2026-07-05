import type { RepositoryError } from "@/lib/persistence/repository/errors"

export const REPOSITORY_RESULT_STATUSES = [
  "SUCCESS",
  "DUPLICATE",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "ADAPTER_ERROR",
  "CONFLICT",
  "UNAVAILABLE",
] as const

export type RepositoryResultStatus = typeof REPOSITORY_RESULT_STATUSES[number]
export type RepositoryFailureStatus = Exclude<RepositoryResultStatus, "SUCCESS">

export interface RepositorySuccess<T> {
  readonly status: "SUCCESS"
  readonly value: T
  readonly errors: readonly RepositoryError[]
}

export interface RepositoryFailure<T = never> {
  readonly status: RepositoryFailureStatus
  readonly value?: T
  readonly errors: readonly RepositoryError[]
}

export type RepositoryResult<T> = RepositorySuccess<T> | RepositoryFailure<T>

export function createRepositorySuccess<T>(value: T): RepositorySuccess<T> {
  return Object.freeze({
    status: "SUCCESS",
    value,
    errors: Object.freeze([]) as readonly RepositoryError[],
  })
}

export function createRepositoryFailure<T = never>(
  status: RepositoryFailureStatus,
  errors: readonly RepositoryError[],
  value?: T,
): RepositoryFailure<T> {
  return Object.freeze({
    status,
    ...(value !== undefined ? { value } : {}),
    errors: Object.freeze([...errors]),
  })
}
