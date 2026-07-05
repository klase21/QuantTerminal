export const CONTEXT_SNAPSHOT_SCHEMA_VERSION = 1 as const

export const CONTEXT_EVIDENCE_CATEGORIES = [
  "MARKET",
  "DERIVATIVES",
  "ETF",
  "MACRO",
  "PREDICTION",
  "SECTOR",
  "NEWS",
  "RESEARCH",
  "EXCHANGE",
] as const

export const CONTEXT_EVIDENCE_FRESHNESS = [
  "LIVE",
  "CURRENT",
  "STALE",
  "EXPIRED",
  "UNAVAILABLE",
] as const

export const CONTEXT_EVIDENCE_AVAILABILITY = ["AVAILABLE", "UNAVAILABLE"] as const
export const CONTEXT_SNAPSHOT_STATES = ["CREATED", "FINALIZED", "ARCHIVED"] as const

export type ContextEvidenceCategory = typeof CONTEXT_EVIDENCE_CATEGORIES[number]
export type ContextEvidenceFreshness = typeof CONTEXT_EVIDENCE_FRESHNESS[number]
export type ContextEvidenceAvailability = typeof CONTEXT_EVIDENCE_AVAILABILITY[number]
export type ContextSnapshotState = typeof CONTEXT_SNAPSHOT_STATES[number]

export type ContextJsonPrimitive = string | number | boolean | null
export type ContextJsonValue =
  | ContextJsonPrimitive
  | readonly ContextJsonValue[]
  | { readonly [key: string]: ContextJsonValue }

export interface ContextEvidenceItem {
  readonly category: ContextEvidenceCategory
  readonly sourceId: string | null
  readonly observedAt: string | null
  readonly freshness: ContextEvidenceFreshness
  readonly availability: ContextEvidenceAvailability
  readonly payload: ContextJsonValue | null
  readonly unavailableReason: string | null
}

export interface ContextSnapshotIdentity {
  readonly contextSnapshotId: string
  readonly signalId: string
  readonly snapshotVersion: number
}

export interface ContextSnapshot {
  readonly schemaVersion: typeof CONTEXT_SNAPSHOT_SCHEMA_VERSION
  readonly identity: ContextSnapshotIdentity
  readonly signalSnapshotId: string
  readonly lifecycleState: ContextSnapshotState
  readonly capturedAt: string
  readonly evidenceSetHash: string
  readonly evidence: readonly ContextEvidenceItem[]
}

export interface CreateContextSnapshotInput {
  readonly signalId: string
  readonly signalSnapshotId: string
  readonly snapshotVersion: number
  readonly capturedAt: string
  readonly evidence: readonly ContextEvidenceItem[]
  readonly existingSnapshotIds?: ReadonlySet<string>
}

export interface ContextSnapshotDateRange {
  readonly from: string
  readonly to: string
}

export interface ContextSnapshotQuery {
  readonly signalId?: string
  readonly sourceId?: string
  readonly category?: ContextEvidenceCategory
  readonly observedAtRange?: ContextSnapshotDateRange
}

export type ContextSnapshotErrorCode =
  | "duplicate_identity"
  | "duplicate_source"
  | "identity_mismatch"
  | "immutable_snapshot"
  | "invalid_category"
  | "invalid_lifecycle"
  | "invalid_query"
  | "invalid_timestamp"
  | "malformed_evidence"
  | "malformed_input"
  | "malformed_json"
  | "malformed_payload"
  | "merge_conflict"
  | "missing_signal_reference"
  | "serialization_failure"
  | "unsupported_schema_version"

export interface ContextSnapshotError {
  readonly code: ContextSnapshotErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type ContextSnapshotResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly ContextSnapshotError[] }

export type ContextSnapshotValidationResult = ContextSnapshotResult<ContextSnapshot>
