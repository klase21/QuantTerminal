import {
  validateCalibrationRecord,
  type CalibrationRecord,
} from "@/lib/confidence-calibration"
import { validateContextSnapshot, type ContextSnapshot } from "@/lib/context-snapshot"
import {
  validateHistoricalMemory,
  type HistoricalMemoryRecord,
} from "@/lib/historical-memory"
import { validateLearningRecord, type LearningRecord } from "@/lib/learning-runtime"
import { validateOutcomeEvent, type OutcomeEvent } from "@/lib/outcome-recorder"
import { validatePatternRecord, type PatternRecord } from "@/lib/pattern-runtime"
import { validatePlaybookRecord, type PlaybookRecord } from "@/lib/playbook-runtime"
import { createIdempotencyKey } from "@/lib/persistence/idempotency"
import type { StorageRecordKind } from "@/lib/persistence/recordKind"
import type {
  StorageJsonValue,
  StorageParentRef,
  StorageRecord,
} from "@/lib/persistence/types"
import { isStorageJsonValue } from "@/lib/persistence/validation"
import {
  validateSignalEvaluationResult,
  type SignalEvaluationResult,
} from "@/lib/signal-evaluation"
import { validateSignalOutcome, type SignalOutcome } from "@/lib/signal-outcome"
import {
  createTrackingId,
  validateTrackingLifecycle,
  type TrackingLifecycle,
} from "@/lib/signal-tracking"
import { createRepositoryError } from "@/lib/persistence/repository/errors"
import {
  createRepositoryFailure,
  type RepositoryResult,
} from "@/lib/persistence/repository/result"
import type {
  RepositoryMappingMetadata,
  HistoricalMarketPersistenceIntent,
  HistoricalFundingPersistenceIntent,
  HistoricalOpenInterestPersistenceIntent,
  HistoricalLiquidationPersistenceIntent,
  HistoricalAggTradePersistenceIntent,
  HistoricalProviderMetadataPersistenceIntent,
  HistoricalProviderMetadataTargetKind,
  HistoricalDatasetMetadataPersistenceIntent,
  HistoricalCoverageProjectionPersistenceIntent,
  PriceObservationPersistenceIntent,
  RuntimeRecordPersistenceIntent,
  SignalSnapshotPersistenceIntent,
  SupportedRuntimeRecordKind,
} from "@/lib/persistence/repository/types"
import { HISTORICAL_PROVIDER_METADATA_TARGET_KINDS } from "@/lib/persistence/repository/types"
import {
  HISTORICAL_COVERAGE_MODES,
  HISTORICAL_DATASET_RESOLUTIONS,
  type HistoricalDatasetResolutionMetadata,
} from "@/lib/persistence/repository/types"
import {
  validateMappedStorageRecord,
  validateRepositoryIntent,
} from "@/lib/persistence/repository/validation"
import { HISTORICAL_PROVIDER_TIERS, type HistoricalProviderMetadata } from "@/lib/persistence/repository/types"

interface RuntimeValidationSuccess<T> {
  readonly success: true
  readonly value: T
}

interface RuntimeValidationFailure {
  readonly success: false
  readonly errors: readonly unknown[]
}

type RuntimeValidationResult<T> = RuntimeValidationSuccess<T> | RuntimeValidationFailure

const HISTORICAL_PROVIDER_TIER_SET = new Set<string>(HISTORICAL_PROVIDER_TIERS)

function isHistoricalProviderMetadata(value: HistoricalProviderMetadata): boolean {
  if (!HISTORICAL_PROVIDER_TIER_SET.has(value.providerTier)
    || typeof value.canonical !== "boolean"
    || typeof value.verified !== "boolean"
    || !Number.isFinite(value.confidence)
    || value.confidence < 0 || value.confidence > 1) return false
  if (value.providerTier === "CANONICAL") return value.canonical && value.verified && value.confidence === 1
  if (value.providerTier === "VERIFIED") return !value.canonical && value.verified
  if (value.providerTier === "EXPERIMENTAL") return !value.canonical && !value.verified && value.confidence <= 0.65
  return !value.canonical && !value.verified
}

const HISTORICAL_DATASET_RESOLUTION_SET = new Set<string>(HISTORICAL_DATASET_RESOLUTIONS)
const HISTORICAL_COVERAGE_MODE_SET = new Set<string>(HISTORICAL_COVERAGE_MODES)

