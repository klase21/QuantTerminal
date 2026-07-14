import { canonicalChecksum } from "@/lib/data-platform/contracts"

import type { BackfillManifest } from "./contracts"

export const FUNDING_EXECUTION_SCHEMA_VERSION = "1.0.0" as const
export const FUNDING_FROZEN_CUTOFF = "2026-07-12T00:00:00.000Z" as const
export const FUNDING_ARCHIVE_FINAL_MONTH = "2026-06" as const
export const FUNDING_REST_TAIL_START = "2026-07-01T00:00:00.000Z" as const

export type FundingSourceKind = "BINANCE_VISION_MONTHLY" | "BINANCE_OFFICIAL_REST_TAIL"
export type FundingPartitionInitialState = "PENDING" | "SKIPPED_ALREADY_COMPLETE"
export type FundingPartitionTerminalClassification =
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

export interface FundingAvailabilityBoundary {
  readonly canonicalInstrumentId: string
  readonly providerSymbol: string
  readonly activationTimestamp: string
  readonly earliestVerifiedArchiveMonth: string
  readonly latestVerifiedArchiveMonth: typeof FUNDING_ARCHIVE_FINAL_MONTH
  readonly earliestVerifiedEventTime: string
  readonly finalEligibleEventTime: string
  readonly discoveryMethod: "BINANCE_VISION_S3_PREFIX_AND_REST_QUERY"
  readonly discoveryEvidence: string
  readonly unavailableBefore: string
}

export interface FundingExecutionPartition {
  readonly partitionId: string
  readonly parentManifestId: string
  readonly parentManifestChecksum: string
  readonly datasetId: "funding"
  readonly cadence: "EVENT_8H"
  readonly sourceKind: FundingSourceKind
  readonly providerId: "binance-vision" | "binance-official-rest-funding-rate"
  readonly venue: "BINANCE"
  readonly marketType: "USD_M_FUTURES"
  readonly canonicalInstrumentId: string
  readonly providerSymbol: string
  readonly sourcePeriod: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly earliestEligibleEventTime: string
  readonly finalEligibleEventTime: string
  readonly sourceObject: string
  readonly unitIdentity: string
  readonly expectedTerminalClassification: "POPULATED_OR_EXPLICIT_SOURCE_CLASSIFICATION"
  readonly executionPriorityGroup: number
  readonly initialState: FundingPartitionInitialState
  readonly retryState: "NOT_ATTEMPTED"
  readonly existingCompletionReference: string | null
  /** Present only for a bounded event subset of a larger provider source object. */
  readonly sourcePartitionId?: string
  readonly sourceWindowStart?: string
  readonly sourceWindowEnd?: string
  readonly preserveSourceRowOrdinal?: true
}

export interface FundingExecutionSnapshotContent {
  readonly schemaVersion: typeof FUNDING_EXECUTION_SCHEMA_VERSION
  readonly parentManifestId: string
  readonly parentManifestChecksum: string
  readonly datasetId: "funding"
  readonly cadence: "EVENT_8H"
  readonly frozenCutoffUtc: typeof FUNDING_FROZEN_CUTOFF
  readonly sourceSelectionPolicy: "VISION_COMPLETE_MONTHS_THEN_OFFICIAL_REST_TAIL"
  readonly instruments: readonly FundingAvailabilityBoundary[]
  readonly partitions: readonly FundingExecutionPartition[]
  readonly completePartitionCount: number
  readonly archivePartitionCount: number
  readonly restTailPartitionCount: number
  readonly alreadyCompletedPartitionCount: number
  readonly pendingPartitionCount: number
  readonly blockedPartitionCount: number
  readonly estimatedEventCount: number
  readonly measuredCanaryCompressedBytes: number
  readonly estimatedSourceBytes: number
  readonly partitionStrategy: "ONE_INSTRUMENT_SOURCE_MONTH_OR_BOUNDED_REST_TAIL_PER_UNIT"
  readonly globalConcurrency: 1
  readonly providerDownloadConcurrency: 1
  readonly checkpointPolicy: "RAW_CANDIDATE_CANONICAL"
  readonly retryPolicyReference: string
}

export interface FundingExecutionSnapshot extends FundingExecutionSnapshotContent {
  readonly snapshotId: string
  readonly snapshotChecksum: string
}

export interface FundingPartitionProgress {
  readonly partitionId: string
  readonly classification: FundingPartitionTerminalClassification | "ACTIVE" | "PENDING"
  readonly reasonCodes: readonly string[]
  readonly jobId: string | null
  readonly runId: string | null
  readonly unitId: string | null
  readonly rawObjectId: string | null
  readonly downloadedBytes: number
  readonly parsedEvents: number
  readonly acceptedCandidates: number
  readonly rejectedCandidates: number
  readonly canonicalFactsCreated: number
  readonly canonicalFactsReused: number
  readonly conflicts: number
  readonly updatedAt: string
}

function monthStart(month: string): number {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("FUNDING_MONTH_INVALID")
  const value = Date.parse(`${month}-01T00:00:00.000Z`)
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 7) !== month) throw new Error("FUNDING_MONTH_INVALID")
  return value
}

