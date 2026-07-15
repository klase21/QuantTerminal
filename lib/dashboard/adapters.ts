import type {
  AvailabilityModel,
  CoverageModel,
  EvidenceViewModel,
  FreshnessModel,
  LifecycleState,
  ProvenanceViewModel,
  RepositoryHandoffViewModel,
} from "@/lib/design-system"
import { formatProbability } from "@/lib/presentation/financialFormatting"
import type {
  DashboardDirection,
  DashboardHandoffViewModel,
  DashboardOpportunityViewModel,
  DashboardRiskViewModel,
  DashboardV2ViewModel,
  MarketDirectionViewModel,
  SupportingIntelligenceViewModel,
} from "@/lib/dashboard/contracts"

export type DashboardLoadState = "loading" | "ready" | "empty" | "unavailable"
export type DashboardCacheKey = "marketMovers" | "macro" | "predictionMarkets" | "etfFlow" | "sectorRotation" | "futures"

export type DashboardDriverCategory =
  | "funding"
  | "open_interest"
  | "liquidation"
  | "exchange_flow"
  | "treasury"
  | "etf"
  | "historical_analog"
  | "event_impact"

export interface DashboardDriverInput {
  readonly category: DashboardDriverCategory
  readonly title: string
  readonly impactScore: number
  readonly quality: "verified" | "degraded" | "unavailable" | "unknown"
  readonly evidence: {
    readonly sourceArtifactId?: string | null
    readonly source: string
    readonly observedAt: string | null
    readonly summary: string
    readonly direction: "positive" | "negative" | "neutral"
  }
}

export interface DashboardMarketDriverInput {
  readonly symbol: string
  readonly timestamp: string
  readonly marketDirection: "positive" | "negative" | "mixed" | "unknown"
  readonly confidence: number
  readonly drivers: readonly DashboardDriverInput[]
  readonly availableCategories?: readonly DashboardDriverCategory[]
  readonly missingCategories?: readonly DashboardDriverCategory[]
  readonly staleCategories?: readonly DashboardDriverCategory[]
  readonly quality?: "verified" | "degraded" | "unavailable" | "unknown"
}

export interface DashboardOpportunityInput {
  readonly asset: string
  readonly label?: string | null
  readonly bias?: string | null
  readonly confidence?: number | null
  readonly tags?: readonly string[]
  readonly detectedAt?: string | null
  readonly context?: string | null
  readonly explanation?: string | null
}

export interface DashboardPredictionInput {
  readonly ok?: boolean
  readonly source?: string
  readonly updatedAt?: string
  readonly unavailableReason?: string
  readonly marketEvents?: readonly {
    readonly title: string
    readonly venue: string
    readonly probability: number
    readonly lastUpdated: string
    readonly source: string
  }[]
}

export interface DashboardEtfInput {
  readonly ok?: boolean
  readonly unavailableReason?: string
  readonly flows?: readonly {
    readonly asset: string
    readonly netFlow: number
    readonly unit: string
    readonly sourceTimestamp?: string
    readonly sourceDate?: string
    readonly latestDate: string
    readonly isStale?: boolean
    readonly staleReason?: string
  }[]
  readonly _source?: {
    readonly sourceId?: string
    readonly sourceName?: string
    readonly freshnessStatus?: string
    readonly unavailableReason?: string | null
  }
}

export interface DashboardReserveInput {
  readonly status?: "available" | "unavailable"
  readonly source?: string
  readonly observedAt?: string | null
  readonly freshness?: "current" | "stale" | "missing"
  readonly coverage?: "full" | "partial" | "unavailable"
  readonly reason?: string
  readonly observations?: readonly {
    readonly asset: string
    readonly observationType: string
    readonly currentObservedAt: string
    readonly quality: "verified" | "partial" | "unavailable"
    readonly reason: string | null
  }[]
}

export interface DashboardMacroInput {
  readonly ok?: boolean
  readonly items?: readonly {
    readonly symbol?: string
    readonly change?: string
    readonly signal?: string
    readonly sourceDate?: string
    readonly sourceTime?: string
  }[]
  readonly unavailableReason?: string
  readonly _source?: {
    readonly sourceId?: string
    readonly sourceName?: string
    readonly freshnessStatus?: string
    readonly lastUpdatedAt?: string | null
    readonly unavailableReason?: string | null
  }
}

