"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Activity, Radar, Signal, Zap } from "lucide-react"

import { useActiveSetupMemory } from "@/hooks/market-movers/useActiveSetupMemory"
import { useMarketMovers } from "@/hooks/market-movers/useMarketMovers"
import { useSafePolling } from "@/hooks/system/useSafePolling"
import type { MarketMoverCandidate } from "@/lib/market-movers/types"
import { ScannerV2View } from "@/components/scanner-v2"
import { buildScannerV2ViewModel } from "@/lib/scanner-presentation/adapters"
import type { ScannerHandoffViewModel } from "@/lib/scanner-presentation/contracts"
import {
  createContext,
  createScannerToResearchContext,
  inspectContextCandidate,
  loadProductContext,
  type JsonObject,
  type ProductContextFreshness,
  type SharedProductContextV1,
} from "@/lib/product-context"

type Opportunity = {
  symbol: string
  score: number
  setup: string
  direction: string
  confidence: string
  historicalSupport: number | null
  priority: string
}

type ScannerCandidate = {
  symbol: string
  setup: string
  direction: string
  confidence: string
  grade: string
  quality: string
  rr: string
  status: string
  score: number
  reason?: string
}

type RetainedMarketMoverCandidate = MarketMoverCandidate & {
  displayState?: "ACTIVE" | "AGING"
}

type RetainedCandidateRecord = {
  candidate: RetainedMarketMoverCandidate
  lastSeenAt: number
}

const CANDIDATE_RETENTION_MS = 5 * 60 * 1000
const SCANNER_RESEARCH_CONTEXT_TTL_MS = 30 * 60 * 1000
const SURFACE = {
  scannerHeader: "rounded-lg border border-amber-500/20 bg-[#07120b] p-3",
  priority: "rounded-lg border border-amber-500/25 bg-[#0c140c] p-3",
  primary: "rounded-lg border border-[#1c2c1c] bg-[#0c140c] p-3",
  secondary: "rounded-lg border border-[#142014] bg-[#111911] p-3",
  support: "rounded-lg border border-[#142014] bg-[#0a0f0a] p-3",
  row: "rounded border border-[#142014] bg-black/45",
}