export function fundingMonthsInclusive(firstMonth: string, lastMonth: string): readonly string[] {
  const first = monthStart(firstMonth)
  const last = monthStart(lastMonth)
  if (first > last) throw new Error("FUNDING_MONTH_RANGE_INVALID")
  const months: string[] = []
  for (let cursor = first; cursor <= last;) {
    const date = new Date(cursor)
    months.push(date.toISOString().slice(0, 7))
    cursor = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
  }
  return Object.freeze(months)
}

export function createFundingPartitionId(canonicalInstrumentId: string, sourceKind: FundingSourceKind, sourcePeriod: string): string {
  return `funding:${canonicalInstrumentId}:event-8h:${sourceKind.toLowerCase()}:${sourcePeriod}`
}

export function createFundingUnitIdentity(parentManifestId: string, canonicalInstrumentId: string, sourceKind: FundingSourceKind, sourcePeriod: string): string {
  return `funding-unit:${canonicalChecksum({ parentManifestId, datasetId: "funding", cadence: "EVENT_8H", canonicalInstrumentId, sourceKind, sourcePeriod })}`
}

export function createBoundedFundingEventPartition(
  partition: FundingExecutionPartition,
  eventWindowStart: string,
  eventWindowEnd: string,
): FundingExecutionPartition {
  const start = Date.parse(eventWindowStart)
  const end = Date.parse(eventWindowEnd)
  const sourceStart = Date.parse(partition.windowStart)
  const sourceEnd = Date.parse(partition.windowEnd)
  if (![start, end, sourceStart, sourceEnd].every(Number.isFinite) || start >= end || start < sourceStart || end > sourceEnd) {
    throw new Error("FUNDING_BOUNDED_EVENT_WINDOW_INVALID")
  }
  if (start === sourceStart && end === sourceEnd) return partition
  const scope = canonicalChecksum({ sourcePartitionId: partition.partitionId, eventWindowStart, eventWindowEnd })
  const partitionId = `${partition.partitionId}:bounded:${scope}`
  return Object.freeze({
    ...partition,
    partitionId,
    windowStart: eventWindowStart,
    windowEnd: eventWindowEnd,
    earliestEligibleEventTime: new Date(Math.max(start, Date.parse(partition.earliestEligibleEventTime))).toISOString(),
    finalEligibleEventTime: new Date(Math.min(end - 1, Date.parse(partition.finalEligibleEventTime))).toISOString(),
    unitIdentity: `funding-unit:${canonicalChecksum({ parentManifestId: partition.parentManifestId, sourcePartitionId: partition.partitionId, eventWindowStart, eventWindowEnd })}`,
    initialState: "PENDING",
    existingCompletionReference: null,
    sourcePartitionId: partition.partitionId,
    sourceWindowStart: partition.windowStart,
    sourceWindowEnd: partition.windowEnd,
    preserveSourceRowOrdinal: true,
  })
}

function partitionBase(manifest: BackfillManifest, boundary: FundingAvailabilityBoundary, sourceKind: FundingSourceKind, sourcePeriod: string, completed: Readonly<Record<string, string>>) {
  const partitionId = createFundingPartitionId(boundary.canonicalInstrumentId, sourceKind, sourcePeriod)
  const completion = completed[partitionId] ?? null
  return { partitionId, parentManifestId: manifest.manifestId, parentManifestChecksum: manifest.manifestChecksum, datasetId: "funding" as const, cadence: "EVENT_8H" as const, sourceKind, venue: "BINANCE" as const, marketType: "USD_M_FUTURES" as const, canonicalInstrumentId: boundary.canonicalInstrumentId, providerSymbol: boundary.providerSymbol, sourcePeriod, unitIdentity: createFundingUnitIdentity(manifest.manifestId, boundary.canonicalInstrumentId, sourceKind, sourcePeriod), expectedTerminalClassification: "POPULATED_OR_EXPLICIT_SOURCE_CLASSIFICATION" as const, executionPriorityGroup: sourceKind === "BINANCE_OFFICIAL_REST_TAIL" ? 0 : 1, initialState: completion ? "SKIPPED_ALREADY_COMPLETE" as const : "PENDING" as const, retryState: "NOT_ATTEMPTED" as const, existingCompletionReference: completion }
}

function archivePartition(manifest: BackfillManifest, boundary: FundingAvailabilityBoundary, month: string, completed: Readonly<Record<string, string>>): FundingExecutionPartition {
  const start = `${month}-01T00:00:00.000Z`
  const date = new Date(monthStart(month))
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString()
  return Object.freeze({ ...partitionBase(manifest, boundary, "BINANCE_VISION_MONTHLY", month, completed), providerId: "binance-vision", windowStart: start, windowEnd: end, earliestEligibleEventTime: month === boundary.earliestVerifiedArchiveMonth ? boundary.earliestVerifiedEventTime : start, finalEligibleEventTime: new Date(Date.parse(end) - 1).toISOString(), sourceObject: `https://data.binance.vision/data/futures/um/monthly/fundingRate/${boundary.providerSymbol}/${boundary.providerSymbol}-fundingRate-${month}.zip` })
}

