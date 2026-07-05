import type {
  ContextSnapshotIdentity,
  ContextSnapshotResult,
} from "@/lib/context-snapshot/types"

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function createContextSnapshotId(
  signalId: string,
  snapshotVersion: number,
): ContextSnapshotResult<string> {
  if (!nonEmpty(signalId)) {
    return { success: false, errors: [{ code: "missing_signal_reference", message: "Context Snapshot identity requires signalId.", field: "signalId" }] }
  }
  if (!Number.isInteger(snapshotVersion) || snapshotVersion <= 0) {
    return { success: false, errors: [{ code: "identity_mismatch", message: "snapshotVersion must be a positive integer.", field: "snapshotVersion" }] }
  }
  return {
    success: true,
    value: ["context-snapshot-v1", encodeURIComponent(signalId.trim()), String(snapshotVersion)].join("|"),
  }
}

export function createContextSnapshotIdentity(
  signalId: string,
  snapshotVersion: number,
): ContextSnapshotResult<ContextSnapshotIdentity> {
  const id = createContextSnapshotId(signalId, snapshotVersion)
  if (id.success === false) return id
  return {
    success: true,
    value: Object.freeze({
      contextSnapshotId: id.value,
      signalId: signalId.trim(),
      snapshotVersion,
    }),
  }
}
