import { createTriggerId, canonicalCronTimestamp } from "@/lib/cron-adapter/identity"
import { createTriggerRecord } from "@/lib/cron-adapter/lifecycle"
import {
  CRON_ADAPTER_SCHEMA_VERSION,
  type CreateTriggerRequestInput,
  type CronAdapterResult,
  type TriggerRecord,
  type TriggerRequest,
} from "@/lib/cron-adapter/types"
import { validateTriggerRequest } from "@/lib/cron-adapter/validation"

export function createTriggerRequest(
  input: CreateTriggerRequestInput,
): CronAdapterResult<TriggerRequest> {
  const triggerId = createTriggerId(input)
  if (triggerId.success === false) return triggerId
  const requestedAt = canonicalCronTimestamp(input.requestedAt)
  if (!requestedAt) {
    return {
      success: false,
      errors: [{ code: "invalid_timestamp", message: "requestedAt is invalid.", field: "requestedAt" }],
    }
  }
  return validateTriggerRequest({
    schemaVersion: CRON_ADAPTER_SCHEMA_VERSION,
    triggerId: triggerId.value,
    provider: input.provider,
    requestedAt,
    triggerType: input.triggerType,
    executionScope: input.executionScope,
    metadata: input.metadata,
  })
}

export function receiveTrigger(
  input: CreateTriggerRequestInput,
): CronAdapterResult<TriggerRecord> {
  const request = createTriggerRequest(input)
  if (request.success === false) return request
  return { success: true, value: createTriggerRecord(request.value) }
}

