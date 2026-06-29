import type {
  SignalSnapshotReference,
  TrackingIdentity,
  TrackingResult,
} from "@/lib/signal-tracking/types"

function failure(
  code: "missing_snapshot_reference" | "invalid_timestamp",
  message: string,
  field: string,
): TrackingResult<never> {
  return { success: false, errors: [{ code, message, field }] }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function canonicalTimestamp(value: string): string | null {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function encodeIdentityPart(value: string): string {
  return encodeURIComponent(value)
}

export function createTrackingId(
  reference: SignalSnapshotReference,
): TrackingResult<string> {
  if (!reference || typeof reference !== "object") {
    return failure(
      "missing_snapshot_reference",
      "Signal Snapshot reference must be an object.",
      "snapshotReference",
    )
  }
  if (!isNonEmptyString(reference?.signalId)) {
    return failure(
      "missing_snapshot_reference",
      "Signal Snapshot reference requires signalId.",
      "signalId",
    )
  }
  if (!isNonEmptyString(reference.snapshotId)) {
    return failure(
      "missing_snapshot_reference",
      "Signal Snapshot reference requires snapshotId.",
      "snapshotId",
    )
  }
  if (!isNonEmptyString(reference.createdAt)) {
    return failure(
      "missing_snapshot_reference",
      "Signal Snapshot reference requires createdAt.",
      "createdAt",
    )
  }

  const createdAt = canonicalTimestamp(reference.createdAt)
  if (!createdAt) {
    return failure(
      "invalid_timestamp",
      "Signal Snapshot createdAt must be a valid timestamp.",
      "createdAt",
    )
  }

  return {
    success: true,
    value: [
      "tracking-v1",
      encodeIdentityPart(reference.signalId.trim()),
      encodeIdentityPart(reference.snapshotId.trim()),
      encodeIdentityPart(createdAt),
    ].join("|"),
  }
}

export function createTrackingIdentity(
  reference: SignalSnapshotReference,
): TrackingResult<TrackingIdentity> {
  const trackingId = createTrackingId(reference)
  if (trackingId.success === false) return trackingId

  const createdAt = canonicalTimestamp(reference.createdAt)
  if (!createdAt) {
    return failure(
      "invalid_timestamp",
      "Signal Snapshot createdAt must be a valid timestamp.",
      "createdAt",
    )
  }

  return {
    success: true,
    value: Object.freeze({
      trackingId: trackingId.value,
      signalId: reference.signalId.trim(),
      snapshotId: reference.snapshotId.trim(),
      createdAt,
    }),
  }
}