function restPartition(manifest: BackfillManifest, boundary: FundingAvailabilityBoundary, completed: Readonly<Record<string, string>>): FundingExecutionPartition {
  const sourcePeriod = "2026-07-01_2026-07-12"
  const start = Date.parse(FUNDING_REST_TAIL_START)
  const end = Date.parse(FUNDING_FROZEN_CUTOFF)
  const url = new URL("https://fapi.binance.com/fapi/v1/fundingRate")
  url.searchParams.set("symbol", boundary.providerSymbol)
  url.searchParams.set("startTime", String(start))
  url.searchParams.set("endTime", String(end - 1))
  url.searchParams.set("limit", "1000")
  return Object.freeze({ ...partitionBase(manifest, boundary, "BINANCE_OFFICIAL_REST_TAIL", sourcePeriod, completed), providerId: "binance-official-rest-funding-rate", windowStart: FUNDING_REST_TAIL_START, windowEnd: FUNDING_FROZEN_CUTOFF, earliestEligibleEventTime: FUNDING_REST_TAIL_START, finalEligibleEventTime: boundary.finalEligibleEventTime, sourceObject: url.toString() })
}

export function createFundingExecutionSnapshot(input: { readonly manifest: BackfillManifest; readonly availability: readonly FundingAvailabilityBoundary[]; readonly completedByPartitionId?: Readonly<Record<string, string>>; readonly measuredCanaryCompressedBytes: number; readonly measuredArchiveBytes: number }): FundingExecutionSnapshot {
  if (input.manifest.manifestId !== `bfm_${input.manifest.manifestChecksum}`) throw new Error("FUNDING_PARENT_MANIFEST_INVALID")
  const governed = new Map(input.manifest.instruments.map((item) => [item.canonicalInstrumentId, item]))
  const availability = [...input.availability].sort((a, b) => a.canonicalInstrumentId.localeCompare(b.canonicalInstrumentId))
  if (availability.length !== governed.size || availability.some((item) => !governed.has(item.canonicalInstrumentId))) throw new Error("FUNDING_AVAILABILITY_SCOPE_MISMATCH")
  const completed = input.completedByPartitionId ?? {}
  const partitions = availability.flatMap((boundary) => [...fundingMonthsInclusive(boundary.earliestVerifiedArchiveMonth, boundary.latestVerifiedArchiveMonth).map((month) => archivePartition(input.manifest, boundary, month, completed)), restPartition(input.manifest, boundary, completed)])
    .sort((a, b) => a.executionPriorityGroup - b.executionPriorityGroup || a.windowStart.localeCompare(b.windowStart) || a.providerSymbol.localeCompare(b.providerSymbol))
  const alreadyCompletedPartitionCount = partitions.filter((partition) => partition.initialState === "SKIPPED_ALREADY_COMPLETE").length
  const estimatedEventCount = partitions.reduce((total, partition) => total + (partition.sourceKind === "BINANCE_OFFICIAL_REST_TAIL" ? 33 : Math.ceil((Date.parse(partition.windowEnd) - Date.parse(partition.windowStart)) / 28_800_000)), 0)
  const content: FundingExecutionSnapshotContent = Object.freeze({ schemaVersion: FUNDING_EXECUTION_SCHEMA_VERSION, parentManifestId: input.manifest.manifestId, parentManifestChecksum: input.manifest.manifestChecksum, datasetId: "funding", cadence: "EVENT_8H", frozenCutoffUtc: FUNDING_FROZEN_CUTOFF, sourceSelectionPolicy: "VISION_COMPLETE_MONTHS_THEN_OFFICIAL_REST_TAIL", instruments: Object.freeze(availability), partitions: Object.freeze(partitions), completePartitionCount: partitions.length, archivePartitionCount: partitions.filter((item) => item.sourceKind === "BINANCE_VISION_MONTHLY").length, restTailPartitionCount: partitions.filter((item) => item.sourceKind === "BINANCE_OFFICIAL_REST_TAIL").length, alreadyCompletedPartitionCount, pendingPartitionCount: partitions.length - alreadyCompletedPartitionCount, blockedPartitionCount: 0, estimatedEventCount, measuredCanaryCompressedBytes: input.measuredCanaryCompressedBytes, estimatedSourceBytes: input.measuredArchiveBytes + input.measuredCanaryCompressedBytes * availability.length, partitionStrategy: "ONE_INSTRUMENT_SOURCE_MONTH_OR_BOUNDED_REST_TAIL_PER_UNIT", globalConcurrency: 1, providerDownloadConcurrency: 1, checkpointPolicy: "RAW_CANDIDATE_CANONICAL", retryPolicyReference: input.manifest.retryPolicyReference })
  const snapshotChecksum = canonicalChecksum(content)
  return Object.freeze({ ...content, snapshotId: `funding-execution:${snapshotChecksum}`, snapshotChecksum })
}
