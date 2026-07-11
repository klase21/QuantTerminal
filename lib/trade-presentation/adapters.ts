import type { AvailabilityModel, LifecycleState, MetricViewModel } from "@/lib/design-system"
import type { TradeV2ViewModel } from "@/lib/trade-presentation/contracts"

export interface TradePresentationInput {
  readonly candidateState: "loading" | "empty" | "ready"
  readonly selected: {
    readonly symbol: string
    readonly setup: string | null
    readonly direction: string | null
    readonly explanation: string | null
    readonly score: number | null
    readonly sourceFreshness: string | null
    readonly observedAt: string | null
    readonly risk: readonly string[]
  } | null
  readonly candidates: readonly { readonly symbol: string; readonly selected: boolean; readonly retentionState: string | null }[]
  readonly replay: { readonly contextId: string | null; readonly label: string; readonly detail: string; readonly available: boolean }
  readonly observations: readonly { readonly id: string; readonly label: string; readonly value: number | null; readonly unit?: string | null; readonly source: string; readonly available: boolean; readonly basis?: string | null }[]
  readonly localHeuristicRisk: readonly string[]
  readonly plan: { readonly entryCondition: string; readonly invalidationCondition: string; readonly modelTargets: string; readonly modelAction: string; readonly monitoringCondition: string | null } | null
  readonly records: readonly { readonly id: string; readonly symbol: string; readonly setupType: string; readonly direction: string; readonly entryArea: string; readonly wrongArea: string; readonly targetArea: string; readonly createdTime: string; readonly status: "Watching" | "Active" | "Won" | "Lost" | "Expired" }[]
  readonly hrefs: { readonly replay: string; readonly research: string; readonly markets: string; readonly scanner: string; readonly dashboard: string }
}

function lifecycle(input: TradePresentationInput): LifecycleState {
  if (input.candidateState === "loading" && !input.selected) return "LOADING"
  if (!input.selected) return "EMPTY"
  if (!input.replay.available || !input.plan) return "PARTIAL"
  return "READY"
}

function metric(input: TradePresentationInput, item: TradePresentationInput["observations"][number]): MetricViewModel {
  return {
    id: item.id,
    label: item.label,
    value: item.available ? item.value : null,
    unit: item.unit ?? null,
    lifecycle: item.available ? "READY" : "PARTIAL",
    availability: item.available ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: `${item.label} was not supplied.` },
    freshness: { state: "UNKNOWN", observedAt: input.selected?.observedAt, reason: "No governed observation freshness contract was supplied to Trade." },
    provenance: { sourceId: item.source, sourceName: item.source, providerTier: "UNKNOWN", observedAt: input.selected?.observedAt },
  }
}

function reviewLabel(status: TradePresentationInput["records"][number]["status"]) {
  if (status === "Won") return "Favorable review"
  if (status === "Lost") return "Adverse review"
  if (status === "Active") return "Active review"
  if (status === "Expired") return "Archived review"
  return "Watching"
}

