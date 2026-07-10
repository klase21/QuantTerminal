import type {
  AvailabilityModel,
  ConfidenceModel,
  CoverageModel,
  FreshnessModel,
  LifecycleState,
} from "@/lib/design-system/contracts/state"

export interface ProvenanceViewModel {
  readonly sourceId: string
  readonly sourceName?: string | null
  readonly providerTier?: "CANONICAL" | "VERIFIED" | "EXPERIMENTAL" | "UNKNOWN" | null
  readonly observedAt?: string | null
}

export interface RepositoryHandoffViewModel {
  readonly available: boolean
  readonly href?: string | null
  readonly recordId?: string | null
  readonly label?: string | null
  readonly unavailableReason?: string | null
}

export interface EvidenceReferenceViewModel {
  readonly id: string
  readonly label: string
  readonly repository?: RepositoryHandoffViewModel | null
}

export interface EvidenceViewModel {
  readonly id: string
  readonly title: string
  readonly summary?: string | null
  readonly evidenceType: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness?: FreshnessModel | null
  readonly coverage?: CoverageModel | null
  readonly confidence?: ConfidenceModel | null
  readonly provenance?: ProvenanceViewModel | null
  readonly supportingEvidenceCount?: number | null
  readonly hasCounterEvidence?: boolean | null
  readonly limitation?: string | null
  readonly repository?: RepositoryHandoffViewModel | null
}

export interface MetricViewModel {
  readonly id: string
  readonly label: string
  readonly value?: string | number | null
  readonly unit?: string | null
  readonly delta?: string | number | null
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness?: FreshnessModel | null
  readonly provenance?: ProvenanceViewModel | null
}

export interface ReasoningViewModel {
  readonly id: string
  readonly summary?: string | null
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly supportingEvidence: readonly EvidenceReferenceViewModel[]
  readonly counterEvidence: readonly EvidenceReferenceViewModel[]
  readonly assumptions: readonly string[]
  readonly confidence?: ConfidenceModel | null
  readonly freshness?: FreshnessModel | null
  readonly unavailableReason?: string | null
}

export interface CounterEvidenceViewModel {
  readonly id: string
  readonly observation?: string | null
  readonly affectedClaim: string
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness?: FreshnessModel | null
  readonly confidence?: ConfidenceModel | null
  readonly provenance?: ProvenanceViewModel | null
  readonly unresolved: boolean
  readonly repository?: RepositoryHandoffViewModel | null
}
