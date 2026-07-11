import type {
  AvailabilityModel,
  CoverageModel,
  FreshnessModel,
  LifecycleState,
  MetricViewModel,
  RepositoryHandoffViewModel,
} from "@/lib/design-system"

export interface ReplayDatasetStateViewModel {
  readonly id: "price" | "open_interest" | "funding" | "liquidation" | "trades" | "orderbook"
  readonly label: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly coverage: CoverageModel
  readonly detail: string
  readonly source: string | null
}

export interface ReplayChartCandleViewModel {
  readonly time: number
  readonly open: number
  readonly high: number
  readonly low: number
  readonly close: number
  readonly volume: number | null
}

export interface ReplaySummaryViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly symbol: string
  readonly exchange: string
  readonly timeframe: string
  readonly window: string
  readonly title: string
  readonly question: string
  readonly observations: readonly string[]
  readonly limitation: string
}

export interface ReplayPrimaryEvidenceViewModel {
  readonly candles: readonly ReplayChartCandleViewModel[]
  readonly chartSource: string | null
  readonly chartReason: string | null
  readonly priceChange: number | null
  readonly datasets: readonly ReplayDatasetStateViewModel[]
}

export interface ReplayTimelineEventViewModel {
  readonly id: string
  readonly timestamp: string
  readonly observationType: string
  readonly observedValue: string
  readonly source: string | null
  readonly interpretation: string | null
  readonly interpretationKind: "LOCAL_HEURISTIC" | null
  readonly repository: RepositoryHandoffViewModel
}

export interface ReplayTimelineViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly events: readonly ReplayTimelineEventViewModel[]
  readonly reasoningUnavailableReason: string
  readonly manualAggTrade: {
    readonly visible: true
    readonly loading: boolean
    readonly loadedRecords: number
    readonly truncated: boolean
    readonly hasContinuation: boolean
    readonly label: string
  }
}

export interface ReplayOrderbookViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly loading: boolean
  readonly detail: string
  readonly metrics: readonly MetricViewModel[]
}

export interface ReplayMarketStructureViewModel {
  readonly metrics: readonly MetricViewModel[]
  readonly orderbook: ReplayOrderbookViewModel
}

export interface ReplayHistoricalContextViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly caseId: string | null
  readonly timestamp: string | null
  readonly source: string | null
  readonly limitation: string
}

export interface ReplayHandoffViewModel {
  readonly id: "research" | "repository"
  readonly label: string
  readonly description: string
  readonly href: string | null
  readonly available: boolean
  readonly unavailableReason: string | null
}

export interface ReplayV2ViewModel {
  readonly summary: ReplaySummaryViewModel
  readonly primaryEvidence: ReplayPrimaryEvidenceViewModel
  readonly timeline: ReplayTimelineViewModel
  readonly historicalContext: ReplayHistoricalContextViewModel
  readonly marketStructure: ReplayMarketStructureViewModel
  readonly researchHandoff: ReplayHandoffViewModel
  readonly repositoryHandoff: ReplayHandoffViewModel
  readonly repositoryRecord: RepositoryHandoffViewModel
  readonly pageLimitations: readonly string[]
}

