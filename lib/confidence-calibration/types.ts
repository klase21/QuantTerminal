import type { LearningRecord } from "@/lib/learning-runtime"
import type { PatternRecord } from "@/lib/pattern-runtime"
import type { SignalDirection } from "@/lib/signal-evaluation"

export const CALIBRATION_SCHEMA_VERSION = 1 as const

export const CALIBRATION_STATUSES = [
  "DRAFT",
  "CANDIDATE",
  "VALIDATED",
  "REJECTED",
  "SUPERSEDED",
  "ARCHIVED",
] as const

export const CALIBRATION_BANDS = [
  "VERY_LOW",
  "LOW",
  "MODERATE",
  "HIGH",
  "VERY_HIGH",
  "UNAVAILABLE",
] as const

export type CalibrationStatus = typeof CALIBRATION_STATUSES[number]
export type CalibrationBand = typeof CALIBRATION_BANDS[number]

export interface CalibrationDateRange {
  readonly from: string
  readonly to: string
}

export interface CalibrationScope {
  readonly symbol: string | null
  readonly timeframe: string | null
  readonly direction: SignalDirection | null
  readonly dateRange: CalibrationDateRange | null
}

export interface CalibrationMethod {
  readonly methodId: string
  readonly methodVersion: number
}

export type CalibrationEvidence =
  | { readonly evidenceType: "LEARNING"; readonly learning: LearningRecord }
  | { readonly evidenceType: "PATTERN"; readonly pattern: PatternRecord }

export interface CalibrationIdentity {
  readonly calibrationId: string
  readonly calibrationVersion: number
  readonly scope: CalibrationScope
  readonly learningSetHash: string
  readonly patternSetHash: string
}

export interface CalibrationModel {
  readonly rawConfidence: number | null
  readonly calibratedConfidence: number | null
  readonly calibrationBand: CalibrationBand
  readonly sampleSize: number
  readonly observedWinRate: number | null
  readonly expectedReturnPercent: number | null
  readonly averageDrawdown: number | null
  readonly calibrationMethod: CalibrationMethod
  readonly applicableConditions: readonly string[]
  readonly failureConditions: readonly string[]
}

export interface CalibrationRecord {
  readonly schemaVersion: typeof CALIBRATION_SCHEMA_VERSION
  readonly identity: CalibrationIdentity
  readonly status: CalibrationStatus
  readonly createdAt: string
  readonly evidence: readonly CalibrationEvidence[]
  /** Caller-supplied trust interpretation; never calculated by this runtime. */
  readonly calibration: CalibrationModel
}

export interface CalibrationQuery {
  readonly symbol?: string
  readonly timeframe?: string
  readonly direction?: SignalDirection
  readonly calibrationStatus?: CalibrationStatus
  readonly calibrationBand?: CalibrationBand
  readonly minimumSampleSize?: number
  readonly learningId?: string
  readonly patternId?: string
  readonly dateRange?: CalibrationDateRange
}

export type CalibrationErrorCode =
  | "duplicate_calibration_identity"
  | "duplicate_evidence_reference"
  | "identity_mismatch"
  | "immutable_calibration_conflict"
  | "invalid_band"
  | "invalid_confidence_range"
  | "invalid_evidence_reference"
  | "invalid_lifecycle"
  | "invalid_method"
  | "invalid_query"
  | "invalid_sample_metric"
  | "invalid_scope"
  | "invalid_timestamp"
  | "invalid_version"
  | "malformed_input"
  | "malformed_json"
  | "missing_calibration_identity"
  | "missing_evidence_reference"
  | "serialization_failure"
  | "unsupported_schema_version"
  | "version_required"

export interface CalibrationError {
  readonly code: CalibrationErrorCode
  readonly message: string
  readonly field?: string
  readonly cause?: unknown
}

export type CalibrationResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly errors: readonly CalibrationError[] }

export type CalibrationValidationResult = CalibrationResult<CalibrationRecord>

export interface CreateCalibrationInput {
  readonly calibrationVersion: number
  readonly scope: CalibrationScope
  readonly createdAt: string
  readonly learningRecords: readonly LearningRecord[]
  readonly patternRecords: readonly PatternRecord[]
  readonly calibration: CalibrationModel
  readonly existingCalibrationIds?: ReadonlySet<string>
}
