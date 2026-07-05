export const CRON_ADAPTER_SCHEMA_VERSION = 1 as const

export const CRON_PROVIDERS = [
  "LOCAL",
  "VERCEL",
  "GITHUB_ACTIONS",
  "MANUAL",
] as const

export const CRON_TRIGGER_TYPES = ["SCHEDULED", "MANUAL"] as const

export const TRIGGER_LIFECYCLE_STATES = [
  "RECEIVED",
  "VALIDATED",
  "NORMALIZED",
  "ACTIVATED",
  "REJECTED",
  "ARCHIVED",
] as const

export type CronProvider = typeof CRON_PROVIDERS[number]
export type CronTriggerType = typeof CRON_TRIGGER_TYPES[number]
export type TriggerLifecycleState = typeof TRIGGER_LIFECYCLE_STATES[number]

export type CronMetadataPrimitive = string | number | boolean | null
export type CronMetadataValue =
  | CronMetadataPrimitive
  | CronMetadataObject
  | CronMetadataArray

export interface CronMetadataObject {
  readonly [key: string]: CronMetadataValue
}

export interface CronMetadataArray extends ReadonlyArray<CronMetadataValue> {}

export interface TriggerRequest {
  readonly schemaVersion: typeof CRON_ADAPTER_SCHEMA_VERSION
  readonly triggerId: string
  readonly provider: CronProvider
  readonly requestedAt: string
  readonly triggerType: CronTriggerType
  readonly executionScope: string
  readonly metadata: CronMetadataObject
}

export interface CreateTriggerRequestInput {
  readonly provider: CronProvider
  readonly requestedAt: string
  readonly triggerType: CronTriggerType
  readonly executionScope: string
  readonly metadata: CronMetadataObject
}

export interface SchedulerActivationRequest {
  readonly schemaVersion: typeof CRON_ADAPTER_SCHEMA_VERSION
  readonly activationId: string
  readonly triggerId: string
  readonly executionPlanIds: readonly string[]
  readonly activationReason: string
}

export interface TriggerLifecycleEntry {
  readonly state: TriggerLifecycleState
  readonly occurredAt: string
}

export interface TriggerRecord {
  readonly schemaVersion: typeof CRON_ADAPTER_SCHEMA_VERSION
  readonly request: TriggerRequest
  readonly state: TriggerLifecycleState
  readonly history: readonly TriggerLifecycleEntry[]
}

export interface TriggerTranslationResult {
  readonly trigger: TriggerRecord
  readonly activation: SchedulerActivationRequest
}

export interface TriggerQuery {
  readonly triggerId?: string
  readonly provider?: CronProvider
  readonly lifecycle?: TriggerLifecycleState
  readonly requestedAfter?: string
  readonly requestedBefore?: string
}

export type CronAdapterErrorCode =
  | "duplicate_trigger"
  | "invalid_lifecycle"
  | "invalid_lifecycle_transition"
  | "invalid_provider"
  | "invalid_timestamp"
  | "malformed_activation"
  | "malformed_input"
  | "malformed_json"
  | "malformed_query"
  | "malformed_trigger"
  | "serialization_failure"
  | "unsupported_schema_version"

export interface CronAdapterError {
  readonly code: CronAdapterErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type CronAdapterResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly CronAdapterError[] }

