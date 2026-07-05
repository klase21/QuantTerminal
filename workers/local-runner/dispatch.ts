import {
  activateExecution,
  createExecutionPlan,
  createInitialRetryPolicy,
  scheduleExecution,
  type ExecutionPlan,
} from "@/lib/scheduler-runtime"
import {
  createWorkerExecutionContext,
  executeWorker,
  type WorkerDispatcher,
} from "@/lib/worker-runtime"
import { createLocalRunnerError, createLocalRunnerResult } from "@/workers/local-runner/result"
import type {
  LocalExecutionResult,
  LocalRunRequest,
  LocalRunnerResult,
} from "@/workers/local-runner/types"

function schedulerErrors(errors: readonly { readonly code: string; readonly message: string }[]) {
  return errors.map((error) => createLocalRunnerError(error.code, error.message))
}

export function createLocalExecutionPlans(
  request: LocalRunRequest,
  latestRunAt: string,
): LocalRunnerResult<readonly ExecutionPlan[]> {
  const retryPolicy = createInitialRetryPolicy(0, "NONE")
  if (retryPolicy.success === false) {
    return createLocalRunnerResult("EXECUTION_ERROR", schedulerErrors(retryPolicy.errors))
  }

  const plans: ExecutionPlan[] = []
  let previousExecutionId: string | null = null
  for (const jobType of request.jobTypes) {
    const plan = createExecutionPlan({
      jobType,
      parentExecutionId: null,
      scheduledAt: request.requestedAt,
      earliestRunAt: request.requestedAt,
      latestRunAt,
      retryPolicy: retryPolicy.value,
      dependencyIds: previousExecutionId === null ? [] : [previousExecutionId],
    })
    if (plan.success === false) {
      return createLocalRunnerResult("EXECUTION_ERROR", schedulerErrors(plan.errors))
    }
    plans.push(plan.value)
    previousExecutionId = plan.value.executionId
  }
  return createLocalRunnerResult("SUCCESS", [], Object.freeze(plans))
}

export async function dispatchLocalExecutions(
  request: LocalRunRequest,
  plans: readonly ExecutionPlan[],
  dispatcher: WorkerDispatcher,
  runTimestamp: string,
): Promise<LocalRunnerResult<readonly LocalExecutionResult[]>> {
  const executions: LocalExecutionResult[] = []
  const resolvedExecutionIds: string[] = []

  for (const plan of plans) {
    const scheduled = scheduleExecution(plan, request.requestedAt)
    if (scheduled.success === false) {
      return createLocalRunnerResult(
        executions.length > 0 ? "PARTIAL" : "EXECUTION_ERROR",
        schedulerErrors(scheduled.errors),
        Object.freeze(executions),
      )
    }
    const ready = activateExecution(scheduled.value, {
      evaluatedAt: runTimestamp,
      resolvedDependencyIds: resolvedExecutionIds,
    })
    if (ready.success === false) {
      return createLocalRunnerResult(
        executions.length > 0 ? "PARTIAL" : "EXECUTION_ERROR",
        schedulerErrors(ready.errors),
        Object.freeze(executions),
      )
    }
    const context = createWorkerExecutionContext({
      executionPlan: ready.value,
      workerId: `local-runner:${request.runId}`,
      claimedAt: runTimestamp,
      startedAt: runTimestamp,
    })
    if (context.success === false) {
      return createLocalRunnerResult(
        executions.length > 0 ? "PARTIAL" : "EXECUTION_ERROR",
        schedulerErrors(context.errors),
        Object.freeze(executions),
      )
    }
    const receipt = await executeWorker(context.value, dispatcher, runTimestamp)
    if (receipt.success === false) {
      return createLocalRunnerResult(
        executions.length > 0 ? "PARTIAL" : "EXECUTION_ERROR",
        schedulerErrors(receipt.errors),
        Object.freeze(executions),
      )
    }
    executions.push(Object.freeze({ plan: ready.value, receipt: receipt.value }))
    if (receipt.value.result.status !== "SUCCEEDED") {
      const notImplemented = receipt.value.result.error?.code === "NOT_IMPLEMENTED"
      const unavailable = receipt.value.result.error?.code === "SCANNER_OUTPUT_UNAVAILABLE"
        || receipt.value.result.error?.code === "TRACKING_SNAPSHOT_UNAVAILABLE"
        || receipt.value.result.error?.code === "TRACKING_RECORD_UNAVAILABLE"
        || receipt.value.result.error?.code === "PRICE_SOURCE_UNAVAILABLE"
        || receipt.value.result.error?.code === "SIGNAL_EVALUATION_OBSERVATION_UNAVAILABLE"
        || receipt.value.result.error?.code === "SIGNAL_EVALUATION_UNAVAILABLE"
        || receipt.value.result.error?.code === "OUTCOME_RECORDING_EVALUATION_UNAVAILABLE"
        || receipt.value.result.error?.code === "HISTORICAL_MEMORY_EVENT_UNAVAILABLE"
      const validationError = receipt.value.result.error?.code === "TRACKING_INPUT_INVALID"
        || receipt.value.result.error?.code === "CONTEXT_SNAPSHOT_INPUT_INVALID"
        || receipt.value.result.error?.code === "EVALUATION_WINDOW_INPUT_INVALID"
        || receipt.value.result.error?.code === "PRICE_OBSERVATION_INPUT_INVALID"
        || receipt.value.result.error?.code === "SIGNAL_EVALUATION_INPUT_INVALID"
        || receipt.value.result.error?.code === "OUTCOME_RECORDING_INPUT_INVALID"
        || receipt.value.result.error?.code === "HISTORICAL_MEMORY_INPUT_INVALID"
      const storageUnavailable = receipt.value.result.error?.code === "STORAGE_UNAVAILABLE"
      const conflict = receipt.value.result.error?.code === "CONTEXT_SNAPSHOT_CONFLICT"
      return createLocalRunnerResult(
        notImplemented
          ? "NOT_IMPLEMENTED"
          : conflict
            ? "CONFLICT"
          : unavailable
            ? "UNAVAILABLE"
            : validationError
              ? "VALIDATION_ERROR"
            : storageUnavailable
              ? "STORAGE_UNAVAILABLE"
                : "EXECUTION_ERROR",
        [createLocalRunnerError(
          receipt.value.result.error?.code ?? "worker_failed",
          receipt.value.result.error?.message ?? "Local Worker execution failed.",
        )],
        Object.freeze(executions),
      )
    }
    resolvedExecutionIds.push(plan.executionId)
  }

  return createLocalRunnerResult("SUCCESS", [], Object.freeze(executions))
}
