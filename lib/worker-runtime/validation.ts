import {
  canonicalSchedulerTimestamp,
  isSchedulerJobType,
  validateExecutionPlan,
} from "@/lib/scheduler-runtime"
import { createWorkerExecutionId } from "@/lib/worker-runtime/identity"
import {
  canTransitionWorkerLifecycle,
  isWorkerLifecycleState,
} from "@/lib/worker-runtime/lifecycle"
import {
  WORKER_RESULT_STATUSES,
  WORKER_SCHEMA_VERSION,
  type ProducedRecordReference,
  type WorkerDispatchOutput,
  type WorkerExecutionContext,
  type WorkerExecutionError,
  type WorkerLifecycle,
  type WorkerLifecycleEntry,
  type WorkerResult,
  type WorkerResultStatus,
  type WorkerRuntimeResult,
} from "@/lib/worker-runtime/types"

type UnknownRecord = Record<string, unknown>
const RESULT_STATUS_SET = new Set<string>(WORKER_RESULT_STATUSES)

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function failure<T>(
  code: Parameters<typeof workerError>[0],
  message: string,
  field?: string,
  cause?: unknown,
): WorkerRuntimeResult<T> {
  return { success: false, errors: [workerError(code, message, field, cause)] }
}

function workerError(
  code: import("@/lib/worker-runtime/types").WorkerErrorCode,
  message: string,
  field?: string,
  cause?: unknown,
) {
  return Object.freeze({
    code,
    message,
    ...(field !== undefined ? { field } : {}),
    ...(cause !== undefined ? { cause } : {}),
  })
}

function validateStringArray(
  input: unknown,
  field: string,
  currentExecutionId?: string,
): WorkerRuntimeResult<readonly string[]> {
  if (!Array.isArray(input) || input.some((value) => !isNonEmptyString(value))) {
    return failure("malformed_execution_result", `${field} must contain non-empty strings.`, field)
  }
  const values = input.map((value) => value.trim())
  if (new Set(values).size !== values.length
    || currentExecutionId !== undefined && values.includes(currentExecutionId)) {
    return failure(
      "malformed_execution_result",
      `${field} must be unique and cannot contain the current executionId.`,
      field,
    )
  }
  return { success: true, value: Object.freeze(values) }
}

function validateProducedRecords(
  input: unknown,
): WorkerRuntimeResult<readonly ProducedRecordReference[]> {
  if (!Array.isArray(input)) {
    return failure(
      "malformed_execution_result",
      "producedRecords must be an array.",
      "producedRecords",
    )
  }
  const records: ProducedRecordReference[] = []
  const seen = new Set<string>()
  for (const [index, item] of input.entries()) {
    if (!isRecord(item)
      || !isNonEmptyString(item.recordId)
      || !isNonEmptyString(item.recordKind)) {
      return failure(
        "malformed_execution_result",
        "Each produced record requires recordId and recordKind.",
        `producedRecords.${index}`,
      )
    }
    const identity = `${item.recordKind}:${item.recordId}`
    if (seen.has(identity)) {
      return failure(
        "malformed_execution_result",
        "producedRecords contains a duplicate reference.",
        `producedRecords.${index}`,
      )
    }
    seen.add(identity)
    records.push(Object.freeze({
      recordId: item.recordId.trim(),
      recordKind: item.recordKind.trim(),
    }))
  }
  return { success: true, value: Object.freeze(records) }
}

export function validateExecutionError(input: unknown): WorkerRuntimeResult<WorkerExecutionError> {
  if (!isRecord(input)
    || !isNonEmptyString(input.code)
    || !isNonEmptyString(input.message)
    || typeof input.retryable !== "boolean") {
    return failure(
      "malformed_execution_result",
      "Worker error requires code, message, and retryable.",
      "error",
    )
  }
  return {
    success: true,
    value: Object.freeze({
      code: input.code.trim(),
      message: input.message.trim(),
      retryable: input.retryable,
    }),
  }
}

