import type {
  CalibrationEvidence,
  CalibrationIdentity,
  CalibrationResult,
  CalibrationScope,
} from "@/lib/confidence-calibration/types"

function hashText(value: string): string {
  let left = 0x811c9dc5
  let right = 0x9e3779b9
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    left = Math.imul(left ^ code, 0x01000193)
    right = Math.imul(right ^ code, 0x85ebca6b)
  }
  return [left, right]
    .map((part) => (part >>> 0).toString(16).padStart(8, "0"))
    .join("")
}

export function canonicalCalibrationScope(scope: CalibrationScope): string {
  return JSON.stringify([
    scope.symbol,
    scope.timeframe,
    scope.direction,
    scope.dateRange ? [scope.dateRange.from, scope.dateRange.to] : null,
  ])
}

function hashEvidenceIds(
  evidence: readonly CalibrationEvidence[],
  evidenceType: CalibrationEvidence["evidenceType"],
): CalibrationResult<string> {
  const ids = evidence
    .filter((item) => item.evidenceType === evidenceType)
    .map((item) => item.evidenceType === "LEARNING"
      ? item.learning.identity.learningId
      : item.pattern.identity.patternId)
    .sort()
  if (ids.length === 0) {
    return {
      success: false,
      errors: [{
        code: "missing_evidence_reference",
        message: `Calibration identity requires ${evidenceType} evidence.`,
        field: "evidence",
      }],
    }
  }
  if (ids.some((id) => typeof id !== "string" || id.length === 0)) {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: `Calibration ${evidenceType} evidence contains an invalid identity.`,
        field: "evidence",
      }],
    }
  }
  if (new Set(ids).size !== ids.length) {
    return {
      success: false,
      errors: [{
        code: "duplicate_evidence_reference",
        message: `Calibration ${evidenceType} evidence contains duplicate identities.`,
        field: "evidence",
      }],
    }
  }
  return { success: true, value: hashText(JSON.stringify(ids)) }
}

export function createLearningSetHash(
  evidence: readonly CalibrationEvidence[],
): CalibrationResult<string> {
  return hashEvidenceIds(evidence, "LEARNING")
}

export function createCalibrationPatternSetHash(
  evidence: readonly CalibrationEvidence[],
): CalibrationResult<string> {
  return hashEvidenceIds(evidence, "PATTERN")
}

export function createCalibrationIdentity(
  calibrationVersion: number,
  scope: CalibrationScope,
  evidence: readonly CalibrationEvidence[],
): CalibrationResult<CalibrationIdentity> {
  if (!Number.isSafeInteger(calibrationVersion) || calibrationVersion < 1) {
    return {
      success: false,
      errors: [{
        code: "invalid_version",
        message: "Calibration version must be a positive safe integer.",
        field: "calibrationVersion",
      }],
    }
  }
  const learningSetHash = createLearningSetHash(evidence)
  if (learningSetHash.success === false) return learningSetHash
  const patternSetHash = createCalibrationPatternSetHash(evidence)
  if (patternSetHash.success === false) return patternSetHash
  const calibrationId = [
    "calibration-v1",
    calibrationVersion,
    hashText(canonicalCalibrationScope(scope)),
    learningSetHash.value,
    patternSetHash.value,
  ].join("|")

  return {
    success: true,
    value: Object.freeze({
      calibrationId,
      calibrationVersion,
      scope,
      learningSetHash: learningSetHash.value,
      patternSetHash: patternSetHash.value,
    }),
  }
}
