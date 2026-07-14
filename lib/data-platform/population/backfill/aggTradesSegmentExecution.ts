import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { PopulationJobProfile } from "@/lib/data-platform/population"

import type { AggTradesExecutionSnapshot } from "./aggTradesExecution"

export const AGG_TRADES_SEGMENT_EXECUTION_SCHEMA_VERSION = "1.0.0" as const
export const AGG_TRADES_SEGMENT_PROFILE_ID = "d3-phase3-agg-trade-segment" as const
export const AGG_TRADES_SEGMENT_PROFILE_VERSION = "1.0.0" as const
export const AGG_TRADES_SEGMENT_RESOLUTION = "daily-parquet-segment" as const
export const AGG_TRADES_SEGMENT_CANARY_SYMBOL = "XRPUSDT" as const
export const AGG_TRADES_SEGMENT_CANARY_DAY = "2020-01-06" as const

// This is a per-partition control-plane budget, not an observed storage metric.
// Segment bytes are estimated separately from a real canary ratio and never from event count.
export const AGG_TRADES_SEGMENT_METADATA_BUDGET_BYTES_PER_PARTITION = 262_144 as const

export const AGG_TRADES_SEGMENT_JOB_PROFILE: PopulationJobProfile = Object.freeze({
  profileId: AGG_TRADES_SEGMENT_PROFILE_ID,
  profileVersion: AGG_TRADES_SEGMENT_PROFILE_VERSION,
  kind: "BACKFILL",
  requiredDimensions: Object.freeze(["venue", "subjectOrSymbol", "windowStart", "windowEnd", "resolution", "partitionKey"] as const),
  rawRetrievalRequired: true,
  mayReuseVerifiedManifest: true,
  retryPolicyId: "retry.historical-source",
  retryPolicyVersion: "UNAVAILABLE",
  watermarkPolicyId: "coverage.agg-trade-segment.partition",
  watermarkPolicyVersion: "1.0.0",
})

export interface AggTradesSegmentCanaryMeasurementContent {
  readonly providerSymbol: typeof AGG_TRADES_SEGMENT_CANARY_SYMBOL
  readonly sourceDay: typeof AGG_TRADES_SEGMENT_CANARY_DAY
  readonly sourceInventoryPartitionId: string
  readonly sourceRawObjectId: string
  readonly sourceChecksum: string
  readonly sourceBytes: number
  readonly segmentId: string
  readonly segmentVersion: string
  readonly segmentChecksum: string
  readonly segmentBytes: number
  readonly eventCount: number
}

export interface AggTradesSegmentCanaryMeasurement extends AggTradesSegmentCanaryMeasurementContent {
  readonly measurementId: string
  readonly measurementChecksum: string
}

export interface AggTradesSegmentExecutionPartition {
  readonly partitionId: string
  readonly sourceInventoryPartitionId: string
  readonly inventorySnapshotId: string
  readonly inventorySnapshotChecksum: string
  readonly parentManifestId: string
  readonly parentManifestChecksum: string
  readonly datasetId: "agg-trade"
  readonly providerId: "binance-public-archive"
  readonly canonicalInstrumentId: string
  readonly providerSymbol: string
  readonly sourceDay: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly sourceObject: string
  readonly compressedBytes: number
  readonly unitIdentity: string
  readonly initialState: "PENDING" | "SKIPPED_ALREADY_COMPLETE"
  readonly existingCompletionReference: string | null
}

