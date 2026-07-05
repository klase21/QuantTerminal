import { canonicalSchedulerTimestamp, isSchedulerJobType } from "@/lib/scheduler-runtime/identity"
import { isExecutionState } from "@/lib/scheduler-runtime/lifecycle"
import type { ExecutionQuery, SchedulerResult } from "@/lib/scheduler-runtime/types"

type UnknownRecord = Record<string, unknown>
const RETRY_QUERY_STATES = new Set(["INITIAL", "SCHEDULED", "EXHAUSTED"])

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function validateExecutionQuery(input: unknown): SchedulerResult<ExecutionQuery> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_query", message: "Execution query must be an object." }],
    }
  }
  if ((input.executionId !== undefined && !isNonEmptyString(input.executionId))
    || (input.parentExecutionId !== undefined
      && input.parentExecutionId !== null
      && !isNonEmptyString(input.parentExecutionId))
    || (input.jobType !== undefined && !isSchedulerJobType(input.jobType))
    || (input.lifecycle !== undefined && !isExecutionState(input.lifecycle))
    || (input.retryState !== undefined
      && (typeof input.retryState !== "string" || !RETRY_QUERY_STATES.has(input.retryState)))) {
    return {
      success: false,
      errors: [{
        code: "malformed_query",
        message: "Execution query contains an invalid identity, job, lifecycle, or retry filter.",
        field: "query",
      }],
    }
  }

  const scheduledAfter = input.scheduledAfter === undefined
    ? undefined
    : canonicalSchedulerTimestamp(input.scheduledAfter)
  const scheduledBefore = input.scheduledBefore === undefined
    ? undefined
    : canonicalSchedulerTimestamp(input.scheduledBefore)
  if (scheduledAfter === null || scheduledBefore === null
    || (scheduledAfter !== undefined
      && scheduledBefore !== undefined
      && Date.parse(scheduledAfter) > Date.parse(scheduledBefore))) {
    return {
      success: false,
      errors: [{
        code: "malformed_query",
        message: "Execution query scheduled range is invalid.",
        field: "scheduledAfter",
      }],
    }
  }

  return {
    success: true,
    value: Object.freeze({
      ...(input.executionId !== undefined
        ? { executionId: (input.executionId as string).trim() }
        : {}),
      ...(input.parentExecutionId !== undefined
        ? {
          parentExecutionId: input.parentExecutionId === null
            ? null
            : (input.parentExecutionId as string).trim(),
        }
        : {}),
      ...(input.jobType !== undefined ? { jobType: input.jobType } : {}),
      ...(input.lifecycle !== undefined ? { lifecycle: input.lifecycle } : {}),
      ...(scheduledAfter !== undefined ? { scheduledAfter } : {}),
      ...(scheduledBefore !== undefined ? { scheduledBefore } : {}),
      ...(input.retryState !== undefined ? { retryState: input.retryState } : {}),
    }) as ExecutionQuery,
  }
}

export function createExecutionQuery(input: ExecutionQuery): SchedulerResult<ExecutionQuery> {
  return validateExecutionQuery(input)
}
