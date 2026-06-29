import { isTrackingStatus } from "@/lib/signal-tracking/stateMachine"
import { createTrackingId } from "@/lib/signal-tracking/identity"
import {
  SIGNAL_TRACKING_SCHEMA_VERSION,
  TRACKING_WINDOW_IDS,
  type SignalSnapshotReference,
  type TrackingError,
  type TrackingIdentity,
  type TrackingLifecycle,
  type TrackingResult,
  type TrackingWindow,
  type TrackingWindowId,
} from "@/lib/signal-tracking/types"
import {
  CANONICAL_TRACKING_WINDOWS,
  getTrackingWindowDefinition,
  isTrackingWindowId,
  orderTrackingWindowIds,
} from "@/lib/signal-tracking/windows"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function oneError<T>(error: TrackingError): TrackingResult<T> {
  return { success: false, errors: [error] }
}

function sameIds(
  actual: readonly TrackingWindowId[],
  expected: readonly TrackingWindowId[],
): boolean {
  if (actual.length !== expected.length) return false
  return actual.every((value, index) => value === expected[index])
}

function validateWindow(
  input: unknown,
  createdAtMs: number,
  index: number,
): TrackingResult<TrackingWindow> {
  const field = `windows[${index}]`
  if (!isRecord(input)) {
    return oneError({
      code: "invalid_lifecycle",
      message: `${field} must be an object.`,
      field,
    })
  }
  if (!isTrackingWindowId(input.id)) {
    return oneError({
      code: "unknown_window",
      message: `${field}.id is not a canonical tracking window.`,
      field: `${field}.id`,
    })
  }

  const definition = getTrackingWindowDefinition(input.id)
  if (definition.success === false) return definition
  if (input.durationMs !== definition.value.durationMs) {
    return oneError({
      code: "invalid_lifecycle",
      message: `${field}.durationMs does not match the canonical window.`,
      field: `${field}.durationMs`,
    })
  }
  if (!isTimestamp(input.dueAt)) {
    return oneError({
      code: "invalid_timestamp",
      message: `${field}.dueAt must be a valid timestamp.`,
      field: `${field}.dueAt`,
    })
  }
  if (Date.parse(input.dueAt) !== createdAtMs + definition.value.durationMs) {
    return oneError({
      code: "invalid_lifecycle",
      message: `${field}.dueAt must be derived from the immutable createdAt.`,
      field: `${field}.dueAt`,
    })
  }
  if (!isTrackingStatus(input.status)) {
    return oneError({
      code: "invalid_lifecycle",
      message: `${field}.status is not supported.`,
      field: `${field}.status`,
    })
  }
  if (input.terminalResult !== null
    && input.terminalResult !== "COMPLETED"
    && input.terminalResult !== "FAILED") {
    return oneError({
      code: "invalid_lifecycle",
      message: `${field}.terminalResult is invalid.`,
      field: `${field}.terminalResult`,
    })
  }

  const expectedTerminal = input.status === "COMPLETED"
    ? "COMPLETED"
    : input.status === "FAILED"
      ? "FAILED"
      : input.status === "ARCHIVED"
        ? input.terminalResult
        : null
  if (input.terminalResult !== expectedTerminal || (input.status === "ARCHIVED" && input.terminalResult === null)) {
    return oneError({
      code: "invalid_lifecycle",
      message: `${field}.terminalResult is inconsistent with its status.`,
      field: `${field}.terminalResult`,
    })
  }

  return { success: true, value: input as unknown as TrackingWindow }
}

function validateWindowIdArray(
  input: unknown,
  field: "completedWindows" | "pendingWindows",
): TrackingResult<readonly TrackingWindowId[]> {
  if (!Array.isArray(input)) {
    return oneError({
      code: "invalid_lifecycle",
      message: `${field} must be an array.`,
      field,
    })
  }

  const seen = new Set<string>()
  for (const value of input) {
    if (!isTrackingWindowId(value)) {
      return oneError({
        code: "unknown_window",
        message: `${field} contains an unknown tracking window.`,
        field,
      })
    }
    if (seen.has(value)) {
      return oneError({
        code: "duplicate_window",
        message: `${field} contains duplicate window ${value}.`,
        field,
      })
    }
    seen.add(value)
  }

  return { success: true, value: input as TrackingWindowId[] }
}

export function validateSignalSnapshotReference(
  input: unknown,
): TrackingResult<SignalSnapshotReference> {
  if (!isRecord(input)) {
    return oneError({
      code: "missing_snapshot_reference",
      message: "Signal Snapshot reference must be an object.",
    })
  }
  for (const field of ["snapshotId", "signalId", "createdAt"] as const) {
    if (!isNonEmptyString(input[field])) {
      return oneError({
        code: "missing_snapshot_reference",
        message: `Signal Snapshot reference requires ${field}.`,
        field,
      })
    }
  }
  if (!isTimestamp(input.createdAt)) {
    return oneError({
      code: "invalid_timestamp",
      message: "Signal Snapshot createdAt must be a valid timestamp.",
      field: "createdAt",
    })
  }

  return { success: true, value: input as unknown as SignalSnapshotReference }
}

