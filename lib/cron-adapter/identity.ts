import {
  CRON_PROVIDERS,
  type CronAdapterResult,
  type CronProvider,
} from "@/lib/cron-adapter/types"

const PROVIDER_SET = new Set<string>(CRON_PROVIDERS)

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function canonicalCronTimestamp(value: unknown): string | null {
  if (!isNonEmptyString(value)) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

export function isCronProvider(value: unknown): value is CronProvider {
  return typeof value === "string" && PROVIDER_SET.has(value)
}

export function createTriggerId(input: {
  readonly provider: CronProvider
  readonly requestedAt: string
}): CronAdapterResult<string> {
  if (!input || typeof input !== "object" || !isCronProvider(input.provider)) {
    return {
      success: false,
      errors: [{
        code: "invalid_provider",
        message: "Trigger identity requires a canonical provider.",
        field: "provider",
      }],
    }
  }
  const requestedAt = canonicalCronTimestamp(input.requestedAt)
  if (!requestedAt) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Trigger identity requires a valid requestedAt timestamp.",
        field: "requestedAt",
      }],
    }
  }
  return {
    success: true,
    value: [
      "cron-trigger-v1",
      encodeURIComponent(input.provider),
      encodeURIComponent(requestedAt),
    ].join("|"),
  }
}

export function createActivationId(input: {
  readonly triggerId: string
  readonly executionPlanIds: readonly string[]
  readonly activationReason: string
}): CronAdapterResult<string> {
  if (!input || typeof input !== "object"
    || !isNonEmptyString(input.triggerId)
    || !Array.isArray(input.executionPlanIds)
    || input.executionPlanIds.length === 0
    || input.executionPlanIds.some((id) => !isNonEmptyString(id))
    || !isNonEmptyString(input.activationReason)) {
    return {
      success: false,
      errors: [{
        code: "malformed_activation",
        message: "Activation identity requires trigger, execution plans, and reason.",
        field: "activation",
      }],
    }
  }
  const planIds = [...input.executionPlanIds].map((id) => id.trim()).sort()
  if (new Set(planIds).size !== planIds.length) {
    return {
      success: false,
      errors: [{
        code: "malformed_activation",
        message: "Activation executionPlanIds must be unique.",
        field: "executionPlanIds",
      }],
    }
  }
  return {
    success: true,
    value: [
      "scheduler-activation-v1",
      encodeURIComponent(input.triggerId.trim()),
      ...planIds.map(encodeURIComponent),
      encodeURIComponent(input.activationReason.trim()),
    ].join("|"),
  }
}

export function validateUniqueTriggerIds(
  triggerIds: readonly string[],
): CronAdapterResult<readonly string[]> {
  if (!Array.isArray(triggerIds) || triggerIds.some((id) => !isNonEmptyString(id))) {
    return {
      success: false,
      errors: [{ code: "malformed_trigger", message: "Trigger IDs must be non-empty strings." }],
    }
  }
  if (new Set(triggerIds).size !== triggerIds.length) {
    return {
      success: false,
      errors: [{
        code: "duplicate_trigger",
        message: "Duplicate triggerId values are not allowed.",
        field: "triggerId",
      }],
    }
  }
  return { success: true, value: Object.freeze([...triggerIds]) }
}

