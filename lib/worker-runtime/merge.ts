import { freezeWorkerLifecycle } from "@/lib/worker-runtime/lifecycle"
import { freezeWorkerResult } from "@/lib/worker-runtime/result"
import type {
  WorkerLifecycle,
  WorkerResult,
  WorkerRuntimeResult,
} from "@/lib/worker-runtime/types"
import {
  validateWorkerLifecycle,
  validateWorkerResult,
} from "@/lib/worker-runtime/validation"

function historyPrefix(existing: WorkerLifecycle, incoming: WorkerLifecycle): boolean {
  if (incoming.history.length < existing.history.length) return false
  return existing.history.every((entry, index) => {
    const candidate = incoming.history[index]
    return entry.state === candidate.state && entry.occurredAt === candidate.occurredAt
  })
}

export function mergeWorkerLifecycle(
  existingInput: WorkerLifecycle,
  incomingInput: WorkerLifecycle,
): WorkerRuntimeResult<WorkerLifecycle> {
  const existing = validateWorkerLifecycle(existingInput)
  if (existing.success === false) return existing
  const incoming = validateWorkerLifecycle(incomingInput)
  if (incoming.success === false) return incoming
  const left = existing.value.identity
  const right = incoming.value.identity
  if (left.workerExecutionId !== right.workerExecutionId
    || left.executionId !== right.executionId
    || left.workerId !== right.workerId
    || left.claimedAt !== right.claimedAt) {
    return {
      success: false,
      errors: [{
        code: "invalid_worker_identity",
        message: "Worker lifecycle merge cannot overwrite identity.",
        field: "identity",
      }],
    }
  }
  if (!historyPrefix(existing.value, incoming.value)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: "Worker lifecycle history is append-only.",
        field: "history",
      }],
    }
  }
  return { success: true, value: freezeWorkerLifecycle(incoming.value) }
}

export function mergeWorkerResult(
  existingInput: WorkerResult,
  incomingInput: WorkerResult,
): WorkerRuntimeResult<WorkerResult> {
  const existing = validateWorkerResult(existingInput)
  if (existing.success === false) return existing
  const incoming = validateWorkerResult(incomingInput)
  if (incoming.success === false) return incoming
  if (JSON.stringify(existing.value) !== JSON.stringify(incoming.value)) {
    return {
      success: false,
      errors: [{
        code: "malformed_execution_result",
        message: "Completed WorkerResult is immutable and cannot be overwritten.",
        field: "result",
      }],
    }
  }
  return { success: true, value: freezeWorkerResult(existing.value) }
}

