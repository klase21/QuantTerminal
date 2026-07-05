import { canonicalSchedulerTimestamp } from "@/lib/scheduler-runtime"
import type {
  WorkerExecutionIdentity,
  WorkerRuntimeResult,
} from "@/lib/worker-runtime/types"

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function createWorkerExecutionId(input: {
  readonly executionId: string
  readonly workerId: string
  readonly claimedAt: string
}): WorkerRuntimeResult<string> {
  if (!input || typeof input !== "object"
    || !isNonEmptyString(input.executionId)
    || !isNonEmptyString(input.workerId)) {
    return {
      success: false,
      errors: [{
        code: "invalid_worker_identity",
        message: "Worker identity requires executionId and workerId.",
        field: "identity",
      }],
    }
  }
  const claimedAt = canonicalSchedulerTimestamp(input.claimedAt)
  if (!claimedAt) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Worker claimedAt must be a valid timestamp.",
        field: "claimedAt",
      }],
    }
  }
  return {
    success: true,
    value: [
      "worker-execution-v1",
      encodeURIComponent(input.executionId.trim()),
      encodeURIComponent(input.workerId.trim()),
      encodeURIComponent(claimedAt),
    ].join("|"),
  }
}

export function createWorkerExecutionIdentity(input: {
  readonly executionId: string
  readonly workerId: string
  readonly claimedAt: string
}): WorkerRuntimeResult<WorkerExecutionIdentity> {
  const workerExecutionId = createWorkerExecutionId(input)
  if (workerExecutionId.success === false) return workerExecutionId
  const claimedAt = canonicalSchedulerTimestamp(input.claimedAt)
  if (!claimedAt) {
    return {
      success: false,
      errors: [{ code: "invalid_timestamp", message: "claimedAt is invalid.", field: "claimedAt" }],
    }
  }
  return {
    success: true,
    value: Object.freeze({
      workerExecutionId: workerExecutionId.value,
      executionId: input.executionId.trim(),
      workerId: input.workerId.trim(),
      claimedAt,
    }),
  }
}

export function validateUniqueWorkerExecutions(
  executionIds: readonly string[],
): WorkerRuntimeResult<readonly string[]> {
  if (!Array.isArray(executionIds)
    || executionIds.some((executionId) => !isNonEmptyString(executionId))) {
    return {
      success: false,
      errors: [{
        code: "invalid_worker_identity",
        message: "Worker execution IDs must be non-empty strings.",
        field: "executionIds",
      }],
    }
  }
  if (new Set(executionIds).size !== executionIds.length) {
    return {
      success: false,
      errors: [{
        code: "duplicate_execution",
        message: "The same Scheduler execution cannot be claimed twice in one Worker set.",
        field: "executionIds",
      }],
    }
  }
  return { success: true, value: Object.freeze([...executionIds]) }
}

