import React from "react"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"

import { DashboardV2View } from "@/components/product/dashboard-v2"
import {
  adaptMarketDirection,
  buildDashboardV2ViewModel,
  type DashboardMarketDriverInput,
} from "@/lib/dashboard/adapters"

const cleanSummary = {
  symbol: "BTCUSDT",
  timestamp: "2025-01-15T08:00:00.000Z",
  marketDirection: "positive",
  confidence: 37.5,
  quality: "degraded",
  availableCategories: ["funding", "open_interest"],
  missingCategories: ["liquidation", "exchange_flow", "treasury", "etf", "historical_analog", "event_impact"],
  drivers: [{
    category: "funding",
    title: "Example funding observation",
    impactScore: 40,
    quality: "verified",
    evidence: {
      sourceArtifactId: "example-funding",
      source: "Example source",
      observedAt: "2025-01-15T08:00:00.000Z",
      summary: "Deterministic component-test observation.",
      direction: "positive",
    },
  }],
} satisfies DashboardMarketDriverInput

const contaminatedSummary = {
  ...cleanSummary,
  availableCategories: [...cleanSummary.availableCategories, "historical_analog"],
  drivers: [...cleanSummary.drivers, {
    category: "historical_analog",
    title: "Unsupported historical input",
    impactScore: 50,
    quality: "verified",
    evidence: {
      sourceArtifactId: "example-analog",
      source: "Example source",
      observedAt: "2025-01-15T08:00:00.000Z",
      summary: "Must activate fail-closed behavior.",
      direction: "positive",
    },
  }],
} satisfies DashboardMarketDriverInput

const checks: Array<{ name: string; pass: boolean }> = []
function check(name: string, pass: boolean) {
  checks.push({ name, pass })
}

const contaminated = adaptMarketDirection({ summary: contaminatedSummary, state: "ready" })
check("Historical Analog contamination fails closed", contaminated.direction === null && contaminated.availability.state === "UNAVAILABLE")
check("Contaminated aggregate score is omitted", contaminated.evidenceReadiness === null)

const clean = adaptMarketDirection({ summary: cleanSummary, state: "ready" })
check("Evidence Readiness preserves supplied value", clean.evidenceReadiness?.value === 37.5)
check("Evidence Readiness exposes basis", clean.evidenceReadiness?.basis.includes("coverage") === true)

const model = buildDashboardV2ViewModel({
  symbol: "BTCUSDT",
  marketDrivers: contaminatedSummary,
  marketDriverState: "ready",
  opportunities: [{ asset: "BTCUSDT", label: "Example heuristic setup", bias: "Bullish", detectedAt: "2025-01-15T08:00:00.000Z" }],
  predictionMarkets: {
    ok: true,
    marketEvents: [{
      title: "Example prediction observation",
      venue: "Example venue",
      probability: 42,
      lastUpdated: "2025-01-15T08:00:00.000Z",
      source: "example-source",
    }],
  },
  etfFlow: null,
  reserve: null,
  failedCacheKeys: ["predictionMarkets"],
})
const html = renderToStaticMarkup(<DashboardV2View model={model} />)
check("Reasoning stays explicitly unavailable", html.includes("Reasoning unavailable") && html.includes("No approved evidence-referenced reasoning"))
check("Heuristics are visibly qualified", html.includes("Qualified heuristic interpretation") && html.includes("Heuristic direction"))
check("Repository handoff is unavailable without identity", html.includes("Repository unavailable") && !html.includes('href="/repository'))
check("Historical context is a handoff only", html.includes("Open Replay") && html.includes("Open Research") && !html.includes("comparable cases"))
check("Cached request failure remains partial", model.supportingIntelligence[0]?.lifecycle === "PARTIAL" && model.pageLimitations.some((item) => item.includes("Cached data")))

const dashboardSource = readFileSync("components/product/DashboardV1.tsx", "utf8")
const requestPaths = [
  "/api/market/movers?focus=",
  "/api/prediction-markets",
  "/api/market/futures-intelligence",
  "/api/macro",
  "/api/etf-flow",
  "/api/market/sector-rotation",
  "/api/narratives?range=24h",
  "/api/market-drivers?symbol=",
  "/api/dashboard/reserve-intelligence?symbol=",
]
check("All nine request paths remain present", requestPaths.every((path) => dashboardSource.includes(path)))
const deferredIndex = dashboardSource.indexOf("deferredTimer = setTimeout")
check("Primary and deferred request ordering remains present", [
  "/api/market/movers?focus=",
  "/api/prediction-markets",
  "/api/market/futures-intelligence",
].every((path) => dashboardSource.indexOf(path) < deferredIndex) && [
  "/api/macro",
  "/api/etf-flow",
  "/api/market/sector-rotation",
].every((path) => dashboardSource.indexOf(path) > deferredIndex))
check("Request timing constants remain present", dashboardSource.includes("setTimeout(() => controller.abort(), 4500)")
  && dashboardSource.includes("}, 2500)")
  && dashboardSource.includes("}, 12000)")
  && dashboardSource.includes("}, 8000)"))
check("Abort and cleanup behavior remains present", dashboardSource.includes("controllers.forEach((controller) => controller.abort())") && dashboardSource.includes("controller.abort()"))
check("Local storage cache behavior remains present", dashboardSource.includes("localStorage.getItem") && dashboardSource.includes("localStorage.setItem"))
check("Request failure observation preserves cached data", dashboardSource.includes("Keep cached or existing state visible.") && dashboardSource.includes("setFailedCacheKeys"))
check("No polling was introduced", !dashboardSource.includes("setInterval("))

const failures = checks.filter((item) => !item.pass)
if (failures.length) {
  console.error("DASHBOARD V2 SMOKE TEST: FAIL")
  failures.forEach((item) => console.error(`[FAIL] ${item.name}`))
  process.exitCode = 1
} else {
  console.log("DASHBOARD V2 SMOKE TEST: PASS")
  checks.forEach((item) => console.log(`[PASS] ${item.name}`))
}
