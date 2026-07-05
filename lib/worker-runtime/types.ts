import type {
  ExecutionPlan,
  SchedulerJobType,
} from "@/lib/scheduler-runtime"

export const WORKER_SCHEMA_VERSION = 1 as const

export const WORKER_LIFECYCLE_STATES = [
  "CREATED",
  "CLAIMED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "ARCHIVED",
] as const

export const WORKER_RESULT_STATUSES = [
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const

export type WorkerLifecycleState = typeof WORKER_LIFECYCLE_STATES[number]
export type WorkerResultStatus = typeof WORKER_RESULT_STATUSES[number]

export interface WorkerExecutionContext {
  readonly executionId: string
  readonly workerId: string
  readonly jobType: SchedulerJobType
  readonly executionPlan: ExecutionPlan
  readonly claimedAt: string
  readonly startedAt: string
}

export interface WorkerExecutionIdentity {
  readonly workerExecutionId: string
  readonly executionId: string
  readonly workerId: string
  readonly claimedAt: string
}

export interface WorkerLifecycleEntry {
  readonly state: WorkerLifecycleState
  readonly occurredAt: string
}

export interface WorkerLifecycle {
  readonly schemaVersion: typeof WORKER_SCHEMA_VERSION
  readonly identity: WorkerExecutionIdentity
  readonly state: WorkerLifecycleState
  readonly history: readonly WorkerLifecycleEntry[]
}

export interface ProducedRecordReference {
  readonly recordId: string
  readonly recordKind: string
}

export interface WorkerExecutionError {
  readonly code: string
  readonly message: string
  readonly retryable: boolean
}

export interface WorkerResult {
  readonly schemaVersion: typeof WORKER_SCHEMA_VERSION
  readonly executionId: string
  readonly workerId: string
  readonly status: WorkerResultStatus
  readonly completedAt: string
  readonly producedRecords: readonly ProducedRecordReference[]
  readonly nextExecutionIds: readonly string[]
  readonly error?: WorkerExecutionError
}

export interface WorkerExecutionLineage {
  readonly executionId: string
  readonly parentExecutionId: string | null
  readonly retryParentExecutionId: string | null
  readonly dependencyExecutionIds: readonly string[]
  readonly downstreamExecutionIds: readonly string[]
}

export interface WorkerDispatchOutput {
  readonly producedRecords: readonly ProducedRecordReference[]
  readonly nextExecutionIds: readonly string[]
}

export type WorkerHandlerResult =
  | { readonly success: true; readonly value: WorkerDispatchOutput }
  | { readonly success: false; readonly error: WorkerExecutionError }

export type WorkerJobHandler = (
  context: WorkerExecutionContext,
) => WorkerHandlerResult | Promise<WorkerHandlerResult>

export type WorkerDispatchHandlers = Partial<
  Readonly<Record<SchedulerJobType, WorkerJobHandler>>
>

export interface WorkerDispatcher {
  dispatch(context: WorkerExecutionContext): Promise<WorkerRuntimeResult<WorkerHandlerResult>>
}

export interface WorkerExecutionReceipt {
  readonly context: WorkerExecutionContext
  readonly lifecycle: WorkerLifecycle
  readonly result: WorkerResult
  readonly lineage: WorkerExecutionLineage
}

export interface WorkerQuery {
  readonly workerId?: string
  readonly executionId?: string
  readonly jobType?: SchedulerJobType
  readonly lifecycle?: WorkerLifecycleState
  readonly executionStatus?: WorkerResultStatus
  readonly completedAfter?: string
  readonly completedBefore?: string
}

export type WorkerErrorCode =
  | "duplicate_execution"
  | "invalid_lifecycle"
  | "invalid_lifecycle_transition"
  | "invalid_timestamp"
  | "invalid_worker_identity"
  | "malformed_dispatch"
  | "malformed_execution_result"
  | "malformed_input"
  | "malformed_json"
  | "malformed_query"
  | "serialization_failure"
  | "unsupported_job_type"
  | "unsupported_schema_version"

export interface WorkerError {
  readonly code: WorkerErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type WorkerRuntimeResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly WorkerError[] }
