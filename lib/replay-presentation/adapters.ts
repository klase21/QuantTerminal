import type {
  AvailabilityModel,
  CoverageModel,
  FreshnessModel,
  LifecycleState,
  MetricViewModel,
  RepositoryHandoffViewModel,
} from "@/lib/design-system"
import type {
  ReplayChartCandleViewModel,
  ReplayDatasetStateViewModel,
  ReplayHistoricalContextViewModel,
  ReplayHandoffViewModel,
  ReplayOrderbookViewModel,
  ReplayTimelineEventViewModel,
  ReplayV2ViewModel,
} from "@/lib/replay-presentation/contracts"

export interface ReplayStatusInput {
  readonly label: string
  readonly detail: string
  readonly source?: string | null
  readonly rowCount?: number | null
}

export interface ReplayTimelineEventInput {
  readonly timestamp: string
  readonly type: string
  readonly label: string
  readonly source?: string | null
  readonly recordId?: string | null
  readonly repositoryHref?: string | null
}

export interface ReplayPresentationInput {
  readonly symbol: string
  readonly exchange: string
  readonly timeframe: string
  readonly window: string
  readonly title: string
  readonly question: string
  readonly hasLoaded: boolean
  readonly loading: boolean
  readonly summaryObservations: readonly string[]
  readonly chartCandles: readonly ReplayChartCandleViewModel[]
  readonly chartSource: string | null
  readonly chartReason: string | null
  readonly priceChange: number | null
  readonly statuses: {
    readonly chart: ReplayStatusInput
    readonly positioning: ReplayStatusInput
    readonly liquidation: ReplayStatusInput
    readonly orderbook: ReplayStatusInput
    readonly trades: ReplayStatusInput
  }
  readonly timelineEvents: readonly ReplayTimelineEventInput[]
  readonly tradeCount: number
  readonly tradeLoading: boolean
  readonly tradesTruncated: boolean
  readonly tradeContinuation: boolean
  readonly marketMetrics: readonly MetricViewModel[]
  readonly orderbookMetrics: readonly MetricViewModel[]
  readonly selectedHistoricalCase?: {
    readonly id: string
    readonly timestamp: string
    readonly source?: string | null
  } | null
  readonly researchHref: string
  readonly repositoryGate: {
    readonly repositoryReady: boolean
    readonly projectionStatus: string
    readonly detail: string
  } | null
}

const repositoryUnavailable: RepositoryHandoffViewModel = {
  available: false,
  unavailableReason: "No record-level Repository identity was supplied for this merged observation.",
}

function lifecycle(label: string): LifecycleState {
  if (label === "LOADING") return "LOADING"
  if (label === "CURRENT") return "READY"
  if (label === "PARTIAL" || label === "STALE" || label === "DEGRADED") return "PARTIAL"
  if (label === "MISSING") return "EMPTY"
  return "ERROR"
}

function availability(label: string, detail: string): AvailabilityModel {
  if (label === "CURRENT" || label === "PARTIAL") return { state: "AVAILABLE" }
  if (label === "STALE") return { state: "STALE", reason: detail }
  if (label === "LOADING" || label === "MISSING") return { state: "MISSING", reason: detail }
  return { state: "UNAVAILABLE", reason: detail }
}

function freshness(label: string, detail: string): FreshnessModel {
  if (label === "CURRENT") return { state: "CURRENT" }
  if (label === "STALE") return { state: "STALE", reason: detail }
  return { state: "UNKNOWN", reason: "No canonical source freshness contract was supplied for this Replay display state." }
}

function coverage(status: ReplayStatusInput): CoverageModel {
  if (typeof status.rowCount === "number") {
    return status.rowCount > 0
      ? { state: "PARTIAL", actualRecords: status.rowCount, reason: "Replay displays the rows returned for the selected bounded window; no expected count is supplied here." }
      : { state: "MISSING", actualRecords: 0, reason: status.detail }
  }
  return { state: "UNKNOWN", reason: "The current Replay status does not supply an expected record contract." }
}

function dataset(id: ReplayDatasetStateViewModel["id"], status: ReplayStatusInput): ReplayDatasetStateViewModel {
  return {
    id,
    label: id.replace(/_/g, " "),
    lifecycle: lifecycle(status.label),
    availability: availability(status.label, status.detail),
    freshness: freshness(status.label, status.detail),
    coverage: coverage(status),
    detail: status.detail,
    source: status.source ?? null,
  }
}

export function adaptReplayTimeline(events: readonly ReplayTimelineEventInput[]): ReplayTimelineEventViewModel[] {
  return events.map((event, index) => ({
    id: `${event.timestamp}:${event.type}:${index}`,
    timestamp: event.timestamp,
    observationType: event.type,
    observedValue: event.label,
    source: event.source ?? null,
    interpretation: `${event.type} is a local threshold label applied to supplied observations; it is not a causal explanation.`,
    interpretationKind: "LOCAL_HEURISTIC",
    repository: event.recordId && event.repositoryHref
      ? { available: true, recordId: event.recordId, href: event.repositoryHref }
      : repositoryUnavailable,
  }))
}