function isHistoricalDatasetResolutionMetadata(
  value: HistoricalDatasetResolutionMetadata,
): boolean {
  if (!HISTORICAL_DATASET_RESOLUTION_SET.has(value.resolution)
    || !HISTORICAL_COVERAGE_MODE_SET.has(value.coverageMode)
    || (value.expectedCadenceMinutes !== null
      && (!Number.isInteger(value.expectedCadenceMinutes) || value.expectedCadenceMinutes <= 0))
    || (value.expectedCadenceHours !== null
      && (!Number.isInteger(value.expectedCadenceHours) || value.expectedCadenceHours <= 0))
    || (value.expectedDailyRecords !== null
      && (!Number.isInteger(value.expectedDailyRecords) || value.expectedDailyRecords <= 0))
    || typeof value.variableDailyRecords !== "boolean") return false

  if (value.resolution === "5m") {
    return value.expectedCadenceMinutes === 5 && value.expectedCadenceHours === null
      && value.expectedDailyRecords === 288 && !value.variableDailyRecords
      && (value.coverageMode === "time_series" || value.coverageMode === "time_series_experimental")
  }
  if (value.resolution === "8h_event") {
    return value.coverageMode === "event" && value.expectedCadenceMinutes === null
      && value.expectedCadenceHours === 8 && value.expectedDailyRecords === 3
      && !value.variableDailyRecords
  }
  return value.coverageMode === "event_stream" && value.expectedCadenceMinutes === null
    && value.expectedCadenceHours === null && value.expectedDailyRecords === null
    && value.variableDailyRecords
}

function matchesHistoricalDatasetResolution(
  datasetKind: HistoricalProviderMetadataTargetKind,
  value: HistoricalDatasetResolutionMetadata,
  providerTier?: HistoricalProviderMetadata["providerTier"],
): boolean {
  if (datasetKind === "HISTORICAL_FUNDING") return value.resolution === "8h_event"
  if (datasetKind === "HISTORICAL_AGG_TRADE") return value.resolution === "tick"
  if (datasetKind === "HISTORICAL_LIQUIDATION") {
    return value.resolution === "5m"
      && value.coverageMode === (providerTier === "EXPERIMENTAL"
        ? "time_series_experimental" : "time_series")
  }
  return value.resolution === "5m" && value.coverageMode === "time_series"
}

const RUNTIME_VERSIONS: Readonly<Record<SupportedRuntimeRecordKind, string>> = Object.freeze({
  CONTEXT_SNAPSHOT: "context-snapshot-runtime-v1",
  SIGNAL_TRACKING: "signal-tracking-runtime-v1",
  SIGNAL_EVALUATION: "signal-evaluation-runtime-v1",
  SIGNAL_OUTCOME: "signal-outcome-runtime-v1",
  OUTCOME_EVENT: "outcome-recorder-runtime-v1",
  HISTORICAL_MEMORY: "historical-memory-runtime-v1",
  PATTERN: "pattern-runtime-v1",
  LEARNING: "learning-runtime-v1",
  CONFIDENCE_CALIBRATION: "confidence-calibration-runtime-v1",
  PLAYBOOK: "playbook-runtime-v1",
})

function encodeIdentity(value: string): string {
  return encodeURIComponent(value)
}

function createEvaluationRecordId(
  signalId: string,
  snapshotId: string,
  evaluationWindow: string,
): string {
  return [
    "signal-evaluation-v1",
    encodeIdentity(signalId),
    encodeIdentity(snapshotId),
    encodeIdentity(evaluationWindow),
  ].join("|")
}

function createPriceObservationRecordId(
  trackingId: string,
  evaluationWindow: string,
): string {
  return [
    "price-observation-v1",
    encodeIdentity(trackingId),
    encodeIdentity(evaluationWindow),
  ].join(":")
}

function parentRef(recordKind: StorageRecordKind, recordId: string): StorageParentRef {
  return Object.freeze({ recordKind, recordId })
}

function runtimeValidationFailure<T>(
  validation: RuntimeValidationResult<T>,
  identityField: string,
): RepositoryResult<never> | null {
  if (validation.success === true) return null
  const errors = validation.errors
  const missingIdentity = errors.some((error) => {
    if (!error || typeof error !== "object") return false
    const record = error as Record<string, unknown>
    return typeof record.code === "string"
      && (record.code.includes("identity") || record.code.includes("reference"))
  })
  return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
    missingIdentity ? "missing_runtime_identity" : "runtime_validation_failed",
    "Runtime record failed its owning runtime validator.",
    { field: identityField, cause: errors },
  )])
}