export interface AggTradesSegmentExecutionSnapshotContent {
  readonly schemaVersion: typeof AGG_TRADES_SEGMENT_EXECUTION_SCHEMA_VERSION
  readonly inventorySnapshotId: string
  readonly inventorySnapshotChecksum: string
  readonly parentManifestId: string
  readonly parentManifestChecksum: string
  readonly datasetId: "agg-trade"
  readonly canonicalObjectKind: "STREAM_MANIFEST"
  readonly providerId: "binance-public-archive"
  readonly sourceSelectionPolicy: "REUSE_FROZEN_AGG_TRADES_ROW_ARCHIVE_INVENTORY"
  readonly segmentIdentityPolicy: "PROVIDER_INSTRUMENT_DAILY_WINDOW_EVENT_ORDER"
  readonly profile: typeof AGG_TRADES_SEGMENT_JOB_PROFILE
  readonly canaryMeasurement: AggTradesSegmentCanaryMeasurement
  readonly partitions: readonly AggTradesSegmentExecutionPartition[]
  readonly completePartitionCount: number
  readonly alreadyCompletedPartitionCount: number
  readonly pendingPartitionCount: number
  readonly measuredCompressedSourceBytes: number
  readonly conservativeRecordCount: number
  readonly estimatedSegmentArtifactBytes: number
  readonly metadataBudgetBytesPerPartition: typeof AGG_TRADES_SEGMENT_METADATA_BUDGET_BYTES_PER_PARTITION
  readonly boundedMetadataBudgetBytes: number
  readonly globalConcurrency: 1
  readonly providerDownloadConcurrency: 1
  readonly checkpointPolicy: "SOURCE_RAW_SEGMENT_RAW_SINGLE_CANDIDATE_SINGLE_OUTCOME"
  readonly retryPolicyReference: string
  readonly canonicalTargetBinding: "quantterminal_backfill:canonical.stream_manifests"
}

export interface AggTradesSegmentExecutionSnapshot extends AggTradesSegmentExecutionSnapshotContent {
  readonly snapshotId: string
  readonly snapshotChecksum: string
}

export interface AggTradesSegmentCapacityEvaluation {
  readonly status: "PASS" | "BLOCKED"
  readonly reasonCodes: readonly string[]
  readonly sourceBytesToProcess: number
  readonly partitionCountToProcess: number
  readonly requiredPostgresBytes: number
  readonly requiredArtifactBytes: number
  readonly estimatedSegmentBytes: number
  readonly safetyBasisPoints: number
}

function positiveSafeInteger(value: number, code: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(code)
  return value
}

function contentForMeasurement(content: AggTradesSegmentCanaryMeasurementContent): AggTradesSegmentCanaryMeasurementContent {
  if (content.providerSymbol !== AGG_TRADES_SEGMENT_CANARY_SYMBOL || content.sourceDay !== AGG_TRADES_SEGMENT_CANARY_DAY) throw new Error("AGG_TRADES_SEGMENT_CANARY_SCOPE_INVALID")
  positiveSafeInteger(content.sourceBytes, "AGG_TRADES_SEGMENT_CANARY_SOURCE_BYTES_INVALID")
  positiveSafeInteger(content.segmentBytes, "AGG_TRADES_SEGMENT_CANARY_SEGMENT_BYTES_INVALID")
  positiveSafeInteger(content.eventCount, "AGG_TRADES_SEGMENT_CANARY_EVENT_COUNT_INVALID")
  if (!/^[a-f0-9]{64}$/.test(content.sourceChecksum) || !/^[a-f0-9]{64}$/.test(content.segmentChecksum)) throw new Error("AGG_TRADES_SEGMENT_CANARY_CHECKSUM_INVALID")
  if (!content.sourceRawObjectId || !content.sourceInventoryPartitionId || !content.segmentId || !content.segmentVersion) throw new Error("AGG_TRADES_SEGMENT_CANARY_IDENTITY_INVALID")
  return Object.freeze({ providerSymbol: content.providerSymbol, sourceDay: content.sourceDay, sourceInventoryPartitionId: content.sourceInventoryPartitionId, sourceRawObjectId: content.sourceRawObjectId, sourceChecksum: content.sourceChecksum, sourceBytes: content.sourceBytes, segmentId: content.segmentId, segmentVersion: content.segmentVersion, segmentChecksum: content.segmentChecksum, segmentBytes: content.segmentBytes, eventCount: content.eventCount })
}

