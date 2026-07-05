import { freezeTriggerRecord } from "@/lib/cron-adapter/lifecycle"
import type {
  CronAdapterResult,
  SchedulerActivationRequest,
  TriggerRecord,
} from "@/lib/cron-adapter/types"
import {
  validateSchedulerActivationRequest,
  validateTriggerRecord,
} from "@/lib/cron-adapter/validation"

function historyPrefix(existing: TriggerRecord, incoming: TriggerRecord): boolean {
  if (incoming.history.length < existing.history.length) return false
  return existing.history.every((entry, index) => {
    const candidate = incoming.history[index]
    return entry.state === candidate.state && entry.occurredAt === candidate.occurredAt
  })
}

export function mergeTriggerRecord(
  existingInput: TriggerRecord,
  incomingInput: TriggerRecord,
): CronAdapterResult<TriggerRecord> {
  const existing = validateTriggerRecord(existingInput)
  if (existing.success === false) return existing
  const incoming = validateTriggerRecord(incomingInput)
  if (incoming.success === false) return incoming
  if (JSON.stringify(existing.value.request) !== JSON.stringify(incoming.value.request)) {
    return {
      success: false,
      errors: [{
        code: "malformed_trigger",
        message: "Trigger merge cannot overwrite the immutable request.",
        field: "request",
      }],
    }
  }
  if (!historyPrefix(existing.value, incoming.value)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: "Trigger history is append-only.",
        field: "history",
      }],
    }
  }
  return { success: true, value: freezeTriggerRecord(incoming.value) }
}

export function mergeActivationRequest(
  existingInput: SchedulerActivationRequest,
  incomingInput: SchedulerActivationRequest,
): CronAdapterResult<SchedulerActivationRequest> {
  const existing = validateSchedulerActivationRequest(existingInput)
  if (existing.success === false) return existing
  const incoming = validateSchedulerActivationRequest(incomingInput)
  if (incoming.success === false) return incoming
  if (JSON.stringify(existing.value) !== JSON.stringify(incoming.value)) {
    return {
      success: false,
      errors: [{
        code: "malformed_activation",
        message: "Scheduler activation requests are immutable.",
        field: "activation",
      }],
    }
  }
  return { success: true, value: existing.value }
}

