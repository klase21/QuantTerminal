import { freezeCalibrationRecord } from "@/lib/confidence-calibration/calibration"
import {
  CALIBRATION_STATUSES,
  type CalibrationRecord,
  type CalibrationResult,
  type CalibrationStatus,
} from "@/lib/confidence-calibration/types"
import { validateCalibrationRecord } from "@/lib/confidence-calibration/validation"

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze(["CANDIDATE"] as const),
  CANDIDATE: Object.freeze(["VALIDATED", "REJECTED"] as const),
  VALIDATED: Object.freeze(["SUPERSEDED", "ARCHIVED"] as const),
  REJECTED: Object.freeze(["SUPERSEDED", "ARCHIVED"] as const),
  SUPERSEDED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<CalibrationStatus, readonly CalibrationStatus[]>>

const STATUS_SET = new Set<string>(CALIBRATION_STATUSES)

export function isCalibrationStatus(value: unknown): value is CalibrationStatus {
  return typeof value === "string" && STATUS_SET.has(value)
}

export function canTransitionCalibration(
  current: CalibrationStatus,
  next: CalibrationStatus,
): boolean {
  const allowed: readonly CalibrationStatus[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function canReachCalibrationStatus(
  current: CalibrationStatus,
  target: CalibrationStatus,
): boolean {
  if (current === target) return true
  return ALLOWED_TRANSITIONS[current].some((next) => (
    canReachCalibrationStatus(next, target)
  ))
}

export function transitionCalibration(
  record: CalibrationRecord,
  nextStatus: CalibrationStatus,
): CalibrationResult<CalibrationRecord> {
  const current = validateCalibrationRecord(record)
  if (current.success === false) return current
  if (!isCalibrationStatus(nextStatus)
    || !canTransitionCalibration(current.value.status, nextStatus)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: `Calibration transition ${current.value.status} -> ${String(nextStatus)} is not allowed.`,
        field: "status",
      }],
    }
  }
  const candidate: CalibrationRecord = { ...current.value, status: nextStatus }
  const validation = validateCalibrationRecord(candidate)
  if (validation.success === false) return validation
  return { success: true, value: freezeCalibrationRecord(validation.value) }
}
