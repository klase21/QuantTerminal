import { canonicalChecksum } from "@/lib/data-platform/contracts"

import type { BackfillManifest, InstrumentLifecycleRecord } from "./contracts"

export const OHLCV_EXECUTION_SCHEMA_VERSION = "1.0.0" as const
export const OHLCV_FINAL_ELIGIBLE_DAY = "2026-07-11" as const
export const OHLCV_FROZEN_CUTOFF = "2026-07-12T00:00:00.000Z" as const

export type OhlcvPartitionInitialState = "PENDING" | "SKIPPED_ALREADY_COMPLETE"
export type OhlcvPartitionTerminalClassification =
  | "POPULATED"
  | "SKIPPED_ALREADY_COMPLETE"
  | "EMPTY_CONFIRMED"
  | "SOURCE_NOT_AVAILABLE_FOR_PERIOD"
  | "NOT_APPLICABLE"
  | "GAP_SOURCE_MISSING"
  | "GAP_CORRUPT_ARTIFACT"
  | "FAILED_RETRYABLE"
  | "FAILED_RETRY_EXHAUSTED"
  | "CONFLICT"
  | "BLOCKED"

export interface OhlcvAvailabilityBoundary {
  readonly canonicalInstrumentId: string
  readonly providerSymbol: string
  readonly activationTimestamp: string
  readonly earliestVerifiedSourceDay: string
  readonly finalEligibleDay: string
  readonly discoveryMethod: "BINANCE_VISION_S3_PREFIX_AND_HEAD" | "ACTIVATION_WINDOW_HEAD"
  readonly discoveryEvidence: string
  readonly unavailableBefore: string
}

export interface OhlcvExecutionPartition {
  readonly partitionId: string
  readonly parentManifestId: string
  readonly parentManifestChecksum: string
  readonly providerId: "binance-public-archive"
  readonly venue: "BINANCE"
  readonly datasetId: "ohlcv"
  readonly resolution: "5m"
  readonly canonicalInstrumentId: string
  readonly providerSymbol: string
  readonly utcDay: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly sourceObject: string
  readonly unitIdentity: string
  readonly expectedTerminalClassification: "POPULATED_OR_EXPLICIT_SOURCE_CLASSIFICATION"
  readonly executionPriorityGroup: number
  readonly initialState: OhlcvPartitionInitialState
  readonly retryState: "NOT_ATTEMPTED"
  readonly existingCompletionReference: string | null
}

export interface OhlcvExecutionSnapshotContent {
  readonly schemaVersion: typeof OHLCV_EXECUTION_SCHEMA_VERSION
  readonly parentManifestId: string
  readonly parentManifestChecksum: string
  readonly datasetId: "ohlcv"
  readonly providerId: "binance-public-archive"
  readonly venue: "BINANCE"
  readonly resolution: "5m"
  readonly frozenCutoffUtc: typeof OHLCV_FROZEN_CUTOFF
  readonly finalEligibleDay: typeof OHLCV_FINAL_ELIGIBLE_DAY
  readonly instruments: readonly OhlcvAvailabilityBoundary[]
  readonly partitions: readonly OhlcvExecutionPartition[]
  readonly completePartitionCount: number
  readonly alreadyCompletedPartitionCount: number
  readonly pendingPartitionCount: number
  readonly blockedPartitionCount: number
  readonly estimatedRowCount: number
  readonly estimatedCanonicalFactCount: number
  readonly measuredCanaryCompressedBytes: number
  readonly estimatedCompressedSourceBytes: number
  readonly partitionStrategy: "ONE_INSTRUMENT_UTC_DAY_PER_UNIT"
  readonly globalConcurrency: number
  readonly providerDownloadConcurrency: number
  readonly checkpointPolicy: "RAW_CANDIDATE_CANONICAL"
  readonly retryPolicyReference: string
}

export interface OhlcvExecutionSnapshot extends OhlcvExecutionSnapshotContent {
  readonly snapshotId: string
  readonly snapshotChecksum: string
}

export interface OhlcvPartitionProgress {
  readonly partitionId: string
  readonly classification: OhlcvPartitionTerminalClassification | "ACTIVE" | "PENDING"
  readonly reasonCodes: readonly string[]
  readonly jobId: string | null
  readonly runId: string | null
  readonly unitId: string | null
  readonly rawObjectId: string | null
  readonly downloadedBytes: number
  readonly parsedRows: number
  readonly acceptedCandidates: number
  readonly rejectedCandidates: number
  readonly canonicalFactsCreated: number
  readonly canonicalFactsReused: number
  readonly conflicts: number
  readonly updatedAt: string
}

const DAY_MS = 86_400_000

export function utcDaysInclusive(firstDay: string, lastDay: string): readonly string[] {
  const first = Date.parse(`${firstDay}T00:00:00.000Z`)
  const last = Date.parse(`${lastDay}T00:00:00.000Z`)
  if (!Number.isFinite(first) || !Number.isFinite(last) || first > last) throw new Error("OHLCV_DATE_RANGE_INVALID")
  const days: string[] = []
  for (let value = first; value <= last; value += DAY_MS) days.push(new Date(value).toISOString().slice(0, 10))
  return Object.freeze(days)
}

export function createOhlcvPartitionId(canonicalInstrumentId: string, day: string): string {
  return `ohlcv:${canonicalInstrumentId}:5m:${day}`
}

export function createOhlcvUnitIdentity(parentManifestId: string, canonicalInstrumentId: string, day: string): string {
  return `ohlcv-unit:${canonicalChecksum({ parentManifestId, canonicalInstrumentId, resolution: "5m", day })}`
}