function buildStorageRecord<T>(
  recordKind: SupportedRuntimeRecordKind,
  runtimeRecord: T,
  metadata: RepositoryMappingMetadata,
  fields: {
    readonly recordId: string
    readonly identityParts: readonly string[]
    readonly schemaVersion: number
    readonly createdAt: string
    readonly parentRefs: readonly StorageParentRef[]
  },
): RepositoryResult<StorageRecord> {
  const idempotencyKey = createIdempotencyKey(recordKind, fields.identityParts)
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Runtime identity could not produce a canonical idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  if (!isStorageJsonValue(runtimeRecord)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "malformed_storage_record",
      "Validated runtime record is not opaque JSON-safe data.",
      { field: "runtimeRecord" },
    )])
  }

  return validateMappedStorageRecord({
    recordId: fields.recordId,
    recordKind,
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: RUNTIME_VERSIONS[recordKind],
    schemaVersion: fields.schemaVersion,
    createdAt: fields.createdAt,
    recordedAt: metadata.recordedAt,
    parentRefs: fields.parentRefs,
    payload: runtimeRecord as StorageJsonValue,
    ...(metadata.checksum !== undefined ? { checksum: metadata.checksum } : {}),
  })
}

export function mapSignalSnapshot(
  intent: SignalSnapshotPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const snapshotId = intent.snapshotId?.trim()
  const signalId = intent.signalId?.trim()
  if (!snapshotId || !signalId) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Signal Snapshot persistence requires snapshotId and signalId.",
      { field: "snapshotId" },
    )])
  }
  if (!Number.isInteger(intent.schemaVersion) || intent.schemaVersion <= 0
    || !Number.isFinite(Date.parse(intent.createdAt))
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Signal Snapshot persistence metadata or opaque payload is invalid.",
      { field: "payload" },
    )])
  }
  const idempotencyKey = createIdempotencyKey("SIGNAL_SNAPSHOT", [snapshotId])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Signal Snapshot identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId: snapshotId,
    recordKind: "SIGNAL_SNAPSHOT",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "scanner-signal-snapshot-v1",
    schemaVersion: intent.schemaVersion,
    createdAt: intent.createdAt,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

export function mapHistoricalMarketRecord(
  intent: HistoricalMarketPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const identity = [
    intent.sourceId?.trim(),
    intent.dataset?.trim(),
    intent.symbol?.trim(),
    intent.interval?.trim(),
    intent.observedAt,
  ]
  if (!intent.recordId?.trim() || identity.some((part) => !part)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Market persistence requires canonical source, dataset, symbol, interval, observation, and record identities.",
      { field: "recordId" },
    )])
  }
  if (!isHistoricalProviderMetadata(intent) || !isHistoricalDatasetResolutionMetadata(intent)
    || !matchesHistoricalDatasetResolution("HISTORICAL_MARKET", intent, intent.providerTier)
    || !Number.isInteger(intent.schemaVersion) || intent.schemaVersion <= 0
    || !Number.isFinite(Date.parse(intent.observedAt))
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Historical Market metadata or opaque payload is invalid.",
      { field: "payload" },
    )])
  }
  const idempotencyKey = createIdempotencyKey("HISTORICAL_MARKET", identity)
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Market identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId: intent.recordId.trim(),
    recordKind: "HISTORICAL_MARKET",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "historical-backfill-v1",
    schemaVersion: intent.schemaVersion,
    createdAt: intent.observedAt,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

export function mapHistoricalFundingRecord(
  intent: HistoricalFundingPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const recordId = intent.recordId?.trim()
  const sourceId = intent.sourceId?.trim()
  const symbol = intent.symbol?.trim()
  if (!recordId || !sourceId || !symbol || !Number.isFinite(Date.parse(intent.fundingTime))) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Funding persistence requires record, source, symbol, and provider funding-time identities.",
      { field: "recordId" },
    )])
  }
  if (!isHistoricalProviderMetadata(intent) || !isHistoricalDatasetResolutionMetadata(intent)
    || !matchesHistoricalDatasetResolution("HISTORICAL_FUNDING", intent, intent.providerTier)
    || !Number.isInteger(intent.schemaVersion) || intent.schemaVersion <= 0
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Historical Funding metadata or opaque payload is invalid.",
      { field: "payload" },
    )])
  }
  const idempotencyKey = createIdempotencyKey("HISTORICAL_FUNDING", [sourceId, symbol, intent.fundingTime])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Funding identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId,
    recordKind: "HISTORICAL_FUNDING",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "historical-funding-backfill-v1",
    schemaVersion: intent.schemaVersion,
    createdAt: intent.fundingTime,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

