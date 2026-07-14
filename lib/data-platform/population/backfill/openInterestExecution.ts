import { canonicalChecksum } from "@/lib/data-platform/contracts"

import type { BackfillManifest } from "./contracts"

export const OPEN_INTEREST_EXECUTION_SCHEMA_VERSION = "1.0.0" as const
export const OPEN_INTEREST_FROZEN_CUTOFF = "2026-07-12T00:00:00.000Z" as const
export const OPEN_INTEREST_CADENCE = "5m" as const

export type OpenInterestPartitionTerminalClassification =
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

export interface OpenInterestAvailabilityBoundary {
  readonly canonicalInstrumentId: string
  readonly providerSymbol: string
  readonly activationTimestamp: string
  readonly earliestVerifiedArchiveDay: string
  readonly latestVerifiedArchiveDay: "2026-07-11"
  readonly earliestVerifiedObservationTime: string
  readonly finalEligibleObservationTime: string
  readonly verifiedArchiveCount: number
  readonly verifiedSourceBytes: number
  readonly discoveryMethod: "BINANCE_VISION_S3_COMPLETE_PREFIX_INVENTORY"
  readonly discoveryEvidence: string
}

export interface OpenInterestExecutionPartition {
  readonly partitionId: string
  readonly parentManifestId: string
  readonly parentManifestChecksum: string
  readonly datasetId: "open-interest"
  readonly providerId: "binance-vision"
  readonly sourceKind: "BINANCE_VISION_DAILY_METRICS"
  readonly venue: "BINANCE"
  readonly marketType: "USD_M_FUTURES"
  readonly canonicalInstrumentId: string
  readonly providerSymbol: string
  readonly cadence: typeof OPEN_INTEREST_CADENCE
  readonly sourceDay: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly sourceObject: string
  readonly expectedUniqueObservations: number
  readonly sourceByteCount: number
  readonly unitIdentity: string
  readonly initialState: "PENDING" | "SKIPPED_ALREADY_COMPLETE"
  readonly retryState: "NOT_ATTEMPTED"
  readonly existingCompletionReference: string | null
  readonly expectedTerminalClassification: "POPULATED_OR_EXPLICIT_SOURCE_CLASSIFICATION"
}

export interface OpenInterestExecutionSnapshotContent {
  readonly schemaVersion: typeof OPEN_INTEREST_EXECUTION_SCHEMA_VERSION
  readonly parentManifestId: string
  readonly parentManifestChecksum: string
  readonly datasetId: "open-interest"
  readonly providerId: "binance-vision"
  readonly sourceSelectionPolicy: "BINANCE_VISION_DAILY_METRICS_ONLY"
  readonly sourceDuplicatePolicy: "REJECT_EXACT_DUPLICATE_SOURCE_OBSERVATIONS"
  readonly cadence: typeof OPEN_INTEREST_CADENCE
  readonly quantityUnit: "PROVIDER_NATIVE"
  readonly valueUnit: "PROVIDER_NATIVE_QUOTE_VALUE"
  readonly frozenCutoffUtc: typeof OPEN_INTEREST_FROZEN_CUTOFF
  readonly normalizerVersion: "d3-phase3-normalizer-v1"
  readonly instruments: readonly OpenInterestAvailabilityBoundary[]
  readonly partitions: readonly OpenInterestExecutionPartition[]
  readonly completePartitionCount: number
  readonly alreadyCompletedPartitionCount: number
  readonly pendingPartitionCount: number
  readonly blockedPartitionCount: 0
  readonly expectedObservationCount: number
  readonly measuredSourceBytes: number
  readonly partitionStrategy: "ONE_INSTRUMENT_UTC_SOURCE_DAY_PER_UNIT"
  readonly globalConcurrency: 1
  readonly providerRequestConcurrency: 1
  readonly checkpointPolicy: "RAW_CANDIDATE_CANONICAL"
  readonly retryPolicyReference: string
  readonly canonicalTargetBinding: "quantterminal_backfill:canonical.open_interest"
}

export interface OpenInterestExecutionSnapshot extends OpenInterestExecutionSnapshotContent {
  readonly snapshotId: string
  readonly snapshotChecksum: string
}

export interface OpenInterestPartitionProgress {
  readonly partitionId: string
  readonly classification: OpenInterestPartitionTerminalClassification | "ACTIVE" | "PENDING"
  readonly reasonCodes: readonly string[]
  readonly jobId: string | null
  readonly runId: string | null
  readonly unitId: string | null
  readonly rawObjectId: string | null
  readonly downloadedBytes: number
  readonly parsedObservations: number
  readonly acceptedCandidates: number
  readonly rejectedCandidates: number
  readonly sourceDuplicateRows: number
  readonly canonicalFactsCreated: number
  readonly canonicalFactsReused: number
  readonly conflicts: number
  readonly updatedAt: string
}

function utcDay(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("OPEN_INTEREST_DAY_INVALID")
  const parsed = Date.parse(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) throw new Error("OPEN_INTEREST_DAY_INVALID")
  return parsed
}

export function openInterestDaysInclusive(firstDay: string, lastDay: string): readonly string[] {
  const first = utcDay(firstDay)
  const last = utcDay(lastDay)
  if (first > last) throw new Error("OPEN_INTEREST_DAY_RANGE_INVALID")
  const days: string[] = []
  for (let cursor = first; cursor <= last; cursor += 86_400_000) days.push(new Date(cursor).toISOString().slice(0, 10))
  return Object.freeze(days)
}

export function createOpenInterestPartitionId(canonicalInstrumentId: string, sourceDay: string): string {
  return `open-interest:${canonicalInstrumentId}:5m:binance_vision_daily_metrics:${sourceDay}`
}

