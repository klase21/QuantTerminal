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
      </Stack>
    </main>
  )
}
