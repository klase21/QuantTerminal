import {
  SCHEDULER_JOB_TYPES,
  type ExecutionIdentity,
  type ExecutionIdentityInput,
  type SchedulerJobType,
  type SchedulerResult,
} from "@/lib/scheduler-runtime/types"

const JOB_TYPE_SET = new Set<string>(SCHEDULER_JOB_TYPES)

function failure(
  code: "invalid_execution_identity" | "invalid_timestamp" | "unsupported_job_type",
  message: string,
  field: string,
): SchedulerResult<never> {
  return { success: false, errors: [{ code, message, field }] }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function canonicalSchedulerTimestamp(value: unknown): string | null {
  if (!isNonEmptyString(value)) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

export function isSchedulerJobType(value: unknown): value is SchedulerJobType {
  return typeof value === "string" && JOB_TYPE_SET.has(value)
}

export function createExecutionId(
  input: ExecutionIdentityInput,
): SchedulerResult<string> {
  if (!input || typeof input !== "object") {
    return failure(
      "invalid_execution_identity",
      "Execution identity input must be an object.",
      "identity",
    )
  }
  if (!isSchedulerJobType(input.jobType)) {
    return failure(
      "unsupported_job_type",
      "Execution identity requires a canonical jobType.",
      "jobType",
    )
  }
  if (input.parentExecutionId !== null
    && !isNonEmptyString(input.parentExecutionId)) {
    return failure(
      "invalid_execution_identity",
      "parentExecutionId must be null or a non-empty string.",
      "parentExecutionId",
    )
  }
  const scheduledAt = canonicalSchedulerTimestamp(input.scheduledAt)
  if (!scheduledAt) {
    return failure(
      "invalid_timestamp",
      "scheduledAt must be a valid timestamp.",
      "scheduledAt",
    )
  }

  return {
    success: true,
    value: [
      "scheduler-execution-v1",
      encodeURIComponent(input.jobType),
      encodeURIComponent(input.parentExecutionId?.trim() ?? "ROOT"),
      encodeURIComponent(scheduledAt),
    ].join("|"),
  }
}

export function createExecutionIdentity(
  input: ExecutionIdentityInput,
): SchedulerResult<ExecutionIdentity> {
  const executionId = createExecutionId(input)
  if (executionId.success === false) return executionId
  const scheduledAt = canonicalSchedulerTimestamp(input.scheduledAt)
  if (!scheduledAt) {
    return failure("invalid_timestamp", "scheduledAt is invalid.", "scheduledAt")
  }
  return {
    success: true,
    value: Object.freeze({
      executionId: executionId.value,
      jobType: input.jobType,
      parentExecutionId: input.parentExecutionId?.trim() ?? null,
      scheduledAt,
    }),
  }
}

export function validateUniqueExecutionIds(
  executionIds: readonly string[],
): SchedulerResult<readonly string[]> {
  if (!Array.isArray(executionIds)
    || executionIds.some((executionId) => !isNonEmptyString(executionId))) {
    return failure(
      "invalid_execution_identity",
      "Execution IDs must be non-empty strings.",
      "executionIds",
    )
  }
  if (new Set(executionIds).size !== executionIds.length) {
    return {
      success: false,
      errors: [{
        code: "duplicate_execution_id",
        message: "Duplicate executionId values are not allowed.",
        field: "executionIds",
      }],
    }
  }
  return { success: true, value: Object.freeze([...executionIds]) }
}

