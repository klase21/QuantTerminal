import { freezePlaybookRecord } from "@/lib/playbook-runtime/playbook"
import type { PlaybookRecord, PlaybookResult } from "@/lib/playbook-runtime/types"
import { validatePlaybookRecord } from "@/lib/playbook-runtime/validation"

export function serializePlaybook(record: PlaybookRecord): PlaybookResult<string> {
  const validation = validatePlaybookRecord(record)
  if (validation.success === false) return validation
  try {
    return { success: true, value: JSON.stringify(validation.value) }
  } catch (cause) {
    return {
      success: false,
      errors: [{
        code: "serialization_failure",
        message: "Playbook Record could not be serialized.",
        cause,
      }],
    }
  }
}

export function deserializePlaybook(
  raw: string,
  existingPlaybookIds: ReadonlySet<string> = new Set<string>(),
): PlaybookResult<PlaybookRecord> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      success: false,
      errors: [{ code: "malformed_json", message: "Serialized Playbook is empty." }],
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
        message: "Serialized Playbook is not valid JSON.",
        cause,
      }],
    }
  }
  const validation = validatePlaybookRecord(parsed, existingPlaybookIds)
  if (validation.success === false) return validation
  return { success: true, value: freezePlaybookRecord(validation.value) }
}
