import { canonicalSchedulerTimestamp, type ExecutionPlan } from "@/lib/scheduler-runtime"
import {
  createWorkerLifecycle,
  transitionWorkerLifecycle,
} from "@/lib/worker-runtime/lifecycle"
import { createWorkerResult } from "@/lib/worker-runtime/result"
import type {
  WorkerDispatcher,
  WorkerExecutionContext,
  WorkerExecutionLineage,
  WorkerExecutionReceipt,
  WorkerRuntimeResult,
} from "@/lib/worker-runtime/types"
import { validateWorkerExecutionContext } from "@/lib/worker-runtime/validation"

export function createWorkerExecutionContext(input: {
  readonly executionPlan: ExecutionPlan
  readonly workerId: string
  readonly claimedAt: string
  readonly startedAt: string
}): WorkerRuntimeResult<WorkerExecutionContext> {
  return validateWorkerExecutionContext({
    executionId: input.executionPlan?.executionId,
    workerId: input.workerId,
    jobType: input.executionPlan?.jobType,
    executionPlan: input.executionPlan,
    claimedAt: input.claimedAt,
    startedAt: input.startedAt,
  })
}

export function createWorkerExecutionLineage(
  context: WorkerExecutionContext,
  downstreamExecutionIds: readonly string[],
): WorkerExecutionLineage {
  const retryParentExecutionId = context.executionPlan.retryPolicy.retryCount > 0
    ? context.executionPlan.parentExecutionId
    : null
  return Object.freeze({
    executionId: context.executionId,
    parentExecutionId: context.executionPlan.parentExecutionId,
    retryParentExecutionId,
    dependencyExecutionIds: Object.freeze([...context.executionPlan.dependencyIds]),
    downstreamExecutionIds: Object.freeze([...downstreamExecutionIds]),
  })
}

export async function executeWorker(
  contextInput: WorkerExecutionContext,
  dispatcher: WorkerDispatcher,
  completedAtInput: string,
): Promise<WorkerRuntimeResult<WorkerExecutionReceipt>> {
  const context = validateWorkerExecutionContext(contextInput)
  if (context.success === false) return context
  const completedAt = canonicalSchedulerTimestamp(completedAtInput)
  if (!completedAt || Date.parse(completedAt) < Date.parse(context.value.startedAt)) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Worker completion must not precede startedAt.",
        field: "completedAt",
      }],
    }
  }

  const created = createWorkerLifecycle(context.value)
  if (created.success === false) return created
  const claimed = transitionWorkerLifecycle(created.value, "CLAIMED", context.value.claimedAt)
  if (claimed.success === false) return claimed
  const running = transitionWorkerLifecycle(claimed.value, "RUNNING", context.value.startedAt)
  if (running.success === false) return running

  const dispatch = await dispatcher.dispatch(context.value)
  const handlerResult = dispatch.success
    ? dispatch.value
    : {
      success: false as const,
      error: Object.freeze({
        code: "DISPATCH_VALIDATION_FAILED",
        message: "Worker dispatch failed validation.",
        retryable: false,
      }),
    }
  const result = handlerResult.success === true
    ? createWorkerResult({
      context: context.value,
      status: "SUCCEEDED",
      completedAt,
      producedRecords: handlerResult.value.producedRecords,
      nextExecutionIds: handlerResult.value.nextExecutionIds,
    })
    : createWorkerResult({
      context: context.value,
      status: "FAILED",
      completedAt,
      producedRecords: [],
      nextExecutionIds: [],
      error: handlerResult.error,
    })
  if (result.success === false) return result

  const lifecycle = transitionWorkerLifecycle(
    running.value,
    result.value.status === "SUCCEEDED" ? "SUCCEEDED" : "FAILED",
    completedAt,
  )
  if (lifecycle.success === false) return lifecycle
  return {
    success: true,
    value: Object.freeze({
      context: context.value,
      lifecycle: lifecycle.value,
      result: result.value,
      lineage: createWorkerExecutionLineage(
        context.value,
        result.value.nextExecutionIds,
      ),
    }),
  }
}

export function cancelWorkerExecution(
  contextInput: WorkerExecutionContext,
  cancelledAt: string,
  error?: { readonly code: string; readonly message: string; readonly retryable: boolean },
): WorkerRuntimeResult<WorkerExecutionReceipt> {
  const context = validateWorkerExecutionContext(contextInput)
  if (context.success === false) return context
  const created = createWorkerLifecycle(context.value)
  if (created.success === false) return created
  const claimed = transitionWorkerLifecycle(created.value, "CLAIMED", context.value.claimedAt)
  if (claimed.success === false) return claimed
  const cancelled = transitionWorkerLifecycle(claimed.value, "CANCELLED", cancelledAt)
  if (cancelled.success === false) return cancelled
  const result = createWorkerResult({
    context: context.value,
    status: "CANCELLED",
    completedAt: cancelledAt,
    producedRecords: [],
    nextExecutionIds: [],
    ...(error !== undefined ? { error } : {}),
  })
  if (result.success === false) return result
  return {
    success: true,
    value: Object.freeze({
      context: context.value,
      lifecycle: cancelled.value,
      result: result.value,
      lineage: createWorkerExecutionLineage(context.value, []),
    }),
  }
}
