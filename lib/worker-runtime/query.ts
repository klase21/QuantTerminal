import { canonicalSchedulerTimestamp, isSchedulerJobType } from "@/lib/scheduler-runtime"
import {
  WORKER_RESULT_STATUSES,
  type WorkerQuery,
  type WorkerRuntimeResult,
} from "@/lib/worker-runtime/types"
import { isWorkerLifecycleState } from "@/lib/worker-runtime/lifecycle"

type UnknownRecord = Record<string, unknown>
const RESULT_STATUS_SET = new Set<string>(WORKER_RESULT_STATUSES)

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function validateWorkerQuery(input: unknown): WorkerRuntimeResult<WorkerQuery> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_query", message: "Worker query must be an object." }],
    }
  }
  if ((input.workerId !== undefined && !isNonEmptyString(input.workerId))
    || (input.executionId !== undefined && !isNonEmptyString(input.executionId))
    || (input.jobType !== undefined && !isSchedulerJobType(input.jobType))
    || (input.lifecycle !== undefined && !isWorkerLifecycleState(input.lifecycle))
    || (input.executionStatus !== undefined
      && (typeof input.executionStatus !== "string"
        || !RESULT_STATUS_SET.has(input.executionStatus)))) {
    return {
      success: false,
      errors: [{
        code: "malformed_query",
        message: "Worker query contains an invalid identity, job, lifecycle, or status.",
        field: "query",
      }],
    }
  }
  const completedAfter = input.completedAfter === undefined
    ? undefined
    : canonicalSchedulerTimestamp(input.completedAfter)
  const completedBefore = input.completedBefore === undefined
    ? undefined
    : canonicalSchedulerTimestamp(input.completedBefore)
  if (completedAfter === null || completedBefore === null
    || (completedAfter !== undefined && completedBefore !== undefined
      && Date.parse(completedAfter) > Date.parse(completedBefore))) {
    return {
      success: false,
      errors: [{
        code: "malformed_query",
        message: "Worker query completion window is invalid.",
        field: "completedAfter",
      }],
    }
  }
  return {
    success: true,
    value: Object.freeze({
      ...(input.workerId !== undefined ? { workerId: (input.workerId as string).trim() } : {}),
      ...(input.executionId !== undefined
        ? { executionId: (input.executionId as string).trim() }
        : {}),
      ...(input.jobType !== undefined ? { jobType: input.jobType } : {}),
      ...(input.lifecycle !== undefined ? { lifecycle: input.lifecycle } : {}),
      ...(input.executionStatus !== undefined
        ? { executionStatus: input.executionStatus }
        : {}),
      ...(completedAfter !== undefined ? { completedAfter } : {}),
      ...(completedBefore !== undefined ? { completedBefore } : {}),
    }) as WorkerQuery,
  }
}

export function createWorkerQuery(input: WorkerQuery): WorkerRuntimeResult<WorkerQuery> {
  return validateWorkerQuery(input)
}

