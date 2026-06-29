import {
  OUTCOME_EVENT_VERSIONS,
  type OutcomeEventIdentity,
  type OutcomeEventVersion,
  type OutcomeRecorderResult,
} from "@/lib/outcome-recorder/types"

const VERSION_SET = new Set<string>(OUTCOME_EVENT_VERSIONS)

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function isOutcomeEventVersion(value: unknown): value is OutcomeEventVersion {
  return typeof value === "string" && VERSION_SET.has(value)
}

export function createOutcomeEventId(
  outcomeId: string,
  eventVersion: OutcomeEventVersion,
): OutcomeRecorderResult<string> {
  if (!isNonEmptyString(outcomeId)) {
    return {
      success: false,
      errors: [{
        code: "missing_outcome_reference",
        message: "Outcome Event identity requires outcomeId.",
        field: "outcomeId",
      }],
    }
  }
  if (!isOutcomeEventVersion(eventVersion)) {
    return {
      success: false,
      errors: [{
        code: "invalid_event_version",
        message: `Outcome Event version ${String(eventVersion)} is not supported.`,
        field: "eventVersion",
      }],
    }
  }

  return {
    success: true,
    value: [
      "outcome-event-v1",
      encodeURIComponent(outcomeId.trim()),
      encodeURIComponent(eventVersion),
    ].join("|"),
  }
}

export function createOutcomeEventIdentity(
  outcomeId: string,
  eventVersion: OutcomeEventVersion,
): OutcomeRecorderResult<OutcomeEventIdentity> {
  const eventId = createOutcomeEventId(outcomeId, eventVersion)
  if (eventId.success === false) return eventId

  return {
    success: true,
    value: Object.freeze({
      eventId: eventId.value,
      outcomeId: outcomeId.trim(),
      eventVersion,
    }),
  }
}
