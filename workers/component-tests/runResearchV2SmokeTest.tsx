import React from "react"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { ResearchV2View } from "@/components/research-v2"
import { buildResearchV2ViewModel } from "@/lib/research-presentation/adapters"

const model = buildResearchV2ViewModel({
  symbol: "EXAMPLEUSDT", exchange: "example_exchange", timeframe: "1h", title: "Synthetic Research fixture", question: "What supplied synthetic evidence is available for this deliberately long investigation question?",
  decisionBrief: null,
  evidence: [{ role: "CONFLICTING", validity: { schemaVersion: 1, observedAt: "2025-01-15T08:00:00.000Z", generatedAt: "2025-01-15T08:05:00.000Z", freshnessStatus: "STALE", coverageStatus: "PARTIAL", reason: "Synthetic partial fixture." }, evidence: { evidenceId: "synthetic-evidence-id", sourceArtifactId: "synthetic-artifact-id", kind: "historical_case", title: "Synthetic structured counter evidence", summary: "Deterministic fixture observation.", source: "Synthetic source", observedAt: "2025-01-15T08:00:00.000Z" } }],
  secondaryContext: [{ id: "synthetic-context", title: "Synthetic retained aggregate", summary: "Prior payload retained.", source: "Synthetic aggregate", observedAt: null, polling: { loading: false, error: "Synthetic polling failure", hasPayload: true }, limitation: "Secondary context only." }],
  primarySourceCandidates: [{ metadata: null, label: "Insufficient source metadata" }],
  predictionMarkets: [{ title: "Synthetic prediction question", probability: 42, volume: 100, liquidity: 50, category: "synthetic", attentionRank: 1, lastUpdated: null, attentionLabel: "Local heuristic" }],
  predictionSource: null, predictionPolling: { loading: false, error: null, hasPayload: true },
  relatedResearch: [{ id: "synthetic-case-id", kind: "HISTORICAL_ANALOG", title: "Synthetic selected historical case", summary: "Synthetic context only.", identity: "synthetic-case-id", selected: true, availability: "AVAILABLE", limitation: "Not a causal claim." }],
  repository: { utcDay: "2025-01-15", status: "STALE", reason: "Synthetic stale projection.", rows: [] }, selectedHistoricalCaseId: "synthetic-case-id", availableHistoricalCaseIds: ["synthetic-case-id"],
  handoffs: [{ id: "replay", label: "Replay", href: "/replay?symbol=EXAMPLEUSDT", available: true, description: "Synthetic handoff.", unavailableReason: null, actionRequired: true }],
})
const noop = () => undefined
const html = renderToStaticMarkup(<ResearchV2View model={model} actions={{ onLoadHistorical: noop, onLoadEventImpact: noop, onLoadMarketMemory: noop, onLoadRepository: noop, onRepositoryDateChange: noop, onSelectHistoricalCase: noop, onOpenReplay: noop, historicalLoading: false, eventImpactLoading: false, marketMemoryLoading: false }} />)
const source = readFileSync("components/research/ResearchPage.tsx", "utf8")
const checks: Array<{ name: string; pass: boolean }> = []
const check = (name: string, pass: boolean) => checks.push({ name, pass })
check("Evidence identity is preserved", model.counterEvidence[0]?.id === "synthetic-evidence-id" && model.counterEvidence[0]?.provenance?.sourceId === "synthetic-artifact-id")
check("Retained polling payload is PARTIAL", model.secondaryContext[0]?.lifecycle === "PARTIAL" && model.secondaryContext[0]?.freshness?.state === "UNKNOWN")
check("Primary source gate fails closed", model.primarySources[0]?.attributable === false && model.primarySources[0]?.availability.state === "UNAVAILABLE")
check("Reasoning is unavailable", html.includes("Reasoning UNAVAILABLE") && !html.includes("ReasoningCard"))
check("Structured counter evidence renders", html.includes("Synthetic structured counter evidence") || html.includes("Deterministic fixture observation"))
check("Prediction probability is not confidence", html.includes("Context, not confidence") && html.includes("Probability: 42%") && !("confidence" in model.predictionContext[0]))
check("Prediction freshness remains unknown", model.predictionContext[0]?.freshness.state === "UNKNOWN")
check("Research Graph fails closed", html.includes("Research Graph UNAVAILABLE"))
check("Repository projection and identity remain separate", model.repository.availability.state === "STALE" && !model.repository.recordHandoff.available && html.includes("Repository unavailable"))
check("Evidence Packet remains unavailable", html.includes("Evidence Packet unavailable"))
check("Selected historical case exposes pressed state", html.includes('aria-pressed="true"'))

const pollingContracts = [
  'useSafePolling<NarrativeResponse>("/api/narratives?range=24h", 60000, { label: "research-narratives", timeoutMs: 12000, retries: 1 })',
  'useSafePolling<PredictionResponse>("/api/research/prediction-markets", 60000, { label: "research-predictions", timeoutMs: 12000, retries: 1 })',
  'useSafePolling<MacroResponse>("/api/macro", 60000, { label: "research-macro", timeoutMs: 12000, retries: 1 })',
]
check("Polling contracts remain exact", pollingContracts.every((contract) => source.includes(contract)))
check("Manual loaders remain manual", source.includes("onLoadHistorical: loadHistoricalIntelligence") && source.includes("onLoadEventImpact: loadEventImpact") && source.includes("onLoadMarketMemory: loadMarketMemory") && source.includes("onLoadRepository: loadRepositorySummary"))
check("Manual request bounds remain exact", source.includes("timeoutMs: 8000") && source.includes("timeoutMs: 5000") && source.includes("retries: 0"))
check("Abort cleanup remains", source.includes("historicalController.current?.abort()") && source.includes("repositoryController.current?.abort()"))
check("Scanner context remains", source.includes("loadProductContext(productContextId)") && source.includes('destinationIntent !== "evaluate_thesis"'))
check("Research-to-Replay writer remains", source.includes("createResearchToReplayContext") && source.includes("saveProductContext(handoff.value)"))
check("No Evidence Packet integration", !source.includes("evidencePacketBuilder") && !source.includes("buildEvidencePacket"))
check("No new search/filter/sort/tabs", model.filters.searchSupported === false && model.filters.filtersSupported === false && model.filters.sortingSupported === false && model.filters.tabsSupported === false)

const failures = checks.filter((item) => !item.pass)
if (failures.length) { console.error("RESEARCH V2 SMOKE TEST: FAIL"); failures.forEach((item) => console.error(`[FAIL] ${item.name}`)); process.exitCode = 1 } else { console.log("RESEARCH V2 SMOKE TEST: PASS"); checks.forEach((item) => console.log(`[PASS] ${item.name}`)) }
