import { canonicalChecksum } from "@/lib/data-platform/contracts"

import type { BackfillManifest } from "./contracts"

export const AGG_TRADES_FROZEN_CUTOFF = "2026-07-12T00:00:00.000Z" as const
export const AGG_TRADES_EXECUTION_SCHEMA_VERSION = "1.0.0" as const
export const AGG_TRADES_PER_RECORD_STORAGE_BYTES = 13_000 as const
export const AGG_TRADES_REMAINING_DATASET_STORAGE_BYTES = 51_163_508_815 as const

export interface AggTradesArchiveInventoryItem { readonly day: string; readonly compressedBytes: number }
export interface AggTradesSizeSample { readonly day: string; readonly compressedBytes: number; readonly uncompressedBytes: number; readonly records: number; readonly headerPresent: boolean }
export interface AggTradesAvailabilityBoundary {
  readonly canonicalInstrumentId: string
  readonly providerSymbol: string
  readonly activationTimestamp: string
  readonly earliestVerifiedArchiveDay: string
  readonly latestVerifiedArchiveDay: "2026-07-11"
  readonly archiveCount: number
  readonly compressedSourceBytes: number
  readonly archives: readonly AggTradesArchiveInventoryItem[]
  readonly sizeSamples: readonly AggTradesSizeSample[]
  readonly estimatedRecords: number
  readonly conservativeRecords: number
  readonly discoveryMethod: "BINANCE_VISION_S3_COMPLETE_PREFIX_INVENTORY"
}

export interface AggTradesExecutionPartition {
  readonly partitionId: string
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
  readonly estimatedRecords: number
  readonly unitIdentity: string
  readonly initialState: "PENDING" | "SKIPPED_ALREADY_COMPLETE"
  readonly existingCompletionReference: string | null
}

export interface AggTradesExecutionSnapshotContent {
  readonly schemaVersion: typeof AGG_TRADES_EXECUTION_SCHEMA_VERSION
  readonly parentManifestId: string
  readonly parentManifestChecksum: string
  readonly datasetId: "agg-trade"
  readonly providerId: "binance-public-archive"
  readonly sourceSelectionPolicy: "BINANCE_VISION_USDM_DAILY_AGGTRADES_ONLY"
  readonly identityPolicy: "PROVIDER_VENUE_SYMBOL_AGGREGATE_TRADE_ID"
  readonly frozenCutoffUtc: typeof AGG_TRADES_FROZEN_CUTOFF
  readonly normalizerVersion: "d3-phase3-normalizer-v1"
  readonly instruments: readonly AggTradesAvailabilityBoundary[]
  readonly partitions: readonly AggTradesExecutionPartition[]
  readonly completePartitionCount: number
  readonly alreadyCompletedPartitionCount: number
  readonly pendingPartitionCount: number
  readonly measuredCompressedSourceBytes: number
  readonly estimatedRecords: number
  readonly conservativeRecords: number
  readonly estimatedCanonicalStorageBytes: number
  readonly conservativeCanonicalStorageBytes: number
  readonly remainingDatasetStorageBytes: typeof AGG_TRADES_REMAINING_DATASET_STORAGE_BYTES
  readonly globalConcurrency: 1
  readonly providerDownloadConcurrency: 1
  readonly checkpointPolicy: "RAW_CANDIDATE_CANONICAL"
  readonly retryPolicyReference: string
  readonly canonicalTargetBinding: "quantterminal_backfill:canonical.agg_trades"
}

export interface AggTradesExecutionSnapshot extends AggTradesExecutionSnapshotContent { readonly snapshotId: string; readonly snapshotChecksum: string }

export function createAggTradesPartitionId(canonicalInstrumentId: string, day: string): string {
  return `agg-trade:${canonicalInstrumentId}:tick:binance_vision_daily:${day}`
}

export function createAggTradesUnitIdentity(parentManifestId: string, canonicalInstrumentId: string, day: string): string {
  return `agg-trade-unit:${canonicalChecksum({ parentManifestId, datasetId: "agg-trade", providerId: "binance-public-archive", canonicalInstrumentId, day })}`
}

