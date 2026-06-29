import type {
  SignalSnapshotReference,
  TrackingWindowId,
} from "@/lib/signal-tracking"

export const SIGNAL_EVALUATION_SCHEMA_VERSION = 1 as const

export const SIGNAL_DIRECTIONS = ["LONG", "SHORT", "NEUTRAL"] as const
export const SIGNAL_EVALUATION_STATUSES = [
  "PENDING",
  "EVALUATED",
  "UNAVAILABLE",
  "FAILED",
  "ARCHIVED",
] as const
export const SIGNAL_OUTCOME_STATUSES = [
  "FAVORABLE",
  "ADVERSE",
  "FLAT",
  "UNAVAILABLE",
] as const

export type SignalDirection = typeof SIGNAL_DIRECTIONS[number]
export type SignalEvaluationStatus = typeof SIGNAL_EVALUATION_STATUSES[number]
export type SignalOutcomeStatus = typeof SIGNAL_OUTCOME_STATUSES[number]
export type DirectionCorrectness = boolean | null
export type InvalidationStatus = boolean | null

export interface SignalEvaluationWindow {
  readonly id: TrackingWindowId
  readonly startsAt: string
  readonly endsAt: string
}

export interface SignalPriceObservation {
  readonly observedAt: string
  readonly price: number | null
  readonly sourceId: string
}

export interface SignalEvaluationInput {
  readonly signalReference: SignalSnapshotReference
  readonly window: SignalEvaluationWindow
  readonly direction: SignalDirection
  /** Signal emission reference price. This is not a realized trade entry. */
  readonly entryPrice: number | null
  readonly entrySourceId: string
  readonly observations: readonly SignalPriceObservation[]
  readonly invalidationPrice?: number | null
}

export interface SignalEvaluationMetrics {
  readonly returnPercent: number | null
  readonly maxFavorableExcursion: number | null
  readonly maxAdverseExcursion: number | null
  readonly drawdown: number | null
  readonly runup: number | null
  readonly timeToMaxFavorable: number | null
  readonly timeToMaxAdverse: number | null
  readonly invalidationHit: InvalidationStatus
  readonly directionCorrect: DirectionCorrectness
  readonly outcomeStatus: SignalOutcomeStatus
}

export interface SignalEvaluationResult {
  readonly schemaVersion: typeof SIGNAL_EVALUATION_SCHEMA_VERSION
  readonly signalReference: SignalSnapshotReference
  readonly window: SignalEvaluationWindow
  readonly direction: SignalDirection
  readonly status: SignalEvaluationStatus
  readonly metrics: SignalEvaluationMetrics | null
  readonly unavailableReason: string | null
}

export type SignalEvaluationErrorCode =
  | "invalid_direction"
  | "invalid_metric_value"
  | "impossible_timestamp"
  | "malformed_input"
  | "malformed_json"
  | "missing_entry_price"
  | "missing_observation_price"
  | "missing_signal_reference"
  | "serialization_failure"
  | "unknown_evaluation_window"
  | "unsupported_schema_version"

export interface SignalEvaluationError {
  readonly code: SignalEvaluationErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type SignalEvaluationOperationResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly SignalEvaluationError[] }