export function createAggTradesSegmentCanaryMeasurement(content: AggTradesSegmentCanaryMeasurementContent): AggTradesSegmentCanaryMeasurement {
  const canonical = contentForMeasurement(content)
  const measurementChecksum = canonicalChecksum(canonical)
  return Object.freeze({ ...canonical, measurementId: `agg-trades-segment-canary:${measurementChecksum}`, measurementChecksum })
}

export function createAggTradesSegmentPartitionId(canonicalInstrumentId: string, day: string): string {
  return `agg-trade-segment:${canonicalInstrumentId}:daily-parquet:${day}`
}

export function createAggTradesSegmentUnitIdentity(parentManifestId: string, canonicalInstrumentId: string, day: string): string {
  return `agg-trade-segment-unit:${canonicalChecksum({ parentManifestId, profileId: AGG_TRADES_SEGMENT_PROFILE_ID, profileVersion: AGG_TRADES_SEGMENT_PROFILE_VERSION, datasetId: "agg-trade", providerId: "binance-public-archive", canonicalInstrumentId, day })}`
}

function validateInventory(inventory: AggTradesExecutionSnapshot): void {
  const { snapshotId, snapshotChecksum, ...content } = inventory
  if (snapshotId !== `agg-trades-execution:${snapshotChecksum}` || canonicalChecksum(content) !== snapshotChecksum) throw new Error("AGG_TRADES_SEGMENT_INVENTORY_INVALID")
  const canary = inventory.partitions.find((partition) => partition.providerSymbol === AGG_TRADES_SEGMENT_CANARY_SYMBOL && partition.sourceDay === AGG_TRADES_SEGMENT_CANARY_DAY)
  if (!canary) throw new Error("AGG_TRADES_SEGMENT_CANARY_PARTITION_MISSING")
}

