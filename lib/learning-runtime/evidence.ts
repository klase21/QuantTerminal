import {
  freezePatternRecord,
  validatePatternRecord,
  type PatternRecord,
} from "@/lib/pattern-runtime"
import type {
  LearningEvidence,
  LearningResult,
} from "@/lib/learning-runtime/types"

export function createLearningEvidence(
  pattern: PatternRecord,
): LearningResult<LearningEvidence> {
  const validation = validatePatternRecord(pattern)
  if (validation.success === false) {
    return {
      success: false,
      errors: validation.errors.map((error) => ({
        code: "invalid_pattern_reference" as const,
        message: error.message,
        field: error.field ? `pattern.${error.field}` : "pattern",
        cause: error.cause,
      })),
    }
  }
  return {
    success: true,
    value: Object.freeze({ pattern: freezePatternRecord(validation.value) }),
  }
}

export function validateLearningEvidence(
  input: unknown,
): LearningResult<LearningEvidence> {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || !("pattern" in input)) {
    return {
      success: false,
      errors: [{
        code: "invalid_pattern_reference",
        message: "Learning evidence must contain a Pattern record.",
        field: "evidence.pattern",
      }],
    }
  }
  return createLearningEvidence((input as { pattern: PatternRecord }).pattern)
}
