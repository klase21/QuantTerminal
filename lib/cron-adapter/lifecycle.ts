import { canonicalCronTimestamp } from "@/lib/cron-adapter/identity"
import {
  CRON_ADAPTER_SCHEMA_VERSION,
  TRIGGER_LIFECYCLE_STATES,
  type CronAdapterResult,
  type CronMetadataArray,
  type CronMetadataObject,
  type CronMetadataValue,
  type TriggerLifecycleState,
  type TriggerRecord,
  type TriggerRequest,
} from "@/lib/cron-adapter/types"

const STATE_SET = new Set<string>(TRIGGER_LIFECYCLE_STATES)
const ALLOWED_TRANSITIONS = Object.freeze({
  RECEIVED: Object.freeze(["VALIDATED", "REJECTED"] as const),
  VALIDATED: Object.freeze(["NORMALIZED", "REJECTED"] as const),
  NORMALIZED: Object.freeze(["ACTIVATED", "REJECTED"] as const),
  ACTIVATED: Object.freeze(["ARCHIVED"] as const),
  REJECTED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<TriggerLifecycleState, readonly TriggerLifecycleState[]>>

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

export function isTriggerLifecycleState(value: unknown): value is TriggerLifecycleState {
  return typeof value === "string" && STATE_SET.has(value)
}

export function canTransitionTriggerLifecycle(
  current: TriggerLifecycleState,
  next: TriggerLifecycleState,
): boolean {
  const allowed: readonly TriggerLifecycleState[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function freezeTriggerRecord(record: TriggerRecord): TriggerRecord {
  return Object.freeze({
    ...record,
    request: Object.freeze({
      ...record.request,
      metadata: freezeMetadata(record.request.metadata) as CronMetadataObject,
    }),
    history: Object.freeze(record.history.map((entry) => Object.freeze({ ...entry }))),
  })
}

export function createTriggerRecord(request: TriggerRequest): TriggerRecord {
  return freezeTriggerRecord({
    schemaVersion: CRON_ADAPTER_SCHEMA_VERSION,
    request,
    state: "RECEIVED",
    history: [{ state: "RECEIVED", occurredAt: request.requestedAt }],
  })
}

export function transitionTriggerRecord(
  record: TriggerRecord,
  nextState: TriggerLifecycleState,
  occurredAt: string,
): CronAdapterResult<TriggerRecord> {
  if (!isTriggerLifecycleState(record?.state)
    || !isTriggerLifecycleState(nextState)
    || !canTransitionTriggerLifecycle(record.state, nextState)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle_transition",
        message: `Trigger transition ${String(record?.state)} -> ${String(nextState)} is not allowed.`,
        field: "state",
      }],
    }
  }
  const canonicalOccurredAt = canonicalCronTimestamp(occurredAt)
  const latest = record.history[record.history.length - 1]?.occurredAt
  if (!canonicalOccurredAt || !latest
    || Date.parse(canonicalOccurredAt) < Date.parse(latest)) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Trigger lifecycle timestamp must be valid and non-decreasing.",
        field: "occurredAt",
      }],
    }
  }
  return {
    success: true,
    value: freezeTriggerRecord({
      ...record,
      state: nextState,
      history: [...record.history, { state: nextState, occurredAt: canonicalOccurredAt }],
    }),
  }
}
