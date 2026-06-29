import type {
  PatternEvidence,
  PatternIdentity,
  PatternResult,
  PatternScope,
} from "@/lib/pattern-runtime/types"

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

export function canonicalPatternScope(scope: PatternScope): string {
  return JSON.stringify([
    scope.symbol,
    scope.timeframe,
    scope.direction,
    scope.evaluationWindow,
    scope.outcomeStatus,
    scope.dateRange ? [scope.dateRange.from, scope.dateRange.to] : null,
  ])
}

export function createEvidenceSetHash(
  evidence: readonly PatternEvidence[],
): PatternResult<string> {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return {
      success: false,
      errors: [{
        code: "missing_evidence_reference",
        message: "Pattern identity requires Historical Memory evidence.",
        field: "evidence",
      }],
    }
  }
  const memoryIds = evidence.map((item) => item.memoryId).sort()
  if (memoryIds.some((memoryId) => typeof memoryId !== "string" || memoryId.length === 0)) {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: "Pattern evidence requires non-empty Historical Memory IDs.",
        field: "evidence",
      }],
    }
  }
  if (new Set(memoryIds).size !== memoryIds.length) {
    return {
      success: false,
      errors: [{
        code: "duplicate_evidence_reference",
        message: "Pattern evidence contains duplicate Historical Memory IDs.",
        field: "evidence",
      }],
    }
  }
  return { success: true, value: hashText(JSON.stringify(memoryIds)) }
}

export function createPatternIdentity(
  patternVersion: number,
  scope: PatternScope,
  evidence: readonly PatternEvidence[],
): PatternResult<PatternIdentity> {
  if (!Number.isSafeInteger(patternVersion) || patternVersion < 1) {
    return {
      success: false,
      errors: [{
        code: "invalid_version",
        message: "Pattern version must be a positive safe integer.",
        field: "patternVersion",
      }],
    }
  }
  const evidenceSetHash = createEvidenceSetHash(evidence)
  if (evidenceSetHash.success === false) return evidenceSetHash
  const scopeKey = canonicalPatternScope(scope)
  const patternId = [
    "pattern-v1",
    patternVersion,
    hashText(scopeKey),
    evidenceSetHash.value,
  ].join("|")

  return {
    success: true,
    value: Object.freeze({
      patternId,
      patternVersion,
      scope,
      evidenceSetHash: evidenceSetHash.value,
    }),
  }
}
