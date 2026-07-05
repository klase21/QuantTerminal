import type {
  CronMetadataObject,
  CronTriggerAdapter,
  SchedulerActivationRequest,
  TriggerRecord,
} from "@/lib/cron-adapter"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { ExecutionPlan, SchedulerJobType } from "@/lib/scheduler-runtime"
import type {
  WorkerDispatcher,
  WorkerExecutionReceipt,
} from "@/lib/worker-runtime"

export const LOCAL_RUNNER_SCHEMA_VERSION = 1 as const

export const LOCAL_RUNNER_STATUSES = [
  "SUCCESS",
  "PARTIAL",
  "UNAVAILABLE",
  "VALIDATION_ERROR",
  "CONFLICT",
  "NOT_IMPLEMENTED",
  "STORAGE_UNAVAILABLE",
  "EXECUTION_ERROR",
] as const

export const LOCAL_TRIGGER_PROVIDERS = ["LOCAL", "MANUAL"] as const

export type LocalRunnerStatus = typeof LOCAL_RUNNER_STATUSES[number]
export type LocalTriggerProvider = typeof LOCAL_TRIGGER_PROVIDERS[number]

export interface LocalRunRequest {
  readonly schemaVersion: typeof LOCAL_RUNNER_SCHEMA_VERSION
  readonly runId: string
  readonly requestedAt: string
  readonly triggerProvider: LocalTriggerProvider
  readonly executionScope: string
  readonly jobTypes: readonly SchedulerJobType[]
  readonly dryRun: boolean
  readonly metadata: CronMetadataObject
}

export interface LocalRunnerError {
  readonly code: string
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export interface LocalRunnerResult<T> {
  readonly status: LocalRunnerStatus
  readonly value?: T
  readonly errors: readonly LocalRunnerError[]
}

export interface LocalExecutionResult {
  readonly plan: ExecutionPlan
  readonly receipt: WorkerExecutionReceipt
}

export interface LocalRunSummary {
  readonly request: LocalRunRequest
  readonly trigger: TriggerRecord
  readonly activation: SchedulerActivationRequest
  readonly executions: readonly LocalExecutionResult[]
  readonly operationalRecordIds: readonly string[]
  readonly dryRun: boolean
}

export interface LocalRunIdentityRegistry {
  claim(runId: string): boolean
}

export interface LocalRunnerBootstrap {
  readonly cronAdapter: CronTriggerAdapter
  readonly workerDispatcher: WorkerDispatcher
  readonly repository: PersistenceRepository | null
  readonly storageStatus: "READY" | "UNAVAILABLE"
  readonly runRegistry: LocalRunIdentityRegistry
  readonly now: () => string
  readonly handlerMode: "NO_OP" | "NOT_IMPLEMENTED"
}

export interface LocalRunnerBootstrapOptions {
  readonly dryRun: boolean
  readonly databasePath?: string
  readonly handlerMode?: "NO_OP" | "NOT_IMPLEMENTED"
  readonly now?: () => string
}
