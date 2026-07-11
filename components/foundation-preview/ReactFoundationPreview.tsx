"use client"

import {
  ConfidenceIndicator,
  CounterEvidenceCard,
  EvidenceCard,
  MetricCard,
  ReasoningCard,
} from "@/components/evidence"
import { AvailabilityBadge, StatePanel } from "@/components/feedback"
import { Inline, Section, Stack, SurfacePanel } from "@/components/layout/foundation-layout"
import { RepositoryLink } from "@/components/navigation"
import { DashboardV2View } from "@/components/product/dashboard-v2"
import { ReplayV2View } from "@/components/replay-v2"
import { ResearchV2View } from "@/components/research-v2"
import { MarketsV2View } from "@/components/markets-v2"
import { ScannerV2View } from "@/components/scanner-v2"
import { TradeV2View } from "@/components/trade-v2"
import { Badge, Button, Chip, Divider, IconButton, Progress, Spinner } from "@/components/ui/foundation"
import {
  PREVIEW_FIXTURE_LABEL,
  previewCounterEvidence,
  previewEvidence,
  previewMetric,
  previewReasoning,
  previewUnavailableEvidence,
} from "@/lib/design-system/fixtures/preview"
import { AVAILABILITY_STATES, LIFECYCLE_STATES, type AvailabilityState } from "@/lib/design-system"
import { buildDashboardV2ViewModel, type DashboardMarketDriverInput } from "@/lib/dashboard/adapters"
import { buildReplayV2ViewModel } from "@/lib/replay-presentation/adapters"
import { buildResearchV2ViewModel } from "@/lib/research-presentation/adapters"
import { buildMarketsV2ViewModel } from "@/lib/markets-presentation/adapters"
import { buildScannerV2ViewModel } from "@/lib/scanner-presentation/adapters"
import { buildTradeV2ViewModel } from "@/lib/trade-presentation/adapters"
import { Search } from "lucide-react"

const staleEvidence = {
  ...previewEvidence,
  id: "example-evidence-stale",
  title: "Stale evidence example with a deliberately long title that verifies safe wrapping at narrow widths",
  availability: { state: "STALE" as const, reason: "Example freshness threshold exceeded." },
  freshness: { state: "STALE" as const, observedAt: "2025-01-14T08:00:00.000Z", reason: "Synthetic preview age." },
}

const partialEvidence = {
  ...previewEvidence,
  id: "example-evidence-partial",
  title: "Partial evidence example",
  lifecycle: "PARTIAL" as const,
  coverage: { state: "PARTIAL" as const, actualRecords: 1, expectedRecords: 3, percent: 33.33, reason: "Synthetic preview coverage." },
}

const syntheticDashboardDrivers = {
  symbol: "EXAMPLEUSDT",
  timestamp: "2025-01-15T08:00:00.000Z",
  marketDirection: "positive",
  confidence: 62.5,
  quality: "degraded",
  availableCategories: ["funding", "open_interest", "historical_analog"],
  missingCategories: ["liquidation", "exchange_flow", "treasury", "etf", "event_impact"],
  staleCategories: ["open_interest"],
  drivers: [
    {
      category: "funding",
      title: "Synthetic funding evidence with a deliberately long title for responsive wrapping validation",
      impactScore: 42,
      quality: "verified",
      evidence: {
        sourceArtifactId: "synthetic-funding-evidence",
        source: "Synthetic preview source",
        observedAt: "2025-01-15T08:00:00.000Z",
        summary: "Demonstration funding observation. This is not current market data.",
        direction: "positive",
      },
    },
    {
      category: "open_interest",
      title: "Synthetic stale open-interest evidence",
      impactScore: 30,
      quality: "degraded",
      evidence: {
        sourceArtifactId: "synthetic-open-interest-evidence",
        source: "Synthetic preview source",
        observedAt: "2025-01-14T08:00:00.000Z",
        summary: "Demonstration stale observation. This is not current market data.",
        direction: "neutral",
      },
    },
    {
      category: "historical_analog",
      title: "Synthetic unsupported historical input",
      impactScore: 25,
      quality: "verified",
      evidence: {
        sourceArtifactId: "synthetic-historical-evidence",
        source: "Synthetic preview source",
        observedAt: "2025-01-15T07:00:00.000Z",
        summary: "This fixture activates the Dashboard fail-closed gate.",
        direction: "positive",
      },
    },
  ],
} satisfies DashboardMarketDriverInput

