export const SCHEDULER_SCHEMA_VERSION = 1 as const

export const SCHEDULER_JOB_TYPES = [
  "SignalCapture",
  "TrackingInitialization",
  "EvaluationWindow",
  "PriceObservation",
  "SignalEvaluation",
  "OutcomeRecording",
  "HistoricalMemoryWrite",
  "PatternCandidate",
  "LearningCandidate",
  "CalibrationCandidate",
  "PlaybookCandidate",
] as const

export const EXECUTION_STATES = [
  "CREATED",
  "SCHEDULED",
  "READY",
  "CLAIMED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "RETRYING",
  "DEAD_LETTERED",
  "ARCHIVED",
] as const

export const BACKOFF_POLICIES = ["NONE", "FIXED", "EXPONENTIAL"] as const

export type SchedulerJobType = typeof SCHEDULER_JOB_TYPES[number]
export type ExecutionState = typeof EXECUTION_STATES[number]
export type BackoffPolicy = typeof BACKOFF_POLICIES[number]

export interface ExecutionIdentityInput {
  readonly jobType: SchedulerJobType
  readonly parentExecutionId: string | null
  readonly scheduledAt: string
}

export interface ExecutionIdentity extends ExecutionIdentityInput {
  readonly executionId: string
}

export interface RetryPolicy {
  readonly retryCount: number
  readonly maxRetryCount: number
  readonly retryAfter: string | null
  readonly retryReason: string | null
  readonly backoffPolicy: BackoffPolicy
}

export interface ExecutionHistoryEntry {
  readonly executionState: ExecutionState
  readonly occurredAt: string
}

export interface ExecutionPlan {
  readonly schemaVersion: typeof SCHEDULER_SCHEMA_VERSION
  readonly executionId: string
  readonly parentExecutionId: string | null
  readonly jobType: SchedulerJobType
  readonly scheduledAt: string
  readonly earliestRunAt: string
  readonly latestRunAt: string
  readonly retryPolicy: RetryPolicy
  readonly dependencyIds: readonly string[]
  readonly executionState: ExecutionState
  readonly executionHistory: readonly ExecutionHistoryEntry[]
}

export interface CreateExecutionPlanInput extends ExecutionIdentityInput {
  readonly earliestRunAt: string
  readonly latestRunAt: string
  readonly retryPolicy: RetryPolicy
  readonly dependencyIds: readonly string[]
}

export interface ExecutionReadinessInput {
  readonly evaluatedAt: string
  readonly resolvedDependencyIds: readonly string[]
}

export interface ExecutionQuery {
  readonly executionId?: string
  readonly parentExecutionId?: string | null
  readonly jobType?: SchedulerJobType
  readonly lifecycle?: ExecutionState
  readonly scheduledAfter?: string
  readonly scheduledBefore?: string
  readonly retryState?: "INITIAL" | "SCHEDULED" | "EXHAUSTED"
}

export type SchedulerErrorCode =
  | "duplicate_execution_id"
  | "invalid_execution_identity"
  | "invalid_lifecycle"
  | "invalid_lifecycle_transition"
  | "invalid_timestamp"
  | "malformed_input"
  | "malformed_json"
  | "malformed_query"
  | "malformed_retry_policy"
  | "missing_dependency"
  | "serialization_failure"
  | "unsupported_job_type"
  | "unsupported_schema_version"

export interface SchedulerError {
  readonly code: SchedulerErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type SchedulerResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly SchedulerError[] }

