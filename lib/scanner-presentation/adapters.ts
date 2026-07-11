import type { EvidenceViewModel, FreshnessModel, LifecycleState, MetricViewModel } from "@/lib/design-system"
import type { ScannerV2ViewModel } from "@/lib/scanner-presentation/contracts"

export interface ScannerRequestObservation {
  readonly loading: boolean
  readonly error: string | null
  readonly hasPayload: boolean
  readonly lastUpdatedAt: string | null
}

export interface ScannerPresentationCandidateInput {
  readonly symbol: string
  readonly sourceKind: "MARKET_MOVERS_MODEL" | "SCANNER_HEURISTIC"
  readonly setup: string | null
  readonly direction: string | null
  readonly reason: string | null
  readonly score: number | null
  readonly priority: string | null
  readonly sourceConfidence: string | null
  readonly sourceFreshness: string | null
  readonly retentionState: "ACTIVE" | "AGING" | null
  readonly observedAt: string | null
  readonly scoreBreakdown: readonly { readonly label: string; readonly value: number; readonly polarity: string }[]
  readonly observations: readonly { readonly id: string; readonly label: string; readonly value: number | null; readonly unit?: string | null }[]
  readonly riskContext: readonly string[]
}

export interface ScannerPresentationInput {
  readonly moverRequest: ScannerRequestObservation
  readonly opportunityRequest: ScannerRequestObservation
  readonly candidates: readonly ScannerPresentationCandidateInput[]
  readonly inheritedMarketsContext: { readonly label: string; readonly detail: string }
}

function lifecycle(input: ScannerPresentationInput): LifecycleState {
  const hasCandidates = input.candidates.length > 0
  const loading = input.moverRequest.loading || input.opportunityRequest.loading
  const error = Boolean(input.moverRequest.error || input.opportunityRequest.error)
  if (!hasCandidates && loading) return "LOADING"
  if (!hasCandidates && error) return "ERROR"
  if (!hasCandidates) return "EMPTY"
  if (error) return "PARTIAL"
  if (loading) return "REFRESHING"
  return "READY"
}

function freshness(candidate: ScannerPresentationCandidateInput): FreshnessModel {
  if (candidate.retentionState === "AGING") return { state: "UNKNOWN", observedAt: candidate.observedAt, reason: "Candidate retention age is separate from source freshness." }
  if (candidate.sourceFreshness === "FRESH") return { state: "CURRENT", observedAt: candidate.observedAt, reason: "Source-model freshness label supplied by Market Movers." }
  if (candidate.sourceFreshness === "LATE" || candidate.sourceFreshness === "MATURE") return { state: "STALE", observedAt: candidate.observedAt, reason: `Source-model freshness label: ${candidate.sourceFreshness}.` }
  return { state: "UNKNOWN", observedAt: candidate.observedAt, reason: "No governed canonical freshness contract was supplied." }
}

function metric(candidate: ScannerPresentationCandidateInput, item: ScannerPresentationCandidateInput["observations"][number]): MetricViewModel {
  const available = Number.isFinite(item.value)
  return {
    id: `${candidate.symbol}-${item.id}`,
    label: item.label,
    value: available ? item.value : null,
    unit: item.unit ?? null,
    lifecycle: available ? "READY" : "PARTIAL",
    availability: available ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: `${item.label} was not supplied.` },
    freshness: freshness(candidate),
    provenance: { sourceId: candidate.sourceKind.toLowerCase(), sourceName: candidate.sourceKind === "MARKET_MOVERS_MODEL" ? "Market Movers source model" : "Scanner opportunity heuristic", providerTier: "UNKNOWN", observedAt: candidate.observedAt },
  }
}

function evidence(candidate: ScannerPresentationCandidateInput, observations: readonly MetricViewModel[]): EvidenceViewModel[] {
  return observations.filter((item) => item.availability.state === "AVAILABLE").map((item) => ({
    id: item.id,
    title: item.label,
    summary: `${item.value}${item.unit ? ` ${item.unit}` : ""}`,
    evidenceType: "STRUCTURED OBSERVATION",
    lifecycle: item.lifecycle,
    availability: item.availability,
    freshness: item.freshness,
    provenance: item.provenance,
    confidence: { state: "UNAVAILABLE", reason: "Observation availability does not establish confidence." },
    limitation: "This is a supplied numeric observation, not proof of a recommendation or causal explanation.",
    repository: { available: false, unavailableReason: "No Repository record identity was supplied." },
  }))
}

