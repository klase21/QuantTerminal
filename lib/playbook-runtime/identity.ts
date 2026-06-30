import type {
  PlaybookEvidence,
  PlaybookIdentity,
  PlaybookResult,
  PlaybookScope,
} from "@/lib/playbook-runtime/types"

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

export function canonicalPlaybookScope(scope: PlaybookScope): string {
  return JSON.stringify([
    scope.symbol,
    scope.timeframe,
    scope.direction,
    scope.dateRange ? [scope.dateRange.from, scope.dateRange.to] : null,
  ])
}

function hashEvidenceIds(
  evidence: readonly PlaybookEvidence[],
  evidenceType: PlaybookEvidence["evidenceType"],
): PlaybookResult<string> {
  const ids = evidence
    .filter((item) => item.evidenceType === evidenceType)
    .map((item) => item.evidenceType === "LEARNING"
      ? item.learning.identity.learningId
      : item.calibration.identity.calibrationId)
    .sort()
  if (ids.length === 0) {
    return {
      success: false,
      errors: [{
        code: evidenceType === "LEARNING"
          ? "missing_learning_reference"
          : "missing_calibration_reference",
        message: `Playbook identity requires ${evidenceType} evidence.`,
        field: "evidence",
      }],
    }
  }
  if (ids.some((id) => typeof id !== "string" || id.length === 0)) {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: `Playbook ${evidenceType} evidence contains an invalid identity.`,
        field: "evidence",
      }],
    }
  }
  if (new Set(ids).size !== ids.length) {
    return {
      success: false,
      errors: [{
        code: "duplicate_evidence_reference",
        message: `Playbook ${evidenceType} evidence contains duplicate identities.`,
        field: "evidence",
      }],
    }
  }
  return { success: true, value: hashText(JSON.stringify(ids)) }
}

export function createPlaybookLearningSetHash(
  evidence: readonly PlaybookEvidence[],
): PlaybookResult<string> {
  return hashEvidenceIds(evidence, "LEARNING")
}

export function createCalibrationSetHash(
  evidence: readonly PlaybookEvidence[],
): PlaybookResult<string> {
  return hashEvidenceIds(evidence, "CALIBRATION")
}

export function createPlaybookIdentity(
  playbookVersion: number,
  scope: PlaybookScope,
  evidence: readonly PlaybookEvidence[],
): PlaybookResult<PlaybookIdentity> {
  if (!Number.isSafeInteger(playbookVersion) || playbookVersion < 1) {
    return {
      success: false,
      errors: [{
        code: "invalid_version",
        message: "Playbook version must be a positive safe integer.",
        field: "playbookVersion",
      }],
    }
  }
  const learningSetHash = createPlaybookLearningSetHash(evidence)
  if (learningSetHash.success === false) return learningSetHash
  const calibrationSetHash = createCalibrationSetHash(evidence)
  if (calibrationSetHash.success === false) return calibrationSetHash
  const playbookId = [
    "playbook-v1",
    playbookVersion,
    hashText(canonicalPlaybookScope(scope)),
    learningSetHash.value,
    calibrationSetHash.value,
  ].join("|")

  return {
    success: true,
    value: Object.freeze({
      playbookId,
      playbookVersion,
      scope,
      learningSetHash: learningSetHash.value,
      calibrationSetHash: calibrationSetHash.value,
    }),
  }
}
