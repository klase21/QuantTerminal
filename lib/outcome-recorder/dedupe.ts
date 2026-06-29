import type {
  OutcomeEvent,
  OutcomeEventIdentity,
  OutcomeRecorderResult,
} from "@/lib/outcome-recorder/types"

export function isDuplicateOutcomeEventIdentity(
  identity: OutcomeEventIdentity,
  existingEventIds: ReadonlySet<string>,
): boolean {
  return existingEventIds.has(identity.eventId)
}

export function rejectDuplicateOutcomeEventIdentity(
  identity: OutcomeEventIdentity,
  existingEventIds: ReadonlySet<string>,
): OutcomeRecorderResult<OutcomeEventIdentity> {
  if (isDuplicateOutcomeEventIdentity(identity, existingEventIds)) {
    return {
      success: false,
      errors: [{
        code: "duplicate_event",
        message: `Outcome Event ${identity.eventId} is already recorded.`,
        field: "identity.eventId",
      }],
    }
  }
  return { success: true, value: identity }
}

export function validateUniqueOutcomeEvents(
  events: readonly OutcomeEvent[],
): OutcomeRecorderResult<readonly OutcomeEvent[]> {
  const seen = new Set<string>()
  for (let index = 0; index < events.length; index += 1) {
    const eventId = events[index]?.identity?.eventId
    if (typeof eventId !== "string" || eventId.trim().length === 0) {
      return {
        success: false,
        errors: [{
          code: "malformed_input",
          message: "Outcome Event collection contains an invalid identity.",
          field: `events[${index}].identity.eventId`,
        }],
      }
    }
    if (seen.has(eventId)) {
      return {
        success: false,
        errors: [{
          code: "duplicate_event",
          message: `Duplicate Outcome Event identity ${eventId}.`,
          field: `events[${index}].identity.eventId`,
        }],
      }
    }
    seen.add(eventId)
  }
  return { success: true, value: events }
}