function historicalContext(input: ReplayPresentationInput): ReplayHistoricalContextViewModel {
  const selected = input.selectedHistoricalCase
  return selected
    ? {
        lifecycle: "PARTIAL",
        availability: { state: "AVAILABLE" },
        caseId: selected.id,
        timestamp: selected.timestamp,
        source: selected.source ?? null,
        limitation: "This supplied case context is displayed without a generated similarity score or causal claim.",
      }
    : {
        lifecycle: "PARTIAL",
        availability: { state: "UNAVAILABLE", reason: "No supplied historical case identity is available." },
        caseId: null,
        timestamp: null,
        source: null,
        limitation: "Replay does not fabricate comparable cases or similarity scores.",
      }
}

function handoffs(input: ReplayPresentationInput): {
  research: ReplayHandoffViewModel
  repository: ReplayHandoffViewModel
} {
  const gate = input.repositoryGate
  return {
    research: {
      id: "research",
      label: "Continue in Research",
      description: "Investigate the selected symbol and bounded Replay window without converting observations into a thesis.",
      href: input.researchHref,
      available: true,
      unavailableReason: null,
    },
    repository: {
      id: "repository",
      label: "Repository traceability",
      description: gate?.repositoryReady
        ? "A bounded Repository projection is available, but merged observations do not retain record-level identity."
        : gate?.detail ?? "Repository coverage has not been established for this bounded window.",
      href: null,
      available: false,
      unavailableReason: "No valid record-level Repository destination was supplied.",
    },
  }
}

export function buildReplayV2ViewModel(input: ReplayPresentationInput): ReplayV2ViewModel {
  const datasets = [
    dataset("price", input.statuses.chart),
    dataset("open_interest", input.statuses.positioning),
    dataset("funding", input.statuses.positioning),
    dataset("liquidation", input.statuses.liquidation),
    dataset("trades", input.statuses.trades),
    dataset("orderbook", input.statuses.orderbook),
  ]
  const orderbook: ReplayOrderbookViewModel = {
    lifecycle: lifecycle(input.statuses.orderbook.label),
    availability: availability(input.statuses.orderbook.label, input.statuses.orderbook.detail),
    loading: input.statuses.orderbook.label === "LOADING",
    detail: input.statuses.orderbook.detail,
    metrics: input.orderbookMetrics,
  }
  const outgoing = handoffs(input)
  return {
    summary: {
      lifecycle: input.loading ? "LOADING" : input.hasLoaded ? "READY" : "EMPTY",
      availability: input.hasLoaded ? { state: "AVAILABLE" } : { state: "MISSING", reason: "Load Replay has not been run for this bounded window." },
      symbol: input.symbol,
      exchange: input.exchange,
      timeframe: input.timeframe,
      window: input.window,
      title: input.title,
      question: input.question,
      observations: input.summaryObservations,
      limitation: "Summary statements describe loaded observations only and do not establish causality.",
    },
    primaryEvidence: {
      candles: input.chartCandles,
      chartSource: input.chartSource,
      chartReason: input.chartReason,
      priceChange: input.priceChange,
      datasets,
    },
    timeline: {
      lifecycle: input.loading ? "LOADING" : input.timelineEvents.length ? "READY" : input.hasLoaded ? "EMPTY" : "EMPTY",
      availability: input.timelineEvents.length
        ? { state: "AVAILABLE" }
        : { state: "MISSING", reason: input.hasLoaded ? "No threshold observations were present in the selected window." : "Replay has not been loaded." },
      events: adaptReplayTimeline(input.timelineEvents),
      reasoningUnavailableReason: "No approved cited Replay reasoning contract exists. Sequence alone does not establish causality.",
      manualAggTrade: {
        visible: true,
        loading: input.tradeLoading,
        loadedRecords: input.tradeCount,
        truncated: input.tradesTruncated,
        hasContinuation: input.tradeContinuation,
        label: input.tradeContinuation ? "Load next trade page" : "Load trades manually",
      },
    },
    historicalContext: historicalContext(input),
    marketStructure: { metrics: input.marketMetrics, orderbook },
    researchHandoff: outgoing.research,
    repositoryHandoff: outgoing.repository,
    repositoryRecord: repositoryUnavailable,
    pageLimitations: [
      "Reasoning is unavailable until cited evidence-reference contracts exist.",
      "AggTrade and orderbook remain manual, bounded, and non-blocking.",
      "Merged observations without record identity cannot provide record-level Repository links.",
      "Historical context never changes Dashboard Market Direction.",
    ],
  }
}