export interface DashboardFuturesInput {
  readonly ok?: boolean
  readonly source?: string
  readonly updatedAt?: string
  readonly sectors?: readonly {
    readonly sector: string
    readonly leverageState?: string
    readonly fundingBias?: string
    readonly leveragePressure?: number
    readonly crowdingScore?: number
  }[]
}

export interface DashboardNarrativesInput {
  readonly topNarratives?: readonly string[]
  readonly updatedAt?: number
  readonly sources?: readonly string[]
}

const repositoryUnavailable: RepositoryHandoffViewModel = {
  available: false,
  unavailableReason: "No record-level Repository identity was supplied.",
}

function validTimestamp(value?: string | null) {
  return Boolean(value && Number.isFinite(Date.parse(value)))
}

function lifecycleFromLoadState(state: DashboardLoadState): LifecycleState {
  if (state === "loading") return "LOADING"
  if (state === "empty") return "EMPTY"
  if (state === "unavailable") return "ERROR"
  return "READY"
}

function availabilityFromLoadState(state: DashboardLoadState, reason?: string | null): AvailabilityModel {
  if (state === "loading") return { state: "MISSING", reason: "Request is still loading." }
  if (state === "empty") return { state: "MISSING", reason: reason ?? "No supported data was returned." }
  if (state === "unavailable") return { state: "UNAVAILABLE", reason: reason ?? "The source request was unavailable." }
  return { state: "AVAILABLE" }
}

function directionFromInput(value: DashboardMarketDriverInput["marketDirection"]): DashboardDirection {
  if (value === "positive") return "Bullish"
  if (value === "negative") return "Bearish"
  if (value === "mixed") return "Mixed"
  return "Unknown"
}

function coverageFromSummary(summary: DashboardMarketDriverInput | null): CoverageModel {
  if (!summary) return { state: "MISSING", reason: "No market-driver summary was supplied." }
  const available = new Set(summary.availableCategories ?? summary.drivers.map((driver) => driver.category)).size
  const missing = new Set(summary.missingCategories ?? []).size
  const total = available + missing
  if (!total) return { state: "UNKNOWN", reason: "The source did not supply category coverage." }
  const percent = Number(((available / total) * 100).toFixed(2))
  return {
    state: missing ? "PARTIAL" : "COMPLETE",
    actualRecords: available,
    expectedRecords: total,
    percent,
    reason: missing ? `${missing} evidence categories are missing.` : undefined,
  }
}

export function adaptMarketDirection(input: {
  readonly summary: DashboardMarketDriverInput | null
  readonly state: DashboardLoadState
  readonly unavailableReason?: string | null
}): MarketDirectionViewModel {
  const { summary, state, unavailableReason } = input
  const contaminated = Boolean(
    summary?.drivers.some((driver) => driver.category === "historical_analog")
    || summary?.availableCategories?.includes("historical_analog"),
  )
  const freshness: FreshnessModel = summary?.staleCategories?.length
    ? { state: "STALE", observedAt: summary.timestamp, reason: "One or more supplied evidence categories are stale." }
    : validTimestamp(summary?.timestamp)
      ? { state: "UNKNOWN", observedAt: summary?.timestamp, reason: "The aggregate supplies an observation time but no canonical freshness status." }
      : { state: "UNKNOWN", reason: "No valid source observation time was supplied." }
  const baseAvailability = availabilityFromLoadState(state, unavailableReason)
  const contaminationReason = "Supplied aggregate includes Historical Analog, which is unsupported on Dashboard. The aggregate was not sanitized or recalculated."

  return {
    symbol: summary?.symbol ?? "UNKNOWN",
    lifecycle: contaminated ? "PARTIAL" : lifecycleFromLoadState(state),
    availability: contaminated ? { state: "UNAVAILABLE", reason: contaminationReason } : baseAvailability,
    direction: state === "ready" && summary && !contaminated ? directionFromInput(summary.marketDirection) : null,
    observedAt: summary?.timestamp ?? null,
    freshness,
    coverage: coverageFromSummary(summary),
    evidenceReadiness: state === "ready" && summary && !contaminated
      ? {
          label: "Evidence Readiness",
          value: summary.confidence,
          basis: "Supplied market-driver coverage multiplied by average evidence quality.",
        }
      : null,
    limitation: contaminated ? contaminationReason : unavailableReason,
    contaminatedByHistoricalAnalog: contaminated,
  }
}

