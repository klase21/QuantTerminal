import { canReachPatternStatus } from "@/lib/pattern-runtime/lifecycle"
import { canonicalPatternScope } from "@/lib/pattern-runtime/identity"
import { freezePatternRecord } from "@/lib/pattern-runtime/pattern"
import type {
  PatternRecord,
  PatternResult,
} from "@/lib/pattern-runtime/types"
import { validatePatternRecord } from "@/lib/pattern-runtime/validation"

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

function isEvidenceSuperset(
  candidate: PatternRecord,
  previous: PatternRecord,
): boolean {
  const candidateIds = new Set(candidate.evidence.map((item) => item.memoryId))
  return previous.evidence.every((item) => candidateIds.has(item.memoryId))
}

export function mergePatternRecords(
  leftInput: PatternRecord,
  rightInput: PatternRecord,
): PatternResult<PatternRecord> {
  const left = validatePatternRecord(leftInput)
  if (left.success === false) return left
  const right = validatePatternRecord(rightInput)
  if (right.success === false) return right
  if (canonicalPatternScope(left.value.identity.scope)
    !== canonicalPatternScope(right.value.identity.scope)) {
    return {
      success: false,
      errors: [{
        code: "identity_mismatch",
        message: "Patterns with different scopes cannot be merged.",
        field: "identity.scope",
      }],
    }
  }

  if (left.value.identity.patternVersion !== right.value.identity.patternVersion) {
    const newer = left.value.identity.patternVersion > right.value.identity.patternVersion
      ? left.value
      : right.value
    const older = newer === left.value ? right.value : left.value
    if (!isEvidenceSuperset(newer, older)) {
      return {
        success: false,
        errors: [{
          code: "version_required",
          message: "A newer Pattern version must retain all prior Historical Memory evidence.",
          field: "evidence",
        }],
      }
    }
    return { success: true, value: freezePatternRecord(newer) }
  }

  if (left.value.identity.patternId !== right.value.identity.patternId
    || !sameValue(left.value.identity, right.value.identity)
    || left.value.createdAt !== right.value.createdAt
    || left.value.interpretation !== right.value.interpretation
    || !sameValue(left.value.evidence, right.value.evidence)
    || !sameValue(left.value.metricSummary, right.value.metricSummary)) {
    return {
      success: false,
      errors: [{
        code: "immutable_fact_conflict",
        message: "A Pattern interpretation or evidence change requires a new version.",
        field: "identity.patternVersion",
      }],
    }
  }

  let status = left.value.status
  if (canReachPatternStatus(left.value.status, right.value.status)) {
    status = right.value.status
  } else if (!canReachPatternStatus(right.value.status, left.value.status)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: "Pattern lifecycle branches cannot be merged within one version.",
        field: "status",
      }],
    }
  }
  const merged: PatternRecord = { ...left.value, status }
  const validation = validatePatternRecord(merged)
  if (validation.success === false) return validation
  return { success: true, value: freezePatternRecord(validation.value) }
}