export function mapHistoricalOpenInterestRecord(
  intent: HistoricalOpenInterestPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const recordId = intent.recordId?.trim()
  const sourceId = intent.sourceId?.trim()
  const symbol = intent.symbol?.trim()
  if (!recordId || !sourceId || !symbol || !Number.isFinite(Date.parse(intent.observedAt))) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Open Interest persistence requires record, source, symbol, and provider observation-time identities.",
      { field: "recordId" },
    )])
  }
  if (!isHistoricalProviderMetadata(intent) || !isHistoricalDatasetResolutionMetadata(intent)
    || !matchesHistoricalDatasetResolution("HISTORICAL_OPEN_INTEREST", intent, intent.providerTier)
    || !Number.isInteger(intent.schemaVersion) || intent.schemaVersion <= 0
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Historical Open Interest metadata or opaque payload is invalid.",
      { field: "payload" },
    )])
  }
  const idempotencyKey = createIdempotencyKey("HISTORICAL_OPEN_INTEREST", [sourceId, symbol, intent.observedAt])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Open Interest identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId,
    recordKind: "HISTORICAL_OPEN_INTEREST",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "historical-open-interest-backfill-v1",
    schemaVersion: intent.schemaVersion,
    createdAt: intent.observedAt,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

export function mapHistoricalLiquidationRecord(
  intent: HistoricalLiquidationPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const recordId = intent.recordId?.trim()
  const sourceId = intent.sourceId?.trim()
  const symbol = intent.symbol?.trim()
  if (!recordId || !sourceId || !symbol || !Number.isFinite(Date.parse(intent.observedAt))) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Liquidation persistence requires record, source, symbol, and provider observation-time identities.",
      { field: "recordId" },
    )])
  }
  if (!isHistoricalProviderMetadata(intent) || !isHistoricalDatasetResolutionMetadata(intent)
    || !matchesHistoricalDatasetResolution("HISTORICAL_LIQUIDATION", intent, intent.providerTier)
    || !Number.isInteger(intent.schemaVersion) || intent.schemaVersion <= 0
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Historical Liquidation metadata or opaque payload is invalid.",
      { field: "payload" },
    )])
  }
  const idempotencyKey = createIdempotencyKey("HISTORICAL_LIQUIDATION", [sourceId, symbol, intent.recordId])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Liquidation identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId,
    recordKind: "HISTORICAL_LIQUIDATION",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "historical-liquidation-backfill-v1",
    schemaVersion: intent.schemaVersion,
    createdAt: intent.observedAt,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

export function mapHistoricalAggTradeRecord(
  intent: HistoricalAggTradePersistenceIntent,
): RepositoryResult<StorageRecord> {
  const recordId = intent.recordId?.trim()
  const sourceId = intent.sourceId?.trim()
  const symbol = intent.symbol?.trim()
  if (!recordId || !sourceId || !symbol || !Number.isSafeInteger(intent.aggregateTradeId)
    || intent.aggregateTradeId < 0 || !Number.isFinite(Date.parse(intent.observedAt))) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical AggTrade persistence requires record, source, symbol, aggregate-trade, and provider observation-time identities.",
      { field: "recordId" },
    )])
  }
  if (!isHistoricalProviderMetadata(intent) || !isHistoricalDatasetResolutionMetadata(intent)
    || !matchesHistoricalDatasetResolution("HISTORICAL_AGG_TRADE", intent, intent.providerTier)
    || !Number.isInteger(intent.schemaVersion) || intent.schemaVersion <= 0
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Historical AggTrade metadata or opaque payload is invalid.",
      { field: "payload" },
    )])
  }
  const idempotencyKey = createIdempotencyKey("HISTORICAL_AGG_TRADE", [sourceId, symbol, String(intent.aggregateTradeId)])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical AggTrade identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId,
    recordKind: "HISTORICAL_AGG_TRADE",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "historical-agg-trade-backfill-v1",
    schemaVersion: intent.schemaVersion,
    createdAt: intent.observedAt,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

const HISTORICAL_PROVIDER_METADATA_TARGET_SET = new Set<string>(
  HISTORICAL_PROVIDER_METADATA_TARGET_KINDS,
)

