import { createHash } from "node:crypto"

import type { PersistenceRepository } from "@/lib/persistence/repository"
import type {
  HistoricalDatasetMetadataPersistenceIntent,
  HistoricalDatasetResolutionMetadata,
  HistoricalProviderMetadataTargetKind,
} from "@/lib/persistence/repository/types"
import type { StorageJsonValue } from "@/lib/persistence/types"

export const HISTORICAL_DATASET_CONTRACT_VERSION = 1 as const
export const HISTORICAL_DATASET_CONTRACT_EFFECTIVE_AT = "2026-07-03T00:00:00.000Z" as const

export type HistoricalDatasetContract = Readonly<Omit<
  HistoricalDatasetMetadataPersistenceIntent,
  "recordedAt" | "payload" | "checksum"
>>

function contract(
  value: HistoricalDatasetContract,
): HistoricalDatasetContract {
  return Object.freeze(value)
}

export const HISTORICAL_DATASET_CONTRACTS: Readonly<
  Record<HistoricalProviderMetadataTargetKind, HistoricalDatasetContract>
> = Object.freeze({
  HISTORICAL_MARKET: contract({
    datasetKind: "HISTORICAL_MARKET",
    sourceId: "binance-vision",
    symbol: "BTCUSDT",
    contractVersion: HISTORICAL_DATASET_CONTRACT_VERSION,
    effectiveAt: HISTORICAL_DATASET_CONTRACT_EFFECTIVE_AT,
    providerTier: "CANONICAL",
    canonical: true,
    verified: true,
    confidence: 1,
    resolution: "5m",
    coverageMode: "time_series",
    expectedCadenceMinutes: 5,
    expectedCadenceHours: null,
    expectedDailyRecords: 288,
    variableDailyRecords: false,
  }),
  HISTORICAL_OPEN_INTEREST: contract({
    datasetKind: "HISTORICAL_OPEN_INTEREST",
    sourceId: "binance-vision",
    symbol: "BTCUSDT",
    contractVersion: HISTORICAL_DATASET_CONTRACT_VERSION,
    effectiveAt: HISTORICAL_DATASET_CONTRACT_EFFECTIVE_AT,
    providerTier: "CANONICAL",
    canonical: true,
    verified: true,
    confidence: 1,
    resolution: "5m",
    coverageMode: "time_series",
    expectedCadenceMinutes: 5,
    expectedCadenceHours: null,
    expectedDailyRecords: 288,
    variableDailyRecords: false,
  }),
  HISTORICAL_LIQUIDATION: contract({
    datasetKind: "HISTORICAL_LIQUIDATION",
    sourceId: "coinalyze-internal-web",
    symbol: "BTCUSDT",
    contractVersion: HISTORICAL_DATASET_CONTRACT_VERSION,
    effectiveAt: HISTORICAL_DATASET_CONTRACT_EFFECTIVE_AT,
    providerTier: "EXPERIMENTAL",
    canonical: false,
    verified: false,
    confidence: 0.65,
    resolution: "5m",
    coverageMode: "time_series_experimental",
    expectedCadenceMinutes: 5,
    expectedCadenceHours: null,
    expectedDailyRecords: 288,
    variableDailyRecords: false,
  }),
  HISTORICAL_FUNDING: contract({
    datasetKind: "HISTORICAL_FUNDING",
    sourceId: "binance-vision",
    symbol: "BTCUSDT",
    contractVersion: HISTORICAL_DATASET_CONTRACT_VERSION,
    effectiveAt: HISTORICAL_DATASET_CONTRACT_EFFECTIVE_AT,
    providerTier: "CANONICAL",
    canonical: true,
    verified: true,
    confidence: 1,
    resolution: "8h_event",
    coverageMode: "event",
    expectedCadenceMinutes: null,
    expectedCadenceHours: 8,
    expectedDailyRecords: 3,
    variableDailyRecords: false,
  }),
  HISTORICAL_AGG_TRADE: contract({
    datasetKind: "HISTORICAL_AGG_TRADE",
    sourceId: "binance-vision",
    symbol: "BTCUSDT",
    contractVersion: HISTORICAL_DATASET_CONTRACT_VERSION,
    effectiveAt: HISTORICAL_DATASET_CONTRACT_EFFECTIVE_AT,
    providerTier: "CANONICAL",
    canonical: true,
    verified: true,
    confidence: 1,
    resolution: "tick",
    coverageMode: "event_stream",
    expectedCadenceMinutes: null,
    expectedCadenceHours: null,
    expectedDailyRecords: null,
    variableDailyRecords: true,
  }),
})