export function createOpenInterestUnitIdentity(parentManifestId: string, canonicalInstrumentId: string, sourceDay: string): string {
  return `open-interest-unit:${canonicalChecksum({ parentManifestId, datasetId: "open-interest", providerId: "binance-vision", cadence: OPEN_INTEREST_CADENCE, canonicalInstrumentId, sourceDay })}`
}

export function createOpenInterestExecutionSnapshot(input: {
  readonly manifest: BackfillManifest
  readonly availability: readonly OpenInterestAvailabilityBoundary[]
  readonly sourceBytesByPartitionId: Readonly<Record<string, number>>
  readonly completedByPartitionId?: Readonly<Record<string, string>>
}): OpenInterestExecutionSnapshot {
  if (input.manifest.manifestId !== `bfm_${input.manifest.manifestChecksum}`) throw new Error("OPEN_INTEREST_PARENT_MANIFEST_INVALID")
  const governed = new Map(input.manifest.instruments.map((instrument) => [instrument.canonicalInstrumentId, instrument]))
  const availability = [...input.availability].sort((a, b) => a.canonicalInstrumentId.localeCompare(b.canonicalInstrumentId))
  if (availability.length !== governed.size || availability.some((item) => !governed.has(item.canonicalInstrumentId))) throw new Error("OPEN_INTEREST_AVAILABILITY_SCOPE_MISMATCH")
  const completed = input.completedByPartitionId ?? {}
  const partitions = availability.flatMap((boundary) => openInterestDaysInclusive(boundary.earliestVerifiedArchiveDay, boundary.latestVerifiedArchiveDay).map((sourceDay) => {
    const partitionId = createOpenInterestPartitionId(boundary.canonicalInstrumentId, sourceDay)
    const existingCompletionReference = completed[partitionId] ?? null
    const windowStart = `${sourceDay}T00:00:00.000Z`
    const windowEnd = new Date(Date.parse(windowStart) + 86_400_000).toISOString()
    const sourceByteCount = input.sourceBytesByPartitionId[partitionId]
    if (!Number.isInteger(sourceByteCount) || sourceByteCount <= 0) throw new Error(`OPEN_INTEREST_SOURCE_SIZE_MISSING:${partitionId}`)
    return Object.freeze({ partitionId, parentManifestId: input.manifest.manifestId, parentManifestChecksum: input.manifest.manifestChecksum, datasetId: "open-interest" as const, providerId: "binance-vision" as const, sourceKind: "BINANCE_VISION_DAILY_METRICS" as const, venue: "BINANCE" as const, marketType: "USD_M_FUTURES" as const, canonicalInstrumentId: boundary.canonicalInstrumentId, providerSymbol: boundary.providerSymbol, cadence: OPEN_INTEREST_CADENCE, sourceDay, windowStart, windowEnd, sourceObject: `https://data.binance.vision/data/futures/um/daily/metrics/${boundary.providerSymbol}/${boundary.providerSymbol}-metrics-${sourceDay}.zip`, expectedUniqueObservations: sourceDay === "2026-07-11" ? 287 : 288, sourceByteCount, unitIdentity: createOpenInterestUnitIdentity(input.manifest.manifestId, boundary.canonicalInstrumentId, sourceDay), initialState: existingCompletionReference ? "SKIPPED_ALREADY_COMPLETE" as const : "PENDING" as const, retryState: "NOT_ATTEMPTED" as const, existingCompletionReference, expectedTerminalClassification: "POPULATED_OR_EXPLICIT_SOURCE_CLASSIFICATION" as const })
  })).sort((a, b) => a.windowStart.localeCompare(b.windowStart) || a.providerSymbol.localeCompare(b.providerSymbol))
  const alreadyCompletedPartitionCount = partitions.filter((partition) => partition.initialState === "SKIPPED_ALREADY_COMPLETE").length
  const content: OpenInterestExecutionSnapshotContent = Object.freeze({ schemaVersion: OPEN_INTEREST_EXECUTION_SCHEMA_VERSION, parentManifestId: input.manifest.manifestId, parentManifestChecksum: input.manifest.manifestChecksum, datasetId: "open-interest", providerId: "binance-vision", sourceSelectionPolicy: "BINANCE_VISION_DAILY_METRICS_ONLY", sourceDuplicatePolicy: "REJECT_EXACT_DUPLICATE_SOURCE_OBSERVATIONS", cadence: OPEN_INTEREST_CADENCE, quantityUnit: "PROVIDER_NATIVE", valueUnit: "PROVIDER_NATIVE_QUOTE_VALUE", frozenCutoffUtc: OPEN_INTEREST_FROZEN_CUTOFF, normalizerVersion: "d3-phase3-normalizer-v1", instruments: Object.freeze(availability), partitions: Object.freeze(partitions), completePartitionCount: partitions.length, alreadyCompletedPartitionCount, pendingPartitionCount: partitions.length - alreadyCompletedPartitionCount, blockedPartitionCount: 0, expectedObservationCount: partitions.reduce((sum, partition) => sum + partition.expectedUniqueObservations, 0), measuredSourceBytes: partitions.reduce((sum, partition) => sum + partition.sourceByteCount, 0), partitionStrategy: "ONE_INSTRUMENT_UTC_SOURCE_DAY_PER_UNIT", globalConcurrency: 1, providerRequestConcurrency: 1, checkpointPolicy: "RAW_CANDIDATE_CANONICAL", retryPolicyReference: input.manifest.retryPolicyReference, canonicalTargetBinding: "quantterminal_backfill:canonical.open_interest" })
  const snapshotChecksum = canonicalChecksum(content)
  return Object.freeze({ ...content, snapshotId: `open-interest-execution:${snapshotChecksum}`, snapshotChecksum })
}
