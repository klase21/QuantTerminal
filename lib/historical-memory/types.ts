import type { OutcomeEvent } from "@/lib/outcome-recorder"
import type { SignalDirection, SignalOutcomeStatus } from "@/lib/signal-evaluation"
import type { TrackingWindowId } from "@/lib/signal-tracking"

export const HISTORICAL_MEMORY_SCHEMA_VERSION = 1 as const

export const HISTORICAL_MEMORY_STATUSES = [
  "CREATED",
  "VERIFIED",
  "INDEXED",
  "ARCHIVED",
] as const

export const HISTORICAL_MEMORY_REFERENCE_TYPES = [
  "OUTCOME_EVENT",
  "EVIDENCE",
  "REPLAY",
  "CONTEXT",
] as const

export type HistoricalMemoryStatus = typeof HISTORICAL_MEMORY_STATUSES[number]
export type HistoricalMemoryReferenceType =
  typeof HISTORICAL_MEMORY_REFERENCE_TYPES[number]

export interface HistoricalMemoryIdentity {
  readonly memoryId: string
  readonly eventId: string
  readonly outcomeId: string
}

export interface HistoricalMemoryReference {
  readonly referenceType: HistoricalMemoryReferenceType
  readonly referenceId: string
}

export interface HistoricalMemoryRecord {
  readonly schemaVersion: typeof HISTORICAL_MEMORY_SCHEMA_VERSION
  readonly identity: HistoricalMemoryIdentity
  readonly status: HistoricalMemoryStatus
  readonly createdAt: string
  readonly outcomeEvent: OutcomeEvent
  readonly references: readonly HistoricalMemoryReference[]
}

export interface HistoricalMemoryDateRange {
  readonly from: string
  readonly to: string
}

export interface HistoricalMemoryQuery {
  readonly symbol?: string
  readonly timeframe?: string
  readonly direction?: SignalDirection
  readonly evaluationWindow?: TrackingWindowId
  readonly outcomeStatus?: SignalOutcomeStatus
  /** Inclusive range over the Outcome evaluation boundary. */
  readonly dateRange?: HistoricalMemoryDateRange
}

export type HistoricalMemoryErrorCode =
  | "duplicate_memory_identity"
  | "identity_mismatch"
  | "immutable_fact_conflict"
  | "invalid_lifecycle"
  | "invalid_outcome_reference"
  | "invalid_query"
  | "invalid_timestamp"
  | "malformed_input"
  | "malformed_json"
  | "malformed_reference"
  | "serialization_failure"
  | "unsupported_schema_version"

export interface HistoricalMemoryError {
  readonly code: HistoricalMemoryErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type HistoricalMemoryResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly HistoricalMemoryError[] }

export type HistoricalMemoryValidationResult =
  HistoricalMemoryResult<HistoricalMemoryRecord>

export interface CreateHistoricalMemoryInput {
  readonly outcomeEvent: OutcomeEvent
  readonly createdAt: string
  readonly references?: readonly HistoricalMemoryReference[]
  readonly existingMemoryIds?: ReadonlySet<string>
}
