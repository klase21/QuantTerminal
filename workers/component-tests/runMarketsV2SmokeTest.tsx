import React from "react"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { MarketsV2View } from "@/components/markets-v2"
import { buildMarketsV2ViewModel } from "@/lib/markets-presentation/adapters"

const source = { sourceId: "synthetic-sector", sourceName: "Synthetic sector source", freshnessStatus: "STALE" as const, qualityLevel: "MEDIUM" as const, sourceStatus: "DEGRADED" as const, lastUpdatedAt: "2025-01-15T08:00:00.000Z", retrievedAt: "2025-01-15T08:05:00.000Z", degradedReason: "PARTIAL_DATA" as const, unavailableReason: null, fallbackSourceId: null, cacheStatus: "HIT" as const, productionApproved: true }
const model = buildMarketsV2ViewModel({
  symbol: "EXAMPLEUSDT", exchange: "example_exchange", timeframe: "1m",
  inheritedDashboard: { label: "PARTIAL", detail: "Synthetic display-only context.", direction: "Synthetic supplied direction", driverCount: 2, evidenceCount: 1, freshness: "UNKNOWN" },
  summaryMetrics: [{ id: "price", label: "Price", value: 100, available: true, source: "Synthetic source" }, { id: "range", label: "24h range", value: null, available: false }], moduleAvailability: [true, true, false, false],
  sectorRotation: { request: { loading: false, error: null, hasPayload: true }, source, mappedAssets: 6, registryAssets: 10, sectors: [{ sector: "SYNTHETIC", rank: 1, rotationScore: 62, direction: "INFLOW", volumeShare: 12, avgPriceChange: 1.2, breadth: 66, assetCount: 6, positiveCount: 4, topSymbols: ["EXAMPLE"] }] },
  etf: { request: { loading: false, error: null, hasPayload: true }, source: { ...source, sourceId: "synthetic-etf", sourceName: "Synthetic ETF source", freshnessStatus: "CURRENT", sourceStatus: "ACTIVE", degradedReason: null }, row: { asset: "EXAMPLE", netFlow: 12.5, unit: "USD millions", sourceDate: "2025-01-15", sourceTimestamp: "2025-01-15T08:00:00.000Z" } },
  reserve: { request: { loading: false, error: null, hasPayload: true }, freshness: "current", observedAt: "2025-01-15T08:00:00.000Z", row: { asset: "EXAMPLE", observationType: "balance", currentBalance: 500, currentBalanceUsd: 1000, balanceChange: null, balanceUsdChange: null } },
  derivatives: { fundingRate: null, fundingSource: null, openInterestNotional: 500000, openInterestSource: "Synthetic fallback provider", liquidationState: "unavailable", longLiquidationNotional: null, shortLiquidationNotional: null, venues: [{ name: "Synthetic venue", ok: true, source: "Synthetic provider", fundingRate: null, openInterestNotional: 500000 }], relationships: [{ label: "Funding relationship", value: null }], heuristics: [{ id: "structure", label: "Structure", value: "Synthetic model state", available: true, basis: "Synthetic supplied model.", qualification: "SOURCE_MODEL" }], liquidationDate: "2025-01-15", liquidationHour: "8" },
  breadth: { request: { loading: false, error: null, hasPayload: true }, source, universeSize: 6, advancers: 4, decliners: 2, registryAssets: 10, heuristicClassification: "BROAD BID" },
  movers: [{ symbol: "EXAMPLEUSDT", priceChangePercent: 1.2, quoteVolume: 1000, qualityState: "WATCHLIST", action: "WATCH", reason: "Synthetic source classification." }],
})
const noop = () => undefined
const html = renderToStaticMarkup(<MarketsV2View model={model} actions={{ onSelectSymbol: noop, onOpenScanner: noop }} />)
const pageSource = readFileSync("components/markets/MarketsPage.tsx", "utf8")
const checks: Array<{ name: string; pass: boolean }> = []
const check = (name: string, pass: boolean) => checks.push({ name, pass })
check("Regime fails closed", model.summary.regime.value === null && model.summary.regime.availability.state === "UNAVAILABLE" && html.includes("Market Regime UNAVAILABLE"))
check("Readiness is not freshness or confidence", model.summary.sourceReadiness.label === "PARTIAL" && model.summary.sourceReadiness.basis.includes("source readiness, not freshness or confidence"))
check("Missing funding and liquidations remain unavailable", model.derivatives.metrics.filter((item) => ["funding", "long-liquidations", "short-liquidations"].includes(item.id)).every((item) => item.value === null && item.availability.state === "UNAVAILABLE"))
check("Sector model classification is qualified", html.includes("MODEL CLASSIFICATION: INFLOW") && html.includes("not observed fund flow"))
check("Sector coverage remains partial", model.sectorRotation.coverage.state === "PARTIAL")
check("ETF and reserve remain separate", model.capitalFlow.etf.value === 12.5 && model.capitalFlow.reserve.balanceUsd === 1000 && model.capitalFlow.reserve.balanceUsdChange === null && html.includes("Reserve balance is balance evidence"))
check("Unsupported flow categories fail closed", model.capitalFlow.categories.every((item) => item.availability.state === "UNAVAILABLE"))
check("Macro and Prediction Markets fail closed", model.macro.availability.state === "UNAVAILABLE" && model.predictionMarkets.availability.state === "UNAVAILABLE" && html.includes("Macro UNAVAILABLE") && html.includes("Prediction Markets UNAVAILABLE"))
check("Breadth heuristic exposes basis and incomplete coverage", model.breadth.lifecycle === "PARTIAL" && model.breadth.heuristicBasis?.includes("4 advancers versus 2 decliners") === true && model.breadth.missingConstituents === 4)
check("Movers render once as secondary context", (html.match(/Secondary Discovery Context/g) ?? []).length === 1 && !html.includes("Priority Queue"))
check("Repository boundary is unavailable", !model.repository.handoff.available && html.includes("Repository Audit UNAVAILABLE") && !html.includes('href="/repository'))
check("No invented interaction capabilities", Object.values(model.filters).every((value) => value === false))

