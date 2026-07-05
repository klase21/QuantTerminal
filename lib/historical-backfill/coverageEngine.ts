import type { PersistenceRepository } from "@/lib/persistence/repository"
import type {
  HistoricalCoverageMode,
  HistoricalDatasetResolution,
  HistoricalProviderMetadataTargetKind,
  HistoricalProviderTier,
} from "@/lib/persistence/repository/types"
import {
  inspectRepositoryProviderAvailability,
  type ProviderAvailabilityStatus,
} from "@/lib/historical-backfill/repositoryHealth"

export const REPOSITORY_COVERAGE_STATUSES = [
  "COMPLETE",
  "PARTIAL",
  "MISSING",
  "UNAVAILABLE",
  "EXPERIMENTAL",
  "VARIABLE",
] as const

export type RepositoryCoverageStatus = typeof REPOSITORY_COVERAGE_STATUSES[number]

export const COVERAGE_DATASETS: readonly HistoricalProviderMetadataTargetKind[] = Object.freeze([
  "HISTORICAL_MARKET",
  "HISTORICAL_OPEN_INTEREST",
  "HISTORICAL_LIQUIDATION",
  "HISTORICAL_FUNDING",
  "HISTORICAL_AGG_TRADE",
])

export interface RepositoryCoverageResult {
  readonly dataset: HistoricalProviderMetadataTargetKind
  readonly symbol: string
  readonly utcDay: string
  readonly resolution: HistoricalDatasetResolution | null
  readonly coverageMode: HistoricalCoverageMode | null
  readonly expectedRecords: number | null
  readonly actualRecords: number
  readonly coveragePercent: number | null
  readonly repositoryCoverageStatus: RepositoryCoverageStatus
  readonly providerAvailabilityStatus: ProviderAvailabilityStatus
  readonly provider: string | null
  readonly providerTier: HistoricalProviderTier | null
  readonly canonical: boolean | null
  readonly verified: boolean | null
  readonly confidence: number | null
  readonly firstObservedAt: string | null
  readonly lastObservedAt: string | null
  readonly reason: string
}

export interface RepositoryCoverageReport {
  readonly status: "SUCCESS" | "PARTIAL" | "VALIDATION_ERROR" | "UNAVAILABLE"
  readonly symbol: string
  readonly utcDay: string
  readonly datasets: readonly RepositoryCoverageResult[]
  readonly errors: readonly string[]
}

export function createCoverageResultKey(result: Pick<
  RepositoryCoverageResult,
  "dataset" | "symbol" | "utcDay"
>): string {
  return [result.dataset, result.symbol, result.utcDay].join(":")
}

interface PersistedDatasetContract {
  readonly datasetKind: HistoricalProviderMetadataTargetKind
  readonly sourceId: string
  readonly symbol: string
  readonly contractVersion: number
  readonly resolution: HistoricalDatasetResolution
  readonly coverageMode: HistoricalCoverageMode
  readonly expectedDailyRecords: number | null
  readonly variableDailyRecords: boolean
  readonly providerTier: HistoricalProviderTier
  readonly canonical: boolean
  readonly verified: boolean
  readonly confidence: number
}

const RESOLUTIONS = new Set(["5m", "8h_event", "tick"])
const COVERAGE_MODES = new Set(["time_series", "time_series_experimental", "event", "event_stream"])
const PROVIDER_TIERS = new Set(["CANONICAL", "VERIFIED", "EXPERIMENTAL", "UNKNOWN"])

function parseContract(payload: unknown): PersistedDatasetContract | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null
  const value = payload as Record<string, unknown>
  if (!COVERAGE_DATASETS.includes(value.datasetKind as HistoricalProviderMetadataTargetKind)
    || typeof value.sourceId !== "string" || typeof value.symbol !== "string"
    || !Number.isInteger(value.contractVersion) || (value.contractVersion as number) <= 0
    || !RESOLUTIONS.has(value.resolution as string)
    || !COVERAGE_MODES.has(value.coverageMode as string)
    || (value.expectedDailyRecords !== null
      && (!Number.isInteger(value.expectedDailyRecords) || (value.expectedDailyRecords as number) <= 0))
    || typeof value.variableDailyRecords !== "boolean"
    || !PROVIDER_TIERS.has(value.providerTier as string)
    || typeof value.canonical !== "boolean" || typeof value.verified !== "boolean"
    || typeof value.confidence !== "number" || !Number.isFinite(value.confidence)
    || value.confidence < 0 || value.confidence > 1) return null
  return Object.freeze(value as unknown as PersistedDatasetContract)
}

