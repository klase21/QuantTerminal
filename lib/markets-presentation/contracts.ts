import type {
  AvailabilityModel,
  CoverageModel,
  FreshnessModel,
  LifecycleState,
  MetricViewModel,
  ProvenanceViewModel,
  RepositoryHandoffViewModel,
} from "@/lib/design-system"

export interface MarketsSourceReadinessViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly availableModules: number
  readonly totalModules: number
  readonly label: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE"
  readonly basis: string
}

export interface MarketsRegimeViewModel {
  readonly value: null
  readonly lifecycle: "PARTIAL"
  readonly availability: AvailabilityModel
  readonly reason: string
}

export interface MarketsSummaryViewModel {
  readonly symbol: string
  readonly exchange: string
  readonly timeframe: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly sourceReadiness: MarketsSourceReadinessViewModel
  readonly regime: MarketsRegimeViewModel
  readonly metrics: readonly MetricViewModel[]
  readonly inheritedContext: {
    readonly lifecycle: LifecycleState
    readonly availability: AvailabilityModel
    readonly direction: string | null
    readonly driverCount: number | null
    readonly evidenceCount: number | null
    readonly freshness: FreshnessModel
    readonly limitation: string
  }
}

export interface SectorItemViewModel {
  readonly id: string
  readonly rank: number
  readonly sector: string
  readonly score: number
  readonly modelClassification: string
  readonly classificationBasis: string
  readonly metrics: readonly MetricViewModel[]
  readonly topSymbols: readonly string[]
  readonly limitations: readonly string[]
}

export interface SectorRotationViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly coverage: CoverageModel
  readonly provenance: ProvenanceViewModel | null
  readonly sectors: readonly SectorItemViewModel[]
  readonly limitation: string
}

export interface EtfFlowViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly asset: string | null
  readonly value: number | null
  readonly unit: string | null
  readonly sourceDate: string | null
  readonly observedAt: string | null
  readonly provenance: ProvenanceViewModel | null
  readonly limitation: string
}

export interface ReserveEvidenceViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly asset: string | null
  readonly balance: number | null
  readonly balanceUsd: number | null
  readonly balanceChange: number | null
  readonly balanceUsdChange: number | null
  readonly observationType: string | null
  readonly limitation: string
}

export interface CapitalFlowCategoryViewModel {
  readonly id: "ETF" | "STABLECOIN" | "EXCHANGE" | "ON_CHAIN"
  readonly label: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly metric: MetricViewModel | null
  readonly limitation: string
}

export interface CapitalFlowViewModel {
  readonly etf: EtfFlowViewModel
  readonly reserve: ReserveEvidenceViewModel
  readonly categories: readonly CapitalFlowCategoryViewModel[]
}

export interface DerivativesVenueViewModel {
  readonly id: string
  readonly name: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly fundingRate: number | null
  readonly openInterestNotional: number | null
  readonly source: string | null
  readonly limitation: string | null
}

export interface DerivativesHeuristicViewModel {
  readonly id: string
  readonly label: string
  readonly value: string | null
  readonly available: boolean
  readonly basis: string
  readonly qualification: "LOCAL_HEURISTIC" | "SOURCE_MODEL"
}

export interface DerivativesIntelligenceViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly metrics: readonly MetricViewModel[]
  readonly venues: readonly DerivativesVenueViewModel[]
  readonly relationships: readonly { readonly label: string; readonly value: string | null }[]
  readonly heuristics: readonly DerivativesHeuristicViewModel[]
  readonly liquidationWindow: { readonly date: string; readonly hour: string }
  readonly limitation: string
}

export interface UnavailableContextViewModel {
  readonly lifecycle: "PARTIAL"
  readonly availability: AvailabilityModel & { readonly state: "UNAVAILABLE" }
  readonly reason: string
}

export interface MarketBreadthViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly coverage: CoverageModel
  readonly universeSize: number | null
  readonly advancers: number | null
  readonly decliners: number | null
  readonly unchanged: number | null
  readonly missingConstituents: number | null
  readonly heuristicClassification: string | null
  readonly heuristicBasis: string | null
  readonly limitation: string
}

export interface SecondaryMoverViewModel {
  readonly id: string
  readonly symbol: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly observedPriceChangePercent: number | null
  readonly observedQuoteVolume: number | null
  readonly sourceClassification: string | null
  readonly sourceAction: string | null
  readonly sourceReason: string | null
  readonly limitation: string
}

export interface MarketsInvestigationHandoffViewModel {
  readonly id: "SCANNER"
  readonly label: string
  readonly available: boolean
  readonly description: string
  readonly limitation: string | null
}

export interface MarketsRepositoryViewModel {
  readonly lifecycle: "PARTIAL"
  readonly availability: AvailabilityModel
  readonly handoff: RepositoryHandoffViewModel
  readonly reason: string
}

export interface MarketsSelectionViewModel {
  readonly symbol: string
  readonly liquidationDate: string
  readonly liquidationHour: string
}

export interface MarketsFiltersViewModel {
  readonly searchSupported: false
  readonly filtersSupported: false
  readonly tabsSupported: false
  readonly sortingSupported: false
  readonly sectorSelectionSupported: false
}

export interface MarketsV2ViewModel {
  readonly summary: MarketsSummaryViewModel
  readonly sectorRotation: SectorRotationViewModel
  readonly capitalFlow: CapitalFlowViewModel
  readonly derivatives: DerivativesIntelligenceViewModel
  readonly macro: UnavailableContextViewModel
  readonly predictionMarkets: UnavailableContextViewModel
  readonly breadth: MarketBreadthViewModel
  readonly secondaryMovers: readonly SecondaryMoverViewModel[]
  readonly scannerHandoff: MarketsInvestigationHandoffViewModel
  readonly repository: MarketsRepositoryViewModel
  readonly selection: MarketsSelectionViewModel
  readonly filters: MarketsFiltersViewModel
  readonly pageLimitations: readonly string[]
}
