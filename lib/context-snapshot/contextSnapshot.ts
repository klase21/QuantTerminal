import { createContextSnapshotIdentity } from "@/lib/context-snapshot/identity"
import { createContextEvidence, freezeContextJsonValue } from "@/lib/context-snapshot/evidence"
import {
  CONTEXT_SNAPSHOT_SCHEMA_VERSION,
  type ContextEvidenceItem,
  type ContextSnapshot,
  type ContextSnapshotResult,
  type CreateContextSnapshotInput,
} from "@/lib/context-snapshot/types"
import { validateContextSnapshot } from "@/lib/context-snapshot/validation"

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]))
  }
  return value
}

function hash(value: unknown): string {
  const input = JSON.stringify(stableValue(value))
  let left = 0x811c9dc5
  let right = 0x9e3779b9
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    left = Math.imul(left ^ code, 0x01000193)
    right = Math.imul(right ^ code, 0x85ebca6b)
  }
  return `${(left >>> 0).toString(16).padStart(8, "0")}${(right >>> 0).toString(16).padStart(8, "0")}`
}

export function createEvidenceSetHash(evidence: readonly ContextEvidenceItem[]): string {
  return `context-evidence-v1:${hash(evidence)}`
}

export function freezeContextSnapshot(snapshot: ContextSnapshot): ContextSnapshot {
  return Object.freeze({
    ...snapshot,
    identity: Object.freeze({ ...snapshot.identity }),
    evidence: Object.freeze(snapshot.evidence.map((item) => Object.freeze({
      ...item,
      payload: item.payload === null ? null : freezeContextJsonValue(item.payload),
    }))),
  })
}

export function createContextSnapshot(
  input: CreateContextSnapshotInput,
): ContextSnapshotResult<ContextSnapshot> {
  if (!input || typeof input !== "object" || !Array.isArray(input.evidence)) {
    return { success: false, errors: [{ code: "malformed_input", message: "Context Snapshot creation requires an evidence array." }] }
  }
  const identity = createContextSnapshotIdentity(input.signalId, input.snapshotVersion)
  if (identity.success === false) return identity
  const evidence: ContextEvidenceItem[] = []
  for (const item of input.evidence) {
    const validation = createContextEvidence(item)
    if (validation.success === false) return validation
    evidence.push(validation.value)
  }
  evidence.sort((left, right) => {
    const category = left.category.localeCompare(right.category)
    return category !== 0 ? category : (left.sourceId ?? "").localeCompare(right.sourceId ?? "")
  })
  const snapshot: ContextSnapshot = {
    schemaVersion: CONTEXT_SNAPSHOT_SCHEMA_VERSION,
    identity: identity.value,
    signalSnapshotId: input.signalSnapshotId,
    lifecycleState: "CREATED",
    capturedAt: input.capturedAt,
    evidenceSetHash: createEvidenceSetHash(evidence),
    evidence,
  }
  const validation = validateContextSnapshot(snapshot, input.existingSnapshotIds)
  if (validation.success === false) return validation
  return { success: true, value: freezeContextSnapshot(validation.value) }
}
