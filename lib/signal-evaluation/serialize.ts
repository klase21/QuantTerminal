import { freezeSignalEvaluationResult } from "@/lib/signal-evaluation/metrics"
import type {
  SignalEvaluationOperationResult,
  SignalEvaluationResult,
} from "@/lib/signal-evaluation/types"
import { validateSignalEvaluationResult } from "@/lib/signal-evaluation/validation"

export function serializeSignalEvaluationResult(
  evaluation: SignalEvaluationResult,
): SignalEvaluationOperationResult<string> {
  const validation = validateSignalEvaluationResult(evaluation)
  if (validation.success === false) return validation

  try {
    const serialized = JSON.stringify(validation.value)
    if (typeof serialized !== "string") {
      return {
        success: false,
        errors: [{
          code: "serialization_failure",
          message: "Signal evaluation result could not be serialized.",
        }],
      }
    }
    return { success: true, value: serialized }
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "serialization_failure",
        message: "Signal evaluation result serialization failed.",
        cause,
      }],
    }
  }
}

export function deserializeSignalEvaluationResult(
  raw: string,
): SignalEvaluationOperationResult<SignalEvaluationResult> {
  if (typeof raw !== "string") {
    return {
      success: false,
      errors: [{
        code: "malformed_input",
        message: "Serialized signal evaluation result must be a string.",
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
        message: "Signal evaluation result is not valid JSON.",
        cause,
      }],
    }
  }

  const validation = validateSignalEvaluationResult(parsed)
  if (validation.success === false) return validation
  return { success: true, value: freezeSignalEvaluationResult(validation.value) }
}

