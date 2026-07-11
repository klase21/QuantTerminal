import type {
  AvailabilityModel,
  ConfidenceModel,
  CoverageModel,
  EvidenceViewModel,
  FreshnessModel,
  LifecycleState,
  MetricViewModel,
  RepositoryHandoffViewModel,
} from "@/lib/design-system"

export interface ScannerSummaryViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly candidateCount: number
  readonly sourceReadiness: string
  readonly limitation: string
}

export interface InvestigationIdentityViewModel {
  readonly contextId: string | null
  readonly durableCandidateId: null
  readonly symbol: string
  readonly observedAt: string | null
  readonly availability: AvailabilityModel
  readonly limitation: string
}

export interface InvestigationPriorityViewModel {
  readonly score: number | null
  readonly tier: string | null
  readonly owner: "MARKET_MOVERS_MODEL" | "SCANNER_HEURISTIC"
  readonly label: "SOURCE MODEL INVESTIGATION PRIORITY" | "HEURISTIC INVESTIGATION PRIORITY"
  readonly basis: readonly string[]
  readonly limitation: string
}

export interface CandidateRiskViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly sourceModelRisk: readonly string[]
  readonly limitation: string
}

export interface CandidateCounterEvidenceViewModel {
  readonly lifecycle: "PARTIAL"
  readonly availability: AvailabilityModel & { readonly state: "UNAVAILABLE" }
  readonly reason: string
}

export interface InvestigationCandidateViewModel {
  readonly id: string
  readonly symbol: string
  readonly sourceKind: "MARKET_MOVERS_MODEL" | "SCANNER_HEURISTIC"
  readonly detectedPattern: string | null
  readonly sourceDirection: string | null
  readonly sourceExplanation: string | null
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly retentionState: "ACTIVE" | "AGING" | null
  readonly confidence: ConfidenceModel & { readonly state: "UNAVAILABLE" }
  readonly priority: InvestigationPriorityViewModel
  readonly identity: InvestigationIdentityViewModel
  readonly observations: readonly MetricViewModel[]
  readonly modelBasis: readonly string[]
  readonly evidence: readonly EvidenceViewModel[]
  readonly risk: CandidateRiskViewModel
  readonly counterEvidence: CandidateCounterEvidenceViewModel
  readonly limitations: readonly string[]
}

export interface InvestigationQueueViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly candidates: readonly InvestigationCandidateViewModel[]
  readonly orderingBasis: string
  readonly coverage: CoverageModel
}

export interface ScannerHandoffViewModel {
  readonly id: "MARKETS" | "REPLAY" | "RESEARCH" | "TRADE"
  readonly label: string
  readonly available: boolean
  readonly description: string
  readonly limitation: string
}

export interface ScannerRepositoryViewModel {
  readonly lifecycle: "PARTIAL"
  readonly availability: AvailabilityModel & { readonly state: "UNAVAILABLE" }
  readonly handoff: RepositoryHandoffViewModel
  readonly reason: string
}

export interface ScannerCapabilitiesViewModel {
  readonly selectionSupported: false
  readonly searchSupported: false
  readonly filtersSupported: false
  readonly tabsSupported: false
  readonly sortingSupported: false
}

export interface ScannerV2ViewModel {
  readonly summary: ScannerSummaryViewModel
  readonly queue: InvestigationQueueViewModel
  readonly primaryCandidate: InvestigationCandidateViewModel | null
  readonly handoffs: readonly ScannerHandoffViewModel[]
  readonly repository: ScannerRepositoryViewModel
  readonly capabilities: ScannerCapabilitiesViewModel
  readonly inheritedMarketsContext: {
    readonly lifecycle: LifecycleState
    readonly availability: AvailabilityModel
    readonly detail: string
  }
  readonly limitations: readonly string[]
}
