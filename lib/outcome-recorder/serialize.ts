import { freezeOutcomeEvent } from "@/lib/outcome-recorder/event"
import { validateOutcomeEvent } from "@/lib/outcome-recorder/validation"
import type {
  OutcomeEvent,
  OutcomeRecorderResult,
} from "@/lib/outcome-recorder/types"

export function serializeOutcomeEvent(
  event: OutcomeEvent,
): OutcomeRecorderResult<string> {
  const validation = validateOutcomeEvent(event)
  if (validation.success === false) return validation

  try {
    return { success: true, value: JSON.stringify(validation.value) }
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "serialization_failure",
        message: "Outcome Event could not be serialized.",
        cause,
      }],
    }
  }
}

export function deserializeOutcomeEvent(
  raw: string,
  existingEventIds: ReadonlySet<string> = new Set<string>(),
): OutcomeRecorderResult<OutcomeEvent> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      success: false,
      errors: [{ code: "malformed_json", message: "Serialized Outcome Event is empty." }],
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "malformed_json",
        message: "Serialized Outcome Event is not valid JSON.",
        cause,
      }],
    }
  }

  const validation = validateOutcomeEvent(parsed, existingEventIds)
  if (validation.success === false) return validation
  return { success: true, value: freezeOutcomeEvent(validation.value) }
}
