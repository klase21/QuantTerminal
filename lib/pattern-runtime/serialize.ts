import { freezePatternRecord } from "@/lib/pattern-runtime/pattern"
import type { PatternRecord, PatternResult } from "@/lib/pattern-runtime/types"
import { validatePatternRecord } from "@/lib/pattern-runtime/validation"

export function serializePattern(pattern: PatternRecord): PatternResult<string> {
  const validation = validatePatternRecord(pattern)
  if (validation.success === false) return validation
  try {
    return { success: true, value: JSON.stringify(validation.value) }
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "serialization_failure",
        message: "Pattern could not be serialized.",
        cause,
      }],
    }
  }
}

export function deserializePattern(
  raw: string,
  existingPatternIds: ReadonlySet<string> = new Set<string>(),
): PatternResult<PatternRecord> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      success: false,
      errors: [{ code: "malformed_json", message: "Serialized Pattern is empty." }],
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
        message: "Serialized Pattern is not valid JSON.",
        cause,
      }],
    }
  }
  const validation = validatePatternRecord(parsed, existingPatternIds)
  if (validation.success === false) return validation
  return { success: true, value: freezePatternRecord(validation.value) }
}
