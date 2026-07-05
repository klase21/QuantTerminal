import type {
  ResearchRepositoryCoverageDataset,
  ResearchRepositoryCoverageResponse,
} from "@/lib/research/researchRepositoryClient"

export const RESEARCH_REPOSITORY_DATASETS = [
  "HISTORICAL_MARKET",
  "HISTORICAL_OPEN_INTEREST",
  "HISTORICAL_LIQUIDATION",
  "HISTORICAL_FUNDING",
  "HISTORICAL_AGG_TRADE",
] as const

export type ResearchRepositoryDataset = typeof RESEARCH_REPOSITORY_DATASETS[number]

export interface ResearchRepositorySummaryRow {
  readonly dataset: ResearchRepositoryDataset
  readonly label: "OHLCV" | "OPEN INTEREST" | "LIQUIDATION" | "FUNDING" | "AGGTRADE"
  readonly coverageStatus: string
  readonly actualRecords: number
  readonly expectedRecords: number | null
  readonly coveragePercent: number | null
  readonly resolution: string
  readonly coverageMode: string
  readonly providerTier: string
  readonly canonical: boolean
  readonly verified: boolean
  readonly confidence: number
  readonly firstObservedAt: string | null
  readonly lastObservedAt: string | null
  readonly computedAt: string
}

export interface ResearchRepositorySummary {
  readonly symbol: string
  readonly utcDay: string
  readonly projectionStatus: "AVAILABLE"
  readonly rows: readonly ResearchRepositorySummaryRow[]
}

export type ResearchRepositoryAdapterResult =
  | { readonly status: "SUCCESS"; readonly value: ResearchRepositorySummary }
  | { readonly status: "INVALID_RESPONSE"; readonly reason: string }

const LABELS: Record<ResearchRepositoryDataset, ResearchRepositorySummaryRow["label"]> = {
  HISTORICAL_MARKET: "OHLCV",
  HISTORICAL_OPEN_INTEREST: "OPEN INTEREST",
  HISTORICAL_LIQUIDATION: "LIQUIDATION",
  HISTORICAL_FUNDING: "FUNDING",
  HISTORICAL_AGG_TRADE: "AGGTRADE",
}

function isFiniteNullable(value: number | null) {
  return value === null || Number.isFinite(value)
}

function validDataset(value: ResearchRepositoryCoverageDataset): value is ResearchRepositoryCoverageDataset & { dataset: ResearchRepositoryDataset } {
  return RESEARCH_REPOSITORY_DATASETS.includes(value.dataset as ResearchRepositoryDataset)
    && Number.isInteger(value.actualRecords) && value.actualRecords >= 0
    && (value.expectedRecords === null || (Number.isInteger(value.expectedRecords) && value.expectedRecords >= 0))
    && isFiniteNullable(value.coveragePercent)
    && Number.isFinite(value.confidence) && value.confidence >= 0 && value.confidence <= 1
    && typeof value.providerTier === "string" && value.providerTier.length > 0
    && typeof value.coverageStatus === "string" && value.coverageStatus.length > 0
}

export function adaptResearchRepositoryCoverage(
  response: ResearchRepositoryCoverageResponse,
): ResearchRepositoryAdapterResult {
  const byDataset = new Map(response.datasets.map((dataset) => [dataset.dataset, dataset]))
  const rows: ResearchRepositorySummaryRow[] = []
  for (const dataset of RESEARCH_REPOSITORY_DATASETS) {
    const value = byDataset.get(dataset)
    if (!value || !validDataset(value)) {
      return Object.freeze({ status: "INVALID_RESPONSE", reason: `${dataset} coverage projection is missing or malformed.` })
    }
    rows.push(Object.freeze({
      dataset,
      label: LABELS[dataset],
      coverageStatus: value.coverageStatus,
      actualRecords: value.actualRecords,
      expectedRecords: value.expectedRecords,
      coveragePercent: value.coveragePercent,
      resolution: value.resolution,
      coverageMode: value.coverageMode,
      providerTier: value.providerTier,
      canonical: value.canonical,
      verified: value.verified,
      confidence: value.confidence,
      firstObservedAt: value.firstObservedAt,
      lastObservedAt: value.lastObservedAt,
      computedAt: value.computedAt,
    }))
  }
  return Object.freeze({
    status: "SUCCESS",
    value: Object.freeze({
      symbol: response.symbol,
      utcDay: response.utcDay,
      projectionStatus: "AVAILABLE",
      rows: Object.freeze(rows),
    }),
  })
}