const immediatePaths = ["/api/market/movers?focus=", "/api/market/sector-rotation", "/api/market/exchange-comparison?symbol=", "/api/intelligence/market-structure", "/api/etf-flow", "/api/dashboard/reserve-intelligence?symbol="]
check("Six immediate request paths remain", immediatePaths.every((path) => pageSource.includes(path)))
check("Shared request cancellation remains", pageSource.includes("const controller = new AbortController()") && pageSource.includes("active = false") && pageSource.includes("controller.abort()"))
check("Ticker polling and timeout remain", pageSource.includes("const timer = setInterval(loadTicker24h, 30000)") && pageSource.includes("window.setTimeout(() => controller.abort(), 5000)"))
check("Futures polling remains", pageSource.includes("const timer = setInterval(loadFutures, 30000)"))
check("Futures fallback and precedence remain", pageSource.includes("const needsDirectFutures = !futuresSymbol || aggregateFundingRate === null || aggregateOiNotional === null") && pageSource.includes("const liveFundingRate = aggregateFundingRate ?? directFundingRate") && pageSource.includes("const liveOiNotional = aggregateOiNotional ?? directOiNotional"))
check("Five realtime hooks remain", ["useMarketSocket()", "useOrderbookSocket(symbol)", "useKlineSocket(symbol, \"1m\")", "useTradeSocket(symbol)", "useDepthHeatmap(symbol)"].every((value) => pageSource.includes(value)))
check("Liquidation contract remains", pageSource.includes('datasets: "liquidations"') && pageSource.includes('exchange: "binance_futures"') && pageSource.includes("}, 7000)") && pageSource.includes("requestIdRef.current"))
check("Symbol and modal interactions remain", pageSource.includes("onSelectSymbol: setSymbol") && pageSource.includes("setAdvancedChartOpen(true)") && pageSource.includes("setAdvancedChartOpen(false)"))
check("Dashboard and Scanner context remain", pageSource.includes("loadProductContext(productContextId)") && pageSource.includes("createMarketsToScannerContext") && pageSource.includes("createContext(handoff.value)"))
check("No Macro or Prediction request added", !pageSource.includes('fetch("/api/macro') && !pageSource.includes('fetch("/api/prediction') && !pageSource.includes('fetch("/api/research/prediction'))

const failures = checks.filter((item) => !item.pass)
if (failures.length) { console.error("MARKETS V2 SMOKE TEST: FAIL"); failures.forEach((item) => console.error(`[FAIL] ${item.name}`)); process.exitCode = 1 } else { console.log("MARKETS V2 SMOKE TEST: PASS"); checks.forEach((item) => console.log(`[PASS] ${item.name}`)) }
