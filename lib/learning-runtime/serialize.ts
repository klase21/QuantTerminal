import { freezeLearningRecord } from "@/lib/learning-runtime/learning"
import type { LearningRecord, LearningResult } from "@/lib/learning-runtime/types"
import { validateLearningRecord } from "@/lib/learning-runtime/validation"

export function serializeLearning(record: LearningRecord): LearningResult<string> {
  const validation = validateLearningRecord(record)
  if (validation.success === false) return validation
  try {
    return { success: true, value: JSON.stringify(validation.value) }
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "serialization_failure",
        message: "Learning Record could not be serialized.",
        cause,
      }],
    }
  }
}

export function deserializeLearning(
  raw: string,
  existingLearningIds: ReadonlySet<string> = new Set<string>(),
): LearningResult<LearningRecord> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      success: false,
      errors: [{ code: "malformed_json", message: "Serialized Learning Record is empty." }],
    }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "malformed_json",
        message: "Serialized Learning Record is not valid JSON.",
        cause,
      }],
    }
  }
  const validation = validateLearningRecord(parsed, existingLearningIds)
  if (validation.success === false) return validation
  return { success: true, value: freezeLearningRecord(validation.value) }
}