export function mapHistoricalProviderMetadata(
  intent: HistoricalProviderMetadataPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const targetRecordId = intent.targetRecordId?.trim()
  const sourceId = intent.sourceId?.trim()
  const symbol = intent.symbol?.trim()
  if (!targetRecordId || !sourceId || !symbol
    || !HISTORICAL_PROVIDER_METADATA_TARGET_SET.has(intent.targetRecordKind)
    || !Number.isFinite(Date.parse(intent.observedAt))) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Provider Metadata requires a canonical target, source, symbol, and observation identity.",
    )])
  }
  if (!isHistoricalProviderMetadata(intent)
    || !Number.isInteger(intent.schemaVersion) || intent.schemaVersion <= 0
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Historical Provider Metadata or opaque payload is invalid.",
    )])
  }
  const recordId = [
    "historical-provider-metadata-v1",
    intent.targetRecordKind,
    encodeURIComponent(targetRecordId),
  ].join(":")
  const idempotencyKey = createIdempotencyKey("HISTORICAL_PROVIDER_METADATA", [
    intent.targetRecordKind,
    targetRecordId,
  ])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Provider Metadata identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId,
    recordKind: "HISTORICAL_PROVIDER_METADATA",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "historical-provider-metadata-v1",
    schemaVersion: intent.schemaVersion,
    createdAt: intent.observedAt,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([{
      recordId: targetRecordId,
      recordKind: intent.targetRecordKind,
    }]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

export function mapHistoricalDatasetMetadata(
  intent: HistoricalDatasetMetadataPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const sourceId = intent.sourceId?.trim()
  const symbol = intent.symbol?.trim()
  if (!sourceId || !symbol
    || !HISTORICAL_PROVIDER_METADATA_TARGET_SET.has(intent.datasetKind)
    || !Number.isInteger(intent.contractVersion) || intent.contractVersion <= 0
    || !Number.isFinite(Date.parse(intent.effectiveAt))) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Dataset Metadata requires a dataset, source, symbol, version, and effective timestamp.",
    )])
  }
  if (!isHistoricalProviderMetadata(intent) || !isHistoricalDatasetResolutionMetadata(intent)
    || !matchesHistoricalDatasetResolution(intent.datasetKind, intent, intent.providerTier)
    || (intent.coverageMode === "time_series_experimental") !== (intent.providerTier === "EXPERIMENTAL")
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Historical Dataset Metadata provider or resolution contract is invalid.",
    )])
  }
  const recordId = [
    "historical-dataset-metadata-v1",
    intent.datasetKind,
    encodeURIComponent(sourceId),
    encodeURIComponent(symbol),
    String(intent.contractVersion),
  ].join(":")
  const idempotencyKey = createIdempotencyKey("HISTORICAL_DATASET_METADATA", [
    intent.datasetKind,
    sourceId,
    symbol,
    String(intent.contractVersion),
  ])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Dataset Metadata identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId,
    recordKind: "HISTORICAL_DATASET_METADATA",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "historical-dataset-metadata-v1",
    schemaVersion: 1,
    createdAt: intent.effectiveAt,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

const COVERAGE_PROJECTION_STATUSES = new Set([
  "COMPLETE", "PARTIAL", "MISSING", "UNAVAILABLE", "EXPERIMENTAL", "VARIABLE",
])
const PROJECTION_PROVIDER_STATUSES = new Set([
  "AVAILABLE", "UNAVAILABLE", "UNKNOWN", "NOT_CHECKED",
])

