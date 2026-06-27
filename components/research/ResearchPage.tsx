"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import {
  createResearchToReplayContext,
  inspectContextCandidate,
  loadProductContext,
  saveProductContext,
  type JsonObject,
  type ProductContextFreshness,
  type SharedProductContextV1,
} from "@/lib/product-context"
import { safeFetchJson } from "@/lib/runtime/safeFetch"

const RESEARCH_REPLAY_CONTEXT_TTL_MS = 30 * 60 * 1000

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

type InheritedScannerContextState = {
  label: "LOADING" | "CURRENT" | "PARTIAL" | "STALE" | "DEGRADED" | "MISSING" | "UNAVAILABLE"
  tone: "good" | "warn" | "bad" | "neutral"
  detail: string
  context: SharedProductContextV1 | null
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

function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]",
        tone === "good" && "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        tone === "warn" && "border-amber-400/25 bg-amber-400/10 text-amber-200",
        tone === "bad" && "border-rose-400/25 bg-rose-400/10 text-rose-200",
        tone === "neutral" && "border-zinc-800 bg-black/45 text-zinc-400",
      )}
    >
      {children}
    </span>
  )
}

function evidenceText(item: unknown) {
  if (typeof item === "string") return item
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>
    const value = record.summary ?? record.reason ?? record.title ?? record.description ?? record.evidence ?? record.label
    if (typeof value === "string") return value
    if (value !== undefined && value !== null) return String(value)
  }
  return "NO DATA"
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

function productContextFreshness(status?: string | null): ProductContextFreshness {
  if (status === "VALID" || status === "CURRENT") return "CURRENT"
  if (status === "STALE" || status === "EXPIRED") return "STALE"
  if (status === "MISSING") return "MISSING"
  if (status === "UNAVAILABLE") return "UNAVAILABLE"
  return "UNKNOWN"
}

function scannerContextString(value: JsonObject | undefined, field: string) {
  const candidate = value?.[field]
  return typeof candidate === "string" ? candidate : null
}