async function loadContracts(
  repository: PersistenceRepository,
  symbol: string,
): Promise<ReadonlyMap<HistoricalProviderMetadataTargetKind, PersistedDatasetContract>> {
  const contracts = new Map<HistoricalProviderMetadataTargetKind, PersistedDatasetContract>()
  let cursor: string | undefined
  do {
    const page = await repository.listStorageRecords({
      recordKinds: ["HISTORICAL_DATASET_METADATA"],
      limit: 100,
      ...(cursor ? { cursor } : {}),
    })
    if (page.status !== "SUCCESS") throw new Error(`Dataset metadata read returned ${page.status}.`)
    for (const record of page.value.records) {
      const candidate = parseContract(record.payload)
      if (!candidate || candidate.symbol !== symbol) continue
      const current = contracts.get(candidate.datasetKind)
      if (!current || candidate.contractVersion > current.contractVersion) {
        contracts.set(candidate.datasetKind, candidate)
      }
    }
    cursor = page.value.nextCursor ?? undefined
  } while (cursor)
  return contracts
}

function utcRange(utcDay: string): { readonly start: string; readonly end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(utcDay)) return null
  const start = Date.parse(`${utcDay}T00:00:00.000Z`)
  if (!Number.isFinite(start)) return null
  return Object.freeze({ start: new Date(start).toISOString(), end: new Date(start + 86_400_000).toISOString() })
}

async function countRepositoryDay(input: {
  readonly repository: PersistenceRepository
  readonly contract: PersistedDatasetContract
  readonly start: string
  readonly end: string
}): Promise<{ readonly count: number; readonly first: string | null; readonly last: string | null }> {
  let cursor: string | undefined
  let count = 0
  let first: string | null = null
  let last: string | null = null
  do {
    const page = await input.repository.listStorageRecords({
      recordKinds: [input.contract.datasetKind],
      createdAfter: input.start,
      createdBefore: input.end,
      limit: 5000,
      ...(cursor ? { cursor } : {}),
    })
    if (page.status !== "SUCCESS") throw new Error(`${input.contract.datasetKind} read returned ${page.status}.`)
    for (const record of page.value.records) {
      if (record.createdAt < input.start || record.createdAt >= input.end) continue
      if (!record.payload || typeof record.payload !== "object" || Array.isArray(record.payload)) continue
      const payload = record.payload as Record<string, unknown>
      if (payload.symbol !== input.contract.symbol || payload.sourceId !== input.contract.sourceId) continue
      count += 1
      if (first === null || record.createdAt < first) first = record.createdAt
      if (last === null || record.createdAt > last) last = record.createdAt
    }
    cursor = page.value.nextCursor ?? undefined
  } while (cursor)
  return Object.freeze({ count, first, last })
}

function repositoryStatus(
  contract: PersistedDatasetContract,
  actualRecords: number,
): { readonly status: RepositoryCoverageStatus; readonly percent: number | null; readonly reason: string } {
  if (contract.providerTier === "EXPERIMENTAL") {
    const percent = contract.expectedDailyRecords === null ? null
      : Math.min(100, Number(((actualRecords / contract.expectedDailyRecords) * 100).toFixed(2)))
    return Object.freeze({ status: "EXPERIMENTAL", percent, reason: "Repository coverage is experimental and non-canonical." })
  }
  if (contract.variableDailyRecords) {
    return Object.freeze({
      status: "VARIABLE",
      percent: null,
      reason: actualRecords > 0
        ? "Variable event stream has repository records; no fixed daily denominator applies."
        : "Variable event stream has no repository records for this UTC day.",
    })
  }
  const expected = contract.expectedDailyRecords
  if (expected === null) return Object.freeze({ status: "UNAVAILABLE", percent: null, reason: "Fixed coverage contract has no expected record count." })
  const percent = Math.min(100, Number(((actualRecords / expected) * 100).toFixed(2)))
  if (actualRecords >= expected) return Object.freeze({ status: "COMPLETE", percent, reason: "Repository meets the dataset-specific daily expectation." })
  if (actualRecords > 0) return Object.freeze({ status: "PARTIAL", percent, reason: "Repository contains fewer records than the dataset-specific daily expectation." })
  return Object.freeze({ status: "MISSING", percent, reason: "Repository contains no matching records for this UTC day." })
}