export function getHistoricalDatasetResolutionMetadata(
  datasetKind: HistoricalProviderMetadataTargetKind,
): HistoricalDatasetResolutionMetadata {
  const value = HISTORICAL_DATASET_CONTRACTS[datasetKind]
  return Object.freeze({
    resolution: value.resolution,
    coverageMode: value.coverageMode,
    expectedCadenceMinutes: value.expectedCadenceMinutes,
    expectedCadenceHours: value.expectedCadenceHours,
    expectedDailyRecords: value.expectedDailyRecords,
    variableDailyRecords: value.variableDailyRecords,
  })
}

export const HISTORICAL_COVERAGE_STATUSES = [
  "COMPLETE",
  "PARTIAL",
  "MISSING",
  "UNAVAILABLE",
  "EXPERIMENTAL",
  "VARIABLE",
] as const
export type HistoricalCoverageStatus = typeof HISTORICAL_COVERAGE_STATUSES[number]

export interface HistoricalCoverageEvaluation {
  readonly datasetKind: HistoricalProviderMetadataTargetKind
  readonly actualRecords: number
  readonly expectedRecords: number | null
  readonly coveragePercent: number | null
  readonly status: HistoricalCoverageStatus
}

export function evaluateHistoricalDatasetCoverage(input: {
  readonly datasetKind: HistoricalProviderMetadataTargetKind
  readonly actualRecords: number
  readonly sourceAvailable: boolean
  readonly sourceComplete: boolean
}): HistoricalCoverageEvaluation {
  if (!Number.isInteger(input.actualRecords) || input.actualRecords < 0) {
    throw new Error("actualRecords must be a non-negative integer.")
  }
  const contractValue = HISTORICAL_DATASET_CONTRACTS[input.datasetKind]
  const expectedRecords = contractValue.expectedDailyRecords
  const coveragePercent = expectedRecords === null
    ? null
    : Math.min(100, Number(((input.actualRecords / expectedRecords) * 100).toFixed(2)))
  let status: HistoricalCoverageStatus
  if (!input.sourceAvailable) status = "UNAVAILABLE"
  else if (contractValue.providerTier === "EXPERIMENTAL") status = "EXPERIMENTAL"
  else if (contractValue.variableDailyRecords) {
    status = input.sourceComplete ? "VARIABLE" : input.actualRecords > 0 ? "PARTIAL" : "MISSING"
  } else if (input.actualRecords >= (expectedRecords ?? 0) && input.sourceComplete) status = "COMPLETE"
  else if (input.actualRecords > 0) status = "PARTIAL"
  else status = "MISSING"
  return Object.freeze({
    datasetKind: input.datasetKind,
    actualRecords: input.actualRecords,
    expectedRecords,
    coveragePercent,
    status,
  })
}

export interface DatasetMetadataReconciliationResult {
  readonly status: "SUCCESS" | "DUPLICATE" | "VALIDATION_ERROR" | "PERSISTENCE_ERROR"
  readonly totalRecords: number
  readonly persistedCount: number
  readonly duplicateCount: number
  readonly errors: readonly string[]
}

export async function reconcileHistoricalDatasetMetadata(
  repository: PersistenceRepository,
  recordedAt: string,
): Promise<DatasetMetadataReconciliationResult> {
  if (!Number.isFinite(Date.parse(recordedAt))) {
    return Object.freeze({
      status: "VALIDATION_ERROR",
      totalRecords: 0,
      persistedCount: 0,
      duplicateCount: 0,
      errors: Object.freeze(["recordedAt must be an explicit valid timestamp."]),
    })
  }
  let persistedCount = 0
  let duplicateCount = 0
  const errors: string[] = []
  const contracts = Object.values(HISTORICAL_DATASET_CONTRACTS)
  for (const value of contracts) {
    const checksum = createHash("sha256").update(JSON.stringify(value)).digest("hex")
    const result = await repository.saveHistoricalDatasetMetadata({
      ...value,
      recordedAt,
      payload: value as unknown as StorageJsonValue,
      checksum,
    })
    if (result.status === "SUCCESS") persistedCount += 1
    else if (result.status === "DUPLICATE") duplicateCount += 1
    else errors.push(`${value.datasetKind}: ${result.status}`)
  }
  return Object.freeze({
    status: errors.length > 0 ? "PERSISTENCE_ERROR"
      : persistedCount === 0 && duplicateCount === contracts.length ? "DUPLICATE" : "SUCCESS",
    totalRecords: contracts.length,
    persistedCount,
    duplicateCount,
    errors: Object.freeze(errors),
  })
}
