import { freezeExecutionPlan } from "@/lib/scheduler-runtime/executionPlan"
import type { ExecutionPlan, SchedulerResult } from "@/lib/scheduler-runtime/types"
import { validateExecutionPlan, validateExecutionPlanSet } from "@/lib/scheduler-runtime/validation"

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index])
}

function sameHistoryPrefix(existing: ExecutionPlan, incoming: ExecutionPlan): boolean {
  if (incoming.executionHistory.length < existing.executionHistory.length) return false
  return existing.executionHistory.every((entry, index) => {
    const candidate = incoming.executionHistory[index]
    return entry.executionState === candidate.executionState
      && entry.occurredAt === candidate.occurredAt
  })
}

function sameImmutablePlanFields(existing: ExecutionPlan, incoming: ExecutionPlan): boolean {
  return existing.schemaVersion === incoming.schemaVersion
    && existing.executionId === incoming.executionId
    && existing.parentExecutionId === incoming.parentExecutionId
    && existing.jobType === incoming.jobType
    && existing.scheduledAt === incoming.scheduledAt
    && existing.earliestRunAt === incoming.earliestRunAt
    && existing.latestRunAt === incoming.latestRunAt
    && existing.retryPolicy.retryCount === incoming.retryPolicy.retryCount
    && existing.retryPolicy.maxRetryCount === incoming.retryPolicy.maxRetryCount
    && existing.retryPolicy.retryAfter === incoming.retryPolicy.retryAfter
    && existing.retryPolicy.retryReason === incoming.retryPolicy.retryReason
    && existing.retryPolicy.backoffPolicy === incoming.retryPolicy.backoffPolicy
    && sameArray(existing.dependencyIds, incoming.dependencyIds)
}

export function mergeExecutionPlan(
  existingPlan: ExecutionPlan,
  incomingPlan: ExecutionPlan,
): SchedulerResult<ExecutionPlan> {
  const existing = validateExecutionPlan(existingPlan)
  if (existing.success === false) return existing
  const incoming = validateExecutionPlan(incomingPlan)
  if (incoming.success === false) return incoming

  if (!sameImmutablePlanFields(existing.value, incoming.value)) {
    return {
      success: false,
      errors: [{
        code: "invalid_execution_identity",
        message: "Execution merge cannot overwrite identity, timing, retry, or dependencies.",
        field: "executionId",
      }],
    }
  }
  if (!sameHistoryPrefix(existing.value, incoming.value)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: "Execution history is append-only and existing entries cannot be changed.",
        field: "executionHistory",
      }],
    }
  }
  return { success: true, value: freezeExecutionPlan(incoming.value) }
}

export function mergeExecutionPlanSets(
  existingPlans: readonly ExecutionPlan[],
  incomingPlans: readonly ExecutionPlan[],
): SchedulerResult<readonly ExecutionPlan[]> {
  const existing = validateExecutionPlanSet(existingPlans)
  if (existing.success === false) return existing
  const incoming = validateExecutionPlanSet(incomingPlans)
  if (incoming.success === false) return incoming

  const merged = new Map(existing.value.map((plan) => [plan.executionId, plan]))
  for (const plan of incoming.value) {
    const current = merged.get(plan.executionId)
    if (!current) {
      merged.set(plan.executionId, plan)
      continue
    }
    const result = mergeExecutionPlan(current, plan)
    if (result.success === false) return result
    merged.set(plan.executionId, result.value)
  }
  return {
    success: true,
    value: Object.freeze([...merged.values()].map(freezeExecutionPlan)),
  }
}

