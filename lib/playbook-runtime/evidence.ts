import {
  freezeCalibrationRecord,
  validateCalibrationRecord,
  type CalibrationRecord,
} from "@/lib/confidence-calibration"
import {
  freezeLearningRecord,
  validateLearningRecord,
  type LearningRecord,
} from "@/lib/learning-runtime"
import type {
  PlaybookEvidence,
  PlaybookResult,
} from "@/lib/playbook-runtime/types"

export function createPlaybookLearningEvidence(
  learning: LearningRecord,
): PlaybookResult<PlaybookEvidence> {
  const validation = validateLearningRecord(learning)
  if (validation.success === false || validation.value.status !== "VALIDATED") {
    return {
      success: false,
      errors: validation.success === false
        ? validation.errors.map((error) => ({
          code: "invalid_evidence_reference" as const,
          message: error.message,
          field: error.field ? `learning.${error.field}` : "learning",
          cause: error.cause,
        }))
        : [{
          code: "invalid_evidence_reference",
          message: "Playbook evidence requires a VALIDATED Learning record.",
          field: "learning.status",
        }],
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

export function createPlaybookCalibrationEvidence(
  calibration: CalibrationRecord,
): PlaybookResult<PlaybookEvidence> {
  const validation = validateCalibrationRecord(calibration)
  if (validation.success === false || validation.value.status !== "VALIDATED") {
    return {
      success: false,
      errors: validation.success === false
        ? validation.errors.map((error) => ({
          code: "invalid_evidence_reference" as const,
          message: error.message,
          field: error.field ? `calibration.${error.field}` : "calibration",
          cause: error.cause,
        }))
        : [{
          code: "invalid_evidence_reference",
          message: "Playbook evidence requires a VALIDATED Calibration record.",
          field: "calibration.status",
        }],
    }
  }
  return {
    success: true,
    value: Object.freeze({
      evidenceType: "CALIBRATION" as const,
      calibration: freezeCalibrationRecord(validation.value),
    }),
  }
}

export function validatePlaybookEvidence(
  input: unknown,
): PlaybookResult<PlaybookEvidence> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: "Playbook evidence must be Learning or Calibration.",
        field: "evidence",
      }],
    }
  }
  const evidence = input as Record<string, unknown>
  if (evidence.evidenceType === "LEARNING") {
    return createPlaybookLearningEvidence(evidence.learning as LearningRecord)
  }
  if (evidence.evidenceType === "CALIBRATION") {
    return createPlaybookCalibrationEvidence(evidence.calibration as CalibrationRecord)
  }
  return {
    success: false,
    errors: [{
      code: "invalid_evidence_reference",
      message: "Playbook evidenceType must be LEARNING or CALIBRATION.",
      field: "evidence.evidenceType",
    }],
  }
}