export function createAggTradesExecutionSnapshot(input: {
  readonly manifest: BackfillManifest
  readonly availability: readonly AggTradesAvailabilityBoundary[]
  readonly completedByPartitionId?: Readonly<Record<string, string>>
}): AggTradesExecutionSnapshot {
  if (input.manifest.manifestId !== `bfm_${input.manifest.manifestChecksum}`) throw new Error("AGG_TRADES_PARENT_MANIFEST_INVALID")
  const governed = new Map(input.manifest.instruments.map((instrument) => [instrument.canonicalInstrumentId, instrument]))
  const instruments = [...input.availability].sort((a, b) => a.canonicalInstrumentId.localeCompare(b.canonicalInstrumentId))
  if (instruments.length !== governed.size || instruments.some((item) => !governed.has(item.canonicalInstrumentId))) throw new Error("AGG_TRADES_SCOPE_MISMATCH")
  const completed = input.completedByPartitionId ?? {}
  const partitions = instruments.flatMap((boundary) => boundary.archives.map((archive) => {
    const partitionId = createAggTradesPartitionId(boundary.canonicalInstrumentId, archive.day)
    const existingCompletionReference = completed[partitionId] ?? null
    const windowStart = `${archive.day}T00:00:00.000Z`
    const windowEnd = new Date(Date.parse(windowStart) + 86_400_000).toISOString()
    const ratio = boundary.estimatedRecords / boundary.compressedSourceBytes
    return Object.freeze({ partitionId, parentManifestId: input.manifest.manifestId, parentManifestChecksum: input.manifest.manifestChecksum, datasetId: "agg-trade" as const, providerId: "binance-public-archive" as const, canonicalInstrumentId: boundary.canonicalInstrumentId, providerSymbol: boundary.providerSymbol, sourceDay: archive.day, windowStart, windowEnd, sourceObject: `https://data.binance.vision/data/futures/um/daily/aggTrades/${boundary.providerSymbol}/${boundary.providerSymbol}-aggTrades-${archive.day}.zip`, compressedBytes: archive.compressedBytes, estimatedRecords: Math.round(archive.compressedBytes * ratio), unitIdentity: createAggTradesUnitIdentity(input.manifest.manifestId, boundary.canonicalInstrumentId, archive.day), initialState: existingCompletionReference ? "SKIPPED_ALREADY_COMPLETE" as const : "PENDING" as const, existingCompletionReference })
  })).sort((a, b) => a.windowStart.localeCompare(b.windowStart) || a.providerSymbol.localeCompare(b.providerSymbol))
  const alreadyCompletedPartitionCount = partitions.filter((partition) => partition.initialState === "SKIPPED_ALREADY_COMPLETE").length
  const estimatedRecords = instruments.reduce((sum, item) => sum + item.estimatedRecords, 0)
  const conservativeRecords = instruments.reduce((sum, item) => sum + item.conservativeRecords, 0)
  const content: AggTradesExecutionSnapshotContent = Object.freeze({ schemaVersion: AGG_TRADES_EXECUTION_SCHEMA_VERSION, parentManifestId: input.manifest.manifestId, parentManifestChecksum: input.manifest.manifestChecksum, datasetId: "agg-trade", providerId: "binance-public-archive", sourceSelectionPolicy: "BINANCE_VISION_USDM_DAILY_AGGTRADES_ONLY", identityPolicy: "PROVIDER_VENUE_SYMBOL_AGGREGATE_TRADE_ID", frozenCutoffUtc: AGG_TRADES_FROZEN_CUTOFF, normalizerVersion: "d3-phase3-normalizer-v1", instruments: Object.freeze(instruments), partitions: Object.freeze(partitions), completePartitionCount: partitions.length, alreadyCompletedPartitionCount, pendingPartitionCount: partitions.length - alreadyCompletedPartitionCount, measuredCompressedSourceBytes: instruments.reduce((sum, item) => sum + item.compressedSourceBytes, 0), estimatedRecords, conservativeRecords, estimatedCanonicalStorageBytes: estimatedRecords * AGG_TRADES_PER_RECORD_STORAGE_BYTES, conservativeCanonicalStorageBytes: conservativeRecords * AGG_TRADES_PER_RECORD_STORAGE_BYTES, remainingDatasetStorageBytes: AGG_TRADES_REMAINING_DATASET_STORAGE_BYTES, globalConcurrency: 1, providerDownloadConcurrency: 1, checkpointPolicy: "RAW_CANDIDATE_CANONICAL", retryPolicyReference: input.manifest.retryPolicyReference, canonicalTargetBinding: "quantterminal_backfill:canonical.agg_trades" })
  const snapshotChecksum = canonicalChecksum(content)
  return Object.freeze({ ...content, snapshotId: `agg-trades-execution:${snapshotChecksum}`, snapshotChecksum })
}

export function evaluateAggTradesCapacity(input: { readonly snapshot: AggTradesExecutionSnapshot; readonly postgresFreeBytes: number; readonly artifactFreeBytes: number }): { readonly status: "PASS" | "BLOCKED"; readonly reasonCodes: readonly string[]; readonly requiredPostgresBytes: number; readonly requiredArtifactBytes: number } {
  const requiredPostgresBytes = input.snapshot.conservativeCanonicalStorageBytes + input.snapshot.remainingDatasetStorageBytes
  const requiredArtifactBytes = input.snapshot.measuredCompressedSourceBytes
  const reasonCodes = [requiredPostgresBytes > input.postgresFreeBytes ? "POSTGRES_CAPACITY_INSUFFICIENT" : null, requiredArtifactBytes > input.artifactFreeBytes ? "ARTIFACT_CAPACITY_INSUFFICIENT" : null].filter((value): value is string => value !== null)
  return Object.freeze({ status: reasonCodes.length ? "BLOCKED" : "PASS", reasonCodes: Object.freeze(reasonCodes), requiredPostgresBytes, requiredArtifactBytes })
}
