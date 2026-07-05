import type { CalibrationRecord } from "@/lib/confidence-calibration"
import type { ContextSnapshot } from "@/lib/context-snapshot"
import type { HistoricalMemoryRecord } from "@/lib/historical-memory"
import type { LearningRecord } from "@/lib/learning-runtime"
import type { OutcomeEvent } from "@/lib/outcome-recorder"
import type { PatternRecord } from "@/lib/pattern-runtime"
import type { PlaybookRecord } from "@/lib/playbook-runtime"
import type {
  OperationalRecordKind,
  StorageRecordKind,
} from "@/lib/persistence/recordKind"
import type {
  StorageJsonValue,
  StorageListQuery,
  StorageParentRef,
  StorageRecordLocator,
} from "@/lib/persistence/types"
import type { SignalEvaluationResult } from "@/lib/signal-evaluation"
import type { SignalOutcome } from "@/lib/signal-outcome"
import type { TrackingLifecycle } from "@/lib/signal-tracking"

export const SUPPORTED_RUNTIME_RECORD_KINDS = [
  "CONTEXT_SNAPSHOT",
  "SIGNAL_TRACKING",
  "SIGNAL_EVALUATION",
  "SIGNAL_OUTCOME",
  "OUTCOME_EVENT",
  "HISTORICAL_MEMORY",
  "PATTERN",
  "LEARNING",
  "CONFIDENCE_CALIBRATION",
  "PLAYBOOK",
] as const

export type SupportedRuntimeRecordKind = typeof SUPPORTED_RUNTIME_RECORD_KINDS[number]

export const HISTORICAL_PROVIDER_TIERS = ["CANONICAL", "VERIFIED", "EXPERIMENTAL", "UNKNOWN"] as const
export type HistoricalProviderTier = typeof HISTORICAL_PROVIDER_TIERS[number]

export interface HistoricalProviderMetadata {
  readonly providerTier: HistoricalProviderTier
  readonly canonical: boolean
  readonly verified: boolean
  readonly confidence: number
}

export const HISTORICAL_DATASET_RESOLUTIONS = ["5m", "8h_event", "tick"] as const
export type HistoricalDatasetResolution = typeof HISTORICAL_DATASET_RESOLUTIONS[number]

export const HISTORICAL_COVERAGE_MODES = [
  "time_series",
  "time_series_experimental",
  "event",
  "event_stream",
] as const
export type HistoricalCoverageMode = typeof HISTORICAL_COVERAGE_MODES[number]

export interface HistoricalDatasetResolutionMetadata {
  readonly resolution: HistoricalDatasetResolution
  readonly coverageMode: HistoricalCoverageMode
  readonly expectedCadenceMinutes: number | null
  readonly expectedCadenceHours: number | null
  readonly expectedDailyRecords: number | null
  readonly variableDailyRecords: boolean
}