const syntheticDashboardModel = buildDashboardV2ViewModel({
  symbol: "EXAMPLEUSDT",
  marketDrivers: syntheticDashboardDrivers,
  marketDriverState: "ready",
  opportunities: [{
    asset: "EXAMPLEUSDT",
    label: "Synthetic local setup label",
    bias: "Bullish",
    detectedAt: "2025-01-15T08:00:00.000Z",
    context: "Synthetic preview context",
    explanation: "Synthetic heuristic explanation requiring visible qualification.",
  }],
  predictionMarkets: {
    ok: true,
    source: "synthetic-preview",
    marketEvents: [{
      title: "Synthetic prediction-market observation",
      venue: "Example fixture",
      probability: 42,
      lastUpdated: "2025-01-15T08:00:00.000Z",
      source: "synthetic-preview",
    }],
  },
  etfFlow: null,
  reserve: null,
  narratives: null,
  narrativeState: "unavailable",
  narrativeUnavailableReason: "Synthetic preview unavailable state.",
  failedCacheKeys: ["predictionMarkets"],
})

const syntheticReplayModel = buildReplayV2ViewModel({
  symbol: "EXAMPLEUSDT", exchange: "binance_futures", timeframe: "1h", window: "2025-01-15 08:00-08:59 UTC",
  title: "Synthetic Replay investigation", question: "A deliberately long synthetic question verifies narrow-width wrapping without making a current market claim.",
  hasLoaded: true, loading: false, summaryObservations: ["Synthetic bounded observation. This is not current market data."],
  chartCandles: [{ time: 1736928000, open: 100, high: 102, low: 99, close: 101, volume: 10 }], chartSource: "Synthetic preview source", chartReason: null, priceChange: 1,
  statuses: {
    chart: { label: "CURRENT", detail: "Synthetic evidence available.", source: "Synthetic preview", rowCount: 1 },
    positioning: { label: "PARTIAL", detail: "Synthetic partial coverage.", source: "Synthetic preview", rowCount: 1 },
    liquidation: { label: "STALE", detail: "Synthetic stale source.", source: "Synthetic preview", rowCount: 1 },
    orderbook: { label: "UNAVAILABLE", detail: "Synthetic orderbook intentionally omitted.", rowCount: 0 },
    trades: { label: "MISSING", detail: "Manual synthetic AggTrade load has not run.", rowCount: 0 },
  },
  timelineEvents: [{ timestamp: "2025-01-15T08:01:00.000Z", type: "Synthetic long timeline observation", label: "Deterministic fixture value with no record identity and no causal claim." }],
  tradeCount: 0, tradeLoading: false, tradesTruncated: true, tradeContinuation: true, marketMetrics: [], orderbookMetrics: [], selectedHistoricalCase: null,
  researchHref: "/research?symbol=EXAMPLEUSDT&source=replay", repositoryGate: { repositoryReady: true, projectionStatus: "AVAILABLE", detail: "Synthetic projection fixture." },
})
const previewReplayActions = { exchange: "binance_futures", symbol: "EXAMPLEUSDT", date: "2025-01-15", hour: "8", sourceMode: "provider" as const, loading: false, loadingStage: null, repositoryModeDisabled: false, repositoryModeReason: null, onExchangeChange: () => undefined, onSymbolChange: () => undefined, onDateChange: () => undefined, onHourChange: () => undefined, onSourceModeChange: () => undefined, onLoadReplay: () => undefined, onLoadTrades: () => undefined, onLoadOrderbook: () => undefined }
const previewResearchModel = buildResearchV2ViewModel({
  symbol: "EXAMPLEUSDT", exchange: "example_exchange", timeframe: "1h", title: "Synthetic Research investigation", question: "What supplied evidence is available for this deliberately long synthetic investigation question at a 393px composition?",
  decisionBrief: { currentView: "INSUFFICIENT_EVIDENCE", freshnessStatus: "UNKNOWN", coverageStatus: "PARTIAL", supportingEvidenceCount: 1, contradictingEvidenceCount: 1, sourceArtifactIds: ["synthetic-artifact-id"] },
  evidence: [
    { role: "SUPPORTING", validity: { schemaVersion: 1, observedAt: "2025-01-15T08:00:00.000Z", generatedAt: "2025-01-15T08:05:00.000Z", freshnessStatus: "VALID", coverageStatus: "FULL", reason: "Synthetic fixture." }, evidence: { evidenceId: "synthetic-support", sourceArtifactId: "synthetic-artifact-id", kind: "historical_case", title: "Synthetic structured evidence with a deliberately long title", summary: "Deterministic preview evidence, not a current market claim.", source: "Synthetic preview source", observedAt: "2025-01-15T08:00:00.000Z" } },
    { role: "CONFLICTING", validity: { schemaVersion: 1, observedAt: "2025-01-14T08:00:00.000Z", generatedAt: "2025-01-15T08:05:00.000Z", freshnessStatus: "STALE", coverageStatus: "PARTIAL", reason: "Synthetic stale fixture." }, evidence: { evidenceId: "synthetic-conflict", kind: "outcome", title: "Synthetic counter evidence", summary: "Deterministic conflicting observation with no record identity.", source: "Synthetic preview source", observedAt: "2025-01-14T08:00:00.000Z" } },
  ],
  secondaryContext: [{ id: "synthetic-retained-context", title: "Synthetic retained aggregate", summary: "A prior payload remains visible after a deterministic polling error.", source: "Synthetic aggregate source", observedAt: null, polling: { loading: false, error: "Synthetic request failure", hasPayload: true }, limitation: "Secondary aggregate context only." }],
  primarySourceCandidates: [
    { label: "Synthetic attributable primary source", metadata: { sourceId: "synthetic-primary", sourceName: "Synthetic Primary Source", freshnessStatus: "CURRENT", qualityLevel: "HIGH", sourceStatus: "ACTIVE", lastUpdatedAt: "2025-01-15T08:00:00.000Z", retrievedAt: "2025-01-15T08:05:00.000Z", degradedReason: null, unavailableReason: null, fallbackSourceId: null, cacheStatus: "HIT", productionApproved: true } },
    { label: "Insufficient source metadata", metadata: null },
  ],
  predictionMarkets: [{ title: "Synthetic prediction context with unknown freshness", probability: 42, volume: 1000, liquidity: 500, category: "synthetic", attentionRank: 1, lastUpdated: null, attentionLabel: "High Attention" }], predictionSource: null, predictionPolling: { loading: false, error: null, hasPayload: true },
  relatedResearch: [{ id: "synthetic-selected-case", kind: "HISTORICAL_ANALOG", title: "Synthetic selected historical case", summary: "Supplied fixture context only.", identity: "synthetic-selected-case", selected: true, availability: "AVAILABLE", limitation: "No similarity or causality is inferred." }],
  repository: { utcDay: "2025-01-15", status: "STALE", reason: "Synthetic stale projection.", rows: [] }, selectedHistoricalCaseId: "synthetic-selected-case", availableHistoricalCaseIds: ["synthetic-selected-case"],
  handoffs: [{ id: "replay", label: "Replay", href: "/replay?symbol=EXAMPLEUSDT", available: true, description: "Synthetic contextual handoff.", unavailableReason: null, actionRequired: true }],
})
const previewResearchActions = { onLoadHistorical: () => undefined, onLoadEventImpact: () => undefined, onLoadMarketMemory: () => undefined, onLoadRepository: () => undefined, onRepositoryDateChange: () => undefined, onSelectHistoricalCase: () => undefined, onOpenReplay: () => undefined, historicalLoading: false, eventImpactLoading: false, marketMemoryLoading: false }
const previewMarketsSource = { sourceId: "synthetic-markets-source", sourceName: "Synthetic Markets Preview Source", freshnessStatus: "STALE" as const, qualityLevel: "MEDIUM" as const, sourceStatus: "DEGRADED" as const, lastUpdatedAt: "2025-01-15T08:00:00.000Z", retrievedAt: "2025-01-15T08:05:00.000Z", degradedReason: "PARTIAL_DATA" as const, unavailableReason: null, fallbackSourceId: null, cacheStatus: "HIT" as const, productionApproved: true }
const previewMarketsModel = buildMarketsV2ViewModel({
  symbol: "EXAMPLEUSDT", exchange: "example_exchange", timeframe: "1m",
  inheritedDashboard: { label: "PARTIAL", detail: "Synthetic inherited context for preview only.", direction: null, driverCount: 2, evidenceCount: 1, freshness: "UNKNOWN" },
  summaryMetrics: [{ id: "synthetic-price", label: "Synthetic supplied price", value: 100, available: true, source: "Synthetic preview source" }, { id: "synthetic-range", label: "Synthetic unavailable range with a deliberately long label", value: null, available: false }], moduleAvailability: [true, true, false, false],
  sectorRotation: { request: { loading: false, error: null, hasPayload: true }, source: previewMarketsSource, mappedAssets: 6, registryAssets: 10, sectors: [{ sector: "SYNTHETIC SECTOR WITH LONG LABEL", rank: 1, rotationScore: 62, direction: "INFLOW", volumeShare: 12, avgPriceChange: 1.2, breadth: 66, assetCount: 6, positiveCount: 4, topSymbols: ["EXAMPLE", "FIXTURE"] }] },
  etf: { request: { loading: false, error: null, hasPayload: true }, source: { ...previewMarketsSource, sourceId: "synthetic-etf-source", sourceName: "Synthetic ETF Preview Source", freshnessStatus: "CURRENT", sourceStatus: "ACTIVE", degradedReason: null }, row: { asset: "EXAMPLE", netFlow: 12.5, unit: "USD millions", sourceDate: "2025-01-15", sourceTimestamp: "2025-01-15T08:00:00.000Z" } },
  reserve: { request: { loading: false, error: null, hasPayload: true }, freshness: "current", observedAt: "2025-01-15T08:00:00.000Z", row: { asset: "EXAMPLE", observationType: "balance", currentBalance: 500, currentBalanceUsd: 1000, balanceChange: null, balanceUsdChange: null } },
  derivatives: { fundingRate: null, fundingSource: null, openInterestNotional: 500000, openInterestSource: "Synthetic fallback provenance", liquidationState: "unavailable", longLiquidationNotional: null, shortLiquidationNotional: null, venues: [{ name: "Synthetic venue", ok: true, source: "Synthetic provider", fundingRate: null, openInterestNotional: 500000 }], relationships: [], heuristics: [{ id: "synthetic-model", label: "Synthetic structure model", value: "SUPPLIED MODEL STATE", available: true, basis: "Deterministic synthetic source-model fixture.", qualification: "SOURCE_MODEL" }], liquidationDate: "2025-01-15", liquidationHour: "8" },
  breadth: { request: { loading: false, error: null, hasPayload: true }, source: previewMarketsSource, universeSize: 6, advancers: 4, decliners: 2, registryAssets: 10, heuristicClassification: "BROAD BID" },
  movers: [{ symbol: "EXAMPLEUSDT", priceChangePercent: 1.2, quoteVolume: 1000, qualityState: "WATCHLIST", action: "WATCH", reason: "Synthetic source-owned classification for secondary context only." }],
})
const previewMarketsActions = { onSelectSymbol: () => undefined, onOpenScanner: () => undefined }
const previewScannerModel = buildScannerV2ViewModel({
  moverRequest: { loading: false, error: null, hasPayload: true, lastUpdatedAt: "2025-01-15T08:00:00.000Z" },
  opportunityRequest: { loading: false, error: "Synthetic retained-payload failure", hasPayload: true, lastUpdatedAt: "2025-01-15T08:00:00.000Z" },
  inheritedMarketsContext: { label: "PARTIAL", detail: "Synthetic context identity without durable candidate identity." },
  candidates: [
    { symbol: "EXAMPLEUSDT", sourceKind: "MARKET_MOVERS_MODEL", setup: "Synthetic source-model pattern with a deliberately long title for narrow composition", direction: null, reason: "Synthetic source-model explanation separated from evidence.", score: 74, priority: "WATCH", sourceConfidence: "HIGH", sourceFreshness: "FRESH", retentionState: "AGING", observedAt: "2025-01-15T08:00:00.000Z", scoreBreakdown: [{ label: "Synthetic disclosed model factor", value: 12, polarity: "positive" }], observations: [{ id: "synthetic-metric", label: "Synthetic structured metric observation", value: 12.5, unit: "units" }], riskContext: ["Synthetic supplied source-model risk context without evidence linkage."] },
    { symbol: "FALLBACKUSDT", sourceKind: "SCANNER_HEURISTIC", setup: "Synthetic fallback pattern", direction: null, reason: null, score: 61, priority: "Moderate", sourceConfidence: "61", sourceFreshness: null, retentionState: null, observedAt: null, scoreBreakdown: [], observations: [], riskContext: [] },
  ],
})
const previewTradeModel = buildTradeV2ViewModel({
  candidateState: "ready",
  selected: { symbol: "EXAMPLEUSDT", setup: "Synthetic selected candidate context with a deliberately long pattern label", direction: "LONG", explanation: "Synthetic source-model explanation separated from evidence.", score: 72, sourceFreshness: "FRESH", observedAt: "2025-01-15T08:00:00.000Z", risk: ["Synthetic supplied source-model risk context."] },
  candidates: [{ symbol: "EXAMPLEUSDT", selected: true, retentionState: "AGING" }],
  replay: { contextId: "synthetic-replay-context", label: "PARTIAL", detail: "Synthetic Replay context envelope available for display only.", available: true },
  observations: [{ id: "synthetic-trade-price", label: "Synthetic structured factual observation", value: 100, source: "synthetic-ticker", available: true }, { id: "synthetic-trade-missing", label: "Synthetic unavailable observation", value: null, source: "synthetic-source", available: false }],
  localHeuristicRisk: ["Synthetic local heuristic risk with disclosed basis."],
  plan: { entryCondition: "Synthetic source-model level A", invalidationCondition: "Synthetic source-model level B", modelTargets: "Synthetic source-model level C", modelAction: "Synthetic planning context only", monitoringCondition: "Synthetic supplied monitoring text" },
  records: [{ id: "synthetic-local-planning-record", symbol: "EXAMPLEUSDT", setupType: "Synthetic pattern", direction: "Uptrend", entryArea: "Level A", wrongArea: "Level B", targetArea: "Level C", createdTime: "2025-01-15T08:00:00.000Z", status: "Won" }],
  hrefs: { replay: "/replay", research: "/research", markets: "/markets?symbol=EXAMPLEUSDT", scanner: "/scanner", dashboard: "/dashboard" },
})
const previewTradeActions = { onSelectCandidate: () => undefined, onTrack: () => undefined, onUpdateStatus: () => undefined, onDelete: () => undefined }