function partitionFor(
  manifest: BackfillManifest,
  boundary: OhlcvAvailabilityBoundary,
  day: string,
  completedByPartitionId: Readonly<Record<string, string>>,
): OhlcvExecutionPartition {
  const partitionId = createOhlcvPartitionId(boundary.canonicalInstrumentId, day)
  const nextDay = new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10)
  const completion = completedByPartitionId[partitionId] ?? null
  return Object.freeze({
    partitionId,
    parentManifestId: manifest.manifestId,
    parentManifestChecksum: manifest.manifestChecksum,
    providerId: "binance-public-archive",
    venue: "BINANCE",
    datasetId: "ohlcv",
    resolution: "5m",
    canonicalInstrumentId: boundary.canonicalInstrumentId,
    providerSymbol: boundary.providerSymbol,
    utcDay: day,
    windowStart: `${day}T00:00:00.000Z`,
    windowEnd: `${nextDay}T00:00:00.000Z`,
    sourceObject: `https://data.binance.vision/data/futures/um/daily/klines/${boundary.providerSymbol}/5m/${boundary.providerSymbol}-5m-${day}.zip`,
    unitIdentity: createOhlcvUnitIdentity(manifest.manifestId, boundary.canonicalInstrumentId, day),
    expectedTerminalClassification: "POPULATED_OR_EXPLICIT_SOURCE_CLASSIFICATION",
    executionPriorityGroup: day === OHLCV_FINAL_ELIGIBLE_DAY ? 0 : 1,
    initialState: completion ? "SKIPPED_ALREADY_COMPLETE" : "PENDING",
    retryState: "NOT_ATTEMPTED",
    existingCompletionReference: completion,
  })
}

export function createOhlcvExecutionSnapshot(input: {
  readonly manifest: BackfillManifest
  readonly availability: readonly OhlcvAvailabilityBoundary[]
  readonly completedByPartitionId?: Readonly<Record<string, string>>
  readonly measuredCanaryCompressedBytes: number
  readonly globalConcurrency?: number
  readonly providerDownloadConcurrency?: number
}): OhlcvExecutionSnapshot {
  if (input.manifest.manifestId !== `bfm_${input.manifest.manifestChecksum}`) throw new Error("OHLCV_PARENT_MANIFEST_INVALID")
  const governed = new Map(input.manifest.instruments.map((instrument) => [instrument.canonicalInstrumentId, instrument]))
  const availability = [...input.availability].sort((a, b) => a.canonicalInstrumentId.localeCompare(b.canonicalInstrumentId))
  if (availability.length !== governed.size || availability.some((item) => !governed.has(item.canonicalInstrumentId))) throw new Error("OHLCV_AVAILABILITY_SCOPE_MISMATCH")
  const completed = input.completedByPartitionId ?? {}
  const partitions = availability.flatMap((boundary) => utcDaysInclusive(boundary.earliestVerifiedSourceDay, boundary.finalEligibleDay).map((day) => partitionFor(input.manifest, boundary, day, completed)))
    .sort((a, b) => a.executionPriorityGroup - b.executionPriorityGroup || a.utcDay.localeCompare(b.utcDay) || a.providerSymbol.localeCompare(b.providerSymbol))
  const alreadyCompletedPartitionCount = partitions.filter((partition) => partition.initialState === "SKIPPED_ALREADY_COMPLETE").length
  const globalConcurrency = input.globalConcurrency ?? 4
  const providerDownloadConcurrency = input.providerDownloadConcurrency ?? 2
  if (!Number.isInteger(globalConcurrency) || globalConcurrency < 1 || !Number.isInteger(providerDownloadConcurrency) || providerDownloadConcurrency < 1 || providerDownloadConcurrency > globalConcurrency) throw new Error("OHLCV_CONCURRENCY_INVALID")
  const content: OhlcvExecutionSnapshotContent = Object.freeze({
    schemaVersion: OHLCV_EXECUTION_SCHEMA_VERSION,
    parentManifestId: input.manifest.manifestId,
    parentManifestChecksum: input.manifest.manifestChecksum,
    datasetId: "ohlcv",
    providerId: "binance-public-archive",
    venue: "BINANCE",
    resolution: "5m",
    frozenCutoffUtc: OHLCV_FROZEN_CUTOFF,
    finalEligibleDay: OHLCV_FINAL_ELIGIBLE_DAY,
    instruments: Object.freeze(availability),
    partitions: Object.freeze(partitions),
    completePartitionCount: partitions.length,
    alreadyCompletedPartitionCount,
    pendingPartitionCount: partitions.length - alreadyCompletedPartitionCount,
    blockedPartitionCount: 0,
    estimatedRowCount: partitions.length * 288,
    estimatedCanonicalFactCount: partitions.length * 288,
    measuredCanaryCompressedBytes: input.measuredCanaryCompressedBytes,
    estimatedCompressedSourceBytes: partitions.length * input.measuredCanaryCompressedBytes,
    partitionStrategy: "ONE_INSTRUMENT_UTC_DAY_PER_UNIT",
    globalConcurrency,
    providerDownloadConcurrency,
    checkpointPolicy: "RAW_CANDIDATE_CANONICAL",
    retryPolicyReference: input.manifest.retryPolicyReference,
  })
  const snapshotChecksum = canonicalChecksum(content)
  return Object.freeze({ ...content, snapshotId: `ohlcv-execution:${snapshotChecksum}`, snapshotChecksum })
}

export function instrumentForSymbol(instruments: readonly InstrumentLifecycleRecord[], symbol: string): InstrumentLifecycleRecord {
  const instrument = instruments.find((item) => item.providerSymbol === symbol)
  if (!instrument) throw new Error(`OHLCV_INSTRUMENT_NOT_GOVERNED:${symbol}`)
  return instrument
}