export function createAggTradesSegmentExecutionSnapshot(input: {
  readonly inventory: AggTradesExecutionSnapshot
  readonly canaryMeasurement: AggTradesSegmentCanaryMeasurement
  readonly completedByPartitionId?: Readonly<Record<string, string>>
}): AggTradesSegmentExecutionSnapshot {
  validateInventory(input.inventory)
  const expectedMeasurement = createAggTradesSegmentCanaryMeasurement(input.canaryMeasurement)
  if (expectedMeasurement.measurementId !== input.canaryMeasurement.measurementId || expectedMeasurement.measurementChecksum !== input.canaryMeasurement.measurementChecksum) throw new Error("AGG_TRADES_SEGMENT_CANARY_MEASUREMENT_INVALID")
  const canaryInventory = input.inventory.partitions.find((partition) => partition.providerSymbol === AGG_TRADES_SEGMENT_CANARY_SYMBOL && partition.sourceDay === AGG_TRADES_SEGMENT_CANARY_DAY)!
  if (input.canaryMeasurement.sourceInventoryPartitionId !== canaryInventory.partitionId || input.canaryMeasurement.sourceBytes !== canaryInventory.compressedBytes) throw new Error("AGG_TRADES_SEGMENT_CANARY_INVENTORY_MISMATCH")

  const completed = input.completedByPartitionId ?? {}
  const partitions = input.inventory.partitions.map((source): AggTradesSegmentExecutionPartition => {
    const partitionId = createAggTradesSegmentPartitionId(source.canonicalInstrumentId, source.sourceDay)
    const existingCompletionReference = completed[partitionId] ?? null
    return Object.freeze({
      partitionId,
      sourceInventoryPartitionId: source.partitionId,
      inventorySnapshotId: input.inventory.snapshotId,
      inventorySnapshotChecksum: input.inventory.snapshotChecksum,
      parentManifestId: input.inventory.parentManifestId,
      parentManifestChecksum: input.inventory.parentManifestChecksum,
      datasetId: "agg-trade",
      providerId: "binance-public-archive",
      canonicalInstrumentId: source.canonicalInstrumentId,
      providerSymbol: source.providerSymbol,
      sourceDay: source.sourceDay,
      windowStart: source.windowStart,
      windowEnd: source.windowEnd,
      sourceObject: source.sourceObject,
      compressedBytes: source.compressedBytes,
      unitIdentity: createAggTradesSegmentUnitIdentity(input.inventory.parentManifestId, source.canonicalInstrumentId, source.sourceDay),
      initialState: existingCompletionReference ? "SKIPPED_ALREADY_COMPLETE" : "PENDING",
      existingCompletionReference,
    })
  }).sort((left, right) => left.windowStart.localeCompare(right.windowStart) || left.providerSymbol.localeCompare(right.providerSymbol))
  const alreadyCompletedPartitionCount = partitions.filter((partition) => partition.initialState === "SKIPPED_ALREADY_COMPLETE").length
  const measuredCompressedSourceBytes = partitions.reduce((sum, partition) => sum + partition.compressedBytes, 0)
  const conservativeRecordCount = input.inventory.conservativeRecords
  const estimatedSegmentArtifactBytes = Math.ceil(conservativeRecordCount * input.canaryMeasurement.segmentBytes / input.canaryMeasurement.eventCount)
  if (!Number.isSafeInteger(estimatedSegmentArtifactBytes)) throw new Error("AGG_TRADES_SEGMENT_ARTIFACT_ESTIMATE_UNSAFE")
  const boundedMetadataBudgetBytes = partitions.length * AGG_TRADES_SEGMENT_METADATA_BUDGET_BYTES_PER_PARTITION
  if (!Number.isSafeInteger(boundedMetadataBudgetBytes)) throw new Error("AGG_TRADES_SEGMENT_METADATA_BUDGET_UNSAFE")

  const content: AggTradesSegmentExecutionSnapshotContent = Object.freeze({
    schemaVersion: AGG_TRADES_SEGMENT_EXECUTION_SCHEMA_VERSION,
    inventorySnapshotId: input.inventory.snapshotId,
    inventorySnapshotChecksum: input.inventory.snapshotChecksum,
    parentManifestId: input.inventory.parentManifestId,
    parentManifestChecksum: input.inventory.parentManifestChecksum,
    datasetId: "agg-trade",
    canonicalObjectKind: "STREAM_MANIFEST",
    providerId: "binance-public-archive",
    sourceSelectionPolicy: "REUSE_FROZEN_AGG_TRADES_ROW_ARCHIVE_INVENTORY",
    segmentIdentityPolicy: "PROVIDER_INSTRUMENT_DAILY_WINDOW_EVENT_ORDER",
    profile: AGG_TRADES_SEGMENT_JOB_PROFILE,
    canaryMeasurement: input.canaryMeasurement,
    partitions: Object.freeze(partitions),
    completePartitionCount: partitions.length,
    alreadyCompletedPartitionCount,
    pendingPartitionCount: partitions.length - alreadyCompletedPartitionCount,
    measuredCompressedSourceBytes,
    conservativeRecordCount,
    estimatedSegmentArtifactBytes,
    metadataBudgetBytesPerPartition: AGG_TRADES_SEGMENT_METADATA_BUDGET_BYTES_PER_PARTITION,
    boundedMetadataBudgetBytes,
    globalConcurrency: 1,
    providerDownloadConcurrency: 1,
    checkpointPolicy: "SOURCE_RAW_SEGMENT_RAW_SINGLE_CANDIDATE_SINGLE_OUTCOME",
    retryPolicyReference: input.inventory.retryPolicyReference,
    canonicalTargetBinding: "quantterminal_backfill:canonical.stream_manifests",
  })
  const snapshotChecksum = canonicalChecksum(content)
  return Object.freeze({ ...content, snapshotId: `agg-trades-segment-execution:${snapshotChecksum}`, snapshotChecksum })
}

