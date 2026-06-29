import { freezeHistoricalMemory } from "@/lib/historical-memory/memory"
import type {
  HistoricalMemoryRecord,
  HistoricalMemoryResult,
} from "@/lib/historical-memory/types"
import { validateHistoricalMemory } from "@/lib/historical-memory/validation"

export function serializeHistoricalMemory(
  memory: HistoricalMemoryRecord,
): HistoricalMemoryResult<string> {
  const validation = validateHistoricalMemory(memory)
  if (validation.success === false) return validation

  try {
    return { success: true, value: JSON.stringify(validation.value) }
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "serialization_failure",
        message: "Historical Memory could not be serialized.",
        cause,
      }],
    }
  }
}

export function deserializeHistoricalMemory(
  raw: string,
  existingMemoryIds: ReadonlySet<string> = new Set<string>(),
): HistoricalMemoryResult<HistoricalMemoryRecord> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      success: false,
      errors: [{ code: "malformed_json", message: "Serialized Historical Memory is empty." }],
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
        message: "Serialized Historical Memory is not valid JSON.",
        cause,
      }],
    }
  }

  const validation = validateHistoricalMemory(parsed, existingMemoryIds)
  if (validation.success === false) return validation
  return { success: true, value: freezeHistoricalMemory(validation.value) }
}
