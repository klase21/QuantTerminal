import type {
  LocalRunnerError,
  LocalRunnerResult,
  LocalRunnerStatus,
} from "@/workers/local-runner/types"

export function createLocalRunnerError(
  code: string,
  message: string,
  options: {
    readonly field?: string
    readonly cause?: unknown
  } = {},
): LocalRunnerError {
  return Object.freeze({
    code,
    message,
    ...(options.field !== undefined ? { field: options.field } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
  })
}

export function createLocalRunnerResult<T>(
  status: LocalRunnerStatus,
  errors: readonly LocalRunnerError[] = [],
  value?: T,
): LocalRunnerResult<T> {
  return Object.freeze({
    status,
    ...(value !== undefined ? { value } : {}),
    errors: Object.freeze([...errors]),
  })
}

