import { createActivationId } from "@/lib/cron-adapter/identity"
import { transitionTriggerRecord } from "@/lib/cron-adapter/lifecycle"
import {
  CRON_ADAPTER_SCHEMA_VERSION,
  type CronAdapterResult,
  type SchedulerActivationRequest,
  type TriggerRecord,
  type TriggerTranslationResult,
} from "@/lib/cron-adapter/types"
import {
  validateSchedulerActivationRequest,
  validateTriggerRecord,
} from "@/lib/cron-adapter/validation"

export interface CronTriggerAdapter {
  normalize(
    trigger: TriggerRecord,
    validatedAt: string,
    normalizedAt: string,
  ): CronAdapterResult<TriggerRecord>
  activate(
    trigger: TriggerRecord,
    executionPlanIds: readonly string[],
    activationReason: string,
    activatedAt: string,
  ): CronAdapterResult<TriggerTranslationResult>
  reject(trigger: TriggerRecord, rejectedAt: string): CronAdapterResult<TriggerRecord>
  archive(trigger: TriggerRecord, archivedAt: string): CronAdapterResult<TriggerRecord>
}

export function createSchedulerActivationRequest(input: {
  readonly trigger: TriggerRecord
  readonly executionPlanIds: readonly string[]
  readonly activationReason: string
}): CronAdapterResult<SchedulerActivationRequest> {
  const trigger = validateTriggerRecord(input.trigger)
  if (trigger.success === false) return trigger
  if (trigger.value.state !== "NORMALIZED") {
    return {
      success: false,
      errors: [{
        code: "malformed_activation",
        message: "Only a NORMALIZED trigger may create a Scheduler activation request.",
        field: "trigger.state",
      }],
    }
  }
  const activationId = createActivationId({
    triggerId: trigger.value.request.triggerId,
    executionPlanIds: input.executionPlanIds,
    activationReason: input.activationReason,
  })
  if (activationId.success === false) return activationId
  return validateSchedulerActivationRequest({
    schemaVersion: CRON_ADAPTER_SCHEMA_VERSION,
    activationId: activationId.value,
    triggerId: trigger.value.request.triggerId,
    executionPlanIds: input.executionPlanIds,
    activationReason: input.activationReason,
  })
}

export function normalizeTriggerRecord(
  input: TriggerRecord,
  validatedAt: string,
  normalizedAt: string,
): CronAdapterResult<TriggerRecord> {
  const trigger = validateTriggerRecord(input)
  if (trigger.success === false) return trigger
  const validated = transitionTriggerRecord(trigger.value, "VALIDATED", validatedAt)
  if (validated.success === false) return validated
  return transitionTriggerRecord(validated.value, "NORMALIZED", normalizedAt)
}

export function translateTriggerToActivation(
  triggerInput: TriggerRecord,
  executionPlanIds: readonly string[],
  activationReason: string,
  activatedAt: string,
): CronAdapterResult<TriggerTranslationResult> {
  const activation = createSchedulerActivationRequest({
    trigger: triggerInput,
    executionPlanIds,
    activationReason,
  })
  if (activation.success === false) return activation
  const activated = transitionTriggerRecord(triggerInput, "ACTIVATED", activatedAt)
  if (activated.success === false) return activated
  return {
    success: true,
    value: Object.freeze({
      trigger: activated.value,
      activation: activation.value,
    }),
  }
}

export function createCronTriggerAdapter(): CronTriggerAdapter {
  return Object.freeze({
    normalize: normalizeTriggerRecord,
    activate: translateTriggerToActivation,
    reject(trigger, rejectedAt) {
      const validation = validateTriggerRecord(trigger)
      if (validation.success === false) return validation
      return transitionTriggerRecord(validation.value, "REJECTED", rejectedAt)
    },
    archive(trigger, archivedAt) {
      const validation = validateTriggerRecord(trigger)
      if (validation.success === false) return validation
      return transitionTriggerRecord(validation.value, "ARCHIVED", archivedAt)
    },
  })
}

