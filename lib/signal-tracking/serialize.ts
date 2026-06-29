import { freezeTrackingLifecycle } from "@/lib/signal-tracking/lifecycle"
import type {
  TrackingLifecycle,
  TrackingResult,
} from "@/lib/signal-tracking/types"
import { validateTrackingLifecycle } from "@/lib/signal-tracking/validation"

export function serializeTrackingLifecycle(
  lifecycle: TrackingLifecycle,
): TrackingResult<string> {
  const validation = validateTrackingLifecycle(lifecycle)
  if (validation.success === false) return validation

  try {
    const serialized = JSON.stringify(validation.value)
    if (typeof serialized !== "string") {
      return {
        success: false,
        errors: [{
          code: "serialization_failure",
          message: "Tracking lifecycle could not be serialized.",
        }],
      }
    }
    return { success: true, value: serialized }
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "serialization_failure",
        message: "Tracking lifecycle serialization failed.",
        cause,
      }],
    }
  }
}

export function deserializeTrackingLifecycle(
  raw: string,
): TrackingResult<TrackingLifecycle> {
  if (typeof raw !== "string") {
    return {
      success: false,
      errors: [{
        code: "malformed_input",
        message: "Serialized tracking lifecycle must be a string.",
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
        message: "Tracking lifecycle is not valid JSON.",
        cause,
      }],
    }
  }

  const validation = validateTrackingLifecycle(parsed)
  if (validation.success === false) return validation
  return { success: true, value: freezeTrackingLifecycle(validation.value) }
}