function evidenceAvailability(driver: DashboardDriverInput, stale: boolean): AvailabilityModel {
  if (stale) return { state: "STALE", reason: "The source marked this evidence category stale." }
  if (driver.quality === "unavailable") return { state: "UNAVAILABLE", reason: "The source marked this evidence unavailable." }
  return { state: "AVAILABLE" }
}

export function adaptKeyEvidence(summary: DashboardMarketDriverInput | null): EvidenceViewModel[] {
  if (!summary) return []
  const stale = new Set(summary.staleCategories ?? [])
  return summary.drivers
    .filter((driver) => driver.category !== "historical_analog")
    .map((driver): EvidenceViewModel => {
      const isStale = stale.has(driver.category)
      const provenance: ProvenanceViewModel = {
        sourceId: driver.evidence.sourceArtifactId ?? driver.evidence.source,
        sourceName: driver.evidence.source,
        providerTier: "UNKNOWN",
        observedAt: driver.evidence.observedAt,
      }
      return {
        id: driver.evidence.sourceArtifactId ?? `${driver.category}:${driver.title}`,
        title: driver.title,
        summary: driver.evidence.summary,
        evidenceType: driver.category.replace(/_/g, " "),
        lifecycle: driver.quality === "degraded" || driver.quality === "unknown" || isStale ? "PARTIAL" : "READY",
        availability: evidenceAvailability(driver, isStale),
        freshness: isStale
          ? { state: "STALE", observedAt: driver.evidence.observedAt, reason: "Category marked stale by the supplied summary." }
          : validTimestamp(driver.evidence.observedAt)
            ? { state: "UNKNOWN", observedAt: driver.evidence.observedAt, reason: "An observation time is supplied without a canonical freshness status." }
            : { state: "UNKNOWN", reason: "No valid observation timestamp was supplied." },
        confidence: { state: "UNAVAILABLE", reason: "No canonical evidence confidence was supplied." },
        provenance,
        limitation: driver.quality === "degraded" || driver.quality === "unknown"
          ? `Evidence quality is ${driver.quality}; direction is source-supplied and not Dashboard reasoning.`
          : "Direction is source-supplied evidence metadata, not a recommendation.",
        repository: repositoryUnavailable,
      }
    })
}

export function adaptOpportunities(items: readonly DashboardOpportunityInput[]): DashboardOpportunityViewModel[] {
  return items.map((item, index) => ({
    id: `${item.asset}:${item.detectedAt ?? index}`,
    symbol: item.asset,
    observedAt: item.detectedAt,
    lifecycle: "PARTIAL",
    availability: { state: "AVAILABLE" },
    observedFacts: [
      `Symbol: ${item.asset}`,
      ...(validTimestamp(item.detectedAt) ? [`Observed: ${item.detectedAt}`] : []),
    ],
    heuristicLabels: [
      ...(item.label ? [`Heuristic setup: ${item.label}`] : []),
      ...(item.bias ? [`Heuristic direction: ${item.bias}`] : []),
      ...(item.context ? [`Heuristic asset context: ${item.context}`] : []),
      ...(item.explanation ? [`Heuristic explanation: ${item.explanation}`] : []),
      ...(item.tags ?? []).map((tag) => `Heuristic tag: ${tag}`),
    ],
    limitation: "Candidate interpretation is produced by local market-mover heuristics and has no canonical evidence-reference lineage.",
  }))
}

export function unavailableRisk(): DashboardRiskViewModel {
  return {
    lifecycle: "PARTIAL",
    availability: { state: "UNAVAILABLE", reason: "No evidence-linked risk contract is supplied." },
    reason: "Risk classification remains unavailable because the current local heuristic has no canonical evidence references.",
  }
}

