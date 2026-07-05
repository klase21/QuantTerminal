import { contextEvidenceKey } from "@/lib/context-snapshot/evidence"
import { freezeContextSnapshot } from "@/lib/context-snapshot/contextSnapshot"
import type { ContextEvidenceItem, ContextSnapshot, ContextSnapshotResult } from "@/lib/context-snapshot/types"
import { validateContextSnapshot } from "@/lib/context-snapshot/validation"

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`
  return JSON.stringify(value)
}

export function mergeContextSnapshots(
  existing: ContextSnapshot,
  incoming: ContextSnapshot,
): ContextSnapshotResult<ContextSnapshot> {
  const left = validateContextSnapshot(existing)
  if (left.success === false) return left
  const right = validateContextSnapshot(incoming)
  if (right.success === false) return right
  if (left.value.identity.contextSnapshotId !== right.value.identity.contextSnapshotId) return { success: false, errors: [{ code: "identity_mismatch", message: "Context Snapshots with different identities cannot be merged.", field: "identity.contextSnapshotId" }] }
  if (left.value.lifecycleState !== "CREATED" || right.value.lifecycleState !== "CREATED") return { success: false, errors: [{ code: "immutable_snapshot", message: "Finalized or archived Context Snapshots cannot be merged.", field: "lifecycleState" }] }
  if (left.value.capturedAt !== right.value.capturedAt || left.value.signalSnapshotId !== right.value.signalSnapshotId) return { success: false, errors: [{ code: "merge_conflict", message: "Context Snapshot Signal reference and capturedAt cannot be overwritten.", field: "signalSnapshotId" }] }

  const incomingByKey = new Map(right.value.evidence.map((item) => [contextEvidenceKey(item), item]))
  for (const item of left.value.evidence) {
    const candidate = incomingByKey.get(contextEvidenceKey(item))
    if (!candidate || stable(candidate) !== stable(item)) return { success: false, errors: [{ code: "merge_conflict", message: "Context evidence may only be appended; existing evidence cannot be removed or overwritten.", field: "evidence" }] }
  }
  const merged: ContextSnapshot = {
    ...right.value,
    evidence: [...right.value.evidence] as readonly ContextEvidenceItem[],
  }
  const validation = validateContextSnapshot(merged)
  if (validation.success === false) return validation
  return { success: true, value: freezeContextSnapshot(validation.value) }
}