function unavailableResult(
  dataset: HistoricalProviderMetadataTargetKind,
  symbol: string,
  utcDay: string,
  reason: string,
): RepositoryCoverageResult {
  return Object.freeze({
    dataset,
    symbol,
    utcDay,
    resolution: null,
    coverageMode: null,
    expectedRecords: null,
    actualRecords: 0,
    coveragePercent: null,
    repositoryCoverageStatus: "UNAVAILABLE",
    providerAvailabilityStatus: "NOT_CHECKED",
    provider: null,
    providerTier: null,
    canonical: null,
    verified: null,
    confidence: null,
    firstObservedAt: null,
    lastObservedAt: null,
    reason,
  })
}

export async function evaluateRepositoryCoverage(input: {
  readonly repository: PersistenceRepository
  readonly symbol: string
  readonly utcDay: string
}): Promise<RepositoryCoverageReport> {
  const symbol = input.symbol.trim().toUpperCase()
  const range = utcRange(input.utcDay)
  if (!/^[A-Z0-9]{5,24}$/.test(symbol) || !range) {
    return Object.freeze({ status: "VALIDATION_ERROR", symbol, utcDay: input.utcDay, datasets: Object.freeze([]), errors: Object.freeze(["symbol and utcDay must be canonical values."]) })
  }
  let contracts: ReadonlyMap<HistoricalProviderMetadataTargetKind, PersistedDatasetContract>
  try {
    contracts = await loadContracts(input.repository, symbol)
  } catch (error) {
    return Object.freeze({ status: "UNAVAILABLE", symbol, utcDay: input.utcDay, datasets: Object.freeze(COVERAGE_DATASETS.map((dataset) => unavailableResult(dataset, symbol, input.utcDay, error instanceof Error ? error.message : String(error)))), errors: Object.freeze([error instanceof Error ? error.message : String(error)]) })
  }

  const datasets: RepositoryCoverageResult[] = []
  const errors: string[] = []
  for (const dataset of COVERAGE_DATASETS) {
    const contract = contracts.get(dataset)
    if (!contract) {
      datasets.push(unavailableResult(dataset, symbol, input.utcDay, "Repository dataset metadata is missing."))
      errors.push(`${dataset}: dataset metadata is missing.`)
      continue
    }
    try {
      const [day, availability] = await Promise.all([
        countRepositoryDay({ repository: input.repository, contract, ...range }),
        inspectRepositoryProviderAvailability({
          repository: input.repository,
          datasetKind: dataset,
          symbol,
          sourceId: contract.sourceId,
        }),
      ])
      const coverage = repositoryStatus(contract, day.count)
      datasets.push(Object.freeze({
        dataset,
        symbol,
        utcDay: input.utcDay,
        resolution: contract.resolution,
        coverageMode: contract.coverageMode,
        expectedRecords: contract.expectedDailyRecords,
        actualRecords: day.count,
        coveragePercent: coverage.percent,
        repositoryCoverageStatus: coverage.status,
        providerAvailabilityStatus: availability.status,
        provider: contract.sourceId,
        providerTier: contract.providerTier,
        canonical: contract.canonical,
        verified: contract.verified,
        confidence: contract.confidence,
        firstObservedAt: day.first,
        lastObservedAt: day.last,
        reason: `${coverage.reason} ${availability.reason}`,
      }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      datasets.push(unavailableResult(dataset, symbol, input.utcDay, reason))
      errors.push(`${dataset}: ${reason}`)
    }
  }
  return Object.freeze({
    status: errors.length === 0 ? "SUCCESS" : datasets.some((item) => item.repositoryCoverageStatus !== "UNAVAILABLE") ? "PARTIAL" : "UNAVAILABLE",
    symbol,
    utcDay: input.utcDay,
    datasets: Object.freeze(datasets),
    errors: Object.freeze(errors),
  })
}
