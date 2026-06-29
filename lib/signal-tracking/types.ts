export const SIGNAL_TRACKING_SCHEMA_VERSION = 1 as const

export const TRACKING_STATUS_VALUES = [
  "QUEUED",
  "WAITING",
  "READY",
  "EVALUATING",
  "COMPLETED",
  "FAILED",
  "ARCHIVED",
] as const

export const TRACKING_WINDOW_IDS = [
  "1h",
  "6h",
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
] as const

export type TrackingStatus = typeof TRACKING_STATUS_VALUES[number]
export type WindowStatus = TrackingStatus
export type TrackingWindowId = typeof TRACKING_WINDOW_IDS[number]
export type WindowTerminalResult = "COMPLETED" | "FAILED" | null

export interface SignalSnapshotReference {
  readonly snapshotId: string
  readonly signalId: string
  readonly createdAt: string
}

export interface TrackingIdentity {
  readonly trackingId: string
  readonly signalId: string
  readonly snapshotId: string
  readonly createdAt: string
}

export interface TrackingWindow {
  readonly id: TrackingWindowId
  readonly durationMs: number
  readonly dueAt: string
  readonly status: WindowStatus
  readonly terminalResult: WindowTerminalResult
}

export interface TrackingLifecycle {
  readonly schemaVersion: typeof SIGNAL_TRACKING_SCHEMA_VERSION
  readonly identity: TrackingIdentity
  readonly status: TrackingStatus
  readonly nextEvaluation: string | null
  readonly completedWindows: readonly TrackingWindowId[]
  readonly pendingWindows: readonly TrackingWindowId[]
  readonly windows: readonly TrackingWindow[]
}

export type TrackingErrorCode =
  | "duplicate_window"
  | "invalid_identity"
  | "invalid_lifecycle"
  | "invalid_state_transition"
  | "invalid_timestamp"
  | "malformed_input"
  | "malformed_json"
  | "missing_snapshot_reference"
  | "serialization_failure"
  | "unknown_window"
  | "unsupported_schema_version"

export interface TrackingError {
  readonly code: TrackingErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type TrackingResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly TrackingError[] }

