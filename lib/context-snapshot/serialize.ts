import { freezeContextSnapshot } from "@/lib/context-snapshot/contextSnapshot"
import type { ContextSnapshot, ContextSnapshotResult } from "@/lib/context-snapshot/types"
import { validateContextSnapshot } from "@/lib/context-snapshot/validation"

export function serializeContextSnapshot(snapshot: ContextSnapshot): ContextSnapshotResult<string> {
  const validation = validateContextSnapshot(snapshot)
  if (validation.success === false) return validation
  try {
    return { success: true, value: JSON.stringify(validation.value) }
  } catch (cause) {
    return { success: false, errors: [{ code: "serialization_failure", message: "Context Snapshot could not be serialized.", cause }] }
  }
}

export function deserializeContextSnapshot(
  raw: string,
  existingSnapshotIds: ReadonlySet<string> = new Set<string>(),
): ContextSnapshotResult<ContextSnapshot> {
  if (typeof raw !== "string" || !raw.trim()) return { success: false, errors: [{ code: "malformed_json", message: "Serialized Context Snapshot is empty." }] }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    return { success: false, errors: [{ code: "malformed_json", message: "Serialized Context Snapshot is not valid JSON.", cause }] }
  }
  const validation = validateContextSnapshot(parsed, existingSnapshotIds)
  if (validation.success === false) return validation
  return { success: true, value: freezeContextSnapshot(validation.value) }
}
