import type { SignalOutcome } from "@/lib/signal-outcome"

export const OUTCOME_EVENT_SCHEMA_VERSION = 1 as const

export const OUTCOME_EVENT_VERSIONS = ["OUTCOME_EVENT_V1"] as const
export const OUTCOME_EVENT_STATUSES = ["RECORDED"] as const
export const OUTCOME_EVENT_SOURCES = ["SIGNAL_OUTCOME"] as const

export type OutcomeEventVersion = typeof OUTCOME_EVENT_VERSIONS[number]
export type OutcomeEventStatus = typeof OUTCOME_EVENT_STATUSES[number]
export type OutcomeEventSource = typeof OUTCOME_EVENT_SOURCES[number]

export interface OutcomeEventIdentity {
  readonly eventId: string
  readonly outcomeId: string
  readonly eventVersion: OutcomeEventVersion
}

export interface OutcomeEventPayload {
  readonly signalOutcome: SignalOutcome
}

export interface OutcomeEvent {
  readonly schemaVersion: typeof OUTCOME_EVENT_SCHEMA_VERSION
  readonly identity: OutcomeEventIdentity
  readonly status: OutcomeEventStatus
  readonly source: OutcomeEventSource
  readonly recordedAt: string
  readonly payload: OutcomeEventPayload
}

export type OutcomeRecorderErrorCode =
  | "duplicate_event"
  | "invalid_event_version"
  | "invalid_outcome"
  | "invalid_status"
  | "invalid_timestamp"
  | "malformed_input"
  | "malformed_json"
  | "malformed_payload"
  | "missing_outcome_reference"
  | "missing_signal_reference"
  | "serialization_failure"
  | "unsupported_schema_version"

export interface OutcomeRecorderError {
  readonly code: OutcomeRecorderErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type OutcomeRecorderResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly OutcomeRecorderError[] }

export type OutcomeEventValidationResult = OutcomeRecorderResult<OutcomeEvent>

export interface CreateOutcomeEventInput {
  readonly outcome: SignalOutcome
  readonly recordedAt: string
  readonly eventVersion?: OutcomeEventVersion
  readonly existingEventIds?: ReadonlySet<string>
}

export interface RecordSignalOutcomeOptions {
  readonly recordedAt: string
  readonly eventVersion?: OutcomeEventVersion
  readonly existingEventIds?: ReadonlySet<string>
}
