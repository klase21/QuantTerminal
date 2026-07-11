import type {
  AvailabilityModel,
  CoverageModel,
  FreshnessModel,
  LifecycleState,
} from "@/lib/design-system"
import type {
  EvidenceViewModel,
  RepositoryHandoffViewModel,
} from "@/lib/design-system"

export type DashboardDirection = "Bullish" | "Bearish" | "Mixed" | "Unknown"

export interface EvidenceReadinessViewModel {
  readonly label: "Evidence Readiness"
  readonly value: number
  readonly basis: string
}

export interface MarketDirectionViewModel {
  readonly symbol: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly direction: DashboardDirection | null
  readonly observedAt?: string | null
  readonly freshness: FreshnessModel
  readonly coverage: CoverageModel
  readonly evidenceReadiness?: EvidenceReadinessViewModel | null
  readonly limitation?: string | null
  readonly contaminatedByHistoricalAnalog: boolean
}

export interface DashboardOpportunityViewModel {
  readonly id: string
  readonly symbol: string
  readonly observedAt?: string | null
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly observedFacts: readonly string[]
  readonly heuristicLabels: readonly string[]
  readonly limitation: string
}

export interface DashboardRiskViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly reason: string
}

export interface SupportingIntelligenceViewModel {
  readonly id: string
  readonly title: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly evidence: readonly EvidenceViewModel[]
  readonly limitation?: string | null
}

export interface DashboardHandoffViewModel {
  readonly id: "replay" | "research" | "repository"
  readonly label: string
  readonly description: string
  readonly href?: string | null
  readonly available: boolean
  readonly unavailableReason?: string | null
}

export interface DashboardV2ViewModel {
  readonly symbol: string
  readonly marketDirection: MarketDirectionViewModel
  readonly keyEvidence: readonly EvidenceViewModel[]
  readonly reasoningUnavailableReason: string
  readonly opportunities: readonly DashboardOpportunityViewModel[]
  readonly risk: DashboardRiskViewModel
  readonly supportingIntelligence: readonly SupportingIntelligenceViewModel[]
  readonly handoffs: readonly DashboardHandoffViewModel[]
  readonly repository: RepositoryHandoffViewModel
  readonly pageLimitations: readonly string[]
}