export function validateWorkerExecutionContext(
  input: unknown,
): WorkerRuntimeResult<WorkerExecutionContext> {
  if (!isRecord(input)
    || !isNonEmptyString(input.executionId)
    || !isNonEmptyString(input.workerId)
    || !isSchedulerJobType(input.jobType)) {
    return failure(
      "invalid_worker_identity",
      "WorkerExecutionContext requires executionId, workerId, and canonical jobType.",
      "context",
    )
  }
  const plan = validateExecutionPlan(input.executionPlan)
  if (plan.success === false) {
    return failure("malformed_dispatch", "Worker context contains an invalid ExecutionPlan.", "executionPlan", plan.errors)
  }
  if (plan.value.executionId !== input.executionId
    || plan.value.jobType !== input.jobType
    || plan.value.executionState !== "READY") {
    return failure(
      "malformed_dispatch",
      "Worker context must match a READY Scheduler ExecutionPlan.",
      "executionPlan",
    )
  }
  const claimedAt = canonicalSchedulerTimestamp(input.claimedAt)
  const startedAt = canonicalSchedulerTimestamp(input.startedAt)
  const latestPlanEvent = plan.value.executionHistory[plan.value.executionHistory.length - 1].occurredAt
  if (!claimedAt || !startedAt
    || Date.parse(claimedAt) < Date.parse(latestPlanEvent)
    || Date.parse(startedAt) < Date.parse(claimedAt)) {
    return failure(
      "invalid_timestamp",
      "Worker timestamps must follow the Scheduler readiness event and claimedAt <= startedAt.",
      "claimedAt",
    )
  }
  return {
    success: true,
    value: Object.freeze({
      executionId: input.executionId.trim(),
      workerId: input.workerId.trim(),
      jobType: input.jobType,
      executionPlan: plan.value,
      claimedAt,
      startedAt,
    }),
  }
}

export function validateWorkerExecutionContexts(
  input: unknown,
): WorkerRuntimeResult<readonly WorkerExecutionContext[]> {
  if (!Array.isArray(input)) {
    return failure("malformed_input", "Worker contexts must be an array.")
  }
  const contexts: WorkerExecutionContext[] = []
  const executionIds = new Set<string>()
  for (const context of input) {
    const validation = validateWorkerExecutionContext(context)
    if (validation.success === false) return validation
    if (executionIds.has(validation.value.executionId)) {
      return failure(
        "duplicate_execution",
        "Worker context set contains a duplicate Scheduler execution.",
        "executionId",
      )
    }
    executionIds.add(validation.value.executionId)
    contexts.push(validation.value)
  }
  return { success: true, value: Object.freeze(contexts) }
}

export function validateWorkerLifecycle(input: unknown): WorkerRuntimeResult<WorkerLifecycle> {
  if (!isRecord(input) || input.schemaVersion !== WORKER_SCHEMA_VERSION
    || !isRecord(input.identity) || !isWorkerLifecycleState(input.state)
    || !Array.isArray(input.history) || input.history.length === 0) {
    return failure("invalid_lifecycle", "Worker lifecycle is malformed.", "lifecycle")
  }
  const identity = input.identity
  if (!isNonEmptyString(identity.workerExecutionId)
    || !isNonEmptyString(identity.executionId)
    || !isNonEmptyString(identity.workerId)) {
    return failure("invalid_worker_identity", "Worker lifecycle identity is invalid.", "identity")
  }
  const claimedAt = canonicalSchedulerTimestamp(identity.claimedAt)
  if (!claimedAt) return failure("invalid_timestamp", "Worker identity claimedAt is invalid.", "identity.claimedAt")
  const expectedId = createWorkerExecutionId({
    executionId: identity.executionId,
    workerId: identity.workerId,
    claimedAt,
  })
  if (expectedId.success === false || expectedId.value !== identity.workerExecutionId) {
    return failure("invalid_worker_identity", "workerExecutionId is not deterministic.", "identity.workerExecutionId")
  }

  const history: WorkerLifecycleEntry[] = []
  for (let index = 0; index < input.history.length; index += 1) {
    const entry = input.history[index]
    if (!isRecord(entry) || !isWorkerLifecycleState(entry.state)) {
      return failure("invalid_lifecycle", "Worker history state is invalid.", `history.${index}.state`)
    }
    const occurredAt = canonicalSchedulerTimestamp(entry.occurredAt)
    if (!occurredAt || index > 0 && Date.parse(occurredAt) < Date.parse(history[index - 1].occurredAt)) {
      return failure("invalid_timestamp", "Worker history timestamps must be valid and ordered.", `history.${index}.occurredAt`)
    }
    if (index > 0 && !canTransitionWorkerLifecycle(history[index - 1].state, entry.state)) {
      return failure("invalid_lifecycle_transition", "Worker history contains a backward or invalid transition.", `history.${index}.state`)
    }
    history.push(Object.freeze({ state: entry.state, occurredAt }))
  }
  if (history[0].state !== "CREATED" || history[0].occurredAt !== claimedAt
    || history[history.length - 1].state !== input.state) {
    return failure("invalid_lifecycle", "Worker lifecycle history is inconsistent with identity or state.", "history")
  }
  return {
    success: true,
    value: Object.freeze({
      schemaVersion: WORKER_SCHEMA_VERSION,
      identity: Object.freeze({
        workerExecutionId: identity.workerExecutionId,
        executionId: identity.executionId,
        workerId: identity.workerId,
        claimedAt,
      }),
      state: input.state,
      history: Object.freeze(history),
    }),
  }
}

