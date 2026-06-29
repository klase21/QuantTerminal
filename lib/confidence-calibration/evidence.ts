import {
  freezeLearningRecord,
  validateLearningRecord,
  type LearningRecord,
} from "@/lib/learning-runtime"
import {
  freezePatternRecord,
  validatePatternRecord,
  type PatternRecord,
} from "@/lib/pattern-runtime"
import type {
  CalibrationEvidence,
  CalibrationResult,
} from "@/lib/confidence-calibration/types"

export function createLearningCalibrationEvidence(
  learning: LearningRecord,
): CalibrationResult<CalibrationEvidence> {
  const validation = validateLearningRecord(learning)
  if (validation.success === false) {
    return {
      success: false,
      errors: validation.errors.map((error) => ({
        code: "invalid_evidence_reference" as const,
        message: error.message,
        field: error.field ? `learning.${error.field}` : "learning",
        cause: error.cause,
      })),
    }
  }
  return {
    success: true,
    value: Object.freeze({
      evidenceType: "LEARNING" as const,
      learning: freezeLearningRecord(validation.value),
    }),
  }
}

export function createPatternCalibrationEvidence(
  pattern: PatternRecord,
): CalibrationResult<CalibrationEvidence> {
  const validation = validatePatternRecord(pattern)
  if (validation.success === false) {
    return {
      success: false,
      errors: validation.errors.map((error) => ({
        code: "invalid_evidence_reference" as const,
        message: error.message,
        field: error.field ? `pattern.${error.field}` : "pattern",
        cause: error.cause,
      })),
    }
  }
  return {
    success: true,
    value: Object.freeze({
      evidenceType: "PATTERN" as const,
      pattern: freezePatternRecord(validation.value),
    }),
  }
}

export function validateCalibrationEvidence(
  input: unknown,
): CalibrationResult<CalibrationEvidence> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: "Calibration evidence must be a Learning or Pattern record.",
        field: "evidence",
      }],
    }
  }
  const evidence = input as Record<string, unknown>
  if (evidence.evidenceType === "LEARNING") {
    return createLearningCalibrationEvidence(evidence.learning as LearningRecord)
  }
  if (evidence.evidenceType === "PATTERN") {
    return createPatternCalibrationEvidence(evidence.pattern as PatternRecord)
  }
  return {
    success: false,
    errors: [{
      code: "invalid_evidence_reference",
      message: "Calibration evidenceType must be LEARNING or PATTERN.",
      field: "evidence.evidenceType",
    }],
  }
}