export function mapHistoricalCoverageProjection(
  intent: HistoricalCoverageProjectionPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const symbol = intent.symbol?.trim()
  const provider = intent.provider?.trim()
  const watermark = intent.sourceRepositoryWatermark?.trim()
  if (!symbol || !provider || !watermark
    || intent.projectionKind !== "REPOSITORY_COVERAGE"
    || !HISTORICAL_PROVIDER_METADATA_TARGET_SET.has(intent.datasetKind)
    || !/^\d{4}-\d{2}-\d{2}$/.test(intent.utcDay)
    || !Number.isFinite(Date.parse(`${intent.utcDay}T00:00:00.000Z`))
    || !Number.isFinite(Date.parse(intent.computedAt))) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Coverage Projection requires dataset, symbol, UTC day, provider, watermark, and computation identity.",
    )])
  }
  if (!isHistoricalProviderMetadata(intent)
    || !HISTORICAL_DATASET_RESOLUTION_SET.has(intent.resolution)
    || !HISTORICAL_COVERAGE_MODE_SET.has(intent.coverageMode)
    || (intent.expectedRecords !== null
      && (!Number.isInteger(intent.expectedRecords) || intent.expectedRecords <= 0))
    || !Number.isInteger(intent.actualRecords) || intent.actualRecords < 0
    || !Number.isInteger(intent.sourceRecordCount) || intent.sourceRecordCount < 0
    || intent.sourceRecordCount !== intent.actualRecords
    || typeof intent.stale !== "boolean" || typeof intent.recomputeRequired !== "boolean"
    || !Number.isInteger(intent.projectionVersion) || intent.projectionVersion <= 0
    || !COVERAGE_PROJECTION_STATUSES.has(intent.coverageStatus)
    || !PROJECTION_PROVIDER_STATUSES.has(intent.providerAvailabilityStatus)
    || (intent.coveragePercent !== null
      && (!Number.isFinite(intent.coveragePercent)
        || intent.coveragePercent < 0 || intent.coveragePercent > 100))
    || (intent.firstObservedAt !== null && !Number.isFinite(Date.parse(intent.firstObservedAt)))
    || (intent.lastObservedAt !== null && !Number.isFinite(Date.parse(intent.lastObservedAt)))
    || (intent.firstObservedAt !== null && intent.lastObservedAt !== null
      && Date.parse(intent.firstObservedAt) > Date.parse(intent.lastObservedAt))
    || typeof intent.reason !== "string" || intent.reason.trim().length === 0
    || !Number.isInteger(intent.schemaVersion) || intent.schemaVersion <= 0
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Historical Coverage Projection metadata or payload is invalid.",
    )])
  }
  const recordId = [
    "historical-coverage-projection-v1",
    intent.datasetKind,
    encodeURIComponent(symbol),
    intent.utcDay,
    intent.projectionKind,
    String(intent.projectionVersion),
    encodeURIComponent(watermark),
  ].join(":")
  const idempotencyKey = createIdempotencyKey("HISTORICAL_COVERAGE_PROJECTION", [
    intent.datasetKind,
    symbol,
    intent.utcDay,
    intent.projectionKind,
    String(intent.projectionVersion),
    watermark,
  ])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Historical Coverage Projection identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId,
    recordKind: "HISTORICAL_COVERAGE_PROJECTION",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "historical-coverage-projection-v1",
    schemaVersion: intent.schemaVersion,
    createdAt: intent.computedAt,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

export function mapPriceObservation(
  intent: PriceObservationPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const observationId = intent.observationId?.trim()
  const trackingId = intent.trackingId?.trim()
  const windowId = intent.windowId?.trim()
  if (!observationId || !trackingId || !windowId) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Price Observation persistence requires observation, tracking, and window identity.",
      { field: "observationId" },
    )])
  }
  if (!Number.isInteger(intent.schemaVersion) || intent.schemaVersion <= 0
    || !Number.isFinite(Date.parse(intent.observedAt))
    || !Number.isFinite(Date.parse(intent.recordedAt))
    || !isStorageJsonValue(intent.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "runtime_validation_failed",
      "Price Observation metadata or opaque payload is invalid.",
      { field: "payload" },
    )])
  }
  const idempotencyKey = createIdempotencyKey("PRICE_OBSERVATION", [trackingId, windowId])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Price Observation identity could not produce an idempotency key.",
      { cause: idempotencyKey.errors },
    )])
  }
  return validateMappedStorageRecord(Object.freeze({
    recordId: observationId,
    recordKind: "PRICE_OBSERVATION",
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: "price-observation-pilot-v1",
    schemaVersion: intent.schemaVersion,
    createdAt: intent.observedAt,
    recordedAt: intent.recordedAt,
    parentRefs: Object.freeze([
      parentRef("SIGNAL_TRACKING", trackingId),
      ...(intent.jobStateRecordId
        ? [parentRef("JOB_STATE", intent.jobStateRecordId)]
        : []),
    ]),
    payload: intent.payload,
    ...(intent.checksum !== undefined ? { checksum: intent.checksum } : {}),
  }))
}

