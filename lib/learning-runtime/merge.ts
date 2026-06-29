import { canReachLearningStatus } from "@/lib/learning-runtime/lifecycle"
import { canonicalLearningScope } from "@/lib/learning-runtime/identity"
import { freezeLearningRecord } from "@/lib/learning-runtime/learning"
import type { LearningRecord, LearningResult } from "@/lib/learning-runtime/types"
import { validateLearningRecord } from "@/lib/learning-runtime/validation"

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

function retainsClassifications(
  newer: LearningRecord,
  older: LearningRecord,
): boolean {
  const newerPatternIds = new Set(
    newer.evidence.map((item) => item.pattern.identity.patternId),
  )
  const newerSupporting = new Set(newer.conclusion.supportingPatternIds)
  const newerConflicting = new Set(newer.conclusion.conflictingPatternIds)
  return older.evidence.every((item) => newerPatternIds.has(item.pattern.identity.patternId))
    && older.conclusion.supportingPatternIds.every((id) => newerSupporting.has(id))
    && older.conclusion.conflictingPatternIds.every((id) => newerConflicting.has(id))
}

export function mergeLearningRecords(
  leftInput: LearningRecord,
  rightInput: LearningRecord,
): LearningResult<LearningRecord> {
  const left = validateLearningRecord(leftInput)
  if (left.success === false) return left
  const right = validateLearningRecord(rightInput)
  if (right.success === false) return right
  if (canonicalLearningScope(left.value.identity.scope)
    !== canonicalLearningScope(right.value.identity.scope)) {
    return {
      success: false,
      errors: [{
        code: "identity_mismatch",
        message: "Learning records with different scopes cannot be merged.",
        field: "identity.scope",
      }],
    }
  }

  if (left.value.identity.learningVersion !== right.value.identity.learningVersion) {
    const newer = left.value.identity.learningVersion > right.value.identity.learningVersion
      ? left.value
      : right.value
    const older = newer === left.value ? right.value : left.value
    if (!retainsClassifications(newer, older)) {
      return {
        success: false,
        errors: [{
          code: "version_required",
          message: "A newer Learning version must retain prior Pattern references and classifications.",
          field: "evidence",
        }],
      }
    }
    return { success: true, value: freezeLearningRecord(newer) }
  }

  if (left.value.identity.learningId !== right.value.identity.learningId
    || !sameValue(left.value.identity, right.value.identity)
    || left.value.createdAt !== right.value.createdAt
    || !sameValue(left.value.evidence, right.value.evidence)
    || !sameValue(left.value.conclusion, right.value.conclusion)) {
    return {
      success: false,
      errors: [{
        code: "immutable_conclusion_conflict",
        message: "A Learning conclusion or Pattern change requires a new version.",
        field: "identity.learningVersion",
      }],
    }
  }

  let status = left.value.status
  if (canReachLearningStatus(left.value.status, right.value.status)) {
    status = right.value.status
  } else if (!canReachLearningStatus(right.value.status, left.value.status)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: "Learning lifecycle branches cannot be merged within one version.",
        field: "status",
      }],
    }
  }
  const merged: LearningRecord = { ...left.value, status }
  const validation = validateLearningRecord(merged)
  if (validation.success === false) return validation
  return { success: true, value: freezeLearningRecord(validation.value) }
}
