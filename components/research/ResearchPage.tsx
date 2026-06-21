"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  Database,
  History,
  Landmark,
  Newspaper,
  PieChart,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react"

import type {
  HistoricalAnalogCachePayloadV2,
  HistoricalAnalogCase,
  HistoricalAnalogHorizon,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
import type { EventImpactResult } from "@/core/event-impact"
import type { MarketMemory } from "@/core/market-memory"
import type { EvidenceValidity } from "@/core/evidence-validity"
import {
  buildDecisionBrief,
  type DecisionBriefEvidenceSource,
} from "@/core/decision-brief"
import { useSafePolling } from "@/hooks/system/useSafePolling"
import {
  buildInvestigationHref,
  createInvestigationContext,
  readInvestigationContext,
  toHistoricalTimeframe,
} from "@/lib/investigation/context"
import { withInvestigationThesisView } from "@/lib/investigation/thesis"
import { safeFetchJson } from "@/lib/runtime/safeFetch"

type NarrativeResponse = {
  updatedAt?: number
  heatmap?: Array<{ narrative: string; total: number }>
  topNarratives?: string[]
}

type PredictionResponse = {
  status?: string
  markets?: Array<{
    title: string
    probability: number | null
    volume: number | null
    liquidity: number | null
    category: string
    attentionRank: number
  }>
}

type MacroResponse = {
  updatedAt?: number
  items?: Array<{ symbol?: string; change?: string; signal?: string; tone?: string; updatedAt?: number }>
}

type HistoricalAnalogResponse = Partial<HistoricalAnalogCachePayloadV2> & {
  ok: boolean
  status: "available" | "unavailable"
  reason?: string
  diagnostics?: {
    cacheStatus: string
    generatedAt: string | null
    source: string | null
    schemaVersion: string | null
    analogCount: number
    validity?: EvidenceValidity | null
  }
  validity?: EvidenceValidity
}

type MarketMemoryResponse = {
  ok: boolean
  status: "available" | "unavailable"
  reason?: string
  generatedAt: string | null
  memories: MarketMemory[]
  validity?: EvidenceValidity
}

const HORIZONS: HistoricalAnalogHorizon[] = ["1h", "4h", "24h", "7d"]

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function Card({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-zinc-900 bg-zinc-950/80 p-3", className)}>
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded border border-zinc-900 bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
      <span className="text-zinc-300">{title}</span>
      <span className="ml-2 text-zinc-600">Reason: {reason}</span>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded border border-zinc-900 bg-black/45 p-2">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className={cn("mt-1 text-sm font-black uppercase text-white", tone)}>{value}</div>
    </div>
  )
}

function pct(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`
}

function compactUsd(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function heatState(total: number) {
  if (total >= 200) return "Very Hot"
  if (total >= 120) return "Hot"
  if (total >= 40) return "Neutral"
  return "Quiet"
}

function dateTime(value?: number | string | null) {
  if (value === null || value === undefined) return "NO DATA"
  const timestamp = typeof value === "number" ? value : Date.parse(value)
  if (!Number.isFinite(timestamp)) return "NO DATA"
  return new Date(timestamp).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function time(value?: number) {
  if (!value) return "NO DATA"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

function attentionLabel(market: PredictionResponse["markets"][number] | undefined) {
  if (!market) return "Unavailable"
  if ((market.volume ?? 0) >= 1_000_000 || (market.liquidity ?? 0) >= 1_000_000) return "High Attention"
  if ((market.volume ?? 0) >= 100_000 || (market.liquidity ?? 0) >= 100_000) return "Active"
  return "Developing"
}

function outcomeTone(value: number | null | undefined) {
  if (value === null || value === undefined) return "text-zinc-500"
  return value > 0 ? "text-emerald-200" : value < 0 ? "text-rose-200" : "text-zinc-200"
}

function replayContextForCase(
  context: ReturnType<typeof readInvestigationContext>,
  selectedCase: HistoricalAnalogCase,
  source: string,
) {
  const caseDate = new Date(selectedCase.state.timestamp)
  const timestamp = caseDate.toISOString()
  return {
    ...context,
    symbol: selectedCase.state.symbol,
    timeframe: selectedCase.state.interval,
    investigationType: "historical_case" as const,
    source: "research",
    thesis: withInvestigationThesisView(context.thesis, "replay"),
    selectedHistoricalCase: {
      id: selectedCase.state.id,
      symbol: selectedCase.state.symbol,
      timeframe: selectedCase.state.interval,
      timestamp,
      source,
      exchange: context.exchange,
    },
    selectedReplayWindow: {
      exchange: context.exchange,
      symbol: selectedCase.state.symbol,
      date: timestamp.slice(0, 10),
      hour: String(caseDate.getUTCHours()),
    },
  }
}

export default function ResearchPage() {
  const searchParams = useSearchParams()
  const investigationContext = readInvestigationContext(
    searchParams,
    createInvestigationContext({
      symbol: "BTCUSDT",
      exchange: "binance_futures",
      timeframe: "1h",
      investigationType: "market_state",
      source: "research",
    }),
  )
  const historicalTimeframe = toHistoricalTimeframe(investigationContext.timeframe)
  const narratives = useSafePolling<NarrativeResponse>("/api/narratives?range=24h", 60000, { label: "research-narratives", timeoutMs: 12000, retries: 1 })
  const predictions = useSafePolling<PredictionResponse>("/api/research/prediction-markets", 60000, { label: "research-predictions", timeoutMs: 12000, retries: 1 })
  const macro = useSafePolling<MacroResponse>("/api/macro", 60000, { label: "research-macro", timeoutMs: 12000, retries: 1 })
  const [historical, setHistorical] = useState<HistoricalAnalogResponse | null>(null)
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [historicalError, setHistoricalError] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [eventImpact, setEventImpact] = useState<EventImpactResult | null>(null)
  const [eventImpactLoading, setEventImpactLoading] = useState(false)
  const [eventImpactError, setEventImpactError] = useState<string | null>(null)
  const [marketMemory, setMarketMemory] = useState<MarketMemoryResponse | null>(null)
  const [marketMemoryLoading, setMarketMemoryLoading] = useState(false)
  const [marketMemoryError, setMarketMemoryError] = useState<string | null>(null)
  const historicalController = useRef<AbortController | null>(null)
  const eventImpactController = useRef<AbortController | null>(null)
  const marketMemoryController = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      historicalController.current?.abort()
      eventImpactController.current?.abort()
      marketMemoryController.current?.abort()
    }
  }, [])

  useEffect(() => {
    historicalController.current?.abort()
    historicalController.current = null
    setHistorical(null)
    setHistoricalError(null)
    setHistoricalLoading(false)
    setSelectedCaseId(null)
  }, [investigationContext.symbol, historicalTimeframe])

  useEffect(() => {
    eventImpactController.current?.abort()
    eventImpactController.current = null
    setEventImpact(null)
    setEventImpactError(null)
    setEventImpactLoading(false)
  }, [
    investigationContext.exchange,
    investigationContext.selectedEvent?.category,
    investigationContext.selectedEvent?.id,
    investigationContext.symbol,
  ])

  useEffect(() => {
    marketMemoryController.current?.abort()
    marketMemoryController.current = null
    setMarketMemory(null)
    setMarketMemoryError(null)
    setMarketMemoryLoading(false)
  }, [investigationContext.exchange, investigationContext.symbol, investigationContext.timeframe])

  async function loadHistoricalIntelligence() {
    historicalController.current?.abort()
    const controller = new AbortController()
    historicalController.current = controller
    setHistoricalLoading(true)
    setHistoricalError(null)
    const query = new URLSearchParams({
      symbol: investigationContext.symbol,
      interval: historicalTimeframe,
    })
    const result = await safeFetchJson<HistoricalAnalogResponse>(`/api/historical-analog?${query.toString()}`, {
      signal: controller.signal,
      timeoutMs: 8000,
      retries: 0,
      label: "research-historical-analog-v2",
      cache: "no-store",
    })
    if (controller.signal.aborted) return
    setHistoricalLoading(false)
    if (!result.ok) {
      setHistoricalError(result.error)
      return
    }
    setHistorical(result.data)
    const requestedCase = investigationContext.selectedHistoricalCase?.id
    const nextCase = result.data.cases?.find((item) => item.state.id === requestedCase)
      ?? result.data.cases?.[0]
      ?? null
    setSelectedCaseId(nextCase?.state.id ?? null)
  }

  async function loadEventImpact() {
    eventImpactController.current?.abort()
    const controller = new AbortController()
    eventImpactController.current = controller
    setEventImpactLoading(true)
    setEventImpactError(null)
    const query = new URLSearchParams({
      symbol: investigationContext.symbol,
      exchange: investigationContext.exchange,
    })
    if (investigationContext.selectedEvent?.id) {
      query.set("eventId", investigationContext.selectedEvent.id)
    } else {
      query.set("category", investigationContext.selectedEvent?.category ?? "macro")
    }
    const result = await safeFetchJson<EventImpactResult>(`/api/event-impact?${query.toString()}`, {
      signal: controller.signal,
      timeoutMs: 8000,
      retries: 0,
      label: "research-event-impact-v1",
      cache: "no-store",
    })
    if (controller.signal.aborted) return
    setEventImpactLoading(false)
    if (!result.ok) {
      setEventImpactError(result.error)
      return
    }
    setEventImpact(result.data)
  }

  async function loadMarketMemory() {
    marketMemoryController.current?.abort()
    const controller = new AbortController()
    marketMemoryController.current = controller
    setMarketMemoryLoading(true)
    setMarketMemoryError(null)
    const query = new URLSearchParams({ symbol: investigationContext.symbol })
    const result = await safeFetchJson<MarketMemoryResponse>(`/api/research/market-memory?${query.toString()}`, {
      signal: controller.signal,
      timeoutMs: 5000,
      retries: 0,
      label: "research-market-memory-v1",
      cache: "no-store",
    })
    if (controller.signal.aborted) return
    setMarketMemoryLoading(false)
    if (!result.ok) {
      setMarketMemoryError(result.error)
      return
    }
    setMarketMemory(result.data)
  }

  const topNarratives = narratives.data?.heatmap?.slice(0, 8) ?? []
  const predictionMarkets = predictions.data?.markets?.slice(0, 5) ?? []
  const informationItems = [
    ...(macro.data?.items?.slice(0, 3).map((item) => ({
      label: `${item.symbol ?? "MACRO"} ${item.change ?? ""}`.trim(),
      tag: item.signal ?? item.tone ?? "MACRO",
      time: time(item.updatedAt ?? macro.data?.updatedAt),
    })) ?? []),
    ...(narratives.data?.topNarratives?.slice(0, 3).map((item) => ({
      label: `${item} Heat`,
      tag: "NARRATIVE",
      time: time(narratives.data?.updatedAt),
    })) ?? []),
  ]
  const cases = historical?.cases ?? []
  const selectedCase = cases.find((item) => item.state.id === selectedCaseId) ?? cases[0] ?? null
  const statistics = historical?.statistics
  const currentState = historical?.currentState
  const summaryHorizon = statistics?.byHorizon["24h"]
  const source = historical?.diagnostics?.source ?? historical?.source ?? "historical-analog-v2"
  const replayHref = selectedCase
    ? buildInvestigationHref("/replay", replayContextForCase(investigationContext, selectedCase, source))
    : null
  const explorerHref = buildInvestigationHref("/historical-intelligence", {
    ...investigationContext,
    timeframe: historicalTimeframe,
    investigationType: selectedCase ? "historical_case" : "historical_analog",
    source: "research",
    thesis: withInvestigationThesisView(investigationContext.thesis, "historical-intelligence"),
    selectedHistoricalCase: selectedCase
      ? replayContextForCase(investigationContext, selectedCase, source).selectedHistoricalCase
      : undefined,
  })
  const eventImpact24h = eventImpact?.statistics.byHorizon["24h"]
  const memories = useMemo(() => marketMemory?.memories ?? [], [marketMemory])
  const decisionBrief = useMemo(() => {
    const thesis = investigationContext.thesis
    if (!thesis) return null
    const sources: DecisionBriefEvidenceSource[] = []
    if (historical?.validity) {
      sources.push({
        artifactId: historical.contradiction?.sourceArtifactIds[0]
          ?? `historical-analog:${investigationContext.symbol}:${historicalTimeframe}`,
        validity: historical.validity,
        contradiction: historical.contradiction,
      })
    }
    if (eventImpact?.validity) {
      sources.push({
        artifactId: eventImpact.contradiction?.sourceArtifactIds[0]
          ?? `event-impact:${eventImpact.query.category ?? "unknown"}:${investigationContext.exchange}:${investigationContext.symbol}`,
        validity: eventImpact.validity,
        contradiction: eventImpact.contradiction,
      })
    }
    for (const memory of memories) {
      sources.push({
        artifactId: `market-memory:${memory.memoryId}`,
        validity: memory.validity,
        contradiction: memory.contradiction,
      })
    }
    const generatedAt = [
      thesis.updatedAt,
      historical?.diagnostics?.generatedAt,
      eventImpact?.source.generatedAt,
      ...memories.map((memory) => memory.generatedAt),
    ].filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)
      ?? thesis.updatedAt
    return buildDecisionBrief({ thesis, sources, generatedAt })
  }, [
    eventImpact,
    historical,
    historicalTimeframe,
    investigationContext.exchange,
    investigationContext.symbol,
    investigationContext.thesis,
    memories,
  ])

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <Card title="Current State" icon={<Activity className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <Metric label="Symbol" value={investigationContext.symbol} />
            <Metric label="Exchange" value={investigationContext.exchange.replaceAll("_", " ")} />
            <Metric label="Timeframe" value={investigationContext.timeframe} />
            <Metric label="Investigation Time" value={dateTime(investigationContext.investigationTimestamp)} />
            <Metric label="Market Regime" value={currentState?.trendRegime ?? "Load historical context"} />
            <Metric label="State Return 24H" value={pct(currentState?.features.return24h)} tone={outcomeTone(currentState?.features.return24h)} />
          </div>
          {investigationContext.thesis ? (
            <div className="mt-2 grid gap-2 border-t border-zinc-900 pt-2 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)_180px]">
              <Metric label="Current Thesis" value={investigationContext.thesis.title} />
              <Metric label="Current Question" value={investigationContext.thesis.question} />
              <Metric label="Decision Horizon" value={investigationContext.thesis.decisionHorizon} />
            </div>
          ) : null}
        </Card>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_440px]">
          <Card title="Narrative Context" icon={<Newspaper className="h-3.5 w-3.5" />}>
            {topNarratives.length ? (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {topNarratives.map((item) => (
                  <div key={item.narrative} className="rounded border border-zinc-900 bg-black/45 p-2">
                    <div className="text-sm font-black uppercase text-white">{item.narrative}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">{heatState(item.total)}</div>
                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{Math.round(item.total).toLocaleString()} articles</div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Unavailable" reason={narratives.error ?? "Narrative heatmap returned no tagged items."} />}
          </Card>

          <Card title="Prediction Markets" icon={<PieChart className="h-3.5 w-3.5" />}>
            {predictionMarkets.length ? (
              <div className="grid gap-1.5">
                {predictionMarkets.map((market) => (
                  <div key={`${market.attentionRank}-${market.title}`} className="grid grid-cols-[1fr_auto] gap-2 rounded border border-zinc-900 bg-black/45 p-2">
                    <div>
                      <div className="text-xs font-black uppercase text-white">{market.title}</div>
                      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        {attentionLabel(market)} / {compactUsd(market.volume ?? market.liquidity)}
                      </div>
                    </div>
                    <div className="text-lg font-black text-emerald-100">{market.probability === null ? "NO DATA" : `${Math.round(market.probability)}%`}</div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Unavailable" reason={predictions.data?.status ?? predictions.error ?? "No attention markets available."} />}
          </Card>
        </div>

        <Card title="Historical Analog Summary" icon={<History className="h-3.5 w-3.5" />}>
          {!historical ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <EmptyState
                title="Manual Load Required"
                reason={historicalError ?? `Read cached ${investigationContext.symbol} / ${historicalTimeframe} intelligence when needed.`}
              />
              <button
                type="button"
                onClick={() => void loadHistoricalIntelligence()}
                disabled={historicalLoading}
                className="rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 disabled:cursor-wait disabled:opacity-50"
              >
                {historicalLoading ? "Reading Cached Intelligence" : "Load Historical Intelligence"}
              </button>
            </div>
          ) : historical.status !== "available" || !statistics ? (
            <EmptyState title="Historical Intelligence Unavailable" reason={historical.reason ?? historical.diagnostics?.cacheStatus ?? "cache unavailable"} />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Similar Cases" value={String(statistics.totalCases)} />
              <Metric label="24H Average Return" value={pct(summaryHorizon?.averageReturn)} tone={outcomeTone(summaryHorizon?.averageReturn)} />
              <Metric label="24H Win Rate" value={pct(summaryHorizon?.winRate)} />
              <Metric label="Best Case" value={pct(summaryHorizon?.bestCase?.return)} tone="text-emerald-200" />
              <Metric label="Worst Case" value={pct(summaryHorizon?.worstCase?.return)} tone="text-rose-200" />
              <Metric label="Supporting Evidence" value={String(historical.contradiction?.supportingEvidence.length ?? 0)} />
              <Metric label="Contradicting Evidence" value={String(historical.contradiction?.contradictingEvidence.length ?? 0)} />
            </div>
          )}
        </Card>

        {historical?.status === "available" && statistics ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
            <Card title="Selected Analog Cases" icon={<BarChart3 className="h-3.5 w-3.5" />}>
              {cases.length ? (
                <div className="grid gap-1.5">
                  {cases.slice(0, 8).map((item, index) => {
                    const selected = item.state.id === selectedCase?.state.id
                    return (
                      <button
                        type="button"
                        key={item.state.id}
                        onClick={() => setSelectedCaseId(item.state.id)}
                        className={cn(
                          "grid grid-cols-[32px_minmax(0,1fr)_80px_repeat(2,70px)] items-center gap-2 rounded border px-2 py-2 text-left",
                          selected ? "border-cyan-300/35 bg-cyan-400/10" : "border-zinc-900 bg-black/45 hover:bg-zinc-900/55",
                        )}
                      >
                        <span className="text-[9px] font-black text-zinc-600">#{index + 1}</span>
                        <span>
                          <span className="block text-xs font-black text-white">{dateTime(item.state.timestamp)}</span>
                          <span className="block text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{item.state.trendRegime} / {item.comparableFeatures} comparable features</span>
                        </span>
                        <span className="text-sm font-black text-cyan-200">{item.similarity.toFixed(1)}%</span>
                        <span className={cn("text-xs font-black", outcomeTone(item.outcome.returns["24h"]))}>{pct(item.outcome.returns["24h"])}</span>
                        <span className={cn("text-xs font-black", outcomeTone(item.outcome.returns["7d"]))}>{pct(item.outcome.returns["7d"])}</span>
                      </button>
                    )
                  })}
                </div>
              ) : <EmptyState title="Unavailable" reason="Valid cache contains no analog cases." />}
            </Card>

            <Card title="Outcome Summary" icon={<Target className="h-3.5 w-3.5" />}>
              {selectedCase ? (
                <div className="grid gap-2">
                  <div className="rounded border border-zinc-900 bg-black/45 p-2">
                    <div className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">Selected Historical Case</div>
                    <div className="mt-1 text-sm font-black text-white">{dateTime(selectedCase.state.timestamp)}</div>
                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{selectedCase.similarity.toFixed(1)}% similarity</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {HORIZONS.map((horizon) => (
                      <Metric
                        key={horizon}
                        label={`${horizon} Outcome`}
                        value={pct(selectedCase.outcome.returns[horizon])}
                        tone={outcomeTone(selectedCase.outcome.returns[horizon])}
                      />
                    ))}
                  </div>
                  <div className="rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                    Dominant outcome: <span className="text-amber-200">{statistics.dominantOutcome}</span>
                  </div>
                </div>
              ) : <EmptyState title="Unavailable" reason="No cached case selected." />}
            </Card>
          </div>
        ) : null}

        <Card title="Event Impact" icon={<Landmark className="h-3.5 w-3.5" />}>
          {eventImpact?.status === "available" && eventImpact24h?.sampleCount ? (
            <div className="grid gap-3 xl:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)_320px]">
              <div className="rounded border border-zinc-900 bg-black/45 p-3">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">Verified Event Sample</div>
                <div className="mt-1 text-sm font-black uppercase text-white">{eventImpact.events[0]?.title ?? eventImpact.query.category}</div>
                <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">
                  {eventImpact.events.length} verified events / {eventImpact.sampleCount} market observations
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                <Metric label="24H Average" value={pct(eventImpact24h.averageReturn)} tone={outcomeTone(eventImpact24h.averageReturn)} />
                <Metric label="24H Median" value={pct(eventImpact24h.medianReturn)} tone={outcomeTone(eventImpact24h.medianReturn)} />
                <Metric label="Win Rate" value={pct(eventImpact24h.winRate)} />
                <Metric label="Best Case" value={pct(eventImpact24h.bestCase?.return)} tone="text-emerald-200" />
                <Metric label="Worst Case" value={pct(eventImpact24h.worstCase?.return)} tone="text-rose-200" />
              </div>
              <div className="grid gap-1.5">
                <Metric
                  label="Source"
                  value={[eventImpact.source.eventCatalog, ...eventImpact.source.marketData].filter(Boolean).join(" / ") || "NO DATA"}
                />
                <Metric label="Generated" value={dateTime(eventImpact.source.generatedAt)} />
                <Metric label="Observed" value={dateTime(eventImpact.validity?.observedAt)} />
                <Metric
                  label="Validity"
                  value={`${eventImpact.validity?.freshnessStatus ?? "UNKNOWN"} / ${eventImpact.validity?.coverageStatus ?? "UNKNOWN"}`}
                />
                <Metric label="Event Count" value={String(eventImpact.events.length)} />
                <Metric label="Supporting Evidence" value={String(eventImpact.contradiction?.supportingEvidence.length ?? 0)} />
                <Metric label="Contradicting Evidence" value={String(eventImpact.contradiction?.contradictingEvidence.length ?? 0)} />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <EmptyState
                title={eventImpact ? "Event Impact Unavailable" : "Manual Load Required"}
                reason={eventImpact?.reason ?? eventImpactError ?? "Read verified event outcomes from canonical OHLCV when needed."}
              />
              <button
                type="button"
                onClick={() => void loadEventImpact()}
                disabled={eventImpactLoading}
                className="rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 disabled:cursor-wait disabled:opacity-50"
              >
                {eventImpactLoading ? "Reading Event Outcomes" : "Load Event Impact"}
              </button>
            </div>
          )}
        </Card>

        <Card title="Market Memory" icon={<Brain className="h-3.5 w-3.5" />}>
          {memories.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {memories.slice(0, 6).map((memory) => (
                <div key={memory.memoryId} className="rounded border border-zinc-900 bg-black/45 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-black uppercase text-white">{memory.title}</div>
                    <div className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{memory.memoryType}</div>
                  </div>
                  <div className="mt-2 text-[10px] font-bold leading-5 text-zinc-400">{memory.summary}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-zinc-900 pt-2 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">
                    <span>{memory.supportingArtifacts.length} supporting artifacts</span>
                    <span>{dateTime(memory.generatedAt)}</span>
                    <span>{memory.validity.freshnessStatus} / {memory.validity.coverageStatus}</span>
                    <span>{memory.contradiction?.supportingEvidence.length ?? 0} support / {memory.contradiction?.contradictingEvidence.length ?? 0} contradict</span>
                  </div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">
                    Sources: {memory.supportingArtifacts.map((artifact) => artifact.artifactId).join(" / ")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <EmptyState
                title={marketMemory ? "Market Memory Unavailable" : "Manual Load Required"}
                reason={marketMemory?.reason ?? marketMemoryError ?? "Read evidence-backed memories from the artifact catalog when needed."}
              />
              <button
                type="button"
                onClick={() => void loadMarketMemory()}
                disabled={marketMemoryLoading}
                className="rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 disabled:cursor-wait disabled:opacity-50"
              >
                {marketMemoryLoading ? "Reading Market Memory" : "Load Market Memory"}
              </button>
            </div>
          )}
        </Card>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card title="Replay Access" icon={<Play className="h-3.5 w-3.5" />}>
            {selectedCase && replayHref ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase text-white">{selectedCase.state.symbol} / {dateTime(selectedCase.state.timestamp)}</div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                    Replay inherits exchange, symbol, timeframe, date, hour, and selected case. Loading remains manual.
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={explorerHref} className="rounded border border-zinc-800 bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                    Open Full Explorer
                  </Link>
                  <Link href={replayHref} className="rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    Open Replay
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState title="Replay Coordinates Required" reason="Load Historical Intelligence and select a cached case first." />
            )}
          </Card>

          <Card title="Evidence" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
            {historical ? (
              <div className="grid gap-1.5">
                <Metric label="Source" value={source} />
                <Metric label="Generated" value={dateTime(historical.diagnostics?.generatedAt)} />
                <Metric label="Observed" value={dateTime(historical.validity?.observedAt)} />
                <Metric
                  label="Validity"
                  value={`${historical.validity?.freshnessStatus ?? "UNKNOWN"} / ${historical.validity?.coverageStatus ?? "UNKNOWN"}`}
                />
                <Metric label="Cache Status" value={historical.diagnostics?.cacheStatus ?? "UNAVAILABLE"} />
                <Metric label="Schema Version" value={historical.diagnostics?.schemaVersion ?? "NO DATA"} />
              </div>
            ) : <EmptyState title="Evidence Pending" reason="Historical cache has not been requested." />}
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card title="Information Flow" icon={<Sparkles className="h-3.5 w-3.5" />}>
            {informationItems.length ? (
              <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                {informationItems.map((item) => (
                  <div key={`${item.time}-${item.label}-${item.tag}`} className="flex items-center justify-between gap-2 rounded border border-zinc-900 bg-black/45 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.1em]">
                    <span className="text-zinc-500">{item.time}</span>
                    <span className="text-white">{item.label}</span>
                    <span className="text-cyan-100">{item.tag}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Unavailable" reason="Macro and narrative flow returned no current items." />}
          </Card>

          <Card title="Investigation Status" icon={<Brain className="h-3.5 w-3.5" />}>
            <div className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]">
              <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">Subject: {investigationContext.symbol} / {investigationContext.timeframe}</div>
              <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">Narrative: {topNarratives[0]?.narrative ?? "Unavailable"}</div>
              <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">Market Attention: {predictionMarkets[0]?.title ?? "Unavailable"}</div>
              <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">Historical Evidence: {statistics ? `${statistics.totalCases} cached cases` : "Manual load required"}</div>
              {decisionBrief ? (
                <>
                  <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">
                    Decision Brief: {decisionBrief.currentView.replaceAll("_", " ")}
                  </div>
                  <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">
                    Evidence: {decisionBrief.supportingEvidenceCount} supporting / {decisionBrief.contradictingEvidenceCount} contradicting
                  </div>
                  <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">
                    Key Support: {decisionBrief.keySupportingFactors[0] ?? "NO DATA"}
                  </div>
                  <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">
                    Key Contradiction: {decisionBrief.keyContradictingFactors[0] ?? "NO DATA"}
                  </div>
                  <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">
                    Next Validation: {decisionBrief.requiredNextValidation[0] ?? "No additional validation identified."}
                  </div>
                </>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