export function mapSignalTrackingRecord(
  record: TrackingLifecycle,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validateTrackingLifecycle(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.identity")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<TrackingLifecycle>).value
  return buildStorageRecord("SIGNAL_TRACKING", value, metadata, {
    recordId: value.identity.trackingId,
    identityParts: [value.identity.trackingId],
    schemaVersion: value.schemaVersion,
    createdAt: value.identity.createdAt,
    parentRefs: [parentRef("SIGNAL_SNAPSHOT", value.identity.snapshotId)],
  })
}

export function mapContextSnapshotRecord(
  record: ContextSnapshot,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validateContextSnapshot(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.identity")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<ContextSnapshot>).value
  return buildStorageRecord("CONTEXT_SNAPSHOT", value, metadata, {
    recordId: value.identity.contextSnapshotId,
    identityParts: [value.identity.signalId, String(value.identity.snapshotVersion)],
    schemaVersion: value.schemaVersion,
    createdAt: value.capturedAt,
    parentRefs: [parentRef("SIGNAL_SNAPSHOT", value.signalSnapshotId)],
  })
}

export function mapSignalEvaluationRecord(
  record: SignalEvaluationResult,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validateSignalEvaluationResult(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.signalReference")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<SignalEvaluationResult>).value
  const trackingId = createTrackingId(value.signalReference)
  if (trackingId.success === false) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Signal Evaluation could not resolve its Tracking parent.",
      { field: "runtimeRecord.signalReference", cause: trackingId.errors },
    )])
  }
  return buildStorageRecord("SIGNAL_EVALUATION", value, metadata, {
    recordId: createEvaluationRecordId(
      value.signalReference.signalId,
      value.signalReference.snapshotId,
      value.window.id,
    ),
    identityParts: [
      value.signalReference.signalId,
      value.signalReference.snapshotId,
      value.window.id,
    ],
    schemaVersion: value.schemaVersion,
    createdAt: value.window.endsAt,
    parentRefs: [
      parentRef("SIGNAL_TRACKING", trackingId.value),
      parentRef(
        "PRICE_OBSERVATION",
        createPriceObservationRecordId(trackingId.value, value.window.id),
      ),
    ],
  })
}