export function buildTradeV2ViewModel(input: TradePresentationInput): TradeV2ViewModel {
  const pageLifecycle = lifecycle(input)
  const observations = input.observations.map((item) => metric(input, item))
  const evidenceAvailable = observations.some((item) => item.availability.state === "AVAILABLE")
  const riskAvailable = Boolean(input.selected?.risk.length || input.localHeuristicRisk.length)
  const unavailable = (reason: string): AvailabilityModel & { readonly state: "UNAVAILABLE" } => ({ state: "UNAVAILABLE", reason })
  const requirements = [
    { id: "candidate", label: "Decision context selected", availability: input.selected ? { state: "AVAILABLE" as const } : { state: "MISSING" as const, reason: "No candidate context is selected." }, required: true, limitation: "Selection does not establish evidence quality." },
    { id: "evidence", label: "Structured observations supplied", availability: evidenceAvailable ? { state: "AVAILABLE" as const } : unavailable("No structured observations are available."), required: true, limitation: "Observation availability is not confidence." },
    { id: "counter", label: "Counter Evidence supplied", availability: unavailable("No canonical Counter Evidence contract exists."), required: true, limitation: "Missing Counter Evidence blocks completeness." },
    { id: "scenarios", label: "Scenario Analysis supplied", availability: unavailable("No canonical scenario contract exists."), required: true, limitation: "Planning levels are not scenarios." },
    { id: "risk", label: "Risk inputs supplied", availability: riskAvailable ? { state: "AVAILABLE" as const } : unavailable("Risk context is unavailable."), required: true, limitation: "User risk limits and position sizing remain unavailable." },
    { id: "identity", label: "Durable decision identity supplied", availability: unavailable("No durable decision identity exists."), required: true, limitation: "Local planning identity is not Repository identity." },
  ]
  const selectedAvailability: AvailabilityModel = input.selected ? { state: "AVAILABLE" } : { state: "MISSING", reason: "No decision context is selected." }
  return {
    context: {
      symbol: input.selected?.symbol ?? null,
      sourceModelSetup: input.selected?.setup ?? null,
      sourceModelDirection: input.selected?.direction ?? null,
      sourceModelExplanation: input.selected?.explanation ?? null,
      sourceModelScore: input.selected?.score ?? null,
      lifecycle: pageLifecycle,
      availability: selectedAvailability,
      freshness: { state: "UNKNOWN", observedAt: input.selected?.observedAt, reason: "Candidate retention and request update time are not canonical evidence freshness." },
      identity: { replayContextId: input.replay.contextId, localPlanningRecordId: input.records.find((record) => record.symbol === input.selected?.symbol)?.id ?? null, durableDecisionId: null, repositoryRecordId: null, availability: unavailable("No durable decision or Repository identity was supplied."), limitation: "URL symbol, Replay context ID, selected candidate, and local planning ID remain separate identities." },
      limitations: ["Candidate score is source-model context, not confidence or readiness.", "Setup, direction, and explanation are source-model planning context, not canonical conclusions."],
    },
    readiness: { label: input.selected ? "INCOMPLETE" : "UNAVAILABLE", lifecycle: input.selected ? "PARTIAL" : pageLifecycle, availability: input.selected ? { state: "AVAILABLE" } : selectedAvailability, requirements, basis: "Preparation readiness uses disclosed prerequisite availability only. Counter Evidence, Scenarios, user risk limits, and durable identity are required and missing.", limitation: "Preparation readiness is not confidence, probability, recommendation, checklist completion, or permission to execute." },
    snapshot: { evidence: evidenceAvailable ? { state: "AVAILABLE" } : unavailable("No structured observations."), counterEvidence: unavailable("No canonical Counter Evidence contract."), scenarios: unavailable("No canonical scenario contract."), risk: riskAvailable ? { state: "AVAILABLE" } : unavailable("No risk context."), planning: input.plan ? { state: "AVAILABLE" } : unavailable("No source-model planning levels."), durableIdentity: unavailable("No durable decision identity."), repositoryTraceability: unavailable("No Repository identity or destination."), orderEntry: { supported: false, label: "NOT SUPPORTED" } },
    evidence: { lifecycle: evidenceAvailable ? "READY" : "PARTIAL", availability: evidenceAvailable ? { state: "AVAILABLE" } : unavailable("No structured observations are available."), observations, sourceModelExplanation: input.selected?.explanation ?? null, limitation: "Only supplied numeric observations are presented as factual context. Source-model explanations and display strings are not evidence." },
    counterEvidence: { lifecycle: "PARTIAL", availability: unavailable("No canonical Counter Evidence contract exists."), reason: "Invalidation text, negative metrics, and model risk labels are not converted into counter evidence." },
    scenarios: { lifecycle: "PARTIAL", availability: unavailable("No Bull, Base, Bear, or alternative-scenario contract exists."), reason: "Direction and planning levels do not generate scenarios or probabilities." },
    risk: { lifecycle: riskAvailable ? "PARTIAL" : "PARTIAL", availability: riskAvailable ? { state: "AVAILABLE" } : unavailable("Risk context is unavailable."), sourceModelRisk: input.selected?.risk ?? [], localHeuristicRisk: input.localHeuristicRisk, userRisk: [], missingRisk: ["User risk limits unavailable", "Position sizing unavailable", "Macro risk contract unavailable", "Canonical liquidity risk contract unavailable"], limitation: "Model risk tiers and risk/reward are context, not canonical risk or recommendation quality." },
    plan: { lifecycle: input.plan ? "READY" : "PARTIAL", availability: input.plan ? { state: "AVAILABLE" } : unavailable("No complete source-model planning levels were supplied."), detectedPattern: input.selected?.setup ?? null, entryCondition: input.plan?.entryCondition ?? null, invalidationCondition: input.plan?.invalidationCondition ?? null, modelTargets: input.plan?.modelTargets ?? null, monitoringCondition: input.plan?.monitoringCondition ?? null, modelAction: input.plan?.modelAction ?? null, limitation: "All levels are source-model, planning-only, non-interactive, and unsupported by order entry." },
    candidateOptions: input.candidates.map((candidate) => ({ ...candidate, limitation: "Candidate selection changes planning context only; it does not approve a decision." })),
    localRecords: input.records.map((record) => ({ id: record.id, symbol: record.symbol, detectedPattern: record.setupType, sourceDirection: record.direction, entryCondition: record.entryArea, invalidationCondition: record.wrongArea, modelTargets: record.targetArea, createdAt: record.createdTime, persistedStatus: record.status, reviewLabel: reviewLabel(record.status), limitation: "LocalStorage planning record only. It is not a Repository record, validated decision, order, or position." })),
    monitoring: { lifecycle: "PARTIAL", availability: unavailable("No canonical monitoring checklist or review contract exists."), reason: "Local record status is user-managed review state and does not establish validation or execution." },
    handoffs: [
      { id: "REPLAY", label: "Investigate in Replay", href: input.hrefs.replay, available: true, limitation: input.replay.available ? "Supplied Replay context is display context; record-level evidence and causal validation are not implied." : "Generic investigation only; no valid Replay context is supplied." },
      { id: "RESEARCH", label: "Investigate in Research", href: input.hrefs.research, available: true, limitation: "No cited thesis or evidence bundle is supplied." },
      { id: "MARKETS", label: "Inspect Markets context", href: input.hrefs.markets, available: true, limitation: "Selected source-model query context does not imply verification." },
      { id: "SCANNER", label: "Return to candidate discovery", href: input.hrefs.scanner, available: true, limitation: "Scanner owns investigation priority, not decision approval." },
      { id: "DASHBOARD", label: "Return to market orientation", href: input.hrefs.dashboard, available: true, limitation: "Dashboard remains general orientation." },
    ],
    repository: { lifecycle: "PARTIAL", availability: unavailable("Trade has no valid Repository identity or destination."), handoff: { available: false, unavailableReason: "Local planning IDs and product context are not Repository record identities." }, reason: "LocalStorage persistence is not Repository durability or record-level traceability." },
    limitations: ["PLANNING ONLY. NO ORDER ENTRY.", "Canonical Counter Evidence and Scenario Analysis are unavailable.", "Durable decision identity and Repository traceability are unavailable."],
  }
}
