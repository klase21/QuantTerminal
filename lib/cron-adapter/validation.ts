import {
  canonicalCronTimestamp,
  createActivationId,
  createTriggerId,
  isCronProvider,
} from "@/lib/cron-adapter/identity"
import {
  canTransitionTriggerLifecycle,
  isTriggerLifecycleState,
} from "@/lib/cron-adapter/lifecycle"
import {
  CRON_ADAPTER_SCHEMA_VERSION,
  CRON_TRIGGER_TYPES,
  type CronAdapterResult,
  type CronMetadataArray,
  type CronMetadataObject,
  type CronMetadataValue,
  type SchedulerActivationRequest,
  type TriggerLifecycleEntry,
  type TriggerRecord,
  type TriggerRequest,
} from "@/lib/cron-adapter/types"

type UnknownRecord = Record<string, unknown>
const TRIGGER_TYPE_SET = new Set<string>(CRON_TRIGGER_TYPES)

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function failure<T>(
  code: import("@/lib/cron-adapter/types").CronAdapterErrorCode,
  message: string,
  field?: string,
  cause?: unknown,
): CronAdapterResult<T> {
  return {
    success: false,
    errors: [Object.freeze({
      code,
      message,
      ...(field !== undefined ? { field } : {}),
      ...(cause !== undefined ? { cause } : {}),
    })],
  }
}

function isMetadataValue(
  value: unknown,
  seen: Set<object> = new Set<object>(),
): value is CronMetadataValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value !== "object" || seen.has(value)) return false
  seen.add(value)
  const valid = Array.isArray(value)
    ? value.every((entry) => isMetadataValue(entry, seen))
    : isRecord(value) && Object.values(value).every((entry) => isMetadataValue(entry, seen))
  seen.delete(value)
  return valid
}

function freezeMetadata(value: CronMetadataValue): CronMetadataValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeMetadata)) as CronMetadataArray
  }
  if (value !== null && typeof value === "object") {
    const output: Record<string, CronMetadataValue> = {}
    for (const [key, entry] of Object.entries(value)) output[key] = freezeMetadata(entry)
    return Object.freeze(output) as CronMetadataObject
  }
  return value
}

export function validateTriggerRequest(input: unknown): CronAdapterResult<TriggerRequest> {
  if (!isRecord(input)) {
    return failure("malformed_trigger", "TriggerRequest must be a plain object.")
  }
  if (input.schemaVersion !== CRON_ADAPTER_SCHEMA_VERSION) {
    return failure(
      "unsupported_schema_version",
      `Only Cron Adapter schema version ${CRON_ADAPTER_SCHEMA_VERSION} is supported.`,
      "schemaVersion",
    )
  }
  if (!isCronProvider(input.provider)) {
    return failure("invalid_provider", "Trigger provider is not supported.", "provider")
  }
  const requestedAt = canonicalCronTimestamp(input.requestedAt)
  if (!requestedAt) {
    return failure("invalid_timestamp", "Trigger requestedAt is invalid.", "requestedAt")
  }
  if (!isNonEmptyString(input.triggerId)
    || typeof input.triggerType !== "string"
    || !TRIGGER_TYPE_SET.has(input.triggerType)
    || !isNonEmptyString(input.executionScope)
    || !isRecord(input.metadata)
    || !isMetadataValue(input.metadata)) {
    return failure(
      "malformed_trigger",
      "Trigger identity, type, executionScope, or metadata is malformed.",
      "trigger",
    )
  }
  const expectedId = createTriggerId({ provider: input.provider, requestedAt })
  if (expectedId.success === false || expectedId.value !== input.triggerId) {
    return failure(
      "malformed_trigger",
      "triggerId does not match provider and requestedAt.",
      "triggerId",
    )
  }
  return {
    success: true,
    value: Object.freeze({
      schemaVersion: CRON_ADAPTER_SCHEMA_VERSION,
      triggerId: input.triggerId,
      provider: input.provider,
      requestedAt,
      triggerType: input.triggerType as TriggerRequest["triggerType"],
      executionScope: input.executionScope.trim(),
      metadata: freezeMetadata(input.metadata) as CronMetadataObject,
    }),
  }
}

