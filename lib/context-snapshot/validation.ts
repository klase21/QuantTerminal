import { createEvidenceSetHash, freezeContextSnapshot } from "@/lib/context-snapshot/contextSnapshot"
import { contextEvidenceKey, createContextEvidence } from "@/lib/context-snapshot/evidence"
import { createContextSnapshotId } from "@/lib/context-snapshot/identity"
import {
  CONTEXT_SNAPSHOT_SCHEMA_VERSION,
  CONTEXT_SNAPSHOT_STATES,
  type ContextEvidenceItem,
  type ContextSnapshot,
  type ContextSnapshotError,
  type ContextSnapshotState,
  type ContextSnapshotValidationResult,
} from "@/lib/context-snapshot/types"

const STATE_SET = new Set<string>(CONTEXT_SNAPSHOT_STATES)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value))
}

export function isContextSnapshotState(value: unknown): value is ContextSnapshotState {
  return typeof value === "string" && STATE_SET.has(value)
}

export function validateContextSnapshot(
  input: unknown,
  existingSnapshotIds: ReadonlySet<string> = new Set<string>(),
): ContextSnapshotValidationResult {
  if (!isRecord(input)) return { success: false, errors: [{ code: "malformed_input", message: "Context Snapshot must be an object." }] }
  const errors: ContextSnapshotError[] = []
  if (input.schemaVersion !== CONTEXT_SNAPSHOT_SCHEMA_VERSION) errors.push({ code: "unsupported_schema_version", message: `Only Context Snapshot schema version ${CONTEXT_SNAPSHOT_SCHEMA_VERSION} is supported.`, field: "schemaVersion" })
  if (!isContextSnapshotState(input.lifecycleState)) errors.push({ code: "invalid_lifecycle", message: "Context Snapshot lifecycleState is invalid.", field: "lifecycleState" })
  if (!timestamp(input.capturedAt)) errors.push({ code: "invalid_timestamp", message: "capturedAt must be a valid timestamp.", field: "capturedAt" })
  if (typeof input.signalSnapshotId !== "string" || !input.signalSnapshotId.trim()) errors.push({ code: "missing_signal_reference", message: "Context Snapshot requires signalSnapshotId.", field: "signalSnapshotId" })
  if (!isRecord(input.identity)) {
    errors.push({ code: "missing_signal_reference", message: "Context Snapshot identity is required.", field: "identity" })
  } else {
    const expected = createContextSnapshotId(input.identity.signalId as string, input.identity.snapshotVersion as number)
    if (expected.success === false) errors.push(...expected.errors)
    else if (input.identity.contextSnapshotId !== expected.value) errors.push({ code: "identity_mismatch", message: "contextSnapshotId does not match signalId and snapshotVersion.", field: "identity.contextSnapshotId" })
    if (typeof input.identity.contextSnapshotId === "string" && existingSnapshotIds.has(input.identity.contextSnapshotId)) errors.push({ code: "duplicate_identity", message: `Context Snapshot ${input.identity.contextSnapshotId} already exists.`, field: "identity.contextSnapshotId" })
  }

  if (!Array.isArray(input.evidence)) {
    errors.push({ code: "malformed_evidence", message: "Context Snapshot evidence must be an array.", field: "evidence" })
  } else {
    const seen = new Set<string>()
    const normalized: ContextEvidenceItem[] = []
    for (let index = 0; index < input.evidence.length; index += 1) {
      const evidence = createContextEvidence(input.evidence[index] as ContextEvidenceItem)
      if (evidence.success === false) {
        errors.push(...evidence.errors.map((error) => ({ ...error, field: `evidence[${index}]${error.field ? `.${error.field}` : ""}` })))
        continue
      }
      const key = contextEvidenceKey(evidence.value)
      if (seen.has(key)) errors.push({ code: "duplicate_source", message: `Duplicate evidence source ${key}.`, field: `evidence[${index}]` })
      seen.add(key)
      normalized.push(evidence.value)
      if (timestamp(input.capturedAt) && evidence.value.observedAt !== null && Date.parse(evidence.value.observedAt) > Date.parse(input.capturedAt)) errors.push({ code: "invalid_timestamp", message: "Evidence observedAt cannot follow capturedAt.", field: `evidence[${index}].observedAt` })
    }
    if (typeof input.evidenceSetHash !== "string" || input.evidenceSetHash !== createEvidenceSetHash(normalized)) errors.push({ code: "identity_mismatch", message: "evidenceSetHash does not match evidence.", field: "evidenceSetHash" })
  }
  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: freezeContextSnapshot(input as unknown as ContextSnapshot) }
}
