import type {
  SignalOutcomeIdentity,
  SignalOutcomeResult,
  SignalOutcomeSnapshot,
} from "@/lib/signal-outcome/types"
import { isTrackingWindowId, type TrackingWindowId } from "@/lib/signal-tracking"

function error(
  code: "missing_signal_reference" | "invalid_evaluation_window",
  message: string,
  field: string,
): SignalOutcomeResult<never> {
  return { success: false, errors: [{ code, message, field }] }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function encodeIdentityPart(value: string): string {
  return encodeURIComponent(value)
}

export function createSignalOutcomeId(
  signalId: string,
  evaluationWindow: TrackingWindowId,
): SignalOutcomeResult<string> {
  if (!isNonEmptyString(signalId)) {
    return error(
      "missing_signal_reference",
      "Signal Outcome identity requires signalId.",
      "signalId",
    )
  }
  if (!isTrackingWindowId(evaluationWindow)) {
    return error(
      "invalid_evaluation_window",
      `Signal Outcome window ${String(evaluationWindow)} is not canonical.`,
      "evaluationWindow",
    )
  }

  return {
    success: true,
    value: [
      "signal-outcome-v1",
      encodeIdentityPart(signalId.trim()),
      encodeIdentityPart(evaluationWindow),
    ].join("|"),
  }
}

export function createSignalOutcomeIdentity(
  snapshot: SignalOutcomeSnapshot,
  evaluationWindow: TrackingWindowId,
): SignalOutcomeResult<SignalOutcomeIdentity> {
  if (!snapshot || typeof snapshot !== "object") {
    return error(
      "missing_signal_reference",
      "Signal Outcome requires a Signal Snapshot.",
      "snapshot",
    )
  }
  for (const field of ["signalId", "snapshotId", "trackingId"] as const) {
    if (!isNonEmptyString(snapshot[field])) {
      return error(
        "missing_signal_reference",
        `Signal Outcome identity requires ${field}.`,
        field,
      )
    }
  }

  const outcomeId = createSignalOutcomeId(snapshot.signalId, evaluationWindow)
  if (outcomeId.success === false) return outcomeId

  return {
    success: true,
    value: Object.freeze({
      outcomeId: outcomeId.value,
      signalId: snapshot.signalId.trim(),
      snapshotId: snapshot.snapshotId.trim(),
      trackingId: snapshot.trackingId.trim(),
    }),
  }
}

