import type { ContradictionEvidence } from "@/core/contradiction"
import type { EvidenceValidity } from "@/core/evidence-validity"
import type { SourceMetadataEnvelope } from "@/lib/data-governance"
import type {
  AvailabilityModel,
  CounterEvidenceViewModel,
  CoverageModel,
  EvidenceViewModel,
  FreshnessModel,
  LifecycleState,
  RepositoryHandoffViewModel,
} from "@/lib/design-system"
import type {
  PredictionMarketContextViewModel,
  PrimarySourceViewModel,
  RelatedResearchViewModel,
  ResearchEvidenceViewModel,
  ResearchHandoffViewModel,
  ResearchRepositoryProjectionRowViewModel,
  ResearchV2ViewModel,
} from "@/lib/research-presentation/contracts"

export interface ResearchPollingStateInput {
  readonly loading: boolean
  readonly error: string | null
  readonly hasPayload: boolean
}

export interface StructuredResearchEvidenceInput {
  readonly evidence: ContradictionEvidence
  readonly validity?: EvidenceValidity | null
  readonly role: "SUPPORTING" | "CONFLICTING"
  readonly classification?: ResearchEvidenceViewModel["classification"]
}

export interface SecondaryContextInput {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly source: string | null
  readonly observedAt: string | null
  readonly polling: ResearchPollingStateInput
  readonly limitation: string
}

export interface PredictionMarketInput {
  readonly title: string
  readonly probability: number | null
  readonly volume: number | null
  readonly liquidity: number | null
  readonly category: string
  readonly attentionRank: number
  readonly lastUpdated?: string | null
  readonly attentionLabel: string
}

export interface RelatedResearchInput {
  readonly id: string
  readonly kind: RelatedResearchViewModel["kind"]
  readonly title: string
  readonly summary: string
  readonly identity?: string | null
  readonly selected?: boolean
  readonly validity?: EvidenceValidity | null
  readonly availability: "AVAILABLE" | "UNAVAILABLE" | "MISSING"
  readonly limitation: string
}

export interface ResearchPresentationInput {
  readonly symbol: string
  readonly exchange: string
  readonly timeframe: string
  readonly title: string
  readonly question: string
  readonly thesisId?: string | null
  readonly decisionBrief?: {
    readonly currentView: string
    readonly freshnessStatus: string
    readonly coverageStatus: string
    readonly supportingEvidenceCount: number
    readonly contradictingEvidenceCount: number
    readonly sourceArtifactIds: readonly string[]
  } | null
  readonly evidence: readonly StructuredResearchEvidenceInput[]
  readonly secondaryContext: readonly SecondaryContextInput[]
  readonly primarySourceCandidates: readonly { readonly metadata: SourceMetadataEnvelope | null; readonly label: string }[]
  readonly predictionMarkets: readonly PredictionMarketInput[]
  readonly predictionSource: SourceMetadataEnvelope | null
  readonly predictionPolling: ResearchPollingStateInput
  readonly relatedResearch: readonly RelatedResearchInput[]
  readonly repository: {
    readonly utcDay: string
    readonly status: "NOT_CHECKED" | "LOADING" | "AVAILABLE" | "STALE" | "PROJECTION_MISSING" | "UNAVAILABLE"
    readonly reason: string | null
    readonly rows: readonly ResearchRepositoryProjectionRowViewModel[]
  }
  readonly selectedHistoricalCaseId: string | null
  readonly availableHistoricalCaseIds: readonly string[]
  readonly handoffs: readonly ResearchHandoffViewModel[]
}

const noRepositoryIdentity: RepositoryHandoffViewModel = {
  available: false,
  unavailableReason: "No valid record-level Repository identity and destination were supplied.",
}

function validTimestamp(value?: string | null) {
  return Boolean(value && Number.isFinite(Date.parse(value)))
}

function freshnessFromValidity(validity?: EvidenceValidity | null): FreshnessModel {
  if (!validity) return { state: "UNKNOWN", reason: "No governed evidence-validity contract was supplied." }
  if (validity.freshnessStatus === "VALID") return { state: "CURRENT", observedAt: validity.observedAt }
  if (validity.freshnessStatus === "STALE") return { state: "STALE", observedAt: validity.observedAt, reason: validity.reason }
  if (validity.freshnessStatus === "EXPIRED") return { state: "EXPIRED", observedAt: validity.observedAt, reason: validity.reason }
  return { state: "UNKNOWN", observedAt: validity.observedAt, reason: validity.reason ?? "Evidence freshness is unknown." }
}