function predictionEvidence(data: DashboardPredictionInput | null): EvidenceViewModel[] {
  if (!data?.ok || !data.marketEvents?.length) return []
  return data.marketEvents.slice(0, 3).map((event, index) => ({
    id: `prediction:${index}:${event.title}`,
    title: event.title,
    summary: `Observed probability: ${formatProbability(event.probability / 100)} on ${event.venue}.`,
    evidenceType: "prediction market",
    lifecycle: "READY",
    availability: { state: "AVAILABLE" },
    freshness: validTimestamp(event.lastUpdated)
      ? { state: "UNKNOWN", observedAt: event.lastUpdated, reason: "The event supplies an update time but no canonical freshness status." }
      : { state: "UNKNOWN", reason: "No valid provider update time was supplied." },
    confidence: { state: "UNAVAILABLE", reason: "Market probability is not evidence confidence." },
    provenance: { sourceId: event.source, sourceName: event.venue, providerTier: "UNKNOWN", observedAt: event.lastUpdated },
    limitation: "Prediction-market probability is market evidence, not a QuantTerminal prediction.",
    repository: repositoryUnavailable,
  }))
}

function etfEvidence(data: DashboardEtfInput | null): EvidenceViewModel[] {
  if (!data?.ok || !data.flows?.length) return []
  return data.flows.map((flow) => ({
    id: `etf:${flow.asset}:${flow.sourceTimestamp ?? flow.sourceDate ?? flow.latestDate}`,
    title: `${flow.asset} ETF net flow`,
    summary: `${flow.netFlow} ${flow.unit}`,
    evidenceType: "ETF flow",
    lifecycle: flow.isStale ? "PARTIAL" : "READY",
    availability: flow.isStale ? { state: "STALE", reason: flow.staleReason } : { state: "AVAILABLE" },
    freshness: flow.isStale
      ? { state: "STALE", observedAt: flow.sourceTimestamp, reason: flow.staleReason }
      : data._source?.freshnessStatus === "CURRENT" && validTimestamp(flow.sourceTimestamp)
        ? { state: "CURRENT", observedAt: flow.sourceTimestamp }
        : validTimestamp(flow.sourceTimestamp)
          ? { state: "UNKNOWN", observedAt: flow.sourceTimestamp, reason: "The source timestamp is valid but canonical current freshness was not supplied." }
        : { state: "UNKNOWN", reason: "No valid source timestamp was supplied." },
    confidence: { state: "UNAVAILABLE", reason: "No canonical evidence confidence was supplied." },
    provenance: {
      sourceId: data._source?.sourceId ?? "etf-flow",
      sourceName: data._source?.sourceName ?? "ETF Flow",
      providerTier: "UNKNOWN",
      observedAt: flow.sourceTimestamp,
    },
    limitation: data._source?.unavailableReason ?? null,
    repository: repositoryUnavailable,
  }))
}

function reserveEvidence(data: DashboardReserveInput | null): EvidenceViewModel[] {
  if (data?.status !== "available" || !data.observations?.length) return []
  return data.observations.slice(0, 3).map((observation) => ({
    id: `reserve:${observation.asset}:${observation.currentObservedAt}`,
    title: `${observation.asset} reserve observation`,
    summary: observation.reason ?? observation.observationType.replace(/_/g, " "),
    evidenceType: "exchange reserve",
    lifecycle: observation.quality === "verified" ? "READY" : "PARTIAL",
    availability: data.freshness === "stale"
      ? { state: "STALE", reason: "Reserve snapshot is stale." }
      : { state: "AVAILABLE" },
    freshness: data.freshness === "stale"
      ? { state: "STALE", observedAt: observation.currentObservedAt, reason: "Reserve snapshot is stale." }
      : validTimestamp(observation.currentObservedAt)
        ? { state: "CURRENT", observedAt: observation.currentObservedAt }
        : { state: "UNKNOWN", reason: "No valid observation timestamp was supplied." },
    coverage: data.coverage === "full"
      ? { state: "COMPLETE" }
      : data.coverage === "partial"
        ? { state: "PARTIAL", reason: "Reserve snapshot coverage is partial." }
        : { state: "MISSING", reason: data.reason ?? "Reserve coverage unavailable." },
    confidence: { state: "UNAVAILABLE", reason: "No canonical evidence confidence was supplied." },
    provenance: { sourceId: data.source ?? "reserve-intelligence", sourceName: data.source, providerTier: "UNKNOWN", observedAt: observation.currentObservedAt },
    limitation: observation.quality === "partial" ? "Reserve observation quality is partial." : null,
    repository: repositoryUnavailable,
  }))
}

