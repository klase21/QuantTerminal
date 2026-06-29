import { canReachCalibrationStatus } from "@/lib/confidence-calibration/lifecycle"
import { canonicalCalibrationScope } from "@/lib/confidence-calibration/identity"
import { freezeCalibrationRecord } from "@/lib/confidence-calibration/calibration"
import type {
  CalibrationRecord,
  CalibrationResult,
} from "@/lib/confidence-calibration/types"
import { validateCalibrationRecord } from "@/lib/confidence-calibration/validation"

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    )
  }
  return value
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
}

function evidenceIds(record: CalibrationRecord): {
  learning: ReadonlySet<string>
  pattern: ReadonlySet<string>
} {
  const learning = new Set<string>()
  const pattern = new Set<string>()
  for (const item of record.evidence) {
    if (item.evidenceType === "LEARNING") learning.add(item.learning.identity.learningId)
    else pattern.add(item.pattern.identity.patternId)
  }
  return { learning, pattern }
}

function retainsEvidence(newer: CalibrationRecord, older: CalibrationRecord): boolean {
  const next = evidenceIds(newer)
  const previous = evidenceIds(older)
  return [...previous.learning].every((id) => next.learning.has(id))
    && [...previous.pattern].every((id) => next.pattern.has(id))
}

export function mergeCalibrationRecords(
  leftInput: CalibrationRecord,
  rightInput: CalibrationRecord,
): CalibrationResult<CalibrationRecord> {
  const left = validateCalibrationRecord(leftInput)
  if (left.success === false) return left
  const right = validateCalibrationRecord(rightInput)
  if (right.success === false) return right
  if (canonicalCalibrationScope(left.value.identity.scope)
    !== canonicalCalibrationScope(right.value.identity.scope)) {
    return {
      success: false,
      errors: [{
        code: "identity_mismatch",
        message: "Calibration records with different scopes cannot be merged.",
        field: "identity.scope",
      }],
    }
  }

  if (left.value.identity.calibrationVersion !== right.value.identity.calibrationVersion) {
    const newer = left.value.identity.calibrationVersion > right.value.identity.calibrationVersion
      ? left.value
      : right.value
    const older = newer === left.value ? right.value : left.value
    if (!retainsEvidence(newer, older)) {
      return {
        success: false,
        errors: [{
          code: "version_required",
          message: "A newer Calibration version must retain all prior evidence references.",
          field: "evidence",
        }],
      }
    }
    return { success: true, value: freezeCalibrationRecord(newer) }
  }

  if (left.value.identity.calibrationId !== right.value.identity.calibrationId
    || !sameValue(left.value.identity, right.value.identity)
    || left.value.createdAt !== right.value.createdAt
    || !sameValue(left.value.evidence, right.value.evidence)
    || !sameValue(left.value.calibration, right.value.calibration)) {
    return {
      success: false,
      errors: [{
        code: "immutable_calibration_conflict",
        message: "Calibration output or evidence changes require a new version.",
        field: "identity.calibrationVersion",
      }],
    }
  }

  let status = left.value.status
  if (canReachCalibrationStatus(left.value.status, right.value.status)) {
    status = right.value.status
  } else if (!canReachCalibrationStatus(right.value.status, left.value.status)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: "Calibration lifecycle branches cannot merge within one version.",
        field: "status",
      }],
    }
  }
  const merged: CalibrationRecord = { ...left.value, status }
  const validation = validateCalibrationRecord(merged)
  if (validation.success === false) return validation
  return { success: true, value: freezeCalibrationRecord(validation.value) }
}
