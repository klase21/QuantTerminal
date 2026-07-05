import { canonicalCronTimestamp, isCronProvider } from "@/lib/cron-adapter/identity"
import { isTriggerLifecycleState } from "@/lib/cron-adapter/lifecycle"
import type { CronAdapterResult, TriggerQuery } from "@/lib/cron-adapter/types"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function validateTriggerQuery(input: unknown): CronAdapterResult<TriggerQuery> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_query", message: "Trigger query must be an object." }],
    }
  }
  if ((input.triggerId !== undefined && !isNonEmptyString(input.triggerId))
    || (input.provider !== undefined && !isCronProvider(input.provider))
    || (input.lifecycle !== undefined && !isTriggerLifecycleState(input.lifecycle))) {
    return {
      success: false,
      errors: [{
        code: "malformed_query",
        message: "Trigger query identity, provider, or lifecycle is invalid.",
        field: "query",
      }],
    }
  }
  const requestedAfter = input.requestedAfter === undefined
    ? undefined
    : canonicalCronTimestamp(input.requestedAfter)
  const requestedBefore = input.requestedBefore === undefined
    ? undefined
    : canonicalCronTimestamp(input.requestedBefore)
  if (requestedAfter === null || requestedBefore === null
    || (requestedAfter !== undefined && requestedBefore !== undefined
      && Date.parse(requestedAfter) > Date.parse(requestedBefore))) {
    return {
      success: false,
      errors: [{
        code: "malformed_query",
        message: "Trigger query requestedAt range is invalid.",
        field: "requestedAfter",
      }],
    }
  }
  return {
    success: true,
    value: Object.freeze({
      ...(input.triggerId !== undefined ? { triggerId: (input.triggerId as string).trim() } : {}),
      ...(input.provider !== undefined ? { provider: input.provider } : {}),
      ...(input.lifecycle !== undefined ? { lifecycle: input.lifecycle } : {}),
      ...(requestedAfter !== undefined ? { requestedAfter } : {}),
      ...(requestedBefore !== undefined ? { requestedBefore } : {}),
    }) as TriggerQuery,
  }
}

export function createTriggerQuery(input: TriggerQuery): CronAdapterResult<TriggerQuery> {
  return validateTriggerQuery(input)
}