function macroEvidence(data: DashboardMacroInput | null): EvidenceViewModel[] {
  if (!data?.ok || !data.items?.length) return []
  const freshnessStatus = data._source?.freshnessStatus
  return data.items.slice(0, 3).map((item, index) => ({
    id: `macro:${item.symbol ?? index}:${item.sourceDate ?? "unknown"}`,
    title: item.symbol ?? "Macro observation",
    summary: [item.change, item.signal].filter(Boolean).join(" · ") || "Macro observation supplied without a display summary.",
    evidenceType: "macro",
    lifecycle: freshnessStatus === "STALE" ? "PARTIAL" : "READY",
    availability: freshnessStatus === "STALE"
      ? { state: "STALE", reason: "Macro source metadata is stale." }
      : { state: "AVAILABLE" },
    freshness: freshnessStatus === "STALE"
      ? { state: "STALE", observedAt: data._source?.lastUpdatedAt, reason: "Macro source metadata is stale." }
      : freshnessStatus === "CURRENT" && validTimestamp(data._source?.lastUpdatedAt)
        ? { state: "CURRENT", observedAt: data._source?.lastUpdatedAt }
        : { state: "UNKNOWN", observedAt: data._source?.lastUpdatedAt, reason: "Canonical source freshness was not supplied as current." },
    confidence: { state: "UNAVAILABLE", reason: "No canonical evidence confidence was supplied." },
    provenance: {
      sourceId: data._source?.sourceId ?? "macro",
      sourceName: data._source?.sourceName ?? "Macro source",
      providerTier: "UNKNOWN",
      observedAt: data._source?.lastUpdatedAt,
    },
    limitation: data._source?.unavailableReason ?? "Macro signal text is source-supplied context, not Dashboard reasoning.",
    repository: repositoryUnavailable,
  }))
}

function futuresEvidence(data: DashboardFuturesInput | null): EvidenceViewModel[] {
  if (!data?.ok || !data.sectors?.length) return []
  return data.sectors.slice(0, 3).map((sector, index) => ({
    id: `futures:${sector.sector}:${index}`,
    title: `${sector.sector} futures positioning`,
    summary: [sector.leverageState, sector.fundingBias].filter(Boolean).join(" · ") || "Futures sector observation available.",
    evidenceType: "derivatives",
    lifecycle: "PARTIAL",
    availability: { state: "AVAILABLE" },
    freshness: { state: "UNKNOWN", observedAt: data.updatedAt, reason: "The futures response does not expose a canonical freshness envelope." },
    confidence: { state: "UNAVAILABLE", reason: "No canonical evidence confidence was supplied." },
    provenance: { sourceId: data.source ?? "futures-intelligence", sourceName: data.source ?? "Futures Intelligence", providerTier: "UNKNOWN", observedAt: data.updatedAt },
    limitation: "Leverage and funding labels are supplied intelligence fields; freshness remains unknown.",
    repository: repositoryUnavailable,
  }))
}

function narrativeEvidence(data: DashboardNarrativesInput | null, state: DashboardLoadState, reason?: string | null): EvidenceViewModel[] {
  if (state !== "ready" || !data?.topNarratives?.length) return []
  const observedAt = typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt)
    ? new Date(data.updatedAt).toISOString()
    : null
  return data.topNarratives.slice(0, 3).map((narrative, index) => ({
    id: `narrative:${index}:${narrative}`,
    title: narrative,
    summary: "Narrative aggregation observed across supplied information sources.",
    evidenceType: "research signal",
    lifecycle: "PARTIAL",
    availability: { state: "AVAILABLE" },
    freshness: { state: "UNKNOWN", observedAt, reason: "Narrative aggregation has no canonical source freshness envelope." },
    confidence: { state: "UNAVAILABLE", reason: "Narrative heat is not evidence confidence." },
    provenance: { sourceId: "narrative-aggregation", sourceName: data.sources?.join(", ") || "Narrative aggregation", providerTier: "UNKNOWN", observedAt },
    limitation: reason ?? "Aggregated narrative labels are a Research handoff, not Dashboard reasoning.",
    repository: repositoryUnavailable,
  }))
}