export function verifyAggTradesSegmentExecutionSnapshot(snapshot: AggTradesSegmentExecutionSnapshot): boolean {
  const { snapshotId, snapshotChecksum, ...content } = snapshot
  return snapshot.schemaVersion === AGG_TRADES_SEGMENT_EXECUTION_SCHEMA_VERSION
    && snapshot.profile.profileId === AGG_TRADES_SEGMENT_PROFILE_ID
    && snapshotId === `agg-trades-segment-execution:${snapshotChecksum}`
    && canonicalChecksum(content) === snapshotChecksum
}

export function evaluateAggTradesSegmentCapacity(input: {
  readonly snapshot: AggTradesSegmentExecutionSnapshot
  readonly postgresFreeBytes: number
  readonly artifactFreeBytes: number
  readonly sourceBytesToProcess?: number
  readonly partitionCountToProcess?: number
  readonly additionalArtifactGrowthBytes?: number
  readonly additionalPostgresGrowthBytes?: number
  readonly safetyBasisPoints?: number
}): AggTradesSegmentCapacityEvaluation {
  const sourceBytesToProcess = input.sourceBytesToProcess ?? input.snapshot.partitions.filter((partition) => partition.initialState === "PENDING").reduce((sum, partition) => sum + partition.compressedBytes, 0)
  const partitionCountToProcess = input.partitionCountToProcess ?? input.snapshot.pendingPartitionCount
  if (!Number.isSafeInteger(sourceBytesToProcess) || sourceBytesToProcess < 0 || !Number.isSafeInteger(partitionCountToProcess) || partitionCountToProcess < 0) throw new Error("AGG_TRADES_SEGMENT_CAPACITY_SCOPE_INVALID")
  const safetyBasisPoints = input.safetyBasisPoints ?? 12_000
  if (!Number.isInteger(safetyBasisPoints) || safetyBasisPoints < 10_000) throw new Error("AGG_TRADES_SEGMENT_CAPACITY_MARGIN_INVALID")
  const fullPendingScope = sourceBytesToProcess === input.snapshot.partitions.filter((partition) => partition.initialState === "PENDING").reduce((sum, partition) => sum + partition.compressedBytes, 0)
    && partitionCountToProcess === input.snapshot.pendingPartitionCount
  const estimatedSegmentBytes = fullPendingScope
    ? input.snapshot.estimatedSegmentArtifactBytes
    : Math.ceil(sourceBytesToProcess * input.snapshot.canaryMeasurement.segmentBytes / input.snapshot.canaryMeasurement.sourceBytes)
  const requiredArtifactBytes = Math.ceil((sourceBytesToProcess + estimatedSegmentBytes + (input.additionalArtifactGrowthBytes ?? 0)) * safetyBasisPoints / 10_000)
  const requiredPostgresBytes = Math.ceil((partitionCountToProcess * input.snapshot.metadataBudgetBytesPerPartition + (input.additionalPostgresGrowthBytes ?? 0)) * safetyBasisPoints / 10_000)
  if (![estimatedSegmentBytes, requiredArtifactBytes, requiredPostgresBytes].every(Number.isSafeInteger)) throw new Error("AGG_TRADES_SEGMENT_CAPACITY_ESTIMATE_UNSAFE")
  const reasonCodes = [
    requiredPostgresBytes > input.postgresFreeBytes ? "POSTGRES_CAPACITY_INSUFFICIENT" : null,
    requiredArtifactBytes > input.artifactFreeBytes ? "ARTIFACT_CAPACITY_INSUFFICIENT" : null,
  ].filter((value): value is string => value !== null)
  return Object.freeze({ status: reasonCodes.length ? "BLOCKED" : "PASS", reasonCodes: Object.freeze(reasonCodes), sourceBytesToProcess, partitionCountToProcess, requiredPostgresBytes, requiredArtifactBytes, estimatedSegmentBytes, safetyBasisPoints })
}