function adaptCandidate(candidate: ScannerPresentationCandidateInput, position: number) {
  const observations = candidate.observations.map((item) => metric(candidate, item))
  const heuristic = candidate.sourceKind === "SCANNER_HEURISTIC"
  const modelBasis = candidate.scoreBreakdown.map((item) => `${item.label}: ${item.value} (${item.polarity})`)
  return {
    id: `presentation-${position}`,
    symbol: candidate.symbol,
    sourceKind: candidate.sourceKind,
    detectedPattern: candidate.setup,
    sourceDirection: candidate.direction,
    sourceExplanation: candidate.reason,
    lifecycle: "READY" as const,
    availability: { state: "AVAILABLE" as const },
    freshness: freshness(candidate),
    retentionState: candidate.retentionState,
    confidence: { state: "UNAVAILABLE" as const, reason: "Current source labels and scores do not include an approved canonical confidence method." },
    priority: {
      score: Number.isFinite(candidate.score) ? candidate.score : null,
      tier: candidate.priority,
      owner: candidate.sourceKind,
      label: heuristic ? "HEURISTIC INVESTIGATION PRIORITY" as const : "SOURCE MODEL INVESTIGATION PRIORITY" as const,
      basis: heuristic ? ["Protected Scanner opportunity score and threshold tier."] : modelBasis.length ? modelBasis : ["Protected Market Movers model score."],
      limitation: "Priority orders investigation attention only. It is not confidence, expected return, probability, or trade quality.",
    },
    identity: {
      contextId: null,
      durableCandidateId: null,
      symbol: candidate.symbol,
      observedAt: candidate.observedAt,
      availability: { state: "UNAVAILABLE" as const, reason: "No durable candidate identity was supplied." },
      limitation: "Queue position, symbol, score, and timestamp are not durable candidate identity.",
    },
    observations,
    modelBasis,
    evidence: evidence(candidate, observations),
    risk: {
      lifecycle: candidate.riskContext.length ? "READY" as const : "PARTIAL" as const,
      availability: candidate.riskContext.length ? { state: "AVAILABLE" as const } : { state: "UNAVAILABLE" as const, reason: "No source-model risk context was supplied." },
      sourceModelRisk: candidate.riskContext,
      limitation: "Risk context is source-model output without cited evidence linkage.",
    },
    counterEvidence: { lifecycle: "PARTIAL" as const, availability: { state: "UNAVAILABLE" as const, reason: "No canonical counter-evidence contract exists." }, reason: "Alternative explanations and contradiction references were not supplied and are not inferred." },
    limitations: [
      candidate.direction ? "Directional language is source-model context, not a canonical Scanner conclusion." : "Direction is unavailable and is not replaced with neutral.",
      candidate.reason ? "The source explanation is model context, not factual evidence." : "No source explanation was supplied.",
      "Canonical confidence and record-level traceability are unavailable.",
    ],
  }
}

export function buildScannerV2ViewModel(input: ScannerPresentationInput): ScannerV2ViewModel {
  const pageLifecycle = lifecycle(input)
  const candidates = input.candidates.map(adaptCandidate)
  const observedAt = input.moverRequest.lastUpdatedAt ?? input.opportunityRequest.lastUpdatedAt
  const partial = pageLifecycle === "PARTIAL"
  return {
    summary: {
      lifecycle: pageLifecycle,
      availability: candidates.length ? { state: "AVAILABLE" } : pageLifecycle === "ERROR" ? { state: "UNAVAILABLE", reason: input.moverRequest.error ?? input.opportunityRequest.error ?? "Scanner requests failed." } : { state: "MISSING", reason: "No investigation candidates were supplied. This does not establish that no candidates exist." },
      freshness: partial ? { state: "UNKNOWN", observedAt, reason: "A retained payload is displayed after a request failure." } : { state: "UNKNOWN", observedAt, reason: "Request update time is not a governed source-observation freshness contract." },
      candidateCount: candidates.length,
      sourceReadiness: candidates.length ? partial ? "PARTIAL" : "AVAILABLE" : "UNAVAILABLE",
      limitation: "Source readiness, lifecycle, freshness, confidence, coverage, and investigation priority remain separate.",
    },
    queue: {
      lifecycle: pageLifecycle,
      availability: candidates.length ? { state: "AVAILABLE" } : { state: pageLifecycle === "ERROR" ? "UNAVAILABLE" : "MISSING", reason: "No candidate queue is available." },
      candidates,
      orderingBasis: "Existing controller order is preserved. Market Movers candidates retain protected score ordering; the protected Scanner opportunity route supplies fallback score ordering.",
      coverage: { state: "UNKNOWN", reason: "No canonical candidate-universe coverage contract was supplied." },
    },
    primaryCandidate: candidates[0] ?? null,
    handoffs: [
      { id: "REPLAY", label: "Investigate symbol in Replay", available: Boolean(candidates[0]), description: "Open the existing symbol-level Replay route.", limitation: "No event identity, evidence identity, bounded UTC window, or prior validation is supplied." },
      { id: "RESEARCH", label: "Continue evidence review", available: Boolean(candidates[0]), description: "Use the existing Scanner-to-Research context builder and storage owner.", limitation: "Model and heuristic fields remain qualified context; they are not cited evidence or reasoning." },
      { id: "MARKETS", label: "Inspect live market context", available: Boolean(candidates[0]), description: "Open the existing Markets destination for the candidate symbol.", limitation: "Markets has not verified the candidate." },
      { id: "TRADE", label: "Open optional decision planning", available: Boolean(candidates[0]), description: "Open the existing planning destination as a secondary user-led action.", limitation: "This is planning, not execution or a recommendation." },
    ],
    repository: { lifecycle: "PARTIAL", availability: { state: "UNAVAILABLE", reason: "Scanner has no Repository query or record identity contract." }, handoff: { available: false, unavailableReason: "No valid Repository destination and record identity were supplied." }, reason: "Source provenance and product context do not equal record-level Repository traceability." },
    capabilities: { selectionSupported: false, searchSupported: false, filtersSupported: false, tabsSupported: false, sortingSupported: false },
    inheritedMarketsContext: { lifecycle: input.inheritedMarketsContext.label === "LOADING" ? "LOADING" : input.inheritedMarketsContext.label === "UNAVAILABLE" ? "PARTIAL" : "READY", availability: input.inheritedMarketsContext.label === "UNAVAILABLE" ? { state: "UNAVAILABLE", reason: input.inheritedMarketsContext.detail } : input.inheritedMarketsContext.label === "STALE" ? { state: "STALE", reason: input.inheritedMarketsContext.detail } : { state: "AVAILABLE" }, detail: input.inheritedMarketsContext.detail },
    limitations: ["No durable candidate or evidence identity is supplied.", "Canonical confidence and counter evidence are unavailable.", "Repository validation remains unavailable."],
  }
}