function sessionEvidence(liquidationCount: number | null | undefined): EvidenceViewModel[] {
  if (liquidationCount === null || liquidationCount === undefined || !Number.isFinite(liquidationCount)) return []
  return [{
    id: "session-liquidation-count",
    title: "Session liquidation events",
    summary: `${liquidationCount} events retained in the current client session.`,
    evidenceType: "realtime session observation",
    lifecycle: "PARTIAL",
    availability: { state: "AVAILABLE" },
    freshness: { state: "UNKNOWN", reason: "The Dashboard receives a bounded session count without an observation timestamp." },
    confidence: { state: "UNAVAILABLE", reason: "A session event count has no confidence contract." },
    provenance: { sourceId: "binance-futures-force-order-stream", sourceName: "Binance Futures force-order stream", providerTier: "UNKNOWN" },
    limitation: "This is a bounded client-session count, not complete market coverage or connection-health proof.",
    repository: repositoryUnavailable,
  }]
}

export function adaptSupportingIntelligence(input: {
  readonly predictionMarkets: DashboardPredictionInput | null
  readonly etfFlow: DashboardEtfInput | null
  readonly reserve: DashboardReserveInput | null
  readonly macro?: DashboardMacroInput | null
  readonly futures?: DashboardFuturesInput | null
  readonly narratives?: DashboardNarrativesInput | null
  readonly narrativeState?: DashboardLoadState
  readonly narrativeUnavailableReason?: string | null
  readonly liquidationCount?: number | null
  readonly failedCacheKeys?: readonly DashboardCacheKey[]
}): SupportingIntelligenceViewModel[] {
  const prediction = predictionEvidence(input.predictionMarkets)
  const etf = etfEvidence(input.etfFlow)
  const reserve = reserveEvidence(input.reserve)
  const macro = macroEvidence(input.macro ?? null)
  const futures = futuresEvidence(input.futures ?? null)
  const narratives = narrativeEvidence(input.narratives ?? null, input.narrativeState ?? "empty", input.narrativeUnavailableReason)
  const session = sessionEvidence(input.liquidationCount)
  const failed = new Set(input.failedCacheKeys ?? [])
  return [
    {
      id: "prediction-markets",
      title: "Prediction Markets",
      lifecycle: prediction.length ? (failed.has("predictionMarkets") ? "PARTIAL" : "READY") : "EMPTY",
      availability: prediction.length
        ? { state: "AVAILABLE" }
        : { state: "UNAVAILABLE", reason: input.predictionMarkets?.unavailableReason ?? "No supported prediction-market evidence was returned." },
      evidence: prediction,
      limitation: failed.has("predictionMarkets")
        ? "A refresh request failed. Cached values remain visible; source timestamps are preserved and no current-status claim is made."
        : "Probabilities are market observations, not predictions or confidence.",
    },
    {
      id: "etf-flow",
      title: "ETF Flow",
      lifecycle: etf.length ? (failed.has("etfFlow") ? "PARTIAL" : "READY") : "EMPTY",
      availability: etf.length
        ? { state: "AVAILABLE" }
        : { state: "UNAVAILABLE", reason: input.etfFlow?.unavailableReason ?? input.etfFlow?._source?.unavailableReason ?? "ETF evidence unavailable." },
      evidence: etf,
      limitation: failed.has("etfFlow")
        ? "A refresh request failed. Cached values remain visible; source-provided freshness is preserved."
        : null,
    },
    {
      id: "reserve-intelligence",
      title: "Reserve Intelligence",
      lifecycle: reserve.length ? "READY" : "EMPTY",
      availability: reserve.length
        ? { state: "AVAILABLE" }
        : { state: "UNAVAILABLE", reason: input.reserve?.reason ?? "Reserve evidence unavailable." },
      evidence: reserve,
    },
    {
      id: "macro",
      title: "Macro Context",
      lifecycle: macro.length ? (failed.has("macro") ? "PARTIAL" : "READY") : "EMPTY",
      availability: macro.length
        ? { state: "AVAILABLE" }
        : { state: "UNAVAILABLE", reason: input.macro?.unavailableReason ?? input.macro?._source?.unavailableReason ?? "Macro evidence unavailable." },
      evidence: macro,
      limitation: failed.has("macro") ? "A refresh request failed; cached values are retained without a current-status claim." : null,
    },
    {
      id: "futures",
      title: "Futures Intelligence",
      lifecycle: futures.length ? "PARTIAL" : "EMPTY",
      availability: futures.length ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: "Futures evidence unavailable." },
      evidence: futures,
      limitation: "The current futures response has no canonical freshness envelope.",
    },
    {
      id: "narratives",
      title: "Research Signals",
      lifecycle: narratives.length ? "PARTIAL" : lifecycleFromLoadState(input.narrativeState ?? "empty"),
      availability: narratives.length
        ? { state: "AVAILABLE" }
        : availabilityFromLoadState(input.narrativeState ?? "empty", input.narrativeUnavailableReason),
      evidence: narratives,
      limitation: "Narrative aggregation remains a Research handoff and is not Dashboard reasoning.",
    },
    {
      id: "session-activity",
      title: "Session Activity",
      lifecycle: session.length ? "PARTIAL" : "EMPTY",
      availability: session.length ? { state: "AVAILABLE" } : { state: "UNAVAILABLE", reason: "No session activity count was supplied." },
      evidence: session,
      limitation: "Session counts do not establish complete coverage or live connection health.",
    },
  ]
}

