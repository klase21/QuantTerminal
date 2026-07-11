import type { AvailabilityModel, FreshnessModel, LifecycleState, MetricViewModel, RepositoryHandoffViewModel } from "@/lib/design-system"

export interface DecisionIdentityViewModel {
  readonly replayContextId: string | null
  readonly localPlanningRecordId: string | null
  readonly durableDecisionId: null
  readonly repositoryRecordId: null
  readonly availability: AvailabilityModel
  readonly limitation: string
}

export interface DecisionContextViewModel {
  readonly symbol: string | null
  readonly sourceModelSetup: string | null
  readonly sourceModelDirection: string | null
  readonly sourceModelExplanation: string | null
  readonly sourceModelScore: number | null
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly freshness: FreshnessModel
  readonly identity: DecisionIdentityViewModel
  readonly limitations: readonly string[]
}

export interface PreparationRequirementViewModel {
  readonly id: string
  readonly label: string
  readonly availability: AvailabilityModel
  readonly required: boolean
  readonly limitation: string | null
}

export interface DecisionReadinessViewModel {
  readonly label: "INCOMPLETE" | "PARTIAL" | "UNAVAILABLE"
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly requirements: readonly PreparationRequirementViewModel[]
  readonly basis: string
  readonly limitation: string
}

export interface DecisionSnapshotViewModel {
  readonly evidence: AvailabilityModel
  readonly counterEvidence: AvailabilityModel
  readonly scenarios: AvailabilityModel
  readonly risk: AvailabilityModel
  readonly planning: AvailabilityModel
  readonly durableIdentity: AvailabilityModel
  readonly repositoryTraceability: AvailabilityModel
  readonly orderEntry: { readonly supported: false; readonly label: "NOT SUPPORTED" }
}

export interface DecisionEvidenceViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly observations: readonly MetricViewModel[]
  readonly sourceModelExplanation: string | null
  readonly limitation: string
}

export interface DecisionUnavailableViewModel {
  readonly lifecycle: "PARTIAL"
  readonly availability: AvailabilityModel & { readonly state: "UNAVAILABLE" }
  readonly reason: string
}

export interface DecisionRiskViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly sourceModelRisk: readonly string[]
  readonly localHeuristicRisk: readonly string[]
  readonly userRisk: readonly string[]
  readonly missingRisk: readonly string[]
  readonly limitation: string
}

export interface DecisionPlanViewModel {
  readonly lifecycle: LifecycleState
  readonly availability: AvailabilityModel
  readonly detectedPattern: string | null
  readonly entryCondition: string | null
  readonly invalidationCondition: string | null
  readonly modelTargets: string | null
  readonly monitoringCondition: string | null
  readonly modelAction: string | null
  readonly limitation: string
}

export interface LocalPlanningRecordViewModel {
  readonly id: string
  readonly symbol: string
  readonly detectedPattern: string
  readonly sourceDirection: string
  readonly entryCondition: string
  readonly invalidationCondition: string
  readonly modelTargets: string
  readonly createdAt: string
  readonly persistedStatus: "Watching" | "Active" | "Won" | "Lost" | "Expired"
  readonly reviewLabel: string
  readonly limitation: string
}

export interface DecisionHandoffViewModel {
  readonly id: "REPLAY" | "RESEARCH" | "MARKETS" | "SCANNER" | "DASHBOARD"
  readonly label: string
  readonly href: string
  readonly available: boolean
  readonly limitation: string
}

export interface TradeRepositoryViewModel {
  readonly lifecycle: "PARTIAL"
  readonly availability: AvailabilityModel & { readonly state: "UNAVAILABLE" }
  readonly handoff: RepositoryHandoffViewModel
  readonly reason: string
}

export interface DecisionCandidateOptionViewModel {
  readonly symbol: string
  readonly selected: boolean
  readonly retentionState: string | null
  readonly limitation: string
}

export interface TradeV2ViewModel {
  readonly context: DecisionContextViewModel
  readonly readiness: DecisionReadinessViewModel
  readonly snapshot: DecisionSnapshotViewModel
  readonly evidence: DecisionEvidenceViewModel
  readonly counterEvidence: DecisionUnavailableViewModel
  readonly scenarios: DecisionUnavailableViewModel
  readonly risk: DecisionRiskViewModel
  readonly plan: DecisionPlanViewModel
  readonly candidateOptions: readonly DecisionCandidateOptionViewModel[]
  readonly localRecords: readonly LocalPlanningRecordViewModel[]
  readonly monitoring: DecisionUnavailableViewModel
  readonly handoffs: readonly DecisionHandoffViewModel[]
  readonly repository: TradeRepositoryViewModel
  readonly limitations: readonly string[]
}
