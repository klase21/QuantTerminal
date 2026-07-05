import { createExecutionId, canonicalSchedulerTimestamp, isSchedulerJobType } from "@/lib/scheduler-runtime/identity"
import { isExecutionState, validateExecutionHistoryTransitions } from "@/lib/scheduler-runtime/lifecycle"
import { validateRetryPolicy } from "@/lib/scheduler-runtime/retry"
import {
  SCHEDULER_SCHEMA_VERSION,
  type ExecutionHistoryEntry,
  type ExecutionPlan,
  type SchedulerError,
  type SchedulerResult,
} from "@/lib/scheduler-runtime/types"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function oneError<T>(error: SchedulerError): SchedulerResult<T> {
  return { success: false, errors: [error] }
}

function validateDependencyIds(
  input: unknown,
  executionId: string,
): SchedulerResult<readonly string[]> {
  if (!Array.isArray(input)
    || input.some((dependencyId) => !isNonEmptyString(dependencyId))) {
    return oneError({
      code: "missing_dependency",
      message: "dependencyIds must be an array of non-empty execution IDs.",
      field: "dependencyIds",
    })
  }
  const normalized = input.map((dependencyId) => dependencyId.trim())
  if (new Set(normalized).size !== normalized.length
    || normalized.includes(executionId)) {
    return oneError({
      code: "missing_dependency",
      message: "dependencyIds must be unique and cannot reference the current execution.",
      field: "dependencyIds",
    })
  }
  return { success: true, value: Object.freeze(normalized) }
}

function validateExecutionHistory(
  input: unknown,
  scheduledAt: string,
  executionState: ExecutionPlan["executionState"],
): SchedulerResult<readonly ExecutionHistoryEntry[]> {
  if (!Array.isArray(input) || input.length === 0) {
    return oneError({
      code: "invalid_lifecycle",
      message: "executionHistory must contain at least the CREATED event.",
      field: "executionHistory",
    })
  }

  const history: ExecutionHistoryEntry[] = []
  for (let index = 0; index < input.length; index += 1) {
    const entry = input[index]
    if (!isRecord(entry) || !isExecutionState(entry.executionState)) {
      return oneError({
        code: "invalid_lifecycle",
        message: "Execution history entry has an invalid executionState.",
        field: `executionHistory.${index}.executionState`,
      })
    }
    const occurredAt = canonicalSchedulerTimestamp(entry.occurredAt)
    if (!occurredAt) {
      return oneError({
        code: "invalid_timestamp",
        message: "Execution history occurredAt must be a valid timestamp.",
        field: `executionHistory.${index}.occurredAt`,
      })
    }
    if (index > 0 && Date.parse(occurredAt) < Date.parse(history[index - 1].occurredAt)) {
      return oneError({
        code: "invalid_timestamp",
        message: "Execution history timestamps must be non-decreasing.",
        field: `executionHistory.${index}.occurredAt`,
      })
    }
    history.push(Object.freeze({ executionState: entry.executionState, occurredAt }))
  }

  if (history[0].occurredAt !== scheduledAt) {
    return oneError({
      code: "invalid_timestamp",
      message: "The CREATED history timestamp must equal scheduledAt.",
      field: "executionHistory.0.occurredAt",
    })
  }
  const transitions = validateExecutionHistoryTransitions(
    history.map((entry) => entry.executionState),
  )
  if (transitions.success === false) return transitions
  if (history[history.length - 1].executionState !== executionState) {
    return oneError({
      code: "invalid_lifecycle",
      message: "executionState must match the final executionHistory state.",
      field: "executionState",
    })
  }
  return { success: true, value: Object.freeze(history) }
}

