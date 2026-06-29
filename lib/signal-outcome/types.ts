import type {
  DirectionCorrectness,
  InvalidationStatus,
  SignalDirection,
  SignalEvaluationMetrics,
  SignalEvaluationResult,
  SignalOutcomeStatus,
} from "@/lib/signal-evaluation"
import type { TrackingWindowId } from "@/lib/signal-tracking"

export const SIGNAL_OUTCOME_SCHEMA_VERSION = 1 as const

export const SIGNAL_OUTCOME_LIFECYCLE_STATES = [
  "CREATED",
  "VALIDATED",
  "FINALIZED",
  "ARCHIVED",
] as const

export const SIGNAL_OUTCOME_LEARNING_STATUSES = [
  "pending",
  "learned",
  "rejected",
] as const

export const SIGNAL_OUTCOME_REFERENCE_STATUSES = [
  "AVAILABLE",
  "UNAVAILABLE",
] as const

export type SignalOutcomeLifecycleState = typeof SIGNAL_OUTCOME_LIFECYCLE_STATES[number]
export type SignalOutcomeLearningStatus = typeof SIGNAL_OUTCOME_LEARNING_STATUSES[number]
export type SignalOutcomeReferenceStatus = typeof SIGNAL_OUTCOME_REFERENCE_STATUSES[number]
export type CompletedSignalEvaluationStatus = "EVALUATED" | "UNAVAILABLE"
export type CompletedSignalEvaluationResult = Omit<
  SignalEvaluationResult,
  "status" | "metrics"
> & {
  readonly status: CompletedSignalEvaluationStatus
  readonly metrics: SignalEvaluationMetrics
}

export interface SignalOutcomeReference {
  readonly status: SignalOutcomeReferenceStatus
  readonly referenceId: string | null
  readonly unavailableReason: string | null
}

export interface SignalOutcomeSnapshot {
  readonly signalId: string
  readonly snapshotId: string
  readonly trackingId: string
  readonly signalCreatedAt: string
  readonly symbol: string
  readonly exchange: string
  readonly timeframe: string
  readonly direction: SignalDirection
  readonly evidenceReference: SignalOutcomeReference
  readonly replayReference: SignalOutcomeReference
  readonly contextReference: SignalOutcomeReference
}

export interface SignalOutcomeIdentity {
  readonly outcomeId: string
  readonly signalId: string
  readonly snapshotId: string
  readonly trackingId: string
}

export interface SignalOutcomeTiming {
  readonly signalCreatedAt: string
  readonly evaluationWindow: TrackingWindowId
  /** Canonical observation boundary, equal to the evaluation window end. */
  readonly evaluatedAt: string
}

export interface SignalOutcomeSignal {
  readonly symbol: string
  readonly exchange: string
  readonly timeframe: string
  readonly direction: SignalDirection
}

export interface SignalOutcomeEvaluation {
  readonly evaluationStatus: CompletedSignalEvaluationStatus
  readonly outcomeStatus: SignalOutcomeStatus
  readonly directionCorrect: DirectionCorrectness
  readonly invalidationHit: InvalidationStatus
  readonly unavailableReason: string | null
}

export interface SignalOutcomePerformance {
  readonly returnPercent: number | null
  readonly maxFavorableExcursion: number | null
  readonly maxAdverseExcursion: number | null
  readonly drawdown: number | null
  readonly runup: number | null
  readonly timeToMaxFavorable: number | null
  readonly timeToMaxAdverse: number | null
}

export interface SignalOutcomeSnapshotReferences {
  readonly evidenceReference: SignalOutcomeReference
  readonly replayReference: SignalOutcomeReference
  readonly contextReference: SignalOutcomeReference
}

export interface SignalOutcome {
  readonly schemaVersion: typeof SIGNAL_OUTCOME_SCHEMA_VERSION
  readonly lifecycleState: SignalOutcomeLifecycleState
  readonly identity: SignalOutcomeIdentity
  readonly timing: SignalOutcomeTiming
  readonly signal: SignalOutcomeSignal
  readonly evaluation: SignalOutcomeEvaluation
  readonly performance: SignalOutcomePerformance
  readonly snapshotReferences: SignalOutcomeSnapshotReferences
  readonly learningStatus: SignalOutcomeLearningStatus
}

export interface SignalOutcomeMergeInput {
  readonly snapshot: SignalOutcomeSnapshot
  readonly evaluation: SignalEvaluationResult
}

export type SignalOutcomeErrorCode =
  | "duplicate_outcome_identity"
  | "identity_mismatch"
  | "impossible_timestamp"
  | "inconsistent_lifecycle"
  | "invalid_evaluation_window"
  | "invalid_metrics"
  | "malformed_input"
  | "malformed_json"
  | "merge_conflict"
  | "missing_signal_reference"
  | "serialization_failure"
  | "unsupported_schema_version"

export interface SignalOutcomeError {
  readonly code: SignalOutcomeErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type SignalOutcomeResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly SignalOutcomeError[] }