export function validateTrackingIdentity(
  input: unknown,
): TrackingResult<TrackingIdentity> {
  if (!isRecord(input)) {
    return oneError({
      code: "invalid_identity",
      message: "Tracking identity must be an object.",
      field: "identity",
    })
  }
  for (const field of ["trackingId", "signalId", "snapshotId", "createdAt"] as const) {
    if (!isNonEmptyString(input[field])) {
      return oneError({
        code: "invalid_identity",
        message: `Tracking identity requires ${field}.`,
        field: `identity.${field}`,
      })
    }
  }
  if (!isTimestamp(input.createdAt)) {
    return oneError({
      code: "invalid_timestamp",
      message: "Tracking identity createdAt must be a valid timestamp.",
      field: "identity.createdAt",
    })
  }

  const expectedTrackingId = createTrackingId({
    signalId: input.signalId as string,
    snapshotId: input.snapshotId as string,
    createdAt: input.createdAt as string,
  })
  if (expectedTrackingId.success === false || input.trackingId !== expectedTrackingId.value) {
    return oneError({
      code: "invalid_identity",
      message: "trackingId does not match signalId, snapshotId, and createdAt.",
      field: "identity.trackingId",
    })
  }

  return { success: true, value: input as unknown as TrackingIdentity }
}

export function validateTrackingLifecycle(
  input: unknown,
): TrackingResult<TrackingLifecycle> {
  if (!isRecord(input)) {
    return oneError({
      code: "malformed_input",
      message: "Tracking lifecycle must be an object.",
    })
  }
  if (input.schemaVersion !== SIGNAL_TRACKING_SCHEMA_VERSION) {
    return oneError({
      code: "unsupported_schema_version",
      message: `Only signal tracking schema version ${SIGNAL_TRACKING_SCHEMA_VERSION} is supported.`,
      field: "schemaVersion",
    })
  }

  const identity = validateTrackingIdentity(input.identity)
  if (identity.success === false) return identity
  if (!isTrackingStatus(input.status)) {
    return oneError({
      code: "invalid_lifecycle",
      message: "Tracking lifecycle status is invalid.",
      field: "status",
    })
  }
  if (!Array.isArray(input.windows)) {
    return oneError({
      code: "invalid_lifecycle",
      message: "Tracking lifecycle windows must be an array.",
      field: "windows",
    })
  }

  const seen = new Set<string>()
  const windows: TrackingWindow[] = []
  const createdAtMs = Date.parse(identity.value.createdAt)
  for (let index = 0; index < input.windows.length; index += 1) {
    const validated = validateWindow(input.windows[index], createdAtMs, index)
    if (validated.success === false) return validated
    if (seen.has(validated.value.id)) {
      return oneError({
        code: "duplicate_window",
        message: `Tracking lifecycle contains duplicate window ${validated.value.id}.`,
        field: "windows",
      })
    }
    seen.add(validated.value.id)
    windows.push(validated.value)
  }
  if (windows.length !== TRACKING_WINDOW_IDS.length
    || TRACKING_WINDOW_IDS.some((windowId) => !seen.has(windowId))) {
    return oneError({
      code: "invalid_lifecycle",
      message: "Tracking lifecycle must contain every canonical window exactly once.",
      field: "windows",
    })
  }

  const completedWindows = validateWindowIdArray(input.completedWindows, "completedWindows")
  if (completedWindows.success === false) return completedWindows
  const pendingWindows = validateWindowIdArray(input.pendingWindows, "pendingWindows")
  if (pendingWindows.success === false) return pendingWindows

  const expectedCompleted = orderTrackingWindowIds(
    windows.filter((window) => window.terminalResult === "COMPLETED").map((window) => window.id),
  )
  const expectedPending = orderTrackingWindowIds(
    windows.filter((window) => window.terminalResult === null).map((window) => window.id),
  )
  if (!sameIds(completedWindows.value, expectedCompleted)) {
    return oneError({
      code: "invalid_lifecycle",
      message: "completedWindows does not match terminal window results.",
      field: "completedWindows",
    })
  }
  if (!sameIds(pendingWindows.value, expectedPending)) {
    return oneError({
      code: "invalid_lifecycle",
      message: "pendingWindows does not match nonterminal window results.",
      field: "pendingWindows",
    })
  }

  const expectedNextEvaluation = windows
    .filter((window) => window.terminalResult === null)
    .map((window) => window.dueAt)
    .sort()[0] ?? null
  if (input.nextEvaluation !== expectedNextEvaluation) {
    return oneError({
      code: "invalid_lifecycle",
      message: "nextEvaluation must be the earliest pending window dueAt.",
      field: "nextEvaluation",
    })
  }

  const allTerminal = windows.every((window) => window.terminalResult !== null)
  const hasFailure = windows.some((window) => window.terminalResult === "FAILED")
  if (input.status === "COMPLETED" && (!allTerminal || hasFailure)) {
    return oneError({
      code: "invalid_lifecycle",
      message: "COMPLETED parent status requires all windows to complete without failure.",
      field: "status",
    })
  }
  if (input.status === "FAILED" && (!allTerminal || !hasFailure)) {
    return oneError({
      code: "invalid_lifecycle",
      message: "FAILED parent status requires all windows terminal and at least one failure.",
      field: "status",
    })
  }
  if (input.status === "ARCHIVED" && !windows.every((window) => window.status === "ARCHIVED")) {
    return oneError({
      code: "invalid_lifecycle",
      message: "ARCHIVED parent status requires every window to be archived.",
      field: "status",
    })
  }

  return { success: true, value: input as unknown as TrackingLifecycle }
}

export function validateKnownWindow(windowId: unknown): TrackingResult<TrackingWindowId> {
  if (!isTrackingWindowId(windowId)) {
    return oneError({
      code: "unknown_window",
      message: `Unknown tracking window: ${String(windowId)}.`,
      field: "window",
    })
  }
  return { success: true, value: windowId }
}

export function listCanonicalWindowIds(): readonly TrackingWindowId[] {
  return Object.freeze(CANONICAL_TRACKING_WINDOWS.map((window) => window.id))
}
