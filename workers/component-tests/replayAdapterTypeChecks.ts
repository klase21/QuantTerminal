import type { ReplayV2ViewModel } from "@/lib/replay-presentation/contracts"
import { buildReplayV2ViewModel, type ReplayPresentationInput } from "@/lib/replay-presentation/adapters"

const input: ReplayPresentationInput = {
  symbol: "EXAMPLEUSDT", exchange: "binance_futures", timeframe: "1h", window: "2025-01-15 08:00-08:59 UTC",
  title: "Synthetic Replay", question: "What occurred?", hasLoaded: true, loading: false,
  summaryObservations: ["Synthetic observation."], chartCandles: [], chartSource: null, chartReason: "Synthetic unavailable.", priceChange: null,
  statuses: {
    chart: { label: "UNAVAILABLE", detail: "No synthetic chart." }, positioning: { label: "PARTIAL", detail: "Synthetic positioning." },
    liquidation: { label: "STALE", detail: "Synthetic stale source." }, orderbook: { label: "UNAVAILABLE", detail: "Synthetic orderbook missing." },
    trades: { label: "MISSING", detail: "Manual load not run." },
  },
  timelineEvents: [], tradeCount: 0, tradeLoading: false, tradesTruncated: false, tradeContinuation: false,
  marketMetrics: [], orderbookMetrics: [], selectedHistoricalCase: null, researchHref: "/research?symbol=EXAMPLEUSDT", repositoryGate: null,
}

const model: ReplayV2ViewModel = buildReplayV2ViewModel(input)
void model

// @ts-expect-error Availability cannot be used as lifecycle.
const invalidLifecycle: ReplayV2ViewModel = { ...model, timeline: { ...model.timeline, lifecycle: "UNAVAILABLE" } }
// @ts-expect-error Timeline interpretation kind is closed and cannot claim reasoning.
const invalidReasoning: ReplayV2ViewModel = { ...model, timeline: { ...model.timeline, events: [{ ...model.timeline.events[0], interpretationKind: "REASONING" }] } }
// @ts-expect-error AggTrade manual state is invariant.
const invalidManualState: ReplayV2ViewModel = { ...model, timeline: { ...model.timeline, manualAggTrade: { ...model.timeline.manualAggTrade, visible: false } } }
void invalidLifecycle
void invalidReasoning
void invalidManualState