type InheritedMarketsContextState = {
  label: "LOADING" | "CURRENT" | "PARTIAL" | "STALE" | "DEGRADED" | "MISSING" | "UNAVAILABLE"
  detail: string
  context: SharedProductContextV1 | null
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function Card({
  title,
  icon,
  children,
  className,
  subtitle,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  subtitle?: string
}) {
  return (
    <section className={cn(SURFACE.primary, className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
          {icon}
          {title}
        </div>
        {subtitle ? (
          <div className="max-w-[340px] text-right text-[9px] font-black uppercase tracking-[0.12em] text-[#6b7d6b]">{subtitle}</div>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded border border-[#142014] bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#6b7d6b]">
      <span className="text-[#d4dbd4]">{title}</span>
      <span className="ml-2 text-[#3d503d]">Reason: {reason}</span>
    </div>
  )
}

function badgeTone(label: string) {
  const normalized = label.toUpperCase()
  if (["CURRENT", "VERIFIED", "ACTIVE", "FRESH", "ACTIONABLE", "HIGH"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["PARTIAL", "DEGRADED", "DEVELOPING", "WATCHLIST", "MEDIUM"].includes(normalized)) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100"
  }
  if (["STALE", "AGING", "MATURE", "LATE"].includes(normalized)) {
    return "border-orange-400/25 bg-orange-400/10 text-orange-100"
  }
  if (["LOADING"].includes(normalized)) {
    return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
  }
  if (["MISSING", "UNAVAILABLE", "NO DATA", "NO_TRADE"].includes(normalized)) {
    return "border-zinc-700 bg-zinc-900/60 text-zinc-400"
  }
  return "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
}

function Badge({ label }: { label: string }) {
  return (
    <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em]", badgeTone(label))}>
      {label}
    </span>
  )
}

function scannerContextFreshness(status: string): ProductContextFreshness {
  if (status === "CURRENT") return "CURRENT"
  if (status === "STALE") return "STALE"
  if (status === "MISSING") return "MISSING"
  if (status === "UNAVAILABLE") return "UNAVAILABLE"
  return "UNKNOWN"
}

function scannerResearchContextId(createdAt: Date) {
  const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${createdAt.getTime()}-${Math.abs(createdAt.getTimezoneOffset())}`
  return `scanner-research-${suffix}`
}

function appendScannerResearchContext(href: string, contextId: string) {
  const [pathname, query = ""] = href.split("?", 2)
  const params = new URLSearchParams(query)
  params.set("contextId", contextId)
  return `${pathname}?${params.toString()}`
}

function marketsContextValue(value: JsonObject | undefined, key: string) {
  const candidate = value?.[key]
  if (typeof candidate === "string" && candidate.trim()) return candidate
  if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate)
  return "UNAVAILABLE"
}

function SummaryMetric({ label, value, reason }: { label: string; value: React.ReactNode; reason?: React.ReactNode }) {
  return (
    <div className={cn(SURFACE.row, "p-2")}>
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6b7d6b]">{label}</div>
      <div className="mt-1 text-lg font-black uppercase text-[#d4dbd4]">{value}</div>
      {reason ? <div className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.1em] text-[#3d503d]">{reason}</div> : null}
    </div>
  )
}

function setupLabel(value?: string | null) {
  const text = value ?? "Live Market Signal"
  if (/breakout/i.test(text)) return "Breakout"
  if (/pullback|retest/i.test(text)) return "Retest"
  if (/liquid|large-cap/i.test(text)) return "Liquidity Watch"
  if (/support/i.test(text)) return "Support Holding"
  if (/range|mean/i.test(text)) return "Range Trade"
  return text.replaceAll("_", " ")
}

function categoryFor(candidate: Pick<MarketMoverCandidate, "setup" | "trigger" | "reason">) {
  const text = `${candidate.setup ?? ""} ${candidate.trigger ?? ""} ${candidate.reason ?? ""}`.toLowerCase()
  if (text.includes("breakout")) return "Breakout"
  if (text.includes("pullback") || text.includes("retest")) return "Retest"
  if (text.includes("liquid")) return "Liquidity Watch"
  if (text.includes("support")) return "Support Holding"
  if (text.includes("range") || text.includes("mean")) return "Range Trade"
  return "Market Activity"
}

function confidence(candidate: MarketMoverCandidate) {
  if (Number.isFinite(candidate.score) && candidate.score < 97) return String(Math.round(candidate.score))
  return candidate.confidence
}

function quality(candidate: MarketMoverCandidate) {
  return [
    candidate.grade ? `Grade ${candidate.grade}` : null,
    Number.isFinite(candidate.tradeabilityScore) ? `${Math.round(candidate.tradeabilityScore)} Quality` : null,
    candidate.riskReward ? `RR ${candidate.riskReward.replace(/^TP1\s*/i, "").replace(/\s*\/\s*TP2\s*/i, " / ")}` : null,
    candidate.qualityState?.replaceAll("_", " "),
  ].filter((item): item is string => Boolean(item)).slice(0, 4)
}

function displayDirection(value?: string | null) {
  if (!value) return "Neutral"
  if (/long|bull|up/i.test(value)) return "Uptrend"
  if (/short|bear|down/i.test(value)) return "Downtrend"
  return "Neutral"
}

function moverToScannerCandidate(candidate: RetainedMarketMoverCandidate): ScannerCandidate {
  const qualityItems = quality(candidate)
  return {
    symbol: candidate.symbol,
    setup: setupLabel(candidate.setup),
    direction: displayDirection(candidate.direction),
    confidence: confidence(candidate),
    grade: candidate.grade ?? "NO DATA",
    quality: qualityItems.find((item) => item.includes("Quality")) ?? candidate.qualityState.replaceAll("_", " "),
    rr: candidate.riskReward?.replace(/^TP1\s*/i, "").replace(/\s*\/\s*TP2\s*/i, " / ") || "NO DATA",
    status: candidate.displayState === "AGING" ? "AGING" : candidate.freshness ?? candidate.action ?? "WATCHLIST",
    score: Number.isFinite(candidate.score) ? candidate.score : 0,
    reason: candidate.reason,
  }
}

function opportunityToScannerCandidate(item: Opportunity): ScannerCandidate {
  return {
    symbol: item.symbol,
    setup: setupLabel(item.setup),
    direction: displayDirection(item.direction),
    confidence: item.confidence || String(item.score),
    grade: item.score >= 85 ? "A" : item.score >= 70 ? "B" : "C",
    quality: item.historicalSupport === null ? "LIVE SIGNAL" : `${Math.round(item.historicalSupport)} History`,
    rr: "NO DATA",
    status: item.priority,
    score: item.score,
  }
}

function marketHref(item: ScannerCandidate) {
  const params = new URLSearchParams({
    symbol: item.symbol,
    source: "scanner",
    setup: item.setup,
    direction: item.direction,
    confidence: item.confidence,
  })
  if (item.reason) params.set("reason", item.reason)
  return `/markets?${params.toString()}`
}

function tradeHref(item: ScannerCandidate) {
  const params = new URLSearchParams({
    symbol: item.symbol,
    source: "scanner",
    setup: item.setup,
    direction: item.direction,
    confidence: item.confidence,
  })
  if (item.reason) params.set("reason", item.reason)
  return `/trade?${params.toString()}`
}

function researchHref(item: ScannerCandidate) {
  const params = new URLSearchParams({
    symbol: item.symbol,
    source: "scanner",
    setup: item.setup,
    direction: item.direction,
    confidence: item.confidence,
  })
  if (item.reason) params.set("reason", item.reason)
  return `/research?${params.toString()}`
}

function replayHref(item: ScannerCandidate) {
  const params = new URLSearchParams({
    symbol: item.symbol,
    source: "scanner",
    setup: item.setup,
    direction: item.direction,
    confidence: item.confidence,
  })
  if (item.reason) params.set("reason", item.reason)
  return `/replay?${params.toString()}`
}

function directionClass(value: string) {
  if (/uptrend/i.test(value)) return "text-emerald-100"
  if (/downtrend/i.test(value)) return "text-rose-100"
  return "text-amber-100"
}

function OpportunityRow({ item }: { item: ScannerCandidate }) {
  return (
    <div className={cn(SURFACE.row, "grid gap-2 p-2 text-[10px] font-black uppercase tracking-[0.1em] md:grid-cols-[1.2fr_0.8fr_80px_80px_80px_80px_110px_96px]")}>
      <div className="min-w-0">
        <div className="text-sm text-[#d4dbd4]">{item.symbol}</div>
        <div className="mt-1 truncate text-cyan-100">{item.setup}</div>
      </div>
      <div>
        <div className="text-[#3d503d]">Direction</div>
        <div className={directionClass(item.direction)}>{item.direction}</div>
      </div>
      <div>
        <div className="text-[#3d503d]">Conf</div>
        <div className="text-emerald-100">{item.confidence}</div>
      </div>
      <div>
        <div className="text-[#3d503d]">Grade</div>
        <div className="text-amber-100">{item.grade}</div>
      </div>
      <div>
        <div className="text-[#3d503d]">Quality</div>
        <div className="truncate text-[#a0b0a0]">{item.quality}</div>
      </div>
      <div>
        <div className="text-[#3d503d]">RR</div>
        <div className="truncate text-[#a0b0a0]">{item.rr}</div>
      </div>
      <Link
        href={marketHref(item)}
        className="flex items-center justify-center rounded border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-center text-[9px] text-cyan-100 transition hover:border-cyan-200/60"
      >
        Inspect Market
      </Link>
      <Link
        href={tradeHref(item)}
        className="flex items-center justify-center rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-center text-[9px] text-zinc-200 transition hover:border-zinc-500 hover:text-white"
      >
        Open Trade
      </Link>
      <div className="md:col-span-8 flex items-center justify-between gap-2 border-t border-[#142014] pt-1">
        <span className="truncate text-[#6b7d6b]">{item.reason ?? item.status}</span>
        <Badge label={item.status} />
      </div>
    </div>
  )
}

function PriorityOpportunityCard({
  item,
  rank,
  onOpenResearch,
}: {
  item: ScannerCandidate
  rank: number
  onOpenResearch: (item: ScannerCandidate) => void
}) {
  return (
    <div className="rounded-lg border border-amber-400/20 bg-black/45 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-4xl font-black leading-none text-orange-400">#{rank}</div>
        <Badge label={item.status} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xl font-black uppercase tracking-[0.04em] text-[#d4dbd4]">{item.symbol}</div>
          <div className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">{item.setup}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6b7d6b]">Confidence</div>
          <div className="text-2xl font-black leading-none text-emerald-100">{item.confidence}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-[10px] font-black uppercase tracking-[0.1em] sm:grid-cols-3">
        <div>
          <div className="text-[#3d503d]">Direction</div>
          <div className={directionClass(item.direction)}>{item.direction}</div>
        </div>
        <div>
          <div className="text-[#3d503d]">Grade</div>
          <div className="text-amber-100">{item.grade}</div>
        </div>
        <div>
          <div className="text-[#3d503d]">Quality</div>
          <div className="truncate text-[#a0b0a0]">{item.quality}</div>
        </div>
      </div>
      <div className="mt-3 min-h-8 border-t border-[#142014] pt-2 text-[10px] font-black uppercase tracking-[0.1em] text-[#6b7d6b]">
        {item.reason ?? "Live opportunity from existing scanner intelligence."}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link
          href={marketHref(item)}
          className="rounded border border-cyan-300/30 bg-cyan-400/10 px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200/60"
        >
          Inspect Market
        </Link>
        <button
          type="button"
          onClick={() => onOpenResearch(item)}
          className="rounded border border-amber-300/25 bg-amber-400/10 px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.12em] text-amber-100 transition hover:border-amber-200/60"
        >
          Research Evidence
        </button>
      </div>
    </div>
  )
}

function NavigationActions({
  item,
  onOpenResearch,
}: {
  item: ScannerCandidate | null
  onOpenResearch: (item: ScannerCandidate) => void
}) {
  if (!item) {
    return <EmptyState title="Unavailable" reason="No selected opportunity is available for navigation." />
  }

  return (
    <div className="grid gap-2 md:grid-cols-4">
      {[
        ["Markets", "Validate live structure", marketHref(item)],
        ["Research", "Review evidence", researchHref(item)],
        ["Replay", "Check historical context", replayHref(item)],
        ["Trade", "Continue planning", tradeHref(item)],
      ].map(([label, description, href]) => {
        const content = (
          <>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">{label}</div>
            <div className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-[#6b7d6b]">{description}</div>
            <div className="mt-3 truncate text-xs font-black uppercase text-[#d4dbd4]">{item.symbol}</div>
          </>
        )
        return label === "Research" ? (
          <button
            key={label}
            type="button"
            onClick={() => onOpenResearch(item)}
            className="rounded border border-[#1c2c1c] bg-black/45 p-3 text-left transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
          >
            {content}
          </button>
        ) : (
          <Link
            key={label}
            href={href}
            className="rounded border border-[#1c2c1c] bg-black/45 p-3 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
          >
            {content}
          </Link>
        )
      })}
    </div>
  )
}

export default function ScannerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productContextId = searchParams.get("contextId")?.trim() || null
  const moverState = useMarketMovers(true)
  const movers = moverState.data
  const liveCandidates = useMemo(() => (movers?.candidates ?? []).slice(0, 25), [movers])
  const [retainedCandidates, setRetainedCandidates] = useState<RetainedCandidateRecord[]>([])
  const [inheritedMarketsContext, setInheritedMarketsContext] = useState<InheritedMarketsContextState>({
    label: productContextId ? "LOADING" : "UNAVAILABLE",
    detail: productContextId
      ? "Loading inherited Markets context."
      : "No shared contextId supplied. Direct Scanner remains available.",
    context: null,
  })

  useEffect(() => {
    if (!productContextId) {
      setInheritedMarketsContext({
        label: "UNAVAILABLE",
        detail: "No shared contextId supplied. Direct Scanner remains available.",
        context: null,
      })
      return
    }

    setInheritedMarketsContext({
      label: "LOADING",
      detail: "Loading inherited Markets context.",
      context: null,
    })
    const loaded = loadProductContext(productContextId)
    if (loaded.success === false) {
      setInheritedMarketsContext({ label: "UNAVAILABLE", detail: loaded.error.message, context: null })
      return
    }

    const lifecycle = inspectContextCandidate(loaded.value)
    if (lifecycle.status !== "SUCCESS" || !lifecycle.value) {
      setInheritedMarketsContext({
        label: "UNAVAILABLE",
        detail: lifecycle.issues[0]?.message ?? "Shared Markets context is not active.",
        context: null,
      })
      return
    }
    if (lifecycle.value.sourcePage !== "markets" || lifecycle.value.destinationIntent !== "prioritize_symbol") {
      setInheritedMarketsContext({
        label: "UNAVAILABLE",
        detail: "Shared context does not describe a Markets to Scanner handoff.",
        context: null,
      })
      return
    }

    const inheritedFreshness = lifecycle.value.freshness?.freshness ?? "UNKNOWN"
    const label = inheritedFreshness === "STALE"
      ? "STALE" as const
      : inheritedFreshness === "UNAVAILABLE" || inheritedFreshness === "MISSING"
        ? "UNAVAILABLE" as const
        : lifecycle.value.marketStructureContext
          ? inheritedFreshness === "CURRENT" ? "CURRENT" as const : "PARTIAL" as const
          : "PARTIAL" as const
    setInheritedMarketsContext({
      label,
      detail: "Markets exploration context loaded for display only. Scanner ranking remains independent.",
      context: lifecycle.value,
    })
  }, [productContextId])

  useEffect(() => {
    const now = Date.now()
    setRetainedCandidates((previous) => {
      const liveKeys = new Set(liveCandidates.map((candidate) => `${candidate.symbol}:${candidate.setup}:${candidate.direction}`))
      const merged = new Map<string, RetainedCandidateRecord>()
      for (const record of previous) {
        if (now - record.lastSeenAt <= CANDIDATE_RETENTION_MS) {
          const key = `${record.candidate.symbol}:${record.candidate.setup}:${record.candidate.direction}`
          merged.set(key, {
            candidate: {
              ...record.candidate,
              displayState: liveKeys.has(key) ? "ACTIVE" : "AGING",
            },
            lastSeenAt: record.lastSeenAt,
          })
        }
      }
      for (const candidate of liveCandidates) {
        const key = `${candidate.symbol}:${candidate.setup}:${candidate.direction}`
        merged.set(key, {
          candidate: { ...candidate, displayState: "ACTIVE" },
          lastSeenAt: now,
        })
      }
      return [...merged.values()]
        .sort((left, right) => (right.candidate.score ?? 0) - (left.candidate.score ?? 0))
        .slice(0, 25)
    })
  }, [liveCandidates])
  const candidates = useMemo(() => retainedCandidates.map((record) => record.candidate), [retainedCandidates])
  const activeSetups = useActiveSetupMemory(candidates)
  const opportunitiesState = useSafePolling<Opportunity[]>("/api/scanner/opportunities", 45000, {
    timeoutMs: 9000,
    retries: 1,
    label: "scanner-opportunities",
    enabled: true,
  })
  const opportunities = opportunitiesState.data ?? []
  const scannerCandidates = useMemo(() => {
    const fromMovers = candidates.map(moverToScannerCandidate)
    if (fromMovers.length) return fromMovers
    return opportunities.map(opportunityToScannerCandidate)
  }, [candidates, opportunities])
  const categories = ["Breakout", "Retest", "Liquidity Watch", "Support Holding", "Market Activity", "Range Trade"]
  const byCategory = categories.map((category) => ({
    category,
    items: candidates.filter((candidate) => categoryFor(candidate) === category).slice(0, 4),
  }))
  const highestConfidence = [...scannerCandidates].sort((left, right) => right.score - left.score).slice(0, 5)
  const tradeableCount = movers?.summary?.tradable ?? scannerCandidates.filter((item) => item.status !== "NO_TRADE").length
  const highConfidenceCount = scannerCandidates.filter((item) => {
    const numeric = Number(item.confidence)
    return item.confidence === "HIGH" || (Number.isFinite(numeric) && numeric >= 75)
  }).length
  const priorityOpportunities = scannerCandidates.slice(0, 3)
  const signalFeed = scannerCandidates.slice(3, 13)
  const primaryOpportunity = scannerCandidates[0] ?? null
  const scannerHealth = moverState.loading || opportunitiesState.loading
    ? "LOADING"
    : scannerCandidates.length
      ? "CURRENT"
      : moverState.error || opportunitiesState.error
        ? "UNAVAILABLE"
        : "MISSING"
  const scannerFreshness = moverState.lastUpdatedAt ?? opportunitiesState.lastUpdatedAt ?? "Unavailable"
  const inheritedMarkets = inheritedMarketsContext.context
  const inheritedStructure = marketsContextValue(inheritedMarkets?.marketStructureContext?.value, "structure")
  const inheritedSector = marketsContextValue(inheritedMarkets?.marketStructureContext?.value, "sector")
  const inheritedBreadth = marketsContextValue(inheritedMarkets?.marketStructureContext?.value, "breadth")
  const inheritedFreshness = inheritedMarkets?.freshness?.freshness ?? "UNAVAILABLE"
  const scannerV2Model = buildScannerV2ViewModel({
    moverRequest: {
      loading: moverState.loading,
      error: moverState.error,
      hasPayload: Boolean(movers),
      lastUpdatedAt: moverState.lastUpdatedAt ?? null,
    },
    opportunityRequest: {
      loading: opportunitiesState.loading,
      error: opportunitiesState.error,
      hasPayload: opportunitiesState.data !== null,
      lastUpdatedAt: opportunitiesState.lastUpdatedAt ?? null,
    },
    candidates: candidates.length
      ? candidates.map((candidate) => ({
          symbol: candidate.symbol,
          sourceKind: "MARKET_MOVERS_MODEL" as const,
          setup: candidate.setup ?? null,
          direction: candidate.direction ?? null,
          reason: candidate.reason ?? null,
          score: Number.isFinite(candidate.score) ? candidate.score : null,
          priority: candidate.action ?? null,
          sourceConfidence: candidate.confidence ?? null,
          sourceFreshness: candidate.freshness ?? null,
          retentionState: candidate.displayState ?? null,
          observedAt: moverState.lastUpdatedAt ?? null,
          scoreBreakdown: candidate.scoreBreakdown ?? [],
          observations: [
            { id: "price-change", label: "Observed 24h price change", value: Number.isFinite(candidate.priceChangePercent) ? candidate.priceChangePercent : null, unit: "%" },
            { id: "quote-volume", label: "Observed quote volume", value: Number.isFinite(candidate.quoteVolume) ? candidate.quoteVolume : null },
            { id: "trade-count", label: "Observed trade count", value: Number.isFinite(candidate.tradeCount) ? candidate.tradeCount : null },
            { id: "last-price", label: "Observed last price", value: Number.isFinite(candidate.lastPrice) ? candidate.lastPrice : null },
          ],
          riskContext: [candidate.qualityReason, candidate.volatilityNote, candidate.suppressedReason].filter((item): item is string => Boolean(item)),
        }))
      : opportunities.map((item) => ({
          symbol: item.symbol,
          sourceKind: "SCANNER_HEURISTIC" as const,
          setup: item.setup || null,
          direction: item.direction || null,
          reason: null,
          score: Number.isFinite(item.score) ? item.score : null,
          priority: item.priority || null,
          sourceConfidence: item.confidence || null,
          sourceFreshness: null,
          retentionState: null,
          observedAt: opportunitiesState.lastUpdatedAt ?? null,
          scoreBreakdown: [],
          observations: [],
          riskContext: [],
        })),
    inheritedMarketsContext: { label: inheritedMarketsContext.label, detail: inheritedMarketsContext.detail },
  })

  function openResearchWithSharedContext(item: ScannerCandidate) {
    const href = researchHref(item)
    const createdAt = new Date()
    const createdAtIso = createdAt.toISOString()
    const freshness = scannerContextFreshness(scannerHealth)
    const observedAt = Number.isFinite(Date.parse(scannerFreshness)) ? new Date(scannerFreshness).toISOString() : undefined
    const handoff = createScannerToResearchContext({
      contextId: scannerResearchContextId(createdAt),
      symbol: item.symbol,
      exchange: inheritedMarkets?.exchange,
      timeframe: inheritedMarkets?.timeframe,
      createdAt: createdAtIso,
      expiresAt: new Date(createdAt.getTime() + SCANNER_RESEARCH_CONTEXT_TTL_MS).toISOString(),
      opportunityContext: {
        value: {
          symbol: item.symbol,
          setup: item.setup,
          direction: item.direction,
          confidence: item.confidence,
          grade: item.grade,
          quality: item.quality,
          riskReward: item.rr,
          status: item.status,
          ...(item.reason ? { reason: item.reason } : {}),
        },
        owner: "scanner",
        source: "scanner",
        observedAt,
        freshness,
        revision: 1,
      },
      signalContext: item.reason
        ? {
            value: {
              reason: item.reason,
              setup: item.setup,
              direction: item.direction,
              status: item.status,
            },
            owner: "scanner",
            source: "scanner",
            observedAt,
            freshness,
            revision: 1,
        }
        : undefined,
      marketStructureContext: inheritedMarkets?.marketStructureContext,
      freshness: {
        value: {
          status: scannerHealth,
          ...(observedAt ? { observedAt } : {}),
        },
        owner: "scanner",
        source: "scanner",
        observedAt,
        freshness,
        revision: 1,
      },
    })

    if (handoff.success === true) {
      const persisted = createContext(handoff.value)
      if (persisted.status === "SUCCESS") {
        router.push(appendScannerResearchContext(href, handoff.value.contextId))
        return
      }
    }

    router.push(href)
  }

  function openScannerV2Handoff(id: ScannerHandoffViewModel["id"]) {
    if (!primaryOpportunity) return
    if (id === "RESEARCH") {
      openResearchWithSharedContext(primaryOpportunity)
      return
    }
    if (id === "REPLAY") router.push(replayHref(primaryOpportunity))
    if (id === "MARKETS") router.push(marketHref(primaryOpportunity))
    if (id === "TRADE") router.push(tradeHref(primaryOpportunity))
  }

  useEffect(() => {
    console.debug("Scanner candidate trace", {
      moverCandidates: candidates.length,
      scannerCandidates: scannerCandidates.length,
      opportunityFallback: opportunities.length,
    })
  }, [candidates.length, opportunities.length, scannerCandidates.length])

  return <ScannerV2View model={scannerV2Model} onOpenHandoff={openScannerV2Handoff} />
}