function coverageFromValidity(validity?: EvidenceValidity | null): CoverageModel {
  if (!validity) return { state: "UNKNOWN", reason: "No governed evidence-validity coverage was supplied." }
  if (validity.coverageStatus === "FULL") return { state: "COMPLETE" }
  if (validity.coverageStatus === "PARTIAL") return { state: "PARTIAL", reason: validity.reason }
  if (validity.coverageStatus === "UNAVAILABLE") return { state: "MISSING", reason: validity.reason }
  return { state: "UNKNOWN", reason: validity.reason }
}

function lifecycleFromPolling(polling: ResearchPollingStateInput): LifecycleState {
  if (polling.loading && !polling.hasPayload) return "LOADING"
  if (polling.error && polling.hasPayload) return "PARTIAL"
  if (polling.error) return "ERROR"
  return polling.hasPayload ? "READY" : "EMPTY"
}

function availabilityFromPolling(polling: ResearchPollingStateInput): AvailabilityModel {
  if (polling.hasPayload) return { state: "AVAILABLE" }
  if (polling.loading) return { state: "MISSING", reason: "The source request is loading." }
  return { state: "UNAVAILABLE", reason: polling.error ?? "The source returned no supported data." }
}

export function adaptStructuredEvidence(input: StructuredResearchEvidenceInput): ResearchEvidenceViewModel {
  const item = input.evidence
  const evidenceId = item.evidenceId.trim()
  const sourceArtifactId = item.sourceArtifactId?.trim() || null
  return {
    id: evidenceId,
    evidenceId,
    sourceArtifactId,
    role: input.role,
    classification: input.classification ?? "DERIVED_HISTORICAL_EVIDENCE",
    title: item.title,
    summary: item.summary,
    evidenceType: input.role === "SUPPORTING" ? "supporting evidence" : "conflicting evidence",
    lifecycle: "READY",
    availability: { state: "AVAILABLE" },
    freshness: freshnessFromValidity(input.validity),
    coverage: coverageFromValidity(input.validity),
    confidence: { state: "UNAVAILABLE", reason: "No canonical claim confidence was supplied." },
    provenance: {
      sourceId: sourceArtifactId ?? item.source,
      sourceName: item.source,
      providerTier: "UNKNOWN",
      observedAt: item.observedAt ?? input.validity?.observedAt ?? null,
    },
    limitation: sourceArtifactId
      ? "Artifact identity is preserved, but it is not automatically a Repository record identity."
      : "Source artifact identity was not supplied; record-level traceability is unavailable.",
    repository: noRepositoryIdentity,
  }
}

function adaptCounterEvidence(input: StructuredResearchEvidenceInput): CounterEvidenceViewModel {
  const item = input.evidence
  return {
    id: item.evidenceId,
    affectedClaim: "UNAVAILABLE: the source did not supply an affected claim contract.",
    observation: item.summary,
    lifecycle: "READY",
    availability: { state: "AVAILABLE" },
    freshness: freshnessFromValidity(input.validity),
    confidence: { state: "UNAVAILABLE", reason: "No canonical counter-evidence confidence was supplied." },
    provenance: {
      sourceId: item.sourceArtifactId ?? item.source,
      sourceName: item.source,
      providerTier: "UNKNOWN",
      observedAt: item.observedAt ?? input.validity?.observedAt ?? null,
    },
    unresolved: true,
    repository: noRepositoryIdentity,
  }
}

function adaptSecondaryContext(input: SecondaryContextInput): EvidenceViewModel {
  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    evidenceType: "secondary aggregate context",
    lifecycle: lifecycleFromPolling(input.polling),
    availability: availabilityFromPolling(input.polling),
    freshness: validTimestamp(input.observedAt)
      ? { state: "UNKNOWN", observedAt: input.observedAt, reason: "A timestamp is supplied without a governed freshness contract." }
      : { state: "UNKNOWN", reason: "No governed provider timestamp was supplied." },
    confidence: { state: "UNAVAILABLE", reason: "Secondary aggregate context has no canonical confidence." },
    provenance: input.source ? { sourceId: input.source, sourceName: input.source, providerTier: "UNKNOWN", observedAt: input.observedAt } : null,
    limitation: input.polling.error && input.polling.hasPayload
      ? `Retained prior payload after polling failure: ${input.polling.error}. ${input.limitation}`
      : input.limitation,
    repository: noRepositoryIdentity,
  }
}

