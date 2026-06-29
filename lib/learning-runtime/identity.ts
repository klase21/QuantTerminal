import type {
  LearningEvidence,
  LearningIdentity,
  LearningResult,
  LearningScope,
} from "@/lib/learning-runtime/types"

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

export function canonicalLearningScope(scope: LearningScope): string {
  return JSON.stringify([
    scope.symbol,
    scope.timeframe,
    scope.direction,
    scope.dateRange ? [scope.dateRange.from, scope.dateRange.to] : null,
  ])
}

export function createPatternSetHash(
  evidence: readonly LearningEvidence[],
): LearningResult<string> {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return {
      success: false,
      errors: [{
        code: "missing_pattern_reference",
        message: "Learning identity requires Pattern evidence.",
        field: "evidence",
      }],
    }
  }
  const patternIds = evidence.map((item) => item.pattern?.identity?.patternId).sort()
  if (patternIds.some((patternId) => typeof patternId !== "string" || patternId.length === 0)) {
    return {
      success: false,
      errors: [{
        code: "invalid_pattern_reference",
        message: "Learning evidence requires valid Pattern IDs.",
        field: "evidence",
      }],
    }
  }
  if (new Set(patternIds).size !== patternIds.length) {
    return {
      success: false,
      errors: [{
        code: "duplicate_pattern_reference",
        message: "Learning evidence contains duplicate Pattern IDs.",
        field: "evidence",
      }],
    }
  }
  return { success: true, value: hashText(JSON.stringify(patternIds)) }
}

export function createLearningIdentity(
  learningVersion: number,
  scope: LearningScope,
  evidence: readonly LearningEvidence[],
): LearningResult<LearningIdentity> {
  if (!Number.isSafeInteger(learningVersion) || learningVersion < 1) {
    return {
      success: false,
      errors: [{
        code: "invalid_version",
        message: "Learning version must be a positive safe integer.",
        field: "learningVersion",
      }],
    }
  }
  const patternSetHash = createPatternSetHash(evidence)
  if (patternSetHash.success === false) return patternSetHash
  const learningId = [
    "learning-v1",
    learningVersion,
    hashText(canonicalLearningScope(scope)),
    patternSetHash.value,
  ].join("|")

  return {
    success: true,
    value: Object.freeze({
      learningId,
      learningVersion,
      scope,
      patternSetHash: patternSetHash.value,
    }),
  }
}
