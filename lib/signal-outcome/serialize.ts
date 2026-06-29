import { freezeSignalOutcome } from "@/lib/signal-outcome/outcome"
import type {
  SignalOutcome,
  SignalOutcomeResult,
} from "@/lib/signal-outcome/types"
import { validateSignalOutcome } from "@/lib/signal-outcome/validation"

export function serializeSignalOutcome(
  outcome: SignalOutcome,
): SignalOutcomeResult<string> {
  const validation = validateSignalOutcome(outcome)
  if (validation.success === false) return validation

  try {
    const serialized = JSON.stringify(validation.value)
    if (typeof serialized !== "string") {
      return {
        success: false,
        errors: [{
          code: "serialization_failure",
          message: "Signal Outcome could not be serialized.",
        }],
      }
    }
    return { success: true, value: serialized }
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "serialization_failure",
        message: "Signal Outcome serialization failed.",
        cause,
      }],
    }
  }
}

export function deserializeSignalOutcome(
  raw: string,
): SignalOutcomeResult<SignalOutcome> {
  if (typeof raw !== "string") {
    return {
      success: false,
      errors: [{
        code: "malformed_input",
        message: "Serialized Signal Outcome must be a string.",
      }],
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
        message: "Signal Outcome is not valid JSON.",
        cause,
      }],
    }
  }

  const validation = validateSignalOutcome(parsed)
  if (validation.success === false) return validation
  return { success: true, value: freezeSignalOutcome(validation.value) }
}