export function validateWorkerDispatchOutput(
  input: unknown,
  executionId: string,
): WorkerRuntimeResult<WorkerDispatchOutput> {
  if (!isRecord(input)) {
    return failure("malformed_dispatch", "Worker dispatch output must be an object.")
  }
  const producedRecords = validateProducedRecords(input.producedRecords)
  if (producedRecords.success === false) return producedRecords
  const nextExecutionIds = validateStringArray(input.nextExecutionIds, "nextExecutionIds", executionId)
  if (nextExecutionIds.success === false) return nextExecutionIds
  return {
    success: true,
    value: Object.freeze({
      producedRecords: producedRecords.value,
      nextExecutionIds: nextExecutionIds.value,
    }),
  }
}

export function validateWorkerResult(
  input: unknown,
  context?: WorkerExecutionContext,
): WorkerRuntimeResult<WorkerResult> {
  if (!isRecord(input) || input.schemaVersion !== WORKER_SCHEMA_VERSION
    || !isNonEmptyString(input.executionId) || !isNonEmptyString(input.workerId)
    || typeof input.status !== "string" || !RESULT_STATUS_SET.has(input.status)) {
    return failure("malformed_execution_result", "WorkerResult identity or status is invalid.", "result")
  }
  if (context !== undefined
    && (input.executionId !== context.executionId || input.workerId !== context.workerId)) {
    return failure("malformed_execution_result", "WorkerResult does not match its context.", "executionId")
  }
  const completedAt = canonicalSchedulerTimestamp(input.completedAt)
  if (!completedAt || context !== undefined
    && Date.parse(completedAt) < Date.parse(context.startedAt)) {
    return failure("invalid_timestamp", "WorkerResult completedAt is invalid.", "completedAt")
  }
  const producedRecords = validateProducedRecords(input.producedRecords)
  if (producedRecords.success === false) return producedRecords
  const nextExecutionIds = validateStringArray(
    input.nextExecutionIds,
    "nextExecutionIds",
    input.executionId,
  )
  if (nextExecutionIds.success === false) return nextExecutionIds

  let error: WorkerExecutionError | undefined
  if (input.error !== undefined) {
    const errorValidation = validateExecutionError(input.error)
    if (errorValidation.success === false) return errorValidation
    error = errorValidation.value
  }
  if (input.status === "FAILED" && error === undefined
    || input.status === "SUCCEEDED" && error !== undefined
    || input.status !== "SUCCEEDED"
      && (producedRecords.value.length > 0 || nextExecutionIds.value.length > 0)) {
    return failure(
      "malformed_execution_result",
      "WorkerResult status is inconsistent with error or produced references.",
      "status",
    )
  }
  return {
    success: true,
    value: Object.freeze({
      schemaVersion: WORKER_SCHEMA_VERSION,
      executionId: input.executionId.trim(),
      workerId: input.workerId.trim(),
      status: input.status as WorkerResultStatus,
      completedAt,
      producedRecords: producedRecords.value,
      nextExecutionIds: nextExecutionIds.value,
      ...(error !== undefined ? { error } : {}),
    }),
  }
}
