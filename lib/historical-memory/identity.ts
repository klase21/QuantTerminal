import type {
  HistoricalMemoryIdentity,
  HistoricalMemoryResult,
} from "@/lib/historical-memory/types"
import type { OutcomeEventIdentity } from "@/lib/outcome-recorder"

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function createHistoricalMemoryId(
  eventId: string,
): HistoricalMemoryResult<string> {
  if (!isNonEmptyString(eventId)) {
    return {
      success: false,
      errors: [{
        code: "invalid_outcome_reference",
        message: "Historical Memory identity requires an Outcome Event ID.",
        field: "eventId",
      }],
    }
  }

  return {
    success: true,
    value: ["historical-memory-v1", encodeURIComponent(eventId.trim())].join("|"),
  }
}

export function createHistoricalMemoryIdentity(
  eventIdentity: OutcomeEventIdentity,
): HistoricalMemoryResult<HistoricalMemoryIdentity> {
  if (!eventIdentity || typeof eventIdentity !== "object") {
    return {
      success: false,
      errors: [{
        code: "invalid_outcome_reference",
        message: "Historical Memory requires an Outcome Event identity.",
        field: "outcomeEvent.identity",
      }],
    }
  }
  if (!isNonEmptyString(eventIdentity.outcomeId)) {
    return {
      success: false,
      errors: [{
        code: "invalid_outcome_reference",
        message: "Historical Memory requires the Outcome reference.",
        field: "outcomeEvent.identity.outcomeId",
      }],
    }
  }

  const memoryId = createHistoricalMemoryId(eventIdentity.eventId)
  if (memoryId.success === false) return memoryId

  return {
    success: true,
    value: Object.freeze({
      memoryId: memoryId.value,
      eventId: eventIdentity.eventId.trim(),
      outcomeId: eventIdentity.outcomeId.trim(),
    }),
  }
}
