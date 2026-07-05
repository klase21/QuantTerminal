import { createExecutionIdentity, canonicalSchedulerTimestamp } from "@/lib/scheduler-runtime/identity"
import { transitionExecutionState } from "@/lib/scheduler-runtime/lifecycle"
import {
  SCHEDULER_SCHEMA_VERSION,
  type CreateExecutionPlanInput,
  type ExecutionHistoryEntry,
  type ExecutionPlan,
  type ExecutionState,
  type SchedulerResult,
} from "@/lib/scheduler-runtime/types"
import { validateExecutionPlan } from "@/lib/scheduler-runtime/validation"

export function freezeExecutionPlan(plan: ExecutionPlan): ExecutionPlan {
  return Object.freeze({
    ...plan,
    retryPolicy: Object.freeze({ ...plan.retryPolicy }),
    dependencyIds: Object.freeze([...plan.dependencyIds]),
    executionHistory: Object.freeze(plan.executionHistory.map(
      (entry) => Object.freeze({ ...entry }),
    )),
  })
}

export function createExecutionPlan(
  input: CreateExecutionPlanInput,
): SchedulerResult<ExecutionPlan> {
  const identity = createExecutionIdentity(input)
  if (identity.success === false) return identity
  const earliestRunAt = canonicalSchedulerTimestamp(input.earliestRunAt)
  const latestRunAt = canonicalSchedulerTimestamp(input.latestRunAt)
  if (!earliestRunAt || !latestRunAt) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Execution window timestamps are invalid.",
        field: "earliestRunAt",
      }],
    }
  }

  return validateExecutionPlan({
    schemaVersion: SCHEDULER_SCHEMA_VERSION,
    executionId: identity.value.executionId,
    parentExecutionId: identity.value.parentExecutionId,
    jobType: identity.value.jobType,
    scheduledAt: identity.value.scheduledAt,
    earliestRunAt,
    latestRunAt,
    retryPolicy: input.retryPolicy,
    dependencyIds: input.dependencyIds,
    executionState: "CREATED",
    executionHistory: [{ executionState: "CREATED", occurredAt: identity.value.scheduledAt }],
  })
}

export function transitionExecutionPlan(
  plan: ExecutionPlan,
  nextState: ExecutionState,
  occurredAt: string,
): SchedulerResult<ExecutionPlan> {
  const current = validateExecutionPlan(plan)
  if (current.success === false) return current
  const transition = transitionExecutionState(current.value.executionState, nextState)
  if (transition.success === false) return transition
  const canonicalOccurredAt = canonicalSchedulerTimestamp(occurredAt)
  if (!canonicalOccurredAt
    || Date.parse(canonicalOccurredAt) < Date.parse(
      current.value.executionHistory[current.value.executionHistory.length - 1].occurredAt,
    )) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Lifecycle occurredAt must be valid and non-decreasing.",
        field: "occurredAt",
      }],
    }
  }
  const entry: ExecutionHistoryEntry = Object.freeze({
    executionState: transition.value,
    occurredAt: canonicalOccurredAt,
  })
  return validateExecutionPlan({
    ...current.value,
    executionState: transition.value,
    executionHistory: [...current.value.executionHistory, entry],
  })
}