export interface SignalSnapshotPersistenceIntent {
  readonly snapshotId: string
  readonly signalId: string
  readonly schemaVersion: number
  readonly createdAt: string
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export interface PriceObservationPersistenceIntent {
  readonly observationId: string
  readonly trackingId: string
  readonly windowId: string
  readonly schemaVersion: number
  readonly observedAt: string
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly jobStateRecordId?: string
  readonly checksum?: string
}

export interface HistoricalMarketPersistenceIntent extends HistoricalProviderMetadata, HistoricalDatasetResolutionMetadata {
  readonly recordId: string
  readonly sourceId: string
  readonly dataset: string
  readonly symbol: string
  readonly interval: string
  readonly observedAt: string
  readonly schemaVersion: number
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export interface HistoricalFundingPersistenceIntent extends HistoricalProviderMetadata, HistoricalDatasetResolutionMetadata {
  readonly recordId: string
  readonly sourceId: string
  readonly symbol: string
  readonly fundingTime: string
  readonly schemaVersion: number
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export interface HistoricalOpenInterestPersistenceIntent extends HistoricalProviderMetadata, HistoricalDatasetResolutionMetadata {
  readonly recordId: string
  readonly sourceId: string
  readonly symbol: string
  readonly observedAt: string
  readonly schemaVersion: number
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export interface HistoricalLiquidationPersistenceIntent extends HistoricalProviderMetadata, HistoricalDatasetResolutionMetadata {
  readonly recordId: string
  readonly sourceId: string
  readonly symbol: string
  readonly observedAt: string
  readonly schemaVersion: number
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export interface HistoricalAggTradePersistenceIntent extends HistoricalProviderMetadata, HistoricalDatasetResolutionMetadata {
  readonly recordId: string
  readonly sourceId: string
  readonly symbol: string
  readonly aggregateTradeId: number
  readonly observedAt: string
  readonly schemaVersion: number
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export const HISTORICAL_PROVIDER_METADATA_TARGET_KINDS = [
  "HISTORICAL_MARKET",
  "HISTORICAL_FUNDING",
  "HISTORICAL_OPEN_INTEREST",
  "HISTORICAL_LIQUIDATION",
  "HISTORICAL_AGG_TRADE",
] as const

export type HistoricalProviderMetadataTargetKind =
  typeof HISTORICAL_PROVIDER_METADATA_TARGET_KINDS[number]

export interface HistoricalProviderMetadataPersistenceIntent extends HistoricalProviderMetadata {
  readonly targetRecordId: string
  readonly targetRecordKind: HistoricalProviderMetadataTargetKind
  readonly sourceId: string
  readonly symbol: string
  readonly observedAt: string
  readonly schemaVersion: number
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export interface HistoricalDatasetMetadataPersistenceIntent
  extends HistoricalProviderMetadata, HistoricalDatasetResolutionMetadata {
  readonly datasetKind: HistoricalProviderMetadataTargetKind
  readonly sourceId: string
  readonly symbol: string
  readonly contractVersion: number
  readonly effectiveAt: string
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export type HistoricalCoverageProjectionStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "MISSING"
  | "UNAVAILABLE"
  | "EXPERIMENTAL"
  | "VARIABLE"

export type HistoricalProjectionProviderAvailabilityStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "UNKNOWN"
  | "NOT_CHECKED"

export interface HistoricalCoverageProjectionPersistenceIntent extends HistoricalProviderMetadata {
  readonly projectionKind: "REPOSITORY_COVERAGE"
  readonly datasetKind: HistoricalProviderMetadataTargetKind
  readonly symbol: string
  readonly utcDay: string
  readonly resolution: HistoricalDatasetResolution
  readonly coverageMode: HistoricalCoverageMode
  readonly expectedRecords: number | null
  readonly actualRecords: number
  readonly coverageStatus: HistoricalCoverageProjectionStatus
  readonly coveragePercent: number | null
  readonly providerAvailabilityStatus: HistoricalProjectionProviderAvailabilityStatus
  readonly provider: string
  readonly firstObservedAt: string | null
  readonly lastObservedAt: string | null
  readonly reason: string
  readonly computedAt: string
  readonly sourceRepositoryWatermark: string
  readonly sourceRecordCount: number
  readonly stale: boolean
  readonly recomputeRequired: boolean
  readonly projectionVersion: number
  readonly schemaVersion: number
  readonly recordedAt: string
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export interface RuntimeRecordMap {
  readonly CONTEXT_SNAPSHOT: ContextSnapshot
  readonly SIGNAL_TRACKING: TrackingLifecycle
  readonly SIGNAL_EVALUATION: SignalEvaluationResult
  readonly SIGNAL_OUTCOME: SignalOutcome
  readonly OUTCOME_EVENT: OutcomeEvent
  readonly HISTORICAL_MEMORY: HistoricalMemoryRecord
  readonly PATTERN: PatternRecord
  readonly LEARNING: LearningRecord
  readonly CONFIDENCE_CALIBRATION: CalibrationRecord
  readonly PLAYBOOK: PlaybookRecord
}

export interface RuntimeRecordPersistenceIntent {
  readonly recordKind: StorageRecordKind
  readonly runtimeRecord: unknown
  readonly recordedAt: string
  readonly checksum?: string
}

export interface TypedRuntimeRecordPersistenceIntent<
  TKind extends SupportedRuntimeRecordKind,
> extends RuntimeRecordPersistenceIntent {
  readonly recordKind: TKind
  readonly runtimeRecord: RuntimeRecordMap[TKind]
}

export interface RepositoryMappingMetadata {
  readonly recordedAt: string
  readonly checksum?: string
}

export const OPERATIONAL_RECORD_TYPES = [
  "SchedulerRun",
  "WorkerLock",
  "RetryState",
  "JobState",
  "DeadLetter",
] as const

export type OperationalRecordType = typeof OPERATIONAL_RECORD_TYPES[number]

export interface OperationalRecordBase<TType extends OperationalRecordType> {
  readonly operationalType: TType
  readonly recordId: string
  readonly operationalVersion: string
  readonly schemaVersion: number
  readonly createdAt: string
  readonly parentRefs: readonly StorageParentRef[]
  readonly payload: StorageJsonValue
}

export type SchedulerRun = OperationalRecordBase<"SchedulerRun">
export type WorkerLock = OperationalRecordBase<"WorkerLock">
export type RetryState = OperationalRecordBase<"RetryState">
export type JobState = OperationalRecordBase<"JobState">
export type DeadLetter = OperationalRecordBase<"DeadLetter">

export type OperationalRecord =
  | SchedulerRun
  | WorkerLock
  | RetryState
  | JobState
  | DeadLetter

export interface OperationalRecordPersistenceIntent {
  readonly operationalRecord: OperationalRecord
  readonly recordedAt: string
  readonly checksum?: string
}

export interface OperationalRecordLocator extends StorageRecordLocator {
  readonly recordKind: OperationalRecordKind
}

export interface OperationalRecordListQuery extends Omit<StorageListQuery, "recordKinds"> {
  readonly recordKinds?: readonly OperationalRecordKind[]
}

const OPERATIONAL_TYPE_SET = new Set<string>(OPERATIONAL_RECORD_TYPES)

export function isOperationalRecordType(
  value: unknown,
): value is OperationalRecordType {
  return typeof value === "string" && OPERATIONAL_TYPE_SET.has(value)
}

const SUPPORTED_KIND_SET = new Set<string>(SUPPORTED_RUNTIME_RECORD_KINDS)

export function isSupportedRuntimeRecordKind(
  value: unknown,
): value is SupportedRuntimeRecordKind {
  return typeof value === "string" && SUPPORTED_KIND_SET.has(value)
}
