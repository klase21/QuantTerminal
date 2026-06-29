import { freezeLearningRecord } from "@/lib/learning-runtime"
import { freezePatternRecord } from "@/lib/pattern-runtime"
import {
  createLearningCalibrationEvidence,
  createPatternCalibrationEvidence,
} from "@/lib/confidence-calibration/evidence"
import { createCalibrationIdentity } from "@/lib/confidence-calibration/identity"
import {
  CALIBRATION_SCHEMA_VERSION,
  type CalibrationEvidence,
  type CalibrationRecord,
  type CalibrationResult,
  type CreateCalibrationInput,
} from "@/lib/confidence-calibration/types"
import { validateCalibrationRecord } from "@/lib/confidence-calibration/validation"

export function freezeCalibrationRecord(record: CalibrationRecord): CalibrationRecord {
  return Object.freeze({
    ...record,
    identity: Object.freeze({
      ...record.identity,
      scope: Object.freeze({
        ...record.identity.scope,
        dateRange: record.identity.scope.dateRange
          ? Object.freeze({ ...record.identity.scope.dateRange })
          : null,
      }),
    }),
    evidence: Object.freeze(record.evidence.map((item) => (
      item.evidenceType === "LEARNING"
        ? Object.freeze({
          evidenceType: "LEARNING" as const,
          learning: freezeLearningRecord(item.learning),
        })
        : Object.freeze({
          evidenceType: "PATTERN" as const,
          pattern: freezePatternRecord(item.pattern),
        })
    ))),
    calibration: Object.freeze({
      ...record.calibration,
      calibrationMethod: Object.freeze({ ...record.calibration.calibrationMethod }),
      applicableConditions: Object.freeze([...record.calibration.applicableConditions]),
      failureConditions: Object.freeze([...record.calibration.failureConditions]),
    }),
  })
}

export function createCalibration(
  input: CreateCalibrationInput,
): CalibrationResult<CalibrationRecord> {
  if (!input || typeof input !== "object"
    || !Array.isArray(input.learningRecords)
    || !Array.isArray(input.patternRecords)) {
    return {
      success: false,
      errors: [{
        code: "malformed_input",
        message: "Calibration requires Learning and Pattern records.",
        field: "evidence",
      }],
    }
  }
  const evidence: CalibrationEvidence[] = []
  for (const learning of input.learningRecords) {
    const result = createLearningCalibrationEvidence(learning)
    if (result.success === false) return result
    evidence.push(result.value)
  }
  for (const pattern of input.patternRecords) {
    const result = createPatternCalibrationEvidence(pattern)
    if (result.success === false) return result
    evidence.push(result.value)
  }
  evidence.sort((left, right) => {
    const leftId = left.evidenceType === "LEARNING"
      ? left.learning.identity.learningId
      : left.pattern.identity.patternId
    const rightId = right.evidenceType === "LEARNING"
      ? right.learning.identity.learningId
      : right.pattern.identity.patternId
    return `${left.evidenceType}|${leftId}`.localeCompare(`${right.evidenceType}|${rightId}`)
  })
  const identity = createCalibrationIdentity(input.calibrationVersion, input.scope, evidence)
  if (identity.success === false) return identity

  const record: CalibrationRecord = {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    identity: identity.value,
    status: "DRAFT",
    createdAt: input.createdAt,
    evidence,
    calibration: input.calibration,
  }
  const validation = validateCalibrationRecord(record, input.existingCalibrationIds)
  if (validation.success === false) return validation
  return { success: true, value: freezeCalibrationRecord(validation.value) }
}