export function ReactFoundationPreview() {
  return (
    <main data-qt-foundation="preview" data-qt-density="standard" className="min-h-screen bg-[var(--qt-color-background)] p-4 font-[var(--qt-font-sans)] text-[var(--qt-color-text-primary)] sm:p-6 lg:p-8">
      <Stack gap="8" className="mx-auto max-w-[1440px]">
        <header className="grid gap-3 border-b border-[var(--qt-color-border)] pb-6">
          <Badge tone="warning">{PREVIEW_FIXTURE_LABEL}</Badge>
          <h1 className="text-2xl font-bold sm:text-3xl">Canonical React Foundation Preview</h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--qt-color-text-secondary)]">Development-only isolated components. Values are deterministic synthetic fixtures and are not current market data.</p>
        </header>

        <Section aria-labelledby="primitive-title">
          <h2 id="primitive-title" className="text-lg font-semibold">Primitives</h2>
          <SurfacePanel>
            <Inline gap="3">
              <Button variant="primary">Primary action</Button>
              <Button>Secondary action</Button>
              <Button variant="ghost">Ghost action</Button>
              <Button loading loadingLabel="Synthetic loading">Ignored content</Button>
              <IconButton accessibleName="Search synthetic preview"><Search className="size-4" /></IconButton>
              <Chip selected>Selected filter</Chip>
              <Chip>Available filter</Chip>
              <Spinner label="Synthetic loading state" />
            </Inline>
            <Divider className="my-4" />
            <Progress label="Demonstration progress" value={2} max={3} />
          </SurfacePanel>
        </Section>

        <Section aria-labelledby="availability-title">
          <h2 id="availability-title" className="text-lg font-semibold">Availability states</h2>
          <Inline gap="2">
            {AVAILABILITY_STATES.map((state: AvailabilityState) => <AvailabilityBadge key={state} availability={{ state, reason: `${state} synthetic preview.` }} />)}
          </Inline>
        </Section>

        <Section aria-labelledby="lifecycle-title">
          <h2 id="lifecycle-title" className="text-lg font-semibold">Lifecycle states</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {LIFECYCLE_STATES.map((state) => <StatePanel key={state} state={state} title={`${state} example`} reason={`${state} synthetic preview state.`} />)}
          </div>
        </Section>

        <Section aria-labelledby="evidence-title">
          <h2 id="evidence-title" className="text-lg font-semibold">Evidence and data display</h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <EvidenceCard evidence={previewEvidence} variant="compact" />
            <EvidenceCard evidence={previewEvidence} variant="expanded" />
            <EvidenceCard evidence={staleEvidence} variant="expanded" />
            <EvidenceCard evidence={partialEvidence} variant="expanded" />
            <EvidenceCard evidence={previewUnavailableEvidence} variant="expanded" />
            <MetricCard metric={previewMetric} />
          </div>
        </Section>

        <Section aria-labelledby="reasoning-title">
          <h2 id="reasoning-title" className="text-lg font-semibold">Reasoning boundaries</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReasoningCard reasoning={previewReasoning} />
            <CounterEvidenceCard counterEvidence={previewCounterEvidence} />
            <ReasoningCard reasoning={{ ...previewReasoning, id: "example-reasoning-unavailable", summary: "This text must not render.", supportingEvidence: [], unavailableReason: "Synthetic preview intentionally omits evidence references." }} />
            <SurfacePanel>
              <Stack>
                <ConfidenceIndicator confidence={{ state: "UNAVAILABLE", reason: "Synthetic preview confidence omitted." }} />
                <RepositoryLink handoff={{ available: false, unavailableReason: "Synthetic fixtures have no Repository record." }} />
              </Stack>
            </SurfacePanel>
          </div>
        </Section>

        <Section aria-labelledby="dashboard-v2-preview-title">
          <h2 id="dashboard-v2-preview-title" className="text-lg font-semibold">Dashboard V2 composition</h2>
          <p className="text-sm text-[var(--qt-color-warning)]">Synthetic preview: contaminated direction, partial cached data, stale evidence, unavailable reasoning, missing Repository identity, and long text.</p>
          <DashboardV2View model={syntheticDashboardModel} embedded />
        </Section>

        <Section aria-labelledby="replay-v2-preview-title">
          <h2 id="replay-v2-preview-title" className="text-lg font-semibold">Replay V2 composition</h2>
          <p className="text-sm text-[var(--qt-color-warning)]">Synthetic preview: partial coverage, stale source, missing orderbook, manual AggTrade, unavailable reasoning, missing Repository identity, long timeline content, and narrow layout.</p>
          <ReplayV2View model={syntheticReplayModel} actions={previewReplayActions} embedded />
        </Section>

        <Section aria-labelledby="research-v2-preview-title">
          <h2 id="research-v2-preview-title" className="text-lg font-semibold">Research V2 composition</h2>
          <p className="text-sm text-[var(--qt-color-warning)]">Synthetic preview: structured evidence, secondary context, strict primary-source gate, counter evidence, unavailable reasoning and graph, unknown prediction freshness, stale projection, selected case, missing Repository identity, long text, and narrow layout.</p>
          <ResearchV2View model={previewResearchModel} actions={previewResearchActions} embedded />
        </Section>

        <Section aria-labelledby="markets-v2-preview-title">
          <h2 id="markets-v2-preview-title" className="text-lg font-semibold">Markets V2 composition</h2>
          <p className="text-sm text-[var(--qt-color-warning)]">Synthetic preview: factual summary, unavailable regime, readiness separated from freshness, qualified sector model, partial coverage, factual ETF flow, reserve balance without flow substitution, fallback provenance, unavailable funding and liquidations, unavailable Macro and Prediction Markets, bounded breadth heuristic, missing constituents, secondary Movers, unavailable Repository, long labels, and 393px composition.</p>
          <MarketsV2View model={previewMarketsModel} actions={previewMarketsActions} embedded />
        </Section>

        <Section aria-labelledby="scanner-v2-preview-title">
          <h2 id="scanner-v2-preview-title" className="text-lg font-semibold">Scanner V2 composition</h2>
          <p className="text-sm text-[var(--qt-color-warning)]">Synthetic preview: source-model and heuristic candidates, disclosed score basis, unavailable confidence and counter evidence, missing direction, retained payload failure, aging separate from freshness, structured observations, context-only identity, symbol-only Replay, unavailable Repository, optional Trade planning, long text, and 393px composition.</p>
          <ScannerV2View model={previewScannerModel} onOpenHandoff={() => undefined} embedded />
        </Section>

        <Section aria-labelledby="trade-v2-preview-title">
          <h2 id="trade-v2-preview-title" className="text-lg font-semibold">Trade V2 / Decision Workspace composition</h2>
          <p className="text-sm text-[var(--qt-color-warning)]">Synthetic preview: planning-only boundary, selected context, Replay context, structured observations, separated model explanation, unavailable Counter Evidence and Scenarios, partial risk, source-model planning levels, local planning record, missing durable identity, unavailable Repository, long text, and 393px composition.</p>
          <TradeV2View model={previewTradeModel} actions={previewTradeActions} embedded />
        </Section>
      </Stack>
    </main>
  )
}
