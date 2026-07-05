import { BACKOFF_POLICIES, type RetryPolicy, type SchedulerResult } from "@/lib/scheduler-runtime/types"
import { canonicalSchedulerTimestamp } from "@/lib/scheduler-runtime/identity"

const BACKOFF_SET = new Set<string>(BACKOFF_POLICIES)

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function validateRetryPolicy(input: unknown): SchedulerResult<RetryPolicy> {
  if (!isRecord(input)
    || !isNonNegativeInteger(input.retryCount)
    || !isNonNegativeInteger(input.maxRetryCount)
    || input.retryCount > input.maxRetryCount
    || typeof input.backoffPolicy !== "string"
    || !BACKOFF_SET.has(input.backoffPolicy)) {
    return {
      success: false,
      errors: [{
        code: "malformed_retry_policy",
        message: "Retry policy requires valid counts and a canonical backoffPolicy.",
        field: "retryPolicy",
      }],
    }
  }

  const retryAfter = input.retryAfter === null
    ? null
    : canonicalSchedulerTimestamp(input.retryAfter)
  const retryReason = input.retryReason === null
    ? null
    : isNonEmptyString(input.retryReason)
      ? input.retryReason.trim()
      : null
  if ((input.retryAfter !== null && retryAfter === null)
    || (input.retryReason !== null && retryReason === null)
    || (input.retryCount === 0 && (retryAfter !== null || retryReason !== null))
    || (input.retryCount > 0 && (retryAfter === null || retryReason === null))
    || (input.backoffPolicy === "NONE" && retryAfter !== null)) {
    return {
      success: false,
      errors: [{
        code: "malformed_retry_policy",
        message: "Retry timing and reason are inconsistent with retry counts or backoffPolicy.",
        field: "retryPolicy",
      }],
    }
  }

  return {
    success: true,
    value: Object.freeze({
      retryCount: input.retryCount,
      maxRetryCount: input.maxRetryCount,
      retryAfter,
      retryReason,
      backoffPolicy: input.backoffPolicy as RetryPolicy["backoffPolicy"],
    }),
  }
}

export function createInitialRetryPolicy(
  maxRetryCount: number,
  backoffPolicy: RetryPolicy["backoffPolicy"],
): SchedulerResult<RetryPolicy> {
  return validateRetryPolicy({
    retryCount: 0,
    maxRetryCount,
    retryAfter: null,
    retryReason: null,
    backoffPolicy,
  })
}

export function createNextRetryPolicy(
  current: RetryPolicy,
  retryAfter: string,
  retryReason: string,
): SchedulerResult<RetryPolicy> {
  const validation = validateRetryPolicy(current)
  if (validation.success === false) return validation
  if (validation.value.retryCount >= validation.value.maxRetryCount) {
    return {
      success: false,
      errors: [{
        code: "malformed_retry_policy",
        message: "Retry count is exhausted.",
        field: "retryPolicy.retryCount",
      }],
    }
  }
  const nextCount = validation.value.retryCount + 1
  return validateRetryPolicy({
    ...validation.value,
    retryCount: nextCount,
    retryAfter,
    retryReason,
  })
}