export function validateExecutionPlan(input: unknown): SchedulerResult<ExecutionPlan> {
  if (!isRecord(input)) {
    return oneError({
      code: "malformed_input",
      message: "ExecutionPlan must be a plain object.",
    })
  }
  if (input.schemaVersion !== SCHEDULER_SCHEMA_VERSION) {
    return oneError({
      code: "unsupported_schema_version",
      message: `Only Scheduler schema version ${SCHEDULER_SCHEMA_VERSION} is supported.`,
      field: "schemaVersion",
    })
  }
  if (!isSchedulerJobType(input.jobType)) {
    return oneError({
      code: "unsupported_job_type",
      message: "ExecutionPlan jobType is not canonical.",
      field: "jobType",
    })
  }
  if (!isNonEmptyString(input.executionId)
    || (input.parentExecutionId !== null && !isNonEmptyString(input.parentExecutionId))) {
    return oneError({
      code: "invalid_execution_identity",
      message: "ExecutionPlan requires executionId and a valid parentExecutionId.",
      field: "executionId",
    })
  }

  const scheduledAt = canonicalSchedulerTimestamp(input.scheduledAt)
  const earliestRunAt = canonicalSchedulerTimestamp(input.earliestRunAt)
  const latestRunAt = canonicalSchedulerTimestamp(input.latestRunAt)
  if (!scheduledAt || !earliestRunAt || !latestRunAt) {
    return oneError({
      code: "invalid_timestamp",
      message: "ExecutionPlan timing fields must be valid timestamps.",
      field: "scheduledAt",
    })
  }
  if (Date.parse(scheduledAt) > Date.parse(earliestRunAt)
    || Date.parse(earliestRunAt) > Date.parse(latestRunAt)) {
    return oneError({
      code: "invalid_timestamp",
      message: "Execution timing must satisfy scheduledAt <= earliestRunAt <= latestRunAt.",
      field: "earliestRunAt",
    })
  }

  const expectedId = createExecutionId({
    jobType: input.jobType,
    parentExecutionId: input.parentExecutionId as string | null,
    scheduledAt,
  })
  if (expectedId.success === false || input.executionId !== expectedId.value) {
    return oneError({
      code: "invalid_execution_identity",
      message: "executionId does not match jobType, parentExecutionId, and scheduledAt.",
      field: "executionId",
    })
  }
  if (input.parentExecutionId === input.executionId) {
    return oneError({
      code: "invalid_execution_identity",
      message: "Execution cannot be its own parent.",
      field: "parentExecutionId",
    })
  }

  const retryPolicy = validateRetryPolicy(input.retryPolicy)
  if (retryPolicy.success === false) return retryPolicy
  const dependencies = validateDependencyIds(input.dependencyIds, input.executionId)
  if (dependencies.success === false) return dependencies
  if (!isExecutionState(input.executionState)) {
    return oneError({
      code: "invalid_lifecycle",
      message: "executionState is not canonical.",
      field: "executionState",
    })
  }
  const history = validateExecutionHistory(
    input.executionHistory,
    scheduledAt,
    input.executionState,
  )
  if (history.success === false) return history

  return {
    success: true,
    value: Object.freeze({
      schemaVersion: SCHEDULER_SCHEMA_VERSION,
      executionId: input.executionId,
      parentExecutionId: input.parentExecutionId as string | null,
      jobType: input.jobType,
      scheduledAt,
      earliestRunAt,
      latestRunAt,
      retryPolicy: retryPolicy.value,
      dependencyIds: dependencies.value,
      executionState: input.executionState,
      executionHistory: history.value,
    }),
  }
}

export function validateExecutionPlanSet(
  input: unknown,
): SchedulerResult<readonly ExecutionPlan[]> {
  if (!Array.isArray(input)) {
    return oneError({ code: "malformed_input", message: "Execution plans must be an array." })
  }
  const plans: ExecutionPlan[] = []
  const ids = new Set<string>()
  for (const plan of input) {
    const validation = validateExecutionPlan(plan)
    if (validation.success === false) return validation
    if (ids.has(validation.value.executionId)) {
      return oneError({
        code: "duplicate_execution_id",
        message: "Execution plan set contains duplicate executionId.",
        field: "executionId",
      })
    }
    ids.add(validation.value.executionId)
    plans.push(validation.value)
  }
  return { success: true, value: Object.freeze(plans) }
}

