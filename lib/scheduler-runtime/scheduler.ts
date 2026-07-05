import { createExecutionPlan, transitionExecutionPlan } from "@/lib/scheduler-runtime/executionPlan"
import { canonicalSchedulerTimestamp } from "@/lib/scheduler-runtime/identity"
import { createNextRetryPolicy } from "@/lib/scheduler-runtime/retry"
import type {
  ExecutionPlan,
  ExecutionReadinessInput,
  SchedulerResult,
} from "@/lib/scheduler-runtime/types"
import { validateExecutionPlan } from "@/lib/scheduler-runtime/validation"

export interface RetryExecutionInput {
  readonly scheduledAt: string
  readonly retryAfter: string
  readonly latestRunAt: string
  readonly retryReason: string
}

export interface RetryExecutionLineage {
  readonly parent: ExecutionPlan
  readonly retry: ExecutionPlan
}

export function scheduleExecution(
  plan: ExecutionPlan,
  scheduledAt: string,
): SchedulerResult<ExecutionPlan> {
  return transitionExecutionPlan(plan, "SCHEDULED", scheduledAt)
}

export function activateExecution(
  plan: ExecutionPlan,
  input: ExecutionReadinessInput,
): SchedulerResult<ExecutionPlan> {
  const validation = validateExecutionPlan(plan)
  if (validation.success === false) return validation
  const evaluatedAt = canonicalSchedulerTimestamp(input.evaluatedAt)
  if (!evaluatedAt) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Readiness evaluatedAt must be a valid timestamp.",
        field: "evaluatedAt",
      }],
    }
  }
  if (!Array.isArray(input.resolvedDependencyIds)) {
    return {
      success: false,
      errors: [{
        code: "missing_dependency",
        message: "resolvedDependencyIds must be an array.",
        field: "resolvedDependencyIds",
      }],
    }
  }
  const resolved = new Set(input.resolvedDependencyIds)
  const missing = validation.value.dependencyIds.filter((id) => !resolved.has(id))
  if (missing.length > 0) {
    return {
      success: false,
      errors: [{
        code: "missing_dependency",
        message: "Execution dependencies are not fully resolved.",
        field: "dependencyIds",
        cause: Object.freeze([...missing]),
      }],
    }
  }
  if (Date.parse(evaluatedAt) < Date.parse(validation.value.earliestRunAt)
    || Date.parse(evaluatedAt) > Date.parse(validation.value.latestRunAt)) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Execution is outside its allowed run window.",
        field: "evaluatedAt",
      }],
    }
  }
  return transitionExecutionPlan(validation.value, "READY", evaluatedAt)
}

export function claimExecution(plan: ExecutionPlan, claimedAt: string) {
  return transitionExecutionPlan(plan, "CLAIMED", claimedAt)
}

export function startExecution(plan: ExecutionPlan, startedAt: string) {
  return transitionExecutionPlan(plan, "RUNNING", startedAt)
}

export function succeedExecution(plan: ExecutionPlan, completedAt: string) {
  return transitionExecutionPlan(plan, "SUCCEEDED", completedAt)
}

export function failExecution(plan: ExecutionPlan, failedAt: string) {
  return transitionExecutionPlan(plan, "FAILED", failedAt)
}

export function deadLetterExecution(plan: ExecutionPlan, deadLetteredAt: string) {
  return transitionExecutionPlan(plan, "DEAD_LETTERED", deadLetteredAt)
}

export function archiveExecution(plan: ExecutionPlan, archivedAt: string) {
  return transitionExecutionPlan(plan, "ARCHIVED", archivedAt)
}

export function createRetryExecution(
  failedPlan: ExecutionPlan,
  input: RetryExecutionInput,
): SchedulerResult<RetryExecutionLineage> {
  const current = validateExecutionPlan(failedPlan)
  if (current.success === false) return current
  if (current.value.executionState !== "FAILED") {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle_transition",
        message: "Only a FAILED execution may create a retry attempt.",
        field: "executionState",
      }],
    }
  }
  const nextRetry = createNextRetryPolicy(
    current.value.retryPolicy,
    input.retryAfter,
    input.retryReason,
  )
  if (nextRetry.success === false) return nextRetry
  const parent = transitionExecutionPlan(current.value, "RETRYING", input.scheduledAt)
  if (parent.success === false) return parent
  const retry = createExecutionPlan({
    jobType: current.value.jobType,
    parentExecutionId: current.value.executionId,
    scheduledAt: input.scheduledAt,
    earliestRunAt: input.retryAfter,
    latestRunAt: input.latestRunAt,
    retryPolicy: nextRetry.value,
    dependencyIds: current.value.dependencyIds,
  })
  if (retry.success === false) return retry
  return {
    success: true,
    value: Object.freeze({ parent: parent.value, retry: retry.value }),
  }
}

