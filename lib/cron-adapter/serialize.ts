import { freezeTriggerRecord } from "@/lib/cron-adapter/lifecycle"
import type {
  CronAdapterResult,
  SchedulerActivationRequest,
  TriggerRecord,
  TriggerRequest,
} from "@/lib/cron-adapter/types"
import {
  validateSchedulerActivationRequest,
  validateTriggerRecord,
  validateTriggerRequest,
} from "@/lib/cron-adapter/validation"

function serializeValidated<T>(
  value: T,
  validate: (input: unknown) => CronAdapterResult<T>,
): CronAdapterResult<string> {
  const validation = validate(value)
  if (validation.success === false) return validation
  try {
    const raw = JSON.stringify(validation.value)
    if (typeof raw !== "string") {
      return {
        success: false,
        errors: [{ code: "serialization_failure", message: "Cron Adapter value could not be serialized." }],
      }
    }
    return { success: true, value: raw }
  } catch (cause) {
    return {
      success: false,
      errors: [{ code: "serialization_failure", message: "Cron Adapter serialization failed.", cause }],
    }
  }
}

function parse(raw: string): CronAdapterResult<unknown> {
  if (typeof raw !== "string") {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Serialized Cron Adapter value must be a string." }],
    }
  }
  try {
    return { success: true, value: JSON.parse(raw) }
  } catch (cause) {
    return {
      success: false,
      errors: [{ code: "malformed_json", message: "Cron Adapter value is not valid JSON.", cause }],
    }
  }
}

export function serializeTriggerRequest(request: TriggerRequest): CronAdapterResult<string> {
  return serializeValidated(request, validateTriggerRequest)
}

export function deserializeTriggerRequest(raw: string): CronAdapterResult<TriggerRequest> {
  const parsed = parse(raw)
  if (parsed.success === false) return parsed
  return validateTriggerRequest(parsed.value)
}

export function serializeSchedulerActivationRequest(
  request: SchedulerActivationRequest,
): CronAdapterResult<string> {
  return serializeValidated(request, validateSchedulerActivationRequest)
}

export function deserializeSchedulerActivationRequest(
  raw: string,
): CronAdapterResult<SchedulerActivationRequest> {
  const parsed = parse(raw)
  if (parsed.success === false) return parsed
  return validateSchedulerActivationRequest(parsed.value)
}

export function serializeTriggerRecord(record: TriggerRecord): CronAdapterResult<string> {
  return serializeValidated(record, validateTriggerRecord)
}

export function deserializeTriggerRecord(raw: string): CronAdapterResult<TriggerRecord> {
  const parsed = parse(raw)
  if (parsed.success === false) return parsed
  const validation = validateTriggerRecord(parsed.value)
  return validation.success
    ? { success: true, value: freezeTriggerRecord(validation.value) }
    : validation
}
