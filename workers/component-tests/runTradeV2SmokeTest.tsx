import React from "react"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { TradeV2View } from "@/components/trade-v2"
import { buildTradeV2ViewModel } from "@/lib/trade-presentation/adapters"

const model = buildTradeV2ViewModel({
  candidateState: "ready",
  selected: { symbol: "EXAMPLEUSDT", setup: "Synthetic supplied pattern", direction: "LONG", explanation: "Synthetic source-model explanation, not evidence.", score: 72, sourceFreshness: "FRESH", observedAt: "2025-01-15T08:00:00.000Z", risk: ["Synthetic source-model risk context."] },
  candidates: [{ symbol: "EXAMPLEUSDT", selected: true, retentionState: "AGING" }],
  replay: { contextId: "synthetic-replay-context", label: "PARTIAL", detail: "Synthetic Replay context envelope.", available: true },
  observations: [{ id: "synthetic-price", label: "Synthetic observed price", value: 100, source: "synthetic-ticker", available: true }, { id: "synthetic-missing", label: "Synthetic missing metric", value: null, source: "synthetic-source", available: false }],
  localHeuristicRisk: ["Synthetic local heuristic with disclosed basis."],
  plan: { entryCondition: "Synthetic source-model level A", invalidationCondition: "Synthetic source-model level B", modelTargets: "Synthetic source-model level C", modelAction: "Synthetic planning context only", monitoringCondition: "Synthetic supplied monitoring text" },
  records: [{ id: "synthetic-local-record", symbol: "EXAMPLEUSDT", setupType: "Synthetic pattern", direction: "Uptrend", entryArea: "Level A", wrongArea: "Level B", targetArea: "Level C", createdTime: "2025-01-15T08:00:00.000Z", status: "Won" }],
  hrefs: { replay: "/replay", research: "/research", markets: "/markets?symbol=EXAMPLEUSDT", scanner: "/scanner", dashboard: "/dashboard" },
})
const noop = () => undefined
const html = renderToStaticMarkup(<TradeV2View model={model} actions={{ onSelectCandidate: noop, onTrack: noop, onUpdateStatus: noop, onDelete: noop }} />)
const page = readFileSync("components/trade/TradePage.tsx", "utf8")
const checks: Array<{ name: string; pass: boolean }> = []
const check = (name: string, pass: boolean) => checks.push({ name, pass })
check("Permanent planning boundary", html.includes("PLANNING ONLY") && html.includes("NO ORDER ENTRY"))
check("Snapshot uses availability only", model.snapshot.counterEvidence.state === "UNAVAILABLE" && model.snapshot.scenarios.state === "UNAVAILABLE" && !html.includes("% ready"))
check("Score is not confidence or readiness", model.context.sourceModelScore === 72 && html.includes("Canonical confidence: UNAVAILABLE") && model.readiness.label === "INCOMPLETE")
check("Structured observations preserve source", model.evidence.observations[0]?.provenance?.sourceId === "synthetic-ticker")
check("Explanation is separated from observations", model.evidence.sourceModelExplanation?.includes("not evidence") === true && model.evidence.observations.length === 2)
check("Counter Evidence fails closed", model.counterEvidence.availability.state === "UNAVAILABLE" && html.includes("Counter Evidence UNAVAILABLE"))
check("Scenario Analysis fails closed", model.scenarios.availability.state === "UNAVAILABLE" && html.includes("Scenario Analysis UNAVAILABLE"))
check("Risk sources remain separate", model.risk.sourceModelRisk.length === 1 && model.risk.localHeuristicRisk.length === 1 && model.risk.userRisk.length === 0)
check("Planning levels are non-executable", html.includes("Planning only / non-executable") && model.plan.limitation.includes("unsupported by order entry"))
check("Local identity is not durable", model.context.identity.localPlanningRecordId === "synthetic-local-record" && model.context.identity.durableDecisionId === null && model.context.identity.repositoryRecordId === null)
check("Stored Won status is presented as review", model.localRecords[0]?.persistedStatus === "Won" && model.localRecords[0]?.reviewLabel === "Favorable review")
check("Repository boundary unavailable", !model.repository.handoff.available && html.includes("Repository Handoff UNAVAILABLE") && !html.includes('href="/repository'))
check("No order form controls", !html.includes("Market Order") && !html.includes("Limit Order") && !html.includes("Position Size submission"))
check("URL symbol intake remains", page.includes('searchParams.get("symbol")?.toUpperCase()'))
check("Replay context intake remains", page.includes("loadProductContext(productContextId)") && page.includes('sourcePage !== "replay"') && page.includes('destinationIntent !== "prepare_execution"'))
check("Candidate selection, bounds, and retention remain", page.includes("selectedCandidateFrom({") && page.includes(".slice(0, 10)") && page.includes("const CANDIDATE_RETENTION_MS = 5 * 60 * 1000"))
check("Four realtime subscriptions remain", ["useTradeSocket(activeSymbol)", "useLiquidationSocket()", "useMarketSocket()", "useOrderbookSocket(activeSymbol)"].every((item) => page.includes(item)))
check("Futures polling remains", page.includes("const timer = window.setInterval(loadTradeData, 30000)") && page.includes("window.clearInterval(timer)"))
check("Local persistence and random IDs remain", page.includes("loadSavedSetups()") && page.includes("saveSetups(setups)") && page.includes("crypto.randomUUID()"))
check("Local status and deletion remain", page.includes("persistSetups(savedSetups.map") && page.includes("persistSetups(savedSetups.filter"))
check("Generic navigation and Markets URL remain", ["/research", "/replay", "/scanner", "/dashboard", 'source: "trade"'].every((item) => page.includes(item)))

const failures = checks.filter((item) => !item.pass)
if (failures.length) { console.error("TRADE V2 SMOKE TEST: FAIL"); failures.forEach((item) => console.error(`[FAIL] ${item.name}`)); process.exitCode = 1 } else { console.log("TRADE V2 SMOKE TEST: PASS"); checks.forEach((item) => console.log(`[PASS] ${item.name}`)) }
