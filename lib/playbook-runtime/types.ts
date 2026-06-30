import type { CalibrationRecord } from "@/lib/confidence-calibration"
import type { LearningRecord } from "@/lib/learning-runtime"
import type { SignalDirection } from "@/lib/signal-evaluation"

export const PLAYBOOK_SCHEMA_VERSION = 1 as const

export const PLAYBOOK_STATUSES = [
  "DRAFT",
  "CANDIDATE",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
  "ARCHIVED",
] as const

export type PlaybookStatus = typeof PLAYBOOK_STATUSES[number]
export type PlaybookDecision = "APPROVED" | "REJECTED" | null

export interface PlaybookDateRange {
  readonly from: string
  readonly to: string
}

export interface PlaybookScope {
  readonly symbol: string | null
  readonly timeframe: string | null
  readonly direction: SignalDirection | null
  readonly dateRange: PlaybookDateRange | null
}

export interface PlaybookIdentity {
  readonly playbookId: string
  readonly playbookVersion: number
  readonly scope: PlaybookScope
  readonly learningSetHash: string
  readonly calibrationSetHash: string
}

export type PlaybookEvidence =
  | { readonly evidenceType: "LEARNING"; readonly learning: LearningRecord }
  | { readonly evidenceType: "CALIBRATION"; readonly calibration: CalibrationRecord }

export interface PlaybookRule {
  readonly title: string
  readonly summary: string
  readonly applicableConditions: readonly string[]
  readonly entryConditions: readonly string[]
  readonly exitConditions: readonly string[]
  readonly riskConditions: readonly string[]
  readonly invalidationConditions: readonly string[]
  readonly failureConditions: readonly string[]
  readonly supportingLearningIds: readonly string[]
  readonly supportingCalibrationIds: readonly string[]
}

export interface PlaybookLifecycle {
  readonly status: PlaybookStatus
  readonly decision: PlaybookDecision
  readonly decidedBy: string | null
  readonly decidedAt: string | null
}

export interface PlaybookRecord {
  readonly schemaVersion: typeof PLAYBOOK_SCHEMA_VERSION
  readonly identity: PlaybookIdentity
  readonly lifecycle: PlaybookLifecycle
  readonly createdAt: string
  readonly evidence: readonly PlaybookEvidence[]
  readonly rules: readonly PlaybookRule[]
}

export interface PlaybookQuery {
  readonly symbol?: string
  readonly timeframe?: string
  readonly direction?: SignalDirection
  readonly status?: PlaybookStatus
  readonly learningId?: string
  readonly calibrationId?: string
  readonly minimumSampleSize?: number
  readonly dateRange?: PlaybookDateRange
}

export type PlaybookErrorCode =
  | "duplicate_evidence_reference"
  | "duplicate_playbook_identity"
  | "identity_mismatch"
  | "immutable_rule_conflict"
  | "invalid_evidence_reference"
  | "invalid_lifecycle"
  | "invalid_query"
  | "invalid_scope"
  | "invalid_timestamp"
  | "invalid_version"
  | "malformed_input"
  | "malformed_json"
  | "malformed_rule"
  | "missing_calibration_reference"
  | "missing_learning_reference"
  | "missing_playbook_identity"
  | "serialization_failure"
  | "unsupported_schema_version"
  | "version_required"

export interface PlaybookError {
  readonly code: PlaybookErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type PlaybookResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly PlaybookError[] }

export type PlaybookValidationResult = PlaybookResult<PlaybookRecord>

export interface CreatePlaybookInput {
  readonly playbookVersion: number
  readonly scope: PlaybookScope
  readonly createdAt: string
  readonly learningRecords: readonly LearningRecord[]
  readonly calibrationRecords: readonly CalibrationRecord[]
  readonly rules: readonly PlaybookRule[]
  readonly existingPlaybookIds?: ReadonlySet<string>
}

export interface PlaybookDecisionInput {
  readonly decidedBy: string
  readonly decidedAt: string
}
