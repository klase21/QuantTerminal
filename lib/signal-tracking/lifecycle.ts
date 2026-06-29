import { createTrackingIdentity } from "@/lib/signal-tracking/identity"
import { transitionTrackingStatus, transitionWindowStatus } from "@/lib/signal-tracking/stateMachine"
import {
  SIGNAL_TRACKING_SCHEMA_VERSION,
  type SignalSnapshotReference,
  type TrackingLifecycle,
  type TrackingResult,
  type TrackingStatus,
  type TrackingWindow,
  type TrackingWindowId,
  type WindowStatus,
} from "@/lib/signal-tracking/types"
import {
  validateKnownWindow,
  validateSignalSnapshotReference,
  validateTrackingLifecycle,
} from "@/lib/signal-tracking/validation"
import {
  createCanonicalTrackingWindows,
  orderTrackingWindowIds,
} from "@/lib/signal-tracking/windows"

function freezeWindow(window: TrackingWindow): TrackingWindow {
  return Object.freeze({ ...window })
}

export function freezeTrackingLifecycle(lifecycle: TrackingLifecycle): TrackingLifecycle {
  return Object.freeze({
    ...lifecycle,
    identity: Object.freeze({ ...lifecycle.identity }),
    completedWindows: Object.freeze([...lifecycle.completedWindows]),
    pendingWindows: Object.freeze([...lifecycle.pendingWindows]),
    windows: Object.freeze(lifecycle.windows.map(freezeWindow)),
  })
}

function deriveProgress(windows: readonly TrackingWindow[]) {
  const completedWindows = orderTrackingWindowIds(
    windows.filter((window) => window.terminalResult === "COMPLETED").map((window) => window.id),
  )
  const pendingWindows = orderTrackingWindowIds(
    windows.filter((window) => window.terminalResult === null).map((window) => window.id),
  )
  const nextEvaluation = windows
    .filter((window) => window.terminalResult === null)
    .map((window) => window.dueAt)
    .sort()[0] ?? null

  return { completedWindows, pendingWindows, nextEvaluation }
}

function validatedFrozenLifecycle(
  lifecycle: TrackingLifecycle,
): TrackingResult<TrackingLifecycle> {
  const validation = validateTrackingLifecycle(lifecycle)
  if (validation.success === false) return validation
  return { success: true, value: freezeTrackingLifecycle(validation.value) }
}

export function createTrackingLifecycle(
  reference: SignalSnapshotReference,
): TrackingResult<TrackingLifecycle> {
  const snapshot = validateSignalSnapshotReference(reference)
  if (snapshot.success === false) return snapshot

  const identity = createTrackingIdentity(snapshot.value)
  if (identity.success === false) return identity

  const windows = createCanonicalTrackingWindows(identity.value.createdAt)
  if (windows.success === false) return windows

  const progress = deriveProgress(windows.value)
  return validatedFrozenLifecycle({
    schemaVersion: SIGNAL_TRACKING_SCHEMA_VERSION,
    identity: identity.value,
    status: "QUEUED",
    nextEvaluation: progress.nextEvaluation,
    completedWindows: progress.completedWindows,
    pendingWindows: progress.pendingWindows,
    windows: windows.value,
  })
}

export function transitionLifecycle(
  lifecycle: TrackingLifecycle,
  nextStatus: TrackingStatus,
): TrackingResult<TrackingLifecycle> {
  const current = validateTrackingLifecycle(lifecycle)
  if (current.success === false) return current

  const transition = transitionTrackingStatus(current.value.status, nextStatus)
  if (transition.success === false) return transition

  return validatedFrozenLifecycle({
    ...current.value,
    status: transition.value,
  })
}

export function transitionLifecycleWindow(
  lifecycle: TrackingLifecycle,
  windowId: TrackingWindowId,
  nextStatus: WindowStatus,
): TrackingResult<TrackingLifecycle> {
  const current = validateTrackingLifecycle(lifecycle)
  if (current.success === false) return current

  const knownWindow = validateKnownWindow(windowId)
  if (knownWindow.success === false) return knownWindow

  const existing = current.value.windows.find((window) => window.id === knownWindow.value)
  if (!existing) {
    return {
      success: false,
      errors: [{
        code: "unknown_window",
        message: `Tracking lifecycle does not contain window ${knownWindow.value}.`,
        field: "window",
      }],
    }
  }

  const transition = transitionWindowStatus(existing.status, nextStatus)
  if (transition.success === false) return transition

  const terminalResult = transition.value === "COMPLETED"
    ? "COMPLETED" as const
    : transition.value === "FAILED"
      ? "FAILED" as const
      : existing.terminalResult
  const windows = current.value.windows.map((window) => (
    window.id === knownWindow.value
      ? freezeWindow({ ...window, status: transition.value, terminalResult })
      : window
  ))
  const progress = deriveProgress(windows)

  return validatedFrozenLifecycle({
    ...current.value,
    nextEvaluation: progress.nextEvaluation,
    completedWindows: progress.completedWindows,
    pendingWindows: progress.pendingWindows,
    windows,
  })
}

