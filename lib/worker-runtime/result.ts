import { canonicalSchedulerTimestamp } from "@/lib/scheduler-runtime"
import {
  WORKER_SCHEMA_VERSION,
  type ProducedRecordReference,
  type WorkerExecutionContext,
  type WorkerExecutionError,
  type WorkerResult,
  type WorkerResultStatus,
  type WorkerRuntimeResult,
} from "@/lib/worker-runtime/types"
import { validateWorkerResult } from "@/lib/worker-runtime/validation"

export function freezeWorkerResult(result: WorkerResult): WorkerResult {
  return Object.freeze({
    ...result,
    producedRecords: Object.freeze(result.producedRecords.map(
      (record) => Object.freeze({ ...record }),
    )),
    nextExecutionIds: Object.freeze([...result.nextExecutionIds]),
    ...(result.error !== undefined ? { error: Object.freeze({ ...result.error }) } : {}),
  })
}

export function createWorkerResult(input: {
  readonly context: WorkerExecutionContext
  readonly status: WorkerResultStatus
  readonly completedAt: string
  readonly producedRecords: readonly ProducedRecordReference[]
  readonly nextExecutionIds: readonly string[]
  readonly error?: WorkerExecutionError
}): WorkerRuntimeResult<WorkerResult> {
  const completedAt = canonicalSchedulerTimestamp(input.completedAt)
  if (!completedAt) {
    return {
      success: false,
      errors: [{ code: "invalid_timestamp", message: "completedAt is invalid.", field: "completedAt" }],
    }
  }
  return validateWorkerResult({
    schemaVersion: WORKER_SCHEMA_VERSION,
    executionId: input.context.executionId,
    workerId: input.context.workerId,
    status: input.status,
    completedAt,
    producedRecords: input.producedRecords,
    nextExecutionIds: input.nextExecutionIds,
    ...(input.error !== undefined ? { error: input.error } : {}),
  }, input.context)
}

