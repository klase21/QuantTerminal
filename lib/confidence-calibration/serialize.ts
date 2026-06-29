import { freezeCalibrationRecord } from "@/lib/confidence-calibration/calibration"
import type {
  CalibrationRecord,
  CalibrationResult,
} from "@/lib/confidence-calibration/types"
import { validateCalibrationRecord } from "@/lib/confidence-calibration/validation"

export function serializeCalibration(
  record: CalibrationRecord,
): CalibrationResult<string> {
  const validation = validateCalibrationRecord(record)
  if (validation.success === false) return validation
  try {
    return { success: true, value: JSON.stringify(validation.value) }
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "serialization_failure",
        message: "Calibration Record could not be serialized.",
        cause,
      }],
    }
  }
}

export function deserializeCalibration(
  raw: string,
  existingCalibrationIds: ReadonlySet<string> = new Set<string>(),
): CalibrationResult<CalibrationRecord> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      success: false,
      errors: [{ code: "malformed_json", message: "Serialized Calibration is empty." }],
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
        message: "Serialized Calibration is not valid JSON.",
        cause,
      }],
    }
  }
  const validation = validateCalibrationRecord(parsed, existingCalibrationIds)
  if (validation.success === false) return validation
  return { success: true, value: freezeCalibrationRecord(validation.value) }
}
