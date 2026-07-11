import React from "react"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { ScannerV2View } from "@/components/scanner-v2"
import { buildScannerV2ViewModel } from "@/lib/scanner-presentation/adapters"

const request = { loading: false, error: null, hasPayload: true, lastUpdatedAt: "2025-01-15T08:00:00.000Z" }
const model = buildScannerV2ViewModel({
  moverRequest: request,
  opportunityRequest: { loading: false, error: "Synthetic retained-payload failure", hasPayload: true, lastUpdatedAt: "2025-01-15T08:00:00.000Z" },
  inheritedMarketsContext: { label: "PARTIAL", detail: "Synthetic context identity only." },
  candidates: [
    { symbol: "EXAMPLEUSDT", sourceKind: "MARKET_MOVERS_MODEL", setup: "Synthetic detected pattern with a deliberately long label", direction: null, reason: "Synthetic source-model explanation, not evidence.", score: 74, priority: "WATCH", sourceConfidence: "HIGH", sourceFreshness: "FRESH", retentionState: "AGING", observedAt: "2025-01-15T08:00:00.000Z", scoreBreakdown: [{ label: "Synthetic model factor", value: 12, polarity: "positive" }], observations: [{ id: "metric", label: "Synthetic observed metric", value: 12.5, unit: "units" }], riskContext: ["Synthetic supplied source-model risk context."] },
    { symbol: "FALLBACKUSDT", sourceKind: "SCANNER_HEURISTIC", setup: "Synthetic fallback pattern", direction: null, reason: null, score: 61, priority: "Moderate", sourceConfidence: "61", sourceFreshness: null, retentionState: null, observedAt: null, scoreBreakdown: [], observations: [], riskContext: [] },
  ],
})
const html = renderToStaticMarkup(<ScannerV2View model={model} onOpenHandoff={() => undefined} />)
const pageSource = readFileSync("components/scanner/ScannerPage.tsx", "utf8")
const checks: Array<{ name: string; pass: boolean }> = []
const check = (name: string, pass: boolean) => checks.push({ name, pass })
check("Retained failure is partial and freshness is unknown", model.summary.lifecycle === "PARTIAL" && model.summary.freshness.state === "UNKNOWN")
check("Score is not confidence", model.primaryCandidate?.priority.score === 74 && model.primaryCandidate.confidence.state === "UNAVAILABLE" && html.includes("Confidence: UNAVAILABLE"))
check("Priority is investigation only", html.includes("SOURCE MODEL INVESTIGATION PRIORITY") && html.includes("not confidence, expected return, probability, or trade quality"))
check("Missing direction fails closed", model.primaryCandidate?.sourceDirection === null && html.includes("Source-model direction: UNAVAILABLE"))
check("Structured observation retains provenance", model.primaryCandidate?.evidence[0]?.provenance?.sourceId === "market_movers_model" && html.includes("STRUCTURED OBSERVATION"))
check("Model explanation is not evidence", model.primaryCandidate?.sourceExplanation?.includes("not evidence") === true && model.primaryCandidate.evidence.length === 1)
check("Counter evidence fails closed", model.primaryCandidate?.counterEvidence.availability.state === "UNAVAILABLE" && html.includes("Counter Evidence UNAVAILABLE"))
check("Identity remains unavailable", model.primaryCandidate?.identity.durableCandidateId === null && html.includes("not durable candidate identity"))
check("Replay limitation is explicit", model.handoffs.find((item) => item.id === "REPLAY")?.limitation.includes("bounded UTC window") === true)
check("Repository remains unavailable", !model.repository.handoff.available && html.includes("Repository Validation UNAVAILABLE") && !html.includes('href="/repository'))
check("Trade remains optional planning", model.handoffs.find((item) => item.id === "TRADE")?.label.includes("optional decision planning") === true)
check("No invented capabilities", Object.values(model.capabilities).every((value) => value === false))
check("Runtime polling contract remains", pageSource.includes('useSafePolling<Opportunity[]>("/api/scanner/opportunities", 45000') && pageSource.includes("timeoutMs: 9000") && pageSource.includes("retries: 1"))
check("Fallback precedence and bounds remain", pageSource.includes("if (fromMovers.length) return fromMovers") && pageSource.includes(".slice(0, 25)"))
check("Five-minute retention remains", pageSource.includes("const CANDIDATE_RETENTION_MS = 5 * 60 * 1000"))
check("Research context ownership remains", pageSource.includes("createScannerToResearchContext") && pageSource.includes("const persisted = createContext(handoff.value)"))
check("Destination URL builders remain", ["function marketHref", "function tradeHref", "function researchHref", "function replayHref"].every((value) => pageSource.includes(value)))

const failures = checks.filter((item) => !item.pass)
if (failures.length) { console.error("SCANNER V2 SMOKE TEST: FAIL"); failures.forEach((item) => console.error(`[FAIL] ${item.name}`)); process.exitCode = 1 } else { console.log("SCANNER V2 SMOKE TEST: PASS"); checks.forEach((item) => console.log(`[PASS] ${item.name}`)) }