export function mapSignalOutcomeRecord(
  record: SignalOutcome,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validateSignalOutcome(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.identity")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<SignalOutcome>).value
  const evaluationId = createEvaluationRecordId(
    value.identity.signalId,
    value.identity.snapshotId,
    value.timing.evaluationWindow,
  )
  return buildStorageRecord("SIGNAL_OUTCOME", value, metadata, {
    recordId: value.identity.outcomeId,
    identityParts: [value.identity.outcomeId],
    schemaVersion: value.schemaVersion,
    createdAt: value.timing.evaluatedAt,
    parentRefs: [
      parentRef("SIGNAL_SNAPSHOT", value.identity.snapshotId),
      ...(value.snapshotReferences.contextReference.status === "AVAILABLE"
        ? [parentRef("CONTEXT_SNAPSHOT", value.snapshotReferences.contextReference.referenceId!)]
        : []),
      parentRef("SIGNAL_TRACKING", value.identity.trackingId),
      parentRef("SIGNAL_EVALUATION", evaluationId),
    ],
  })
}

export function mapOutcomeEventRecord(
  record: OutcomeEvent,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validateOutcomeEvent(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.identity")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<OutcomeEvent>).value
  return buildStorageRecord("OUTCOME_EVENT", value, metadata, {
    recordId: value.identity.eventId,
    identityParts: [value.identity.eventId],
    schemaVersion: value.schemaVersion,
    createdAt: value.recordedAt,
    parentRefs: [parentRef("SIGNAL_OUTCOME", value.identity.outcomeId)],
  })
}

export function mapHistoricalMemoryRecord(
  record: HistoricalMemoryRecord,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validateHistoricalMemory(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.identity")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<HistoricalMemoryRecord>).value
  const outcome = value.outcomeEvent.payload.signalOutcome
  const evaluationId = createEvaluationRecordId(
    outcome.identity.signalId,
    outcome.identity.snapshotId,
    outcome.timing.evaluationWindow,
  )
  return buildStorageRecord("HISTORICAL_MEMORY", value, metadata, {
    recordId: value.identity.memoryId,
    identityParts: [value.identity.memoryId],
    schemaVersion: value.schemaVersion,
    createdAt: value.createdAt,
    parentRefs: [
      parentRef("SIGNAL_SNAPSHOT", outcome.identity.snapshotId),
      ...(outcome.snapshotReferences.contextReference.status === "AVAILABLE"
        ? [parentRef("CONTEXT_SNAPSHOT", outcome.snapshotReferences.contextReference.referenceId!)]
        : []),
      parentRef("SIGNAL_EVALUATION", evaluationId),
      parentRef("OUTCOME_EVENT", value.identity.eventId),
    ],
  })
}

export function mapPatternRecord(
  record: PatternRecord,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validatePatternRecord(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.identity")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<PatternRecord>).value
  return buildStorageRecord("PATTERN", value, metadata, {
    recordId: value.identity.patternId,
    identityParts: [
      value.identity.patternId,
      String(value.identity.patternVersion),
      value.identity.evidenceSetHash,
    ],
    schemaVersion: value.schemaVersion,
    createdAt: value.createdAt,
    parentRefs: value.evidence.map(
      (evidence) => parentRef("HISTORICAL_MEMORY", evidence.memoryId),
    ),
  })
}

export function mapLearningRecord(
  record: LearningRecord,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validateLearningRecord(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.identity")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<LearningRecord>).value
  return buildStorageRecord("LEARNING", value, metadata, {
    recordId: value.identity.learningId,
    identityParts: [
      value.identity.learningId,
      String(value.identity.learningVersion),
      value.identity.patternSetHash,
    ],
    schemaVersion: value.schemaVersion,
    createdAt: value.createdAt,
    parentRefs: value.evidence.map(
      (evidence) => parentRef("PATTERN", evidence.pattern.identity.patternId),
    ),
  })
}

export function mapConfidenceCalibrationRecord(
  record: CalibrationRecord,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validateCalibrationRecord(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.identity")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<CalibrationRecord>).value
  return buildStorageRecord("CONFIDENCE_CALIBRATION", value, metadata, {
    recordId: value.identity.calibrationId,
    identityParts: [
      value.identity.calibrationId,
      String(value.identity.calibrationVersion),
      value.identity.learningSetHash,
      value.identity.patternSetHash,
    ],
    schemaVersion: value.schemaVersion,
    createdAt: value.createdAt,
    parentRefs: value.evidence.map((evidence) => evidence.evidenceType === "LEARNING"
      ? parentRef("LEARNING", evidence.learning.identity.learningId)
      : parentRef("PATTERN", evidence.pattern.identity.patternId)),
  })
}

export function mapPlaybookRecord(
  record: PlaybookRecord,
  metadata: RepositoryMappingMetadata,
): RepositoryResult<StorageRecord> {
  const validation = validatePlaybookRecord(record)
  const failure = runtimeValidationFailure(validation, "runtimeRecord.identity")
  if (failure) return failure
  const value = (validation as RuntimeValidationSuccess<PlaybookRecord>).value
  return buildStorageRecord("PLAYBOOK", value, metadata, {
    recordId: value.identity.playbookId,
    identityParts: [
      value.identity.playbookId,
      String(value.identity.playbookVersion),
      value.identity.learningSetHash,
      value.identity.calibrationSetHash,
    ],
    schemaVersion: value.schemaVersion,
    createdAt: value.createdAt,
    parentRefs: value.evidence.map((evidence) => evidence.evidenceType === "LEARNING"
      ? parentRef("LEARNING", evidence.learning.identity.learningId)
      : parentRef("CONFIDENCE_CALIBRATION", evidence.calibration.identity.calibrationId)),
  })
}

export function mapRuntimeRecord(
  intent: RuntimeRecordPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const intentValidation = validateRepositoryIntent(intent)
  if (intentValidation.status !== "SUCCESS") {
    return createRepositoryFailure(intentValidation.status, intentValidation.errors)
  }
  const value = intentValidation.value
  const metadata: RepositoryMappingMetadata = {
    recordedAt: value.recordedAt,
    ...(value.checksum !== undefined ? { checksum: value.checksum } : {}),
  }

  switch (value.recordKind) {
    case "CONTEXT_SNAPSHOT":
      return mapContextSnapshotRecord(value.runtimeRecord as ContextSnapshot, metadata)
    case "SIGNAL_TRACKING":
      return mapSignalTrackingRecord(value.runtimeRecord as TrackingLifecycle, metadata)
    case "SIGNAL_EVALUATION":
      return mapSignalEvaluationRecord(value.runtimeRecord as SignalEvaluationResult, metadata)
    case "SIGNAL_OUTCOME":
      return mapSignalOutcomeRecord(value.runtimeRecord as SignalOutcome, metadata)
    case "OUTCOME_EVENT":
      return mapOutcomeEventRecord(value.runtimeRecord as OutcomeEvent, metadata)
    case "HISTORICAL_MEMORY":
      return mapHistoricalMemoryRecord(value.runtimeRecord as HistoricalMemoryRecord, metadata)
    case "PATTERN":
      return mapPatternRecord(value.runtimeRecord as PatternRecord, metadata)
    case "LEARNING":
      return mapLearningRecord(value.runtimeRecord as LearningRecord, metadata)
    case "CONFIDENCE_CALIBRATION":
      return mapConfidenceCalibrationRecord(value.runtimeRecord as CalibrationRecord, metadata)
    case "PLAYBOOK":
      return mapPlaybookRecord(value.runtimeRecord as PlaybookRecord, metadata)
    default:
      return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
        "unsupported_runtime_record",
        "Operational runtime mapping is not implemented in P5-3.",
        { field: "recordKind" },
      )])
  }
}
