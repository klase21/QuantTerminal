import React from "react"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"

import { ReasoningTimelineSection } from "@/components/replay-v2/ReasoningTimelineSection"
import { adaptReplayTimeline, buildReplayV2ViewModel } from "@/lib/replay-presentation/adapters"

const model = buildReplayV2ViewModel({
  symbol: "EXAMPLEUSDT", exchange: "binance_futures", timeframe: "1h", window: "2025-01-15 08:00-08:59 UTC",
  title: "Synthetic Replay fixture", question: "Synthetic investigation question with deliberately long text for narrow-layout validation.",
  hasLoaded: true, loading: false,
  summaryObservations: ["EXAMPLEUSDT moved 1.00% in the synthetic bounded window."],
  chartCandles: [{ time: 1736928000, open: 100, high: 102, low: 99, close: 101, volume: 10 }], chartSource: "Synthetic preview source", chartReason: null, priceChange: 1,
  statuses: {
    chart: { label: "CURRENT", detail: "One synthetic candle.", source: "Synthetic preview source", rowCount: 1 },
    positioning: { label: "PARTIAL", detail: "Partial synthetic coverage.", source: "Synthetic preview source", rowCount: 1 },
    liquidation: { label: "STALE", detail: "Synthetic stale source.", source: "Synthetic preview source", rowCount: 1 },
    orderbook: { label: "UNAVAILABLE", detail: "Synthetic cache was not supplied.", source: null, rowCount: 0 },
    trades: { label: "MISSING", detail: "Manual AggTrade load has not run.", source: null, rowCount: 0 },
  },
  timelineEvents: [
    { timestamp: "2025-01-15T08:01:00.000Z", type: "Synthetic observation with long content", label: "Observed fixture value; not a market claim." },
    { timestamp: "2025-01-15T08:02:00.000Z", type: "Second synthetic observation", label: "Later supplied timestamp." },
  ],
  tradeCount: 0, tradeLoading: false, tradesTruncated: true, tradeContinuation: true,
  marketMetrics: [], orderbookMetrics: [], selectedHistoricalCase: null,
  researchHref: "/research?symbol=EXAMPLEUSDT&source=replay",
  repositoryGate: { repositoryReady: true, projectionStatus: "AVAILABLE", detail: "Synthetic projection only." },
})
const html = renderToStaticMarkup(<ReasoningTimelineSection model={model.timeline} onLoadTrades={() => undefined} />)

const checks: Array<{ name: string; pass: boolean }> = []
const check = (name: string, pass: boolean) => checks.push({ name, pass })
const viewSource = readFileSync("components/replay-v2/ReplayV2View.tsx", "utf8")
const sectionComponents = ["ReplaySummarySection", "PrimaryEvidenceSection", "ReasoningTimelineSection", "HistoricalContextSection", "MarketStructureSection", "InvestigationHandoffs"]
check("Canonical section order", sectionComponents.every((name, index) => index === 0 || viewSource.lastIndexOf(sectionComponents[index - 1]) < viewSource.lastIndexOf(name)))
const structureSource = readFileSync("components/replay-v2/MarketStructureSection.tsx", "utf8")
check("Missing orderbook renders UNAVAILABLE", model.marketStructure.orderbook.availability.state === "UNAVAILABLE" && structureSource.includes("Orderbook UNAVAILABLE") && !structureSource.includes("Orderbook EMPTY"))
check("AggTrade manual control remains visible", html.includes("Load next trade page") && html.includes("AggTrade remains manual"))
check("Reasoning fails closed", html.includes("Reasoning unavailable") && html.includes("No approved cited Replay reasoning contract"))
check("Merged observation has no Repository link", html.includes("No record-level Repository identity") && !html.includes('href="/repository'))
check("Historical context does not fabricate analog", model.historicalContext.caseId === null && model.historicalContext.availability.state === "UNAVAILABLE")
check("Research handoff preserves supplied route", model.researchHandoff.href === "/research?symbol=EXAMPLEUSDT&source=replay")

const ordered = adaptReplayTimeline([
  { timestamp: "2025-01-15T08:01:00.000Z", type: "First", label: "one" },
  { timestamp: "2025-01-15T08:02:00.000Z", type: "Second", label: "two" },
])
check("Adapter preserves supplied timeline order and timestamps", ordered[0]?.timestamp === "2025-01-15T08:01:00.000Z" && ordered[1]?.timestamp === "2025-01-15T08:02:00.000Z")

const source = readFileSync("components/replay/ReplayV1Page.tsx", "utf8")
check("Coverage gate remains projection-only", source.includes("checkReplayCoverageGate({") && source.includes('gate.projectionStatus !== "AVAILABLE"'))
check("Repository bounded datasets remain unchanged", source.includes('const datasets: ReplayRepositoryDataset[] = ["market", "open_interest", "liquidation", "funding"]'))
check("Repository AggTrade page size remains 1000", source.includes('dataset: "agg_trade"') && source.includes("limit: 1000"))
check("AggTrade has no automatic load", source.includes('onLoadTrades: () => void (replayMode === "repository" ? loadRepositoryTrades() : loadManualDatasets(["trades"], "trades"))') && !source.includes("void loadRepositoryTrades()"))
const cryptoIndex = source.indexOf('fetchReplayDatasets(["open_interest", "mark_price"]')
const binanceIndex = source.indexOf("fetchBinancePositioningFallback(controller.signal, loadId)")
const currentIndex = source.indexOf("fetchCurrentPositioningFallback(controller.signal, loadId)")
check("OI and Funding fallback order remains unchanged", cryptoIndex >= 0 && cryptoIndex < binanceIndex && binanceIndex < currentIndex)
check("Orderbook remains manual cache-only", source.includes('const requestUrl = `/api/replay/orderbook-cache?${params.toString()}`') && source.includes("onLoadOrderbook: () => void loadOrderbook()"))
check("Orderbook timeout and cancellation remain", source.includes("orderbookControllerRef.current?.abort()") && source.includes("}, 12000)"))
check("Timeline source ordering remains timestamp-based", source.includes("events.sort((left, right) => left.timestamp.localeCompare(right.timestamp)).slice(-10)"))
check("Replay cleanup remains", source.includes("abortOrderbookRequest()") && source.includes("abortReplayRequests()"))

const failures = checks.filter((item) => !item.pass)
if (failures.length) {
  console.error("REPLAY V2 SMOKE TEST: FAIL")
  failures.forEach((item) => console.error(`[FAIL] ${item.name}`))
  process.exitCode = 1
} else {
  console.log("REPLAY V2 SMOKE TEST: PASS")
  checks.forEach((item) => console.log(`[PASS] ${item.name}`))
}