function sourceFreshness(metadata: SourceMetadataEnvelope): FreshnessModel {
  if (metadata.freshnessStatus === "CURRENT") return { state: "CURRENT", observedAt: metadata.lastUpdatedAt }
  if (metadata.freshnessStatus === "STALE") return { state: "STALE", observedAt: metadata.lastUpdatedAt, reason: metadata.degradedReason ?? "Source is stale." }
  if (metadata.freshnessStatus === "EXPIRED") return { state: "EXPIRED", observedAt: metadata.lastUpdatedAt, reason: metadata.degradedReason ?? "Source is expired." }
  return { state: "UNKNOWN", observedAt: metadata.lastUpdatedAt, reason: "The source freshness contract is unavailable or unknown." }
}

function adaptPrimarySource(candidate: ResearchPresentationInput["primarySourceCandidates"][number]): PrimarySourceViewModel {
  const metadata = candidate.metadata
  const attributable = Boolean(metadata?.sourceId && metadata.sourceName)
  return {
    id: metadata?.sourceId ?? `unattributed:${candidate.label}`,
    name: metadata?.sourceName ?? candidate.label,
    lifecycle: attributable ? "READY" : "PARTIAL",
    availability: attributable ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: "Attributable source identity is incomplete." },
    freshness: metadata ? sourceFreshness(metadata) : { state: "UNKNOWN", reason: "No source metadata envelope was supplied." },
    quality: metadata?.qualityLevel ?? null,
    attributable,
    productionApproved: metadata?.productionApproved ?? null,
    observedAt: metadata?.lastUpdatedAt ?? null,
    limitation: attributable ? null : "This context cannot be labeled a canonical Primary Source.",
  }
}

function adaptPrediction(input: PredictionMarketInput, source: SourceMetadataEnvelope | null, polling: ResearchPollingStateInput): PredictionMarketContextViewModel {
  const providerTimestamp = validTimestamp(input.lastUpdated) ? input.lastUpdated! : null
  return {
    id: `${input.attentionRank}:${input.title}`,
    title: input.title,
    probability: input.probability,
    volume: input.volume,
    liquidity: input.liquidity,
    category: input.category,
    providerTimestamp,
    sourceId: source?.sourceId ?? null,
    sourceName: source?.sourceName ?? null,
    lifecycle: lifecycleFromPolling(polling),
    availability: availabilityFromPolling({ ...polling, hasPayload: true }),
    freshness: source ? sourceFreshness(source) : { state: "UNKNOWN", observedAt: providerTimestamp, reason: "No governed source envelope was supplied." },
    attentionHeuristic: input.attentionLabel,
    limitation: "Probability is contextual market data, not Research confidence or factual likelihood. Attention is a local heuristic, not objective priority.",
  }
}

function adaptRelated(item: RelatedResearchInput): RelatedResearchViewModel {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    summary: item.summary,
    identity: item.identity ?? null,
    selected: item.selected ?? false,
    lifecycle: item.availability === "MISSING" ? "EMPTY" : item.availability === "UNAVAILABLE" ? "PARTIAL" : "READY",
    availability: item.availability === "AVAILABLE" ? { state: "AVAILABLE" } : item.availability === "MISSING" ? { state: "MISSING", reason: item.limitation } : { state: "UNAVAILABLE", reason: item.limitation },
    freshness: freshnessFromValidity(item.validity),
    limitation: item.limitation,
  }
}

