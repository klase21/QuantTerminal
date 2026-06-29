import { freezePatternRecord } from "@/lib/pattern-runtime"
import { createLearningEvidence } from "@/lib/learning-runtime/evidence"
import { createLearningIdentity } from "@/lib/learning-runtime/identity"
import {
  LEARNING_SCHEMA_VERSION,
  type CreateLearningInput,
  type LearningEvidence,
  type LearningRecord,
  type LearningResult,
} from "@/lib/learning-runtime/types"
import { validateLearningRecord } from "@/lib/learning-runtime/validation"

export function freezeLearningRecord(record: LearningRecord): LearningRecord {
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
    evidence: Object.freeze(record.evidence.map((item) => Object.freeze({
      pattern: freezePatternRecord(item.pattern),
    }))),
    conclusion: Object.freeze({
      ...record.conclusion,
      applicableConditions: Object.freeze([...record.conclusion.applicableConditions]),
      failureConditions: Object.freeze([...record.conclusion.failureConditions]),
      supportingPatternIds: Object.freeze([...record.conclusion.supportingPatternIds]),
      conflictingPatternIds: Object.freeze([...record.conclusion.conflictingPatternIds]),
      riskNotes: Object.freeze([...record.conclusion.riskNotes]),
    }),
  })
}

export function createLearning(
  input: CreateLearningInput,
): LearningResult<LearningRecord> {
  if (!input || typeof input !== "object" || !Array.isArray(input.patterns)) {
    return {
      success: false,
      errors: [{
        code: "malformed_input",
        message: "Learning creation requires Pattern records.",
        field: "patterns",
      }],
    }
  }
  const evidence: LearningEvidence[] = []
  for (let index = 0; index < input.patterns.length; index += 1) {
    const result = createLearningEvidence(input.patterns[index])
    if (result.success === false) return result
    evidence.push(result.value)
  }
  evidence.sort((left, right) => (
    left.pattern.identity.patternId.localeCompare(right.pattern.identity.patternId)
  ))
  const identity = createLearningIdentity(input.learningVersion, input.scope, evidence)
  if (identity.success === false) return identity

  const record: LearningRecord = {
    schemaVersion: LEARNING_SCHEMA_VERSION,
    identity: identity.value,
    status: "DRAFT",
    createdAt: input.createdAt,
    evidence,
    conclusion: input.conclusion,
  }
  const validation = validateLearningRecord(record, input.existingLearningIds)
  if (validation.success === false) return validation
  return { success: true, value: freezeLearningRecord(validation.value) }
}