export function contextualHandoffs(symbol: string): DashboardHandoffViewModel[] {
  const normalized = encodeURIComponent(symbol)
  const common = `symbol=${normalized}&exchange=binance_futures&timeframe=1h&source=dashboard`
  return [
    {
      id: "replay",
      label: "Open Replay",
      description: "Continue with the current symbol in the historical investigation workspace.",
      href: `/replay?${common}&investigation=replay`,
      available: true,
    },
    {
      id: "research",
      label: "Open Research",
      description: "Continue with the current symbol in the evidence workspace.",
      href: `/research?${common}&investigation=market_state`,
      available: true,
    },
    {
      id: "repository",
      label: "Repository record",
      description: "Inspect the factual record backing this Dashboard item.",
      available: false,
      unavailableReason: "No record-level Repository identity or destination was supplied.",
    },
  ]
}

export function buildDashboardV2ViewModel(input: {
  readonly symbol: string
  readonly marketDrivers: DashboardMarketDriverInput | null
  readonly marketDriverState: DashboardLoadState
  readonly marketDriverUnavailableReason?: string | null
  readonly opportunities: readonly DashboardOpportunityInput[]
  readonly predictionMarkets: DashboardPredictionInput | null
  readonly etfFlow: DashboardEtfInput | null
  readonly reserve: DashboardReserveInput | null
  readonly macro?: DashboardMacroInput | null
  readonly futures?: DashboardFuturesInput | null
  readonly narratives?: DashboardNarrativesInput | null
  readonly narrativeState?: DashboardLoadState
  readonly narrativeUnavailableReason?: string | null
  readonly liquidationCount?: number | null
  readonly failedCacheKeys?: readonly DashboardCacheKey[]
}): DashboardV2ViewModel {
  const marketDirection = adaptMarketDirection({
    summary: input.marketDrivers,
    state: input.marketDriverState,
    unavailableReason: input.marketDriverUnavailableReason,
  })
  return {
    symbol: input.symbol,
    marketDirection: { ...marketDirection, symbol: input.symbol },
    keyEvidence: adaptKeyEvidence(input.marketDrivers),
    reasoningUnavailableReason: "No approved evidence-referenced reasoning object is supplied to Dashboard.",
    opportunities: adaptOpportunities(input.opportunities),
    risk: unavailableRisk(),
    supportingIntelligence: adaptSupportingIntelligence({
      predictionMarkets: input.predictionMarkets,
      etfFlow: input.etfFlow,
      reserve: input.reserve,
      macro: input.macro,
      futures: input.futures,
      narratives: input.narratives,
      narrativeState: input.narrativeState,
      narrativeUnavailableReason: input.narrativeUnavailableReason,
      liquidationCount: input.liquidationCount,
      failedCacheKeys: input.failedCacheKeys,
    }),
    handoffs: contextualHandoffs(input.symbol),
    repository: repositoryUnavailable,
    pageLimitations: [
      "Historical Analog is excluded from Dashboard presentation.",
      "Evidence Readiness is coverage-quality metadata, not confidence.",
      "Reasoning and record-level Repository handoffs remain unavailable without supplied contracts.",
      ...(input.failedCacheKeys?.length
        ? [`Cached data is retained after failed refresh requests (${input.failedCacheKeys.join(", ")}); readiness is partial.`]
        : []),
    ],
  }
}