function researchReplayContextId(caseId: string, createdAt: Date) {
  const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${createdAt.getTime()}-${caseId}`
  return `research-replay-${suffix}`
}

function appendProductContextId(href: string, contextId: string) {
  const [pathname, query = ""] = href.split("?", 2)
  const params = new URLSearchParams(query)
  params.set("contextId", contextId)
  return `${pathname}?${params.toString()}`
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const productContextId = searchParams.get("contextId")?.trim() || null
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
  const [inheritedScannerContext, setInheritedScannerContext] = useState<InheritedScannerContextState>({
    label: productContextId ? "LOADING" : "MISSING",
    tone: productContextId ? "neutral" : "neutral",
    detail: productContextId
      ? "Loading inherited Scanner context."
      : "No shared contextId supplied. Direct Research remains available.",
    context: null,
  })
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
    if (!productContextId) {
      setInheritedScannerContext({
        label: "MISSING",
        tone: "neutral",
        detail: "No shared contextId supplied. Direct Research remains available.",
        context: null,
      })
      return
    }

    setInheritedScannerContext({
      label: "LOADING",
      tone: "neutral",
      detail: "Loading inherited Scanner context.",
      context: null,
    })
    const loaded = loadProductContext(productContextId)
    if (loaded.success === false) {
      setInheritedScannerContext({
        label: "UNAVAILABLE",
        tone: "bad",
        detail: loaded.error.message,
        context: null,
      })
      return
    }
    const lifecycle = inspectContextCandidate(loaded.value)
    if (lifecycle.status !== "SUCCESS" || !lifecycle.value) {
      setInheritedScannerContext({
        label: "UNAVAILABLE",
        tone: "bad",
        detail: lifecycle.issues[0]?.message ?? "Shared Scanner context is not active.",
        context: null,
      })
      return
    }
    if (lifecycle.value.sourcePage !== "scanner" || lifecycle.value.destinationIntent !== "evaluate_thesis") {
      setInheritedScannerContext({
        label: "DEGRADED",
        tone: "warn",
        detail: "Shared context does not describe a Scanner to Research handoff.",
        context: null,
      })
      return
    }

    const hasOpportunity = Boolean(lifecycle.value.opportunityContext)
    const hasSignal = Boolean(lifecycle.value.signalContext)
    const inheritedFreshness = lifecycle.value.freshness?.freshness
    const label = inheritedFreshness === "STALE"
      ? "STALE" as const
      : hasOpportunity && hasSignal
        ? "CURRENT" as const
        : "PARTIAL" as const
    setInheritedScannerContext({
      label,
      tone: label === "CURRENT" ? "good" : "warn",
      detail: "Scanner opportunity and signal context loaded for display only. Research evidence remains independent.",
      context: lifecycle.value,
    })
  }, [productContextId])

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
  const supportingEvidence = [
    ...(decisionBrief?.keySupportingFactors.slice(0, 4).map((item) => ({
      source: "Decision Brief",
      detail: item,
      status: decisionBrief.freshnessStatus,
    })) ?? []),
    ...(historical?.contradiction?.supportingEvidence.slice(0, 3).map((item) => ({
      source: "Historical Analog",
      detail: evidenceText(item),
      status: historical.validity?.freshnessStatus ?? "UNKNOWN",
    })) ?? []),
    ...(eventImpact?.contradiction?.supportingEvidence.slice(0, 3).map((item) => ({
      source: "Event Impact",
      detail: evidenceText(item),
      status: eventImpact.validity?.freshnessStatus ?? "UNKNOWN",
    })) ?? []),
    ...memories.flatMap((memory) => (
      memory.contradiction?.supportingEvidence.slice(0, 2).map((item) => ({
        source: `Market Memory / ${memory.memoryType}`,
        detail: evidenceText(item),
        status: memory.validity.freshnessStatus,
      })) ?? []
    )),
  ]
  const conflictingEvidence = [
    ...(decisionBrief?.keyContradictingFactors.slice(0, 4).map((item) => ({
      source: "Decision Brief",
      detail: item,
      status: decisionBrief.freshnessStatus,
    })) ?? []),
    ...(historical?.contradiction?.contradictingEvidence.slice(0, 3).map((item) => ({
      source: "Historical Analog",
      detail: evidenceText(item),
      status: historical.validity?.freshnessStatus ?? "UNKNOWN",
    })) ?? []),
    ...(eventImpact?.contradiction?.contradictingEvidence.slice(0, 3).map((item) => ({
      source: "Event Impact",
      detail: evidenceText(item),
      status: eventImpact.validity?.freshnessStatus ?? "UNKNOWN",
    })) ?? []),
    ...memories.flatMap((memory) => (
      memory.contradiction?.contradictingEvidence.slice(0, 2).map((item) => ({
        source: `Market Memory / ${memory.memoryType}`,
        detail: evidenceText(item),
        status: memory.validity.freshnessStatus,
      })) ?? []
    )),
  ]
  const sourceRows = [
    {
      source: "Narrative Context",
      freshness: narratives.data?.updatedAt ? "CURRENT" : "UNAVAILABLE",
      coverage: topNarratives.length ? "PARTIAL" : "UNAVAILABLE",
      generated: dateTime(narratives.data?.updatedAt),
      reason: topNarratives.length ? "Tagged narrative items available." : (narratives.error ?? "Narrative heatmap returned no tagged items."),
    },
    {
      source: "Prediction Markets",
      freshness: predictions.data?.status === "available" ? "CURRENT" : "UNAVAILABLE",
      coverage: predictionMarkets.length ? "PARTIAL" : "UNAVAILABLE",
      generated: "NO DATA",
      reason: predictionMarkets.length ? "Attention markets available." : (predictions.error ?? "No attention markets available."),
    },
    {
      source: "Historical Analog",
      freshness: historical?.validity?.freshnessStatus ?? "UNKNOWN",
      coverage: historical?.validity?.coverageStatus ?? "UNAVAILABLE",
      generated: dateTime(historical?.diagnostics?.generatedAt),
      reason: historical ? (historical.reason ?? historical.diagnostics?.cacheStatus ?? "ready") : "Manual load required.",
    },
    {
      source: "Event Impact",
      freshness: eventImpact?.validity?.freshnessStatus ?? "UNKNOWN",
      coverage: eventImpact?.validity?.coverageStatus ?? "UNAVAILABLE",
      generated: dateTime(eventImpact?.source.generatedAt),
      reason: eventImpact ? (eventImpact.reason ?? "Verified event outcomes available.") : "Manual load required.",
    },
    {
      source: "Market Memory",
      freshness: marketMemory?.validity?.freshnessStatus ?? "UNKNOWN",
      coverage: marketMemory?.validity?.coverageStatus ?? "UNAVAILABLE",
      generated: dateTime(marketMemory?.generatedAt),
      reason: marketMemory ? (marketMemory.reason ?? `${memories.length} memories available.`) : "Manual load required.",
    },
    {
      source: "Macro Flow",
      freshness: macro.data?.updatedAt ? "CURRENT" : "UNAVAILABLE",
      coverage: informationItems.length ? "PARTIAL" : "UNAVAILABLE",
      generated: dateTime(macro.data?.updatedAt),
      reason: informationItems.length ? "Macro or narrative flow items available." : (macro.error ?? "Macro and narrative flow returned no current items."),
    },
  ]
  const marketsHref = buildInvestigationHref("/markets", {
    ...investigationContext,
    source: "research",
    thesis: withInvestigationThesisView(investigationContext.thesis, "markets"),
  })
  const tradeHref = buildInvestigationHref("/trade", {
    ...investigationContext,
    source: "research",
    thesis: withInvestigationThesisView(investigationContext.thesis, "trade"),
  })
  const inheritedScanner = inheritedScannerContext.context
  const inheritedOpportunity = inheritedScanner?.opportunityContext
    ? scannerContextString(inheritedScanner.opportunityContext.value, "setup") ?? "AVAILABLE"
    : "UNAVAILABLE"
  const inheritedSignal = inheritedScanner?.signalContext
    ? scannerContextString(inheritedScanner.signalContext.value, "reason") ?? "AVAILABLE"
    : "UNAVAILABLE"
  const inheritedStructure = inheritedScanner?.marketStructureContext ? "AVAILABLE" : "UNAVAILABLE"
  const inheritedFreshness = inheritedScanner?.freshness?.freshness ?? "UNKNOWN"

  function openReplayWithSharedContext() {
    if (!selectedCase || !replayHref) return

    const replayInvestigation = replayContextForCase(investigationContext, selectedCase, source)
    const createdAt = new Date()
    const createdAtIso = createdAt.toISOString()
    const caseTimestamp = new Date(selectedCase.state.timestamp).toISOString()
    const caseFreshness = productContextFreshness(historical?.validity?.freshnessStatus)
    const evidenceFreshness = productContextFreshness(
      decisionBrief?.freshnessStatus ?? historical?.validity?.freshnessStatus,
    )
    const thesis = investigationContext.thesis
      ? {
          value: {
            thesisVersion: investigationContext.thesis.thesisVersion,
            thesisId: investigationContext.thesis.thesisId,
            title: investigationContext.thesis.title,
            question: investigationContext.thesis.question,
            decisionHorizon: investigationContext.thesis.decisionHorizon,
            status: investigationContext.thesis.status,
            createdAt: investigationContext.thesis.createdAt,
            updatedAt: investigationContext.thesis.updatedAt,
            ...(investigationContext.thesis.hypothesis ? { hypothesis: investigationContext.thesis.hypothesis } : {}),
            ...(investigationContext.thesis.currentView ? { currentView: investigationContext.thesis.currentView } : {}),
            ...(investigationContext.thesis.tags?.length ? { tags: investigationContext.thesis.tags } : {}),
          },
          owner: "research" as const,
          source: investigationContext.source ?? "research",
          observedAt: investigationContext.thesis.updatedAt,
          freshness: "UNKNOWN" as const,
          revision: 1,
        }
      : undefined
    const evidenceSummary = decisionBrief
      ? {
          value: {
            decisionBriefId: decisionBrief.decisionBriefId,
            currentView: decisionBrief.currentView,
            freshnessStatus: decisionBrief.freshnessStatus,
            coverageStatus: decisionBrief.coverageStatus,
            supportingEvidenceCount: decisionBrief.supportingEvidenceCount,
            contradictingEvidenceCount: decisionBrief.contradictingEvidenceCount,
            sourceArtifactIds: decisionBrief.sourceArtifactIds,
          },
          owner: "research" as const,
          source: "decision-brief",
          generatedAt: decisionBrief.generatedAt,
          freshness: evidenceFreshness,
          revision: 1,
        }
      : undefined
    const supporting = supportingEvidence.length
      ? {
          value: supportingEvidence.map((item) => ({
            source: item.source,
            detail: item.detail,
            status: item.status,
          })),
          owner: "research" as const,
          source: "research-evidence",
          freshness: evidenceFreshness,
          revision: 1,
        }
      : undefined
    const conflicting = conflictingEvidence.length
      ? {
          value: conflictingEvidence.map((item) => ({
            source: item.source,
            detail: item.detail,
            status: item.status,
          })),
          owner: "research" as const,
          source: "research-evidence",
          freshness: evidenceFreshness,
          revision: 1,
        }
      : undefined
    const freshness = decisionBrief || historical?.validity
      ? {
          value: {
            status: decisionBrief?.freshnessStatus ?? historical?.validity?.freshnessStatus ?? "UNKNOWN",
            coverage: decisionBrief?.coverageStatus ?? historical?.validity?.coverageStatus ?? "UNKNOWN",
            ...(decisionBrief?.generatedAt ? { generatedAt: decisionBrief.generatedAt } : {}),
          },
          owner: "research" as const,
          source: decisionBrief ? "decision-brief" : source,
          generatedAt: decisionBrief?.generatedAt ?? historical?.diagnostics?.generatedAt ?? undefined,
          freshness: evidenceFreshness,
          revision: 1,
        }
      : undefined
    const handoff = createResearchToReplayContext({
      contextId: researchReplayContextId(selectedCase.state.id, createdAt),
      symbol: replayInvestigation.symbol,
      exchange: replayInvestigation.exchange,
      timeframe: replayInvestigation.timeframe,
      createdAt: createdAtIso,
      expiresAt: new Date(createdAt.getTime() + RESEARCH_REPLAY_CONTEXT_TTL_MS).toISOString(),
      thesis,
      evidenceSummary,
      supportingEvidence: supporting,
      conflictingEvidence: conflicting,
      freshness,
      replayTarget: {
        value: {
          caseId: selectedCase.state.id,
          symbol: selectedCase.state.symbol,
          exchange: replayInvestigation.exchange,
          timeframe: selectedCase.state.interval,
          timestamp: caseTimestamp,
          date: caseTimestamp.slice(0, 10),
          hour: String(new Date(caseTimestamp).getUTCHours()),
          source,
        },
        owner: "research",
        source,
        observedAt: caseTimestamp,
        generatedAt: historical?.diagnostics?.generatedAt ?? undefined,
        freshness: caseFreshness,
        revision: 1,
      },
    })

    if (handoff.success === true) {
      const saved = saveProductContext(handoff.value)
      if (saved.success === true) {
        router.push(appendProductContextId(replayHref, handoff.value.contextId))
        return
      }
    }

    router.push(replayHref)
  }

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <Card title="Research Summary" icon={<Search className="h-3.5 w-3.5" />} className="border-amber-500/20 bg-[#070d07]">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Active Investigation</div>
              <div className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                {investigationContext.thesis?.title ?? `${investigationContext.symbol} Market Thesis`}
              </div>
              <div className="mt-2 max-w-4xl text-xs font-bold uppercase leading-5 tracking-[0.08em] text-zinc-400">
                {investigationContext.thesis?.question ?? "No explicit thesis supplied. Research is using the selected market context as the investigation subject."}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge>{investigationContext.symbol}</StatusBadge>
                <StatusBadge>{investigationContext.exchange.replaceAll("_", " ")}</StatusBadge>
                <StatusBadge>{investigationContext.timeframe}</StatusBadge>
                <StatusBadge tone={decisionBrief ? "good" : "warn"}>{decisionBrief?.freshnessStatus ?? "EVIDENCE PENDING"}</StatusBadge>
                <StatusBadge tone={decisionBrief ? "good" : "warn"}>{decisionBrief?.coverageStatus ?? "PARTIAL"}</StatusBadge>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Metric label="Supporting Evidence" value={String(decisionBrief?.supportingEvidenceCount ?? supportingEvidence.length)} />
              <Metric label="Conflicting Evidence" value={String(decisionBrief?.contradictingEvidenceCount ?? conflictingEvidence.length)} />
              <Metric label="Source Quality" value={sourceRows.some((row) => row.coverage !== "UNAVAILABLE") ? "PARTIAL" : "UNAVAILABLE"} />
              <Metric label="Investigation Time" value={dateTime(investigationContext.investigationTimestamp)} />
            </div>
          </div>
          <div className="mt-3 rounded border border-zinc-900 bg-black/45 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Inherited Scanner Context</div>
              <StatusBadge tone={inheritedScannerContext.tone}>{inheritedScannerContext.label}</StatusBadge>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Opportunity" value={inheritedOpportunity} />
              <Metric label="Signal" value={inheritedSignal} />
              <Metric label="Market Structure" value={inheritedStructure} />
              <Metric label="Freshness" value={inheritedFreshness} />
            </div>
            <div className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{inheritedScannerContext.detail}</div>
          </div>
        </Card>

        <Card title="Thesis" icon={<Target className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <Metric label="Title" value={investigationContext.thesis?.title ?? `${investigationContext.symbol} research context`} />
            <Metric label="Question" value={investigationContext.thesis?.question ?? "Why should I believe this market thesis?"} />
            <Metric label="Decision Horizon" value={investigationContext.thesis?.decisionHorizon ?? investigationContext.timeframe} />
            <Metric label="Status" value={investigationContext.thesis?.status ?? "active"} />
            <Metric label="Current View" value={decisionBrief?.currentView.replaceAll("_", " ") ?? "insufficient evidence"} />
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <Metric label="Market Regime" value={currentState?.trendRegime ?? "Load historical context"} />
            <Metric label="State Return 24H" value={pct(currentState?.features.return24h)} tone={outcomeTone(currentState?.features.return24h)} />
            <Metric label="Next Validation" value={decisionBrief?.requiredNextValidation[0] ?? "Load evidence sources as needed"} />
          </div>
        </Card>

        <Card title="Supporting Evidence" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-2">
              {supportingEvidence.length ? (
                supportingEvidence.slice(0, 8).map((item, index) => (
                  <div key={`${item.source}-${index}-${item.detail}`} className="rounded border border-emerald-500/15 bg-emerald-500/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">{item.source}</div>
                      <StatusBadge tone={item.status === "VALID" ? "good" : "neutral"}>{item.status}</StatusBadge>
                    </div>
                    <div className="mt-2 text-xs font-bold leading-5 text-zinc-200">{item.detail}</div>
                  </div>
                ))
              ) : (
                <EmptyState title="Evidence Pending" reason="Load Historical Analog, Event Impact, or Market Memory to expose supporting evidence." />
              )}
            </div>

            <div className="grid gap-2">
              <div className="rounded border border-zinc-900 bg-black/45 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Historical Analog</div>
                {!historical ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <EmptyState title="Manual Load Required" reason={historicalError ?? `Read cached ${investigationContext.symbol} / ${historicalTimeframe} intelligence when needed.`} />
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
                  <div className="mt-2">
                    <EmptyState title="Historical Intelligence Unavailable" reason={historical.reason ?? historical.diagnostics?.cacheStatus ?? "cache unavailable"} />
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Metric label="Similar Cases" value={String(statistics.totalCases)} />
                    <Metric label="24H Average" value={pct(summaryHorizon?.averageReturn)} tone={outcomeTone(summaryHorizon?.averageReturn)} />
                    <Metric label="24H Win Rate" value={pct(summaryHorizon?.winRate)} />
                    <Metric label="Best Case" value={pct(summaryHorizon?.bestCase?.return)} tone="text-emerald-200" />
                    <Metric label="Worst Case" value={pct(summaryHorizon?.worstCase?.return)} tone="text-rose-200" />
                    <Metric label="Support / Conflict" value={`${historical.contradiction?.supportingEvidence.length ?? 0} / ${historical.contradiction?.contradictingEvidence.length ?? 0}`} />
                  </div>
                )}
              </div>

              <div className="rounded border border-zinc-900 bg-black/45 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Event Impact</div>
                {eventImpact?.status === "available" && eventImpact24h?.sampleCount ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Metric label="24H Average" value={pct(eventImpact24h.averageReturn)} tone={outcomeTone(eventImpact24h.averageReturn)} />
                    <Metric label="Win Rate" value={pct(eventImpact24h.winRate)} />
                    <Metric label="Events" value={String(eventImpact.events.length)} />
                    <Metric label="Support / Conflict" value={`${eventImpact.contradiction?.supportingEvidence.length ?? 0} / ${eventImpact.contradiction?.contradictingEvidence.length ?? 0}`} />
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <EmptyState title={eventImpact ? "Event Impact Unavailable" : "Manual Load Required"} reason={eventImpact?.reason ?? eventImpactError ?? "Read verified event outcomes from canonical OHLCV when needed."} />
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
              </div>

              <div className="rounded border border-zinc-900 bg-black/45 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Market Memory</div>
                {memories.length ? (
                  <div className="mt-2 grid gap-2">
                    {memories.slice(0, 3).map((memory) => (
                      <div key={memory.memoryId} className="rounded border border-zinc-900 bg-black/45 p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-black uppercase text-white">{memory.title}</div>
                          <StatusBadge>{memory.memoryType}</StatusBadge>
                        </div>
                        <div className="mt-1 text-[10px] font-bold leading-5 text-zinc-400">{memory.summary}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <EmptyState title={marketMemory ? "Market Memory Unavailable" : "Manual Load Required"} reason={marketMemory?.reason ?? marketMemoryError ?? "Read evidence-backed memories from the artifact catalog when needed."} />
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
              </div>
            </div>
          </div>
        </Card>

        <Card title="Conflicting Evidence" icon={<Activity className="h-3.5 w-3.5" />}>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-2">
              {conflictingEvidence.length ? (
                conflictingEvidence.slice(0, 8).map((item, index) => (
                  <div key={`${item.source}-${index}-${item.detail}`} className="rounded border border-rose-500/15 bg-rose-500/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-200">{item.source}</div>
                      <StatusBadge tone="warn">{item.status}</StatusBadge>
                    </div>
                    <div className="mt-2 text-xs font-bold leading-5 text-zinc-200">{item.detail}</div>
                  </div>
                ))
              ) : (
                <EmptyState title="Contradiction Pending" reason="No loaded source has exposed contradicting evidence yet." />
              )}
            </div>

            <div className="grid gap-2">
              {historical?.status === "available" && statistics ? (
                <div className="rounded border border-zinc-900 bg-black/45 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Selected Analog Cases</div>
                  <div className="mt-2 grid gap-1.5">
                    {cases.slice(0, 6).map((item, index) => {
                      const selected = item.state.id === selectedCase?.state.id
                      return (
                        <button
                          type="button"
                          key={item.state.id}
                          onClick={() => setSelectedCaseId(item.state.id)}
                          className={cn(
                            "grid grid-cols-[32px_minmax(0,1fr)_70px_64px] items-center gap-2 rounded border px-2 py-2 text-left",
                            selected ? "border-cyan-300/35 bg-cyan-400/10" : "border-zinc-900 bg-black/45 hover:bg-zinc-900/55",
                          )}
                        >
                          <span className="text-[9px] font-black text-zinc-600">#{index + 1}</span>
                          <span>
                            <span className="block text-xs font-black text-white">{dateTime(item.state.timestamp)}</span>
                            <span className="block text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{item.state.trendRegime}</span>
                          </span>
                          <span className="text-sm font-black text-cyan-200">{item.similarity.toFixed(1)}%</span>
                          <span className={cn("text-xs font-black", outcomeTone(item.outcome.returns["24h"]))}>{pct(item.outcome.returns["24h"])}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {selectedCase ? (
                <div className="rounded border border-zinc-900 bg-black/45 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Outcome Summary</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {HORIZONS.map((horizon) => (
                      <Metric
                        key={horizon}
                        label={`${horizon} Outcome`}
                        value={pct(selectedCase.outcome.returns[horizon])}
                        tone={outcomeTone(selectedCase.outcome.returns[horizon])}
                      />
                    ))}
                  </div>
                  {statistics ? (
                    <div className="mt-2 rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                      Dominant outcome: <span className="text-amber-200">{statistics.dominantOutcome}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <Card title="Narrative Timeline" icon={<Newspaper className="h-3.5 w-3.5" />}>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-2">
              {informationItems.length ? (
                informationItems.map((item) => (
                  <div key={`${item.time}-${item.label}-${item.tag}`} className="grid gap-2 rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] md:grid-cols-[90px_120px_minmax(0,1fr)]">
                    <span className="text-zinc-500">{item.time}</span>
                    <span className="text-cyan-100">{item.tag}</span>
                    <span className="text-white">{item.label}</span>
                  </div>
                ))
              ) : (
                <EmptyState title="Unavailable" reason="Macro and narrative flow returned no current items." />
              )}
            </div>

            <div className="grid gap-2">
              <div className="rounded border border-zinc-900 bg-black/45 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Narrative Context</div>
                {topNarratives.length ? (
                  <div className="mt-2 grid gap-2">
                    {topNarratives.slice(0, 5).map((item) => (
                      <div key={item.narrative} className="rounded border border-zinc-900 bg-black/45 p-2">
                        <div className="text-xs font-black uppercase text-white">{item.narrative}</div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">
                          <span>{heatState(item.total)}</span>
                          <span>{Math.round(item.total).toLocaleString()} articles</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="mt-2"><EmptyState title="Unavailable" reason={narratives.error ?? "Narrative heatmap returned no tagged items."} /></div>}
              </div>

              <div className="rounded border border-zinc-900 bg-black/45 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">Prediction Markets</div>
                {predictionMarkets.length ? (
                  <div className="mt-2 grid gap-1.5">
                    {predictionMarkets.slice(0, 4).map((market) => (
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
                ) : <div className="mt-2"><EmptyState title="Unavailable" reason={predictions.data?.status ?? predictions.error ?? "No attention markets available."} /></div>}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Source Intelligence" icon={<Database className="h-3.5 w-3.5" />}>
          <div className="grid gap-2">
            {sourceRows.map((row) => (
              <div key={row.source} className="grid gap-2 rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] md:grid-cols-[180px_110px_120px_150px_minmax(0,1fr)]">
                <span className="text-white">{row.source}</span>
                <span className="text-cyan-100">{row.freshness}</span>
                <span className="text-amber-100">{row.coverage}</span>
                <span className="text-zinc-500">{row.generated}</span>
                <span className="text-zinc-500">{row.reason}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Related Markets" icon={<BarChart3 className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded border border-zinc-900 bg-black/45 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Active Subject</div>
              <div className="mt-1 text-sm font-black uppercase text-white">{investigationContext.symbol}</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{investigationContext.exchange.replaceAll("_", " ")} / {investigationContext.timeframe}</div>
            </div>
            <div className="rounded border border-zinc-900 bg-black/45 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Market Attention</div>
              <div className="mt-1 text-sm font-black uppercase text-white">{predictionMarkets[0]?.title ?? "UNAVAILABLE"}</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{attentionLabel(predictionMarkets[0])}</div>
            </div>
            <div className="rounded border border-zinc-900 bg-black/45 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Live Context Handoff</div>
              <div className="mt-1 text-sm font-black uppercase text-white">Markets</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">Use existing live market surface</div>
            </div>
          </div>
        </Card>

        <Card title="Navigation Actions" icon={<Play className="h-3.5 w-3.5" />}>
          <div className="grid gap-3 xl:grid-cols-3">
            <div className="rounded border border-zinc-900 bg-black/45 p-3">
              <div className="text-xs font-black uppercase text-white">Need live market context</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">Markets owns live structure and symbol comparison.</div>
              <Link href={marketsHref} className="mt-3 inline-flex rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                Open Markets
              </Link>
            </div>

            <div className="rounded border border-zinc-900 bg-black/45 p-3">
              <div className="text-xs font-black uppercase text-white">Need historical validation</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                {selectedCase && replayHref ? "Replay inherits exchange, symbol, timeframe, date, hour, and selected case." : "Load Historical Intelligence and select a cached case first."}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={explorerHref} className="rounded border border-zinc-800 bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                  Open Explorer
                </Link>
                {selectedCase && replayHref ? (
                  <button type="button" onClick={openReplayWithSharedContext} className="rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    Open Replay
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded border border-zinc-900 bg-black/45 p-3">
              <div className="text-xs font-black uppercase text-white">Ready to plan execution</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">Trade owns execution planning. Research only hands off the evidence context.</div>
              <Link href={tradeHref} className="mt-3 inline-flex rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                Open Trade
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