function repository(input: ResearchPresentationInput["repository"]): ResearchV2ViewModel["repository"] {
  const status = input.status
  const lifecycle: LifecycleState = status === "LOADING" ? "LOADING" : status === "NOT_CHECKED" ? "EMPTY" : status === "AVAILABLE" ? "READY" : status === "STALE" ? "PARTIAL" : "ERROR"
  const availability: AvailabilityModel = status === "AVAILABLE" ? { state: "AVAILABLE" } : status === "STALE" ? { state: "STALE", reason: input.reason } : status === "NOT_CHECKED" || status === "LOADING" ? { state: "MISSING", reason: status === "NOT_CHECKED" ? "Manual projection load has not been requested." : "Projection load is in progress." } : { state: "UNAVAILABLE", reason: input.reason ?? status }
  return {
    utcDay: input.utcDay,
    lifecycle,
    availability,
    freshness: status === "STALE" ? { state: "STALE", reason: input.reason } : { state: "UNKNOWN", reason: "Projection status is separate from factual record freshness." },
    rows: input.rows,
    recordHandoff: noRepositoryIdentity,
    limitation: "Coverage projection is Repository availability evidence, not record-level factual traceability or Research confidence.",
  }
}

export function buildResearchV2ViewModel(input: ResearchPresentationInput): ResearchV2ViewModel {
  const evidence = input.evidence.map(adaptStructuredEvidence)
  const counters = input.evidence.filter((item) => item.role === "CONFLICTING").map(adaptCounterEvidence)
  const secondary = input.secondaryContext.map(adaptSecondaryContext)
  const brief = input.decisionBrief
  return {
    summary: {
      question: { title: input.title, question: input.question, thesisId: input.thesisId ?? null, symbol: input.symbol, exchange: input.exchange, timeframe: input.timeframe },
      lifecycle: "PARTIAL",
      availability: { state: "AVAILABLE" },
      freshness: brief?.freshnessStatus === "STALE" ? { state: "STALE", reason: "Decision Brief source evidence is stale." } : { state: "UNKNOWN", reason: "Research Summary has no canonical answer freshness contract." },
      coverage: brief?.coverageStatus === "FULL" ? { state: "COMPLETE" } : brief?.coverageStatus === "PARTIAL" ? { state: "PARTIAL" } : { state: "UNKNOWN", reason: "Research evidence coverage is incomplete or unknown." },
      supportingCount: brief?.supportingEvidenceCount ?? evidence.filter((item) => item.role === "SUPPORTING").length,
      conflictingCount: brief?.contradictingEvidenceCount ?? counters.length,
      decisionBriefOrientation: brief?.currentView ?? null,
      limitation: "Decision Brief orientation is a local count-based classification, not cited reasoning or confidence.",
    },
    evidence: evidence.filter((item) => item.role === "SUPPORTING"),
    secondaryContext: secondary,
    primarySources: input.primarySourceCandidates.map(adaptPrimarySource),
    reasoning: { lifecycle: "PARTIAL", availability: { state: "UNAVAILABLE", reason: "No approved cited Research reasoning contract exists." }, reason: "Reasoning requires claim-level supporting references, counter-evidence semantics, assumptions, provenance, freshness, and availability." },
    counterEvidence: counters,
    predictionContext: input.predictionMarkets.map((item) => adaptPrediction(item, input.predictionSource, input.predictionPolling)),
    graph: { lifecycle: "PARTIAL", availability: { state: "UNAVAILABLE", reason: "No approved Research relationship contract exists." }, reason: "Nodes and edges cannot be inferred from shared symbols, responses, timestamps, or co-location." },
    relatedResearch: input.relatedResearch.map(adaptRelated),
    repository: repository(input.repository),
    evidencePacketUnavailableReason: "The protected Evidence Packet engine is not consumed by Research and lacks cited reasoning, counter-evidence, assumptions, record links, and durable packet identity.",
    selection: { selectedHistoricalCaseId: input.selectedHistoricalCaseId, availableHistoricalCaseIds: input.availableHistoricalCaseIds },
    filters: { searchSupported: false, filtersSupported: false, sortingSupported: false, tabsSupported: false },
    handoffs: input.handoffs,
    pageLimitations: [
      "Reasoning and Research Graph remain unavailable until approved contracts exist.",
      "Prediction-market probability is context, not confidence or causal evidence.",
      "Repository coverage is availability metadata; record-level links require supplied identities.",
      "Historical Analog, Event Impact, Market Memory, and Repository coverage remain manual-load workflows.",
      "Search, filters, sorting, and tabs are not implemented in the current Research runtime.",
    ],
  }
}
