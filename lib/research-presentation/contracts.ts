import type {
  AvailabilityModel,
  CounterEvidenceViewModel,
  CoverageModel,
  EvidenceViewModel,
  FreshnessModel,
  LifecycleState,
  RepositoryHandoffViewModel,
} from "@/lib/design-system"

export interface ResearchQuestionViewModel {
  readonly title: string
  readonly question: string
  readonly thesisId: string | null
  readonly symbol: string
  readonly exchange: string
  readonly timeframe: string
}

export interface ResearchSummaryViewModel {
  readonly question: ResearchQuestionViewModel
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly coverage: CoverageModel
  readonly supportingCount: number
  readonly conflictingCount: number
  readonly decisionBriefOrientation: string | null
  readonly limitation: string
}

export interface ResearchEvidenceViewModel extends EvidenceViewModel {
  readonly role: "SUPPORTING" | "CONFLICTING"
  readonly evidenceId: string
  readonly sourceArtifactId: string | null
  readonly classification: "DERIVED_HISTORICAL_EVIDENCE" | "SECONDARY_AGGREGATE_CONTEXT" | "FACTUAL_OBSERVATION"
}

export interface PrimarySourceViewModel {
  readonly id: string
  readonly name: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly quality: string | null
  readonly attributable: boolean
  readonly productionApproved: boolean | null
  readonly observedAt: string | null
  readonly limitation: string | null
}

export interface ResearchReasoningViewModel {
  readonly lifecycle: "PARTIAL"
  readonly availability: AvailabilityModel
  readonly reason: string
}

export interface ResearchGraphViewModel {
  readonly lifecycle: "PARTIAL"
  readonly availability: AvailabilityModel
  readonly reason: string
}

export interface PredictionMarketContextViewModel {
  readonly id: string
  readonly title: string
  readonly probability: number | null
  readonly volume: number | null
  readonly liquidity: number | null
  readonly category: string
  readonly providerTimestamp: string | null
  readonly sourceId: string | null
  readonly sourceName: string | null
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly attentionHeuristic: string
  readonly limitation: string
}

export interface RelatedResearchViewModel {
  readonly id: string
  readonly kind: "HISTORICAL_ANALOG" | "EVENT_IMPACT" | "MARKET_MEMORY"
  readonly title: string
  readonly summary: string
  readonly identity: string | null
  readonly selected: boolean
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly limitation: string
}

export interface ResearchRepositoryProjectionRowViewModel {
  readonly dataset: string
  readonly label: string
  readonly coverageStatus: string
  readonly actualRecords: number
  readonly expectedRecords: number | null
  readonly providerTier: string
  readonly canonical: boolean
  readonly verified: boolean
  readonly providerConfidence: number
  readonly resolution: string
}

export interface ResearchRepositoryViewModel {
  readonly utcDay: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly rows: readonly ResearchRepositoryProjectionRowViewModel[]
  readonly recordHandoff: RepositoryHandoffViewModel
  readonly limitation: string
}

export interface ResearchSelectionViewModel {
  readonly selectedHistoricalCaseId: string | null
  readonly availableHistoricalCaseIds: readonly string[]
}

export interface ResearchFiltersViewModel {
  readonly searchSupported: false
  readonly filtersSupported: false
  readonly sortingSupported: false
  readonly tabsSupported: false
}

export interface ResearchHandoffViewModel {
  readonly id: "markets" | "replay" | "explorer" | "trade"
  readonly label: string
  readonly href: string | null
  readonly available: boolean
  readonly description: string
  readonly unavailableReason: string | null
  readonly actionRequired: boolean
}

export interface ResearchV2ViewModel {
  readonly summary: ResearchSummaryViewModel
  readonly evidence: readonly ResearchEvidenceViewModel[]
  readonly secondaryContext: readonly EvidenceViewModel[]
  readonly primarySources: readonly PrimarySourceViewModel[]
  readonly reasoning: ResearchReasoningViewModel
  readonly counterEvidence: readonly CounterEvidenceViewModel[]
  readonly predictionContext: readonly PredictionMarketContextViewModel[]
  readonly graph: ResearchGraphViewModel
  readonly relatedResearch: readonly RelatedResearchViewModel[]
  readonly repository: ResearchRepositoryViewModel
  readonly evidencePacketUnavailableReason: string
  readonly selection: ResearchSelectionViewModel
  readonly filters: ResearchFiltersViewModel
  readonly handoffs: readonly ResearchHandoffViewModel[]
  readonly pageLimitations: readonly string[]
}