export function validateTriggerRequests(
  input: unknown,
): CronAdapterResult<readonly TriggerRequest[]> {
  if (!Array.isArray(input)) {
    return failure("malformed_input", "Trigger requests must be an array.")
  }
  const triggers: TriggerRequest[] = []
  const ids = new Set<string>()
  for (const trigger of input) {
    const validation = validateTriggerRequest(trigger)
    if (validation.success === false) return validation
    if (ids.has(validation.value.triggerId)) {
      return failure(
        "duplicate_trigger",
        "Trigger request set contains a duplicate triggerId.",
        "triggerId",
      )
    }
    ids.add(validation.value.triggerId)
    triggers.push(validation.value)
  }
  return { success: true, value: Object.freeze(triggers) }
}

export function validateSchedulerActivationRequest(
  input: unknown,
): CronAdapterResult<SchedulerActivationRequest> {
  if (!isRecord(input) || input.schemaVersion !== CRON_ADAPTER_SCHEMA_VERSION
    || !isNonEmptyString(input.activationId)
    || !isNonEmptyString(input.triggerId)
    || !Array.isArray(input.executionPlanIds)
    || input.executionPlanIds.length === 0
    || input.executionPlanIds.some((id) => !isNonEmptyString(id))
    || !isNonEmptyString(input.activationReason)) {
    return failure("malformed_activation", "SchedulerActivationRequest is malformed.", "activation")
  }
  const executionPlanIds = input.executionPlanIds.map((id) => id.trim()).sort()
  if (new Set(executionPlanIds).size !== executionPlanIds.length) {
    return failure(
      "malformed_activation",
      "SchedulerActivationRequest contains duplicate executionPlanIds.",
      "executionPlanIds",
    )
  }
  const expectedId = createActivationId({
    triggerId: input.triggerId,
    executionPlanIds,
    activationReason: input.activationReason,
  })
  if (expectedId.success === false || expectedId.value !== input.activationId) {
    return failure(
      "malformed_activation",
      "activationId does not match trigger, plans, and reason.",
      "activationId",
    )
  }
  return {
    success: true,
    value: Object.freeze({
      schemaVersion: CRON_ADAPTER_SCHEMA_VERSION,
      activationId: input.activationId,
      triggerId: input.triggerId.trim(),
      executionPlanIds: Object.freeze(executionPlanIds),
      activationReason: input.activationReason.trim(),
    }),
  }
}

export function validateTriggerRecord(input: unknown): CronAdapterResult<TriggerRecord> {
  if (!isRecord(input) || input.schemaVersion !== CRON_ADAPTER_SCHEMA_VERSION
    || !isTriggerLifecycleState(input.state)
    || !Array.isArray(input.history) || input.history.length === 0) {
    return failure("invalid_lifecycle", "TriggerRecord is malformed.", "record")
  }
  const request = validateTriggerRequest(input.request)
  if (request.success === false) return request
  const history: TriggerLifecycleEntry[] = []
  for (let index = 0; index < input.history.length; index += 1) {
    const entry = input.history[index]
    if (!isRecord(entry) || !isTriggerLifecycleState(entry.state)) {
      return failure("invalid_lifecycle", "Trigger history state is invalid.", `history.${index}.state`)
    }
    const occurredAt = canonicalCronTimestamp(entry.occurredAt)
    if (!occurredAt
      || index > 0 && Date.parse(occurredAt) < Date.parse(history[index - 1].occurredAt)) {
      return failure("invalid_timestamp", "Trigger history timestamps are invalid.", `history.${index}.occurredAt`)
    }
    if (index > 0 && !canTransitionTriggerLifecycle(history[index - 1].state, entry.state)) {
      return failure(
        "invalid_lifecycle_transition",
        "Trigger history contains an invalid transition.",
        `history.${index}.state`,
      )
    }
    history.push(Object.freeze({ state: entry.state, occurredAt }))
  }
  if (history[0].state !== "RECEIVED"
    || history[0].occurredAt !== request.value.requestedAt
    || history[history.length - 1].state !== input.state) {
    return failure("invalid_lifecycle", "Trigger history is inconsistent with request or state.", "history")
  }
  return {
    success: true,
    value: Object.freeze({
      schemaVersion: CRON_ADAPTER_SCHEMA_VERSION,
      request: request.value,
      state: input.state,
      history: Object.freeze(history),
    }),
  }
}

