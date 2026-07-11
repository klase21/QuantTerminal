"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, History, RadioTower, Save, Trash2, Zap } from "lucide-react"

import useLiquidationSocket from "@/hooks/useLiquidationSocket"
import useMarketSocket from "@/hooks/useMarketSocket"
import useOrderbookSocket from "@/hooks/useOrderbookSocket"
import useTradeSocket from "@/hooks/useTradeSocket"
import { useActiveSetupMemory, type ActiveSetupMemoryItem } from "@/hooks/market-movers/useActiveSetupMemory"
import { useMarketMovers } from "@/hooks/market-movers/useMarketMovers"
import { useMarketStore } from "@/stores/useMarketStore"
import type { MarketMoverCandidate } from "@/lib/market-movers/types"
import { TradeV2View } from "@/components/trade-v2"
import { buildTradeV2ViewModel } from "@/lib/trade-presentation/adapters"
import {
  inspectContextCandidate,
  loadProductContext,
  type JsonObject,
  type SharedProductContextV1,
} from "@/lib/product-context"

const STORAGE_KEY = "qt.trade.setupMemory.v2"
const CANDIDATE_RETENTION_MS = 5 * 60 * 1000

type SetupStatus = "Watching" | "Active" | "Won" | "Lost" | "Expired"
type CandidateListState = "loading" | "empty" | "ready"
type RetainedTradeCandidate = MarketMoverCandidate & {
  displayState?: "ACTIVE" | "AGING"
}
type RetainedTradeCandidateRecord = {
  candidate: RetainedTradeCandidate
  lastSeenAt: number
}

type FuturesSymbol = {
  symbol: string
  openInterest: number
  oiNotional: number
  fundingRate: number
}

type FuturesResponse = {
  ok?: boolean
  symbols?: FuturesSymbol[]
  notes?: string[]
}

type SavedSetup = {
  id: string
  symbol: string
  setupType: string
  direction: string
  entryArea: string
  wrongArea: string
  targetArea: string
  createdTime: string
  status: SetupStatus
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function Card({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded border border-[#1c2c1c] bg-[#0c140c] p-3", className)}>
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#38bdf8]">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded border border-[#142014] bg-[#0a0f0a] p-5 text-center">
      <div className="text-sm font-black uppercase tracking-[0.16em] text-[#a0b0a0]">{title}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#6b7d6b]">Reason: {reason}</div>
    </div>
  )
}

type InheritedReplayContextState = {
  label: "LOADING" | "CURRENT" | "PARTIAL" | "DEGRADED" | "MISSING" | "UNAVAILABLE"
  tone: "current" | "partial" | "missing" | "unavailable" | "loading"
  detail: string
  context: SharedProductContextV1 | null
}

function MiniMetric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "green" | "red" | "cyan" | "amber" }) {
  return (
    <div className="rounded border border-[#142014] bg-[#0a0f0a] px-2 py-1.5">
      <div className="text-[8px] font-black uppercase tracking-[0.14em] text-[#6b7d6b]">{label}</div>
      <div className={cn(
        "mt-0.5 text-sm font-black uppercase leading-tight text-[#d4dbd4]",
        tone === "green" && "text-emerald-100",
        tone === "red" && "text-rose-100",
        tone === "cyan" && "text-cyan-100",
        tone === "amber" && "text-amber-100",
      )}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.1em] text-[#3d503d]">{sub}</div>}
    </div>
  )
}

function StatusBadge({ label, tone }: { label: string; tone: "current" | "partial" | "missing" | "unavailable" | "loading" }) {
  return (
    <span className={cn(
      "inline-flex rounded border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]",
      tone === "current" && "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
      tone === "partial" && "border-amber-300/30 bg-amber-400/10 text-amber-100",
      tone === "missing" && "border-zinc-700 bg-zinc-900/70 text-zinc-400",
      tone === "unavailable" && "border-zinc-700 bg-black/40 text-zinc-400",
      tone === "loading" && "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
    )}>
      {label}
    </span>
  )
}

function contextString(value: JsonObject | undefined, field: string) {
  const candidate = value?.[field]
  return typeof candidate === "string" ? candidate : null
}

function firstContextString(value: JsonObject | undefined, fields: string[]) {
  for (const field of fields) {
    const candidate = contextString(value, field)
    if (candidate) return candidate
  }
  return null
}

function firstContextScalar(value: JsonObject | undefined, fields: string[]) {
  for (const field of fields) {
    const candidate = value?.[field]
    if (typeof candidate === "string" || typeof candidate === "number") return String(candidate)
  }
  return null
}

function inheritedStatusTone(label: string): InheritedReplayContextState["tone"] {
  if (label === "CURRENT" || label === "VERIFIED") return "current"
  if (label === "PARTIAL" || label === "STALE" || label === "DEGRADED") return "partial"
  if (label === "MISSING") return "missing"
  if (label === "LOADING") return "loading"
  return "unavailable"
}

function inheritedReplayContextStatus(
  validationAvailability: string | null,
  replayAvailability: string | null,
  isComplete: boolean,
): Pick<InheritedReplayContextState, "label" | "tone"> {
  if (!validationAvailability && !replayAvailability) return { label: "UNAVAILABLE", tone: "unavailable" }
  if (!isComplete) return { label: "PARTIAL", tone: "partial" }

  const states = [validationAvailability, replayAvailability].map((value) => value?.toUpperCase() ?? "UNAVAILABLE")
  if (states.some((value) => value === "LOADING")) return { label: "LOADING", tone: "loading" }
  if (states.some((value) => value === "MISSING" || value === "UNAVAILABLE")) {
    return { label: "UNAVAILABLE", tone: "unavailable" }
  }
  if (states.some((value) => value === "PARTIAL" || value === "DEGRADED" || value === "STALE" || value === "UNKNOWN")) {
    return { label: "PARTIAL", tone: "partial" }
  }
  return { label: "CURRENT", tone: "current" }
}

function fmt(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function pct(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}%`
}

function compactUsd(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(1)}K`
  return `$${abs.toFixed(0)}`
}

function displayDataReason(value?: string | null) {
  const text = value ?? ""
  if (/\b(403|451)\b/i.test(text) || /forbidden|restricted|unavailable for legal reasons/i.test(text)) return "Exchange response blocked"
  if (/timeout|abort/i.test(text)) return "Source timed out"
  if (/not responded/i.test(text)) return "Source waiting"
  if (/unavailable/i.test(text)) return "Source unavailable"
  return text || "Source unavailable"
}

function titleCase(value?: string | null) {
  if (!value) return "NO DATA"
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function setupLabel(candidate?: MarketMoverCandidate | null) {
  if (!candidate) return "NO DATA"
  if (candidate.setup === "Breakout continuation") return "Break Above Level"
  if (candidate.setup === "Pullback continuation") return "Retest After Move"
  if (candidate.setup === "Mean reversion watch") return "Sideways Range Trade"
  if (candidate.setup === "Liquid large-cap watch") return "Market Activity Watch"
  if (candidate.setup === "No clean setup") return "No Clean Setup"
  return titleCase(candidate.setup)
}

function directionLabel(candidate?: MarketMoverCandidate | null) {
  if (!candidate) return "NO DATA"
  if (candidate.direction === "LONG") return "Uptrend"
  if (candidate.direction === "SHORT") return "Downtrend"
  return "Watching"
}

function confidenceLabel(candidate?: MarketMoverCandidate | null) {
  if (!candidate) return "NO DATA"
  if (Number.isFinite(candidate.score) && candidate.score < 97) return `${Math.round(candidate.score)} Confidence`
  return `${titleCase(candidate.confidence)} Confidence`
}

function statusLabel(candidate?: MarketMoverCandidate | null) {
  if (!candidate) return "NO DATA"
  if (candidate.action === "WATCH") return "Watching"
  if (candidate.action === "WAIT") return "Waiting"
  if (candidate.action === "AVOID") return "Avoiding"
  return titleCase(candidate.action)
}

function isMemoryItem(candidate: MarketMoverCandidate | ActiveSetupMemoryItem | null | undefined): candidate is ActiveSetupMemoryItem {
  return Boolean(candidate && "lifecycle" in candidate && "firstSeenAt" in candidate)
}

function lifecycleLabel(candidate?: MarketMoverCandidate | ActiveSetupMemoryItem | null) {
  if (!isMemoryItem(candidate)) return null
  return candidate.lifecycle
}

function lifecycleTone(lifecycle?: string | null) {
  if (lifecycle === "STRENGTHENING" || lifecycle === "COMPLETED") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
  if (lifecycle === "WEAKENING") return "border-amber-300/30 bg-amber-400/10 text-amber-100"
  if (lifecycle === "INVALIDATED") return "border-rose-300/30 bg-rose-400/10 text-rose-100"
  if (lifecycle === "ACTIVE") return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
  return "border-zinc-800 bg-zinc-950 text-zinc-300"
}

function isClosedMemorySetup(setup: ActiveSetupMemoryItem) {
  return setup.lifecycle === "INVALIDATED" || setup.lifecycle === "COMPLETED" || setup.outcome === "STOPPED" || setup.outcome === "EXPIRED" || setup.outcome === "TP1_HIT" || setup.outcome === "TP2_HIT"
}

function qualityFields(candidate?: MarketMoverCandidate | null) {
  if (!candidate) return []
  return [
    candidate.grade ? `Grade ${candidate.grade}` : null,
    Number.isFinite(candidate.tradeabilityScore) ? `${Math.round(candidate.tradeabilityScore)} Quality` : null,
    candidate.riskReward ? `RR ${candidate.riskReward.replace(/^TP1\s*/i, "").replace(/\s*\/\s*TP2\s*/i, " / ")}` : null,
    candidate.freshness ? titleCase(candidate.freshness) : null,
    candidate.planQuality ? titleCase(candidate.planQuality) : null,
  ].filter((item): item is string => Boolean(item))
}

function plainReason(value?: string | null) {
  const text = (value ?? "").trim()
  if (!text) return "NO DATA"
  return text
    .replace(/\bVWAP\b/gi, "Key support")
    .replace(/\bCVD\b/gi, "buyer activity")
    .replace(/\bOI\b/gi, "trader participation")
    .replace(/\bOpen Interest\b/gi, "Trader Participation")
    .replace(/\bFunding\b/gi, "Long / Short Positioning")
    .replace(/\bliquidity sweep\b/gi, "stop-loss hunt")
}

function reasonFromCandidate(candidate?: MarketMoverCandidate | null) {
  if (!candidate) return "NO DATA"
  if (candidate.reason) return plainReason(candidate.reason)
  const strongest = candidate.scoreBreakdown?.filter((item) => item.polarity === "positive").sort((a, b) => b.value - a.value)[0]
  if (strongest) return plainReason(strongest.label)
  return plainReason(candidate.qualityReason)
}

function scoreEvidence(candidate?: MarketMoverCandidate | null) {
  if (!candidate) return []
  const lines: Array<{ title: string; detail: string }> = []
  const breakdown = candidate.scoreBreakdown ?? []
  const hasPositive = (term: string) => breakdown.some((item) => item.polarity === "positive" && item.label.toLowerCase().includes(term))
  const valueFor = (term: string) => breakdown.find((item) => item.label.toLowerCase().includes(term))?.value

  if (hasPositive("liquid") || (candidate.liquidityRank ?? 0) >= 65) {
    lines.push({ title: "Large Traders Are Active", detail: "Liquidity is strong enough to monitor execution." })
  }
  if (hasPositive("participation") || (candidate.participationRank ?? 0) >= 55) {
    lines.push({ title: "Market Participation Is Healthy", detail: "Trade activity supports the setup." })
  }
  if (hasPositive("volatility") || (candidate.volatilityRank ?? 0) >= 50) {
    lines.push({ title: "Price Movement Has Attention", detail: "Movement is active enough to watch." })
  }
  if ((candidate.tradeabilityScore ?? 0) >= 64) {
    lines.push({ title: "Execution Quality Is Acceptable", detail: "Tradeability passed the quality filter." })
  }
  if (candidate.planQuality === "BALANCED") {
    lines.push({ title: "Risk / Reward Is Favorable", detail: candidate.riskReward || "Plan quality is balanced." })
  }
  if ((candidate.chaseRisk ?? 0) >= 70 || (valueFor("chase") ?? 0) < -8) {
    lines.push({ title: "Chase Risk Is Elevated", detail: "Wait for confirmation before sizing." })
  }

  return lines
}

function evidenceLines(candidate: MarketMoverCandidate | null, futuresSymbol?: FuturesSymbol, tradeFlow?: { value: string; reason: string }, liquidationPressure?: { value: string; reason: string }) {
  if (!candidate) return []
  const lines = [
    { title: reasonFromCandidate(candidate), detail: candidate.qualityReason ? plainReason(candidate.qualityReason) : "Main reason from tactical alert" },
    ...scoreEvidence(candidate),
  ]
  if (tradeFlow && tradeFlow.value !== "NO DATA") {
    lines.push({ title: `Trade Flow: ${tradeFlow.value}`, detail: tradeFlow.reason })
  }
  if (futuresSymbol) {
    lines.push({
      title: "Trader Participation",
      detail: compactUsd(futuresSymbol.oiNotional),
    })
  }
  if (liquidationPressure && liquidationPressure.value !== "NO DATA") {
    lines.push({ title: `Liquidations: ${liquidationPressure.value}`, detail: liquidationPressure.reason })
  }
  return lines.slice(0, 6)
}

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function tradePlan(candidate?: MarketMoverCandidate | null) {
  const plan = candidate?.numericPlan
  if (!candidate || !plan) return null
  const values = [plan.entryLow, plan.entryHigh, plan.stopLoss, plan.takeProfit1, plan.takeProfit2]
  if (!values.every(validNumber)) return null
  if (plan.side === "NEUTRAL") return null
  return {
    entryArea: plan.entryLow === plan.entryHigh ? fmt(plan.entryLow, 2) : `${fmt(plan.entryLow, 2)} - ${fmt(plan.entryHigh, 2)}`,
    wrongArea: fmt(plan.stopLoss, 2),
    targetArea: [plan.takeProfit1, plan.takeProfit2].filter(validNumber).map((value) => fmt(value, 2)).join(" / "),
    riskLevel: candidate.chaseRisk >= 72 ? "High" : candidate.chaseRisk >= 45 ? "Medium" : "Low",
    action: candidate.action === "WAIT"
      ? "Wait for confirmation before entering."
      : candidate.action === "AVOID"
        ? "Avoid chase until setup improves."
        : "Watch for planned entry area.",
  }
}

function timeAgo(value?: string | number | null) {
  if (!value) return "NO DATA"
  const timestamp = typeof value === "number" ? value : new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return "NO DATA"
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return "Detected now"
  if (minutes < 60) return `Detected ${minutes}m ago`
  return `Detected ${Math.floor(minutes / 60)}h ago`
}

function formatDate(value?: string | null) {
  if (!value) return "NO DATA"
  const timestamp = new Date(`${value}T00:00:00Z`).getTime()
  if (!Number.isFinite(timestamp)) return value
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

function pastDirection(value?: string | null) {
  const normalized = value?.toLowerCase() ?? ""
  if (normalized.includes("bullish") || normalized.includes("uptrend") || normalized.includes("continuation")) return "Uptrend"
  if (normalized.includes("bearish") || normalized.includes("downtrend")) return "Downtrend"
  return "Mixed"
}

function loadSavedSetups(): SavedSetup[] {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveSetups(setups: SavedSetup[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(setups))
}

function selectedCandidateFrom(input: {
  focusCandidate?: MarketMoverCandidate | null
  candidates: RetainedTradeCandidate[]
  activeSetups: ActiveSetupMemoryItem[]
  selectedId: string | null
}) {
  const { focusCandidate, candidates, activeSetups, selectedId } = input
  const liveTracked = activeSetups.filter((setup) => !isClosedMemorySetup(setup))
  if (selectedId) {
    const selected = focusCandidate?.symbol === selectedId
      ? focusCandidate
      : candidates.find((candidate) => candidate.symbol === selectedId)
        ?? liveTracked.find((candidate) => candidate.symbol === selectedId)
        ?? null
    return selected ?? candidates[0] ?? focusCandidate ?? liveTracked[0] ?? null
  }
  return candidates[0] ?? focusCandidate ?? liveTracked[0] ?? null
}

export default function TradePage() {
  const searchParams = useSearchParams()
  const requestedSymbol = searchParams.get("symbol")?.toUpperCase() ?? null
  const productContextId = searchParams.get("contextId")?.trim() || null
  const [futures, setFutures] = useState<FuturesResponse | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(requestedSymbol)
  const [savedSetups, setSavedSetups] = useState<SavedSetup[]>([])
  const [retainedCandidateRecords, setRetainedCandidateRecords] = useState<RetainedTradeCandidateRecord[]>([])
  const [stableFocusCandidate, setStableFocusCandidate] = useState<MarketMoverCandidate | null>(null)
  const [inheritedReplayContext, setInheritedReplayContext] = useState<InheritedReplayContextState>({
    label: productContextId ? "LOADING" : "UNAVAILABLE",
    tone: productContextId ? "loading" : "unavailable",
    detail: productContextId
      ? "Loading inherited Replay context."
      : "No shared contextId supplied. Direct Trade remains available.",
    context: null,
  })
  const lastRequestedSymbolRef = useRef(requestedSymbol)
  const moverState = useMarketMovers(true, selectedSymbol)
  const marketMovers = moverState.data

  useEffect(() => {
    if (!productContextId) {
      setInheritedReplayContext({
        label: "UNAVAILABLE",
        tone: "unavailable",
        detail: "No shared contextId supplied. Direct Trade remains available.",
        context: null,
      })
      return
    }

    setInheritedReplayContext({
      label: "LOADING",
      tone: "loading",
      detail: "Loading inherited Replay context.",
      context: null,
    })
    const loaded = loadProductContext(productContextId)
    if (loaded.success === false) {
      setInheritedReplayContext({
        label: "UNAVAILABLE",
        tone: "unavailable",
        detail: loaded.error.message,
        context: null,
      })
      return
    }
    const lifecycle = inspectContextCandidate(loaded.value)
    if (lifecycle.status !== "SUCCESS" || !lifecycle.value) {
      setInheritedReplayContext({
        label: "UNAVAILABLE",
        tone: "unavailable",
        detail: lifecycle.issues[0]?.message ?? "Shared Replay context is not active.",
        context: null,
      })
      return
    }
    if (lifecycle.value.sourcePage !== "replay" || lifecycle.value.destinationIntent !== "prepare_execution") {
      setInheritedReplayContext({
        label: "UNAVAILABLE",
        tone: "unavailable",
        detail: "Shared context does not describe a Replay to Trade handoff.",
        context: null,
      })
      return
    }

    const validationAvailability = contextString(lifecycle.value.validationResult?.value, "status")
    const replayAvailability = contextString(lifecycle.value.replayResult?.value, "availability")
    const isComplete = Boolean(lifecycle.value.validationResult && lifecycle.value.replayResult)
    const inheritedStatus = inheritedReplayContextStatus(validationAvailability, replayAvailability, isComplete)
    setInheritedReplayContext({
      ...inheritedStatus,
      detail: `Replay validation ${validationAvailability ?? "UNAVAILABLE"}; replay result ${replayAvailability ?? "UNAVAILABLE"}. Display only.`,
      context: lifecycle.value,
    })
  }, [productContextId])

  const tickers = useMarketStore((state) => state.tickers)
  const orderbook = useMarketStore((state) => state.orderbook)
  const liveCandidates = useMemo(() => (marketMovers?.candidates ?? []).slice(0, 10), [marketMovers])
  useEffect(() => {
    if (marketMovers?.focusCandidate) setStableFocusCandidate(marketMovers.focusCandidate)
  }, [marketMovers?.focusCandidate])
  useEffect(() => {
    const now = Date.now()
    setRetainedCandidateRecords((previous) => {
      const incoming = new Map<string, MarketMoverCandidate>()
      for (const candidate of liveCandidates) {
        incoming.set(candidate.symbol, candidate)
      }
      if (marketMovers?.focusCandidate) {
        incoming.set(marketMovers.focusCandidate.symbol, marketMovers.focusCandidate)
      }

      const merged = new Map<string, RetainedTradeCandidateRecord>()
      for (const record of previous) {
        if (now - record.lastSeenAt > CANDIDATE_RETENTION_MS) continue
        const refreshed = incoming.get(record.candidate.symbol)
        merged.set(record.candidate.symbol, {
          candidate: {
            ...(refreshed ?? record.candidate),
            displayState: refreshed ? "ACTIVE" : "AGING",
          },
          lastSeenAt: refreshed ? now : record.lastSeenAt,
        })
      }
      for (const candidate of incoming.values()) {
        merged.set(candidate.symbol, {
          candidate: { ...candidate, displayState: "ACTIVE" },
          lastSeenAt: now,
        })
      }
      return [...merged.values()]
        .sort((left, right) => (right.candidate.score ?? 0) - (left.candidate.score ?? 0))
        .slice(0, 10)
    })
  }, [liveCandidates, marketMovers?.focusCandidate])
  const stableCandidates = useMemo(() => retainedCandidateRecords.map((record) => record.candidate), [retainedCandidateRecords])
  const candidates = stableCandidates
  const activeSetups = useActiveSetupMemory(candidates)
  const liveTrackedSetups = useMemo(() => activeSetups.filter((setup) => !isClosedMemorySetup(setup)), [activeSetups])
  const focusCandidate = marketMovers?.focusCandidate
    ?? candidates.find((candidate) => candidate.symbol === stableFocusCandidate?.symbol)
    ?? null
  const candidateListState: CandidateListState = candidates.length > 0
    ? "ready"
    : moverState.loading
      ? "loading"
      : "empty"
  const selected = selectedCandidateFrom({ focusCandidate, candidates, activeSetups, selectedId: selectedSymbol })
  const activeSymbol = selected?.symbol ?? "BTCUSDT"
  const ticker = tickers[activeSymbol]
  const futuresSymbol = futures?.symbols?.find((item) => item.symbol === activeSymbol)
  const futuresReason = displayDataReason(futures?.notes?.[0] ?? (futures?.ok === false ? "Futures intelligence unavailable" : "Futures data unavailable"))
  const { trades } = useTradeSocket(activeSymbol)
  const { liquidations } = useLiquidationSocket()

  useMarketSocket()
  useOrderbookSocket(activeSymbol)

  useEffect(() => {
    setSavedSetups(loadSavedSetups())
  }, [])

  useEffect(() => {
    let active = true

    async function loadTradeData() {
      try {
        const futuresResult = await fetch(`/api/market/futures-intelligence?symbol=${encodeURIComponent(activeSymbol)}`, { cache: "no-store" })
        if (!active) return

        if (futuresResult.ok) setFutures(await futuresResult.json())
        else setFutures({ ok: false, notes: ["Futures intelligence unavailable"] })
      } catch {
        if (active) setFutures({ ok: false, notes: ["Futures intelligence unavailable"] })
      }
    }

    void loadTradeData()
    const timer = window.setInterval(loadTradeData, 30000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [activeSymbol])

  useEffect(() => {
    if (requestedSymbol && requestedSymbol !== lastRequestedSymbolRef.current) {
      lastRequestedSymbolRef.current = requestedSymbol
      setSelectedSymbol(requestedSymbol)
      return
    }
    if (!selectedSymbol && (candidates[0]?.symbol || focusCandidate?.symbol || liveTrackedSetups[0]?.symbol)) {
      setSelectedSymbol(candidates[0]?.symbol ?? focusCandidate?.symbol ?? liveTrackedSetups[0]?.symbol ?? null)
    }
  }, [candidates, liveTrackedSetups, focusCandidate?.symbol, requestedSymbol, selectedSymbol])

  useEffect(() => {
    console.debug("Trade candidate trace", {
      requestedSymbol,
      selectedSymbol,
      liveCandidates: liveCandidates.length,
      cachedCandidates: stableCandidates.length,
      retainedCandidates: retainedCandidateRecords.length,
      focusCandidate: focusCandidate?.symbol ?? null,
      candidateListState,
    })
  }, [candidateListState, focusCandidate?.symbol, liveCandidates.length, requestedSymbol, retainedCandidateRecords.length, selectedSymbol, stableCandidates.length])

  const buyQty = trades.filter((trade) => trade.side === "buy").reduce((sum, trade) => sum + trade.qty, 0)
  const sellQty = trades.filter((trade) => trade.side === "sell").reduce((sum, trade) => sum + trade.qty, 0)
  const bidDepth = orderbook?.bids?.slice(0, 10).reduce((sum, item) => sum + item.quantity, 0) ?? null
  const askDepth = orderbook?.asks?.slice(0, 10).reduce((sum, item) => sum + item.quantity, 0) ?? null
  const orderbookPressure = bidDepth === null || askDepth === null || bidDepth + askDepth === 0
    ? { value: "NO DATA", reason: "Orderbook depth unavailable" }
    : bidDepth > askDepth * 1.1
      ? { value: "Bid Support", reason: "More visible bid depth" }
      : askDepth > bidDepth * 1.1
        ? { value: "Sell Pressure", reason: "More visible ask depth" }
        : { value: "Balanced", reason: "Bid/ask depth similar" }
  const tradeFlow = trades.length === 0
    ? { value: "NO DATA", reason: "Trade stream waiting" }
    : buyQty > sellQty * 1.1
      ? { value: "Buying", reason: `Buy ${fmt(buyQty, 3)} / Sell ${fmt(sellQty, 3)}` }
      : sellQty > buyQty * 1.1
        ? { value: "Selling", reason: `Buy ${fmt(buyQty, 3)} / Sell ${fmt(sellQty, 3)}` }
        : { value: "Balanced", reason: `Buy ${fmt(buyQty, 3)} / Sell ${fmt(sellQty, 3)}` }
  const longLiq = liquidations.filter((item) => item.side === "LONG").reduce((sum, item) => sum + item.value, 0)
  const shortLiq = liquidations.filter((item) => item.side === "SHORT").reduce((sum, item) => sum + item.value, 0)
  const liquidationPressure = longLiq + shortLiq === 0
    ? { value: "NO DATA", reason: "Liquidation feed waiting" }
    : longLiq > shortLiq * 1.15
      ? { value: "Longs Hit", reason: compactUsd(longLiq) }
      : shortLiq > longLiq * 1.15
        ? { value: "Shorts Hit", reason: compactUsd(shortLiq) }
        : { value: "Balanced", reason: compactUsd(longLiq + shortLiq) }
  const plan = tradePlan(selected)
  const evidence = evidenceLines(selected, futuresSymbol, tradeFlow, liquidationPressure)
  const completed = savedSetups.filter((setup) => setup.status === "Won" || setup.status === "Lost")
  const wins = savedSetups.filter((setup) => setup.status === "Won").length
  const losses = savedSetups.filter((setup) => setup.status === "Lost").length
  const open = savedSetups.filter((setup) => setup.status === "Watching" || setup.status === "Active").length
  const memoryCompleted = activeSetups.filter((setup) => setup.outcome === "TP1_HIT" || setup.outcome === "TP2_HIT" || setup.outcome === "STOPPED" || setup.outcome === "EXPIRED")
  const memoryWinners = memoryCompleted.filter((setup) => setup.outcome === "TP1_HIT" || setup.outcome === "TP2_HIT")
  const memoryLosers = memoryCompleted.filter((setup) => setup.outcome === "STOPPED" || setup.outcome === "EXPIRED")
  const combinedWins = wins + memoryWinners.length
  const combinedLosses = losses + memoryLosers.length
  const combinedCompleted = completed.length + memoryCompleted.length
  const winRate = combinedCompleted ? Math.round((combinedWins / combinedCompleted) * 100) : null
  const averageOutcome = memoryCompleted.length
    ? memoryCompleted.reduce((sum, setup) => sum + setup.bestMovePct, 0) / memoryCompleted.length
    : null
  const inheritedContext = inheritedReplayContext.context
  const inheritedValidationLabel = contextString(inheritedContext?.validationResult?.value, "status") ?? "UNAVAILABLE"
  const inheritedValidationDetail = contextString(inheritedContext?.validationResult?.value, "detail") ?? "No inherited validation result"
  const inheritedReplayAvailability = contextString(inheritedContext?.replayResult?.value, "availability") ?? "UNAVAILABLE"
  const inheritedThesis = contextString(inheritedContext?.thesis?.value, "title") ?? "UNAVAILABLE"
  const inheritedEvidence = firstContextString(inheritedContext?.evidenceSummary?.value, ["coverageStatus", "freshnessStatus", "status"])
    ?? (inheritedContext?.evidenceSummary ? "AVAILABLE" : "UNAVAILABLE")
  const inheritedFreshness = inheritedContext?.freshness?.freshness
    ?? contextString(inheritedContext?.freshness?.value, "status")
    ?? inheritedContext?.evidenceSummary?.freshness
    ?? "UNAVAILABLE"
  const inheritedStructure = [
    contextString(inheritedContext?.marketStructureContext?.value, "structure"),
    contextString(inheritedContext?.marketStructureContext?.value, "sector"),
    contextString(inheritedContext?.marketStructureContext?.value, "breadth"),
  ].filter((value): value is string => Boolean(value)).join(" / ") || "UNAVAILABLE"
  const inheritedOpportunity = firstContextString(inheritedContext?.opportunityContext?.value, ["setup", "direction", "status"])
    ?? "UNAVAILABLE"
  const inheritedSignal = firstContextString(inheritedContext?.signalContext?.value, ["reason", "setup", "direction", "status"])
    ?? "UNAVAILABLE"
  const inheritedConfidence = firstContextScalar(inheritedContext?.confidenceContext?.value, ["confidence", "value", "status", "label"])
    ?? firstContextScalar(inheritedContext?.opportunityContext?.value, ["confidence"])
    ?? "UNAVAILABLE"
  const inheritedSymbol = inheritedContext?.symbol ?? "UNAVAILABLE"
  const inheritedExchange = inheritedContext?.exchange ?? "UNAVAILABLE"
  const inheritedTimeframe = inheritedContext?.timeframe ?? "UNAVAILABLE"
  const inheritedValidationTone = inheritedStatusTone(inheritedValidationLabel)

  const persistSetups = (setups: SavedSetup[]) => {
    setSavedSetups(setups)
    saveSetups(setups)
  }

  const trackSetup = () => {
    if (!selected || !plan) return
    const setup: SavedSetup = {
      id: crypto.randomUUID(),
      symbol: selected.symbol,
      setupType: setupLabel(selected),
      direction: directionLabel(selected),
      entryArea: plan.entryArea,
      wrongArea: plan.wrongArea,
      targetArea: plan.targetArea,
      createdTime: new Date().toISOString(),
      status: "Watching",
    }
    persistSetups([setup, ...savedSetups])
  }

  const updateStatus = (id: string, status: SetupStatus) => {
    persistSetups(savedSetups.map((setup) => setup.id === id ? { ...setup, status } : setup))
  }

  const deleteSetup = (id: string) => {
    persistSetups(savedSetups.filter((setup) => setup.id !== id))
  }
  const marketHref = selected
    ? `/markets?${new URLSearchParams({
      symbol: selected.symbol,
      source: "trade",
      setup: setupLabel(selected),
      direction: directionLabel(selected),
      confidence: confidenceLabel(selected),
      reason: evidence[0]?.detail ?? evidence[0]?.title ?? "Selected trade setup",
    }).toString()}`
    : "/markets"

  const tradeV2Model = buildTradeV2ViewModel({
    candidateState: candidateListState,
    selected: selected ? {
      symbol: selected.symbol,
      setup: selected.setup ?? null,
      direction: selected.direction ?? null,
      explanation: selected.reason ?? selected.qualityReason ?? null,
      score: Number.isFinite(selected.score) ? selected.score : null,
      sourceFreshness: selected.freshness ?? null,
      observedAt: marketMovers?.updatedAt ?? null,
      risk: [
        selected.volatilityNote,
        selected.invalidation ? `Source-model invalidation: ${selected.invalidation}` : null,
        selected.riskReward ? `Source-model risk/reward: ${selected.riskReward}` : null,
        Number.isFinite(selected.chaseRisk) ? `Source-model chase risk: ${selected.chaseRisk}` : null,
        selected.planQuality ? `Source-model plan quality: ${selected.planQuality}` : null,
      ].filter((item): item is string => Boolean(item)),
    } : null,
    candidates: [...candidates, ...liveTrackedSetups]
      .filter((candidate, index, list) => list.findIndex((item) => item.symbol === candidate.symbol) === index)
      .map((candidate) => ({
        symbol: candidate.symbol,
        selected: candidate.symbol === selected?.symbol,
        retentionState: "displayState" in candidate ? candidate.displayState ?? null : isMemoryItem(candidate) ? candidate.lifecycle : null,
      })),
    replay: {
      contextId: inheritedReplayContext.context?.contextId ?? null,
      label: inheritedReplayContext.label,
      detail: inheritedReplayContext.detail,
      available: Boolean(inheritedReplayContext.context),
    },
    observations: [
      { id: "trade-ticker-price", label: "Observed ticker price", value: ticker?.price ?? null, source: "market-store-ticker", available: Number.isFinite(ticker?.price) },
      { id: "trade-ticker-change", label: "Observed 24h price change", value: ticker?.change24h ?? null, unit: "%", source: "market-store-ticker", available: Number.isFinite(ticker?.change24h) },
      { id: "trade-open-interest", label: "Observed open interest notional", value: futuresSymbol?.oiNotional ?? null, unit: "USD", source: "futures-intelligence", available: Number.isFinite(futuresSymbol?.oiNotional) },
      { id: "trade-funding", label: "Observed funding rate", value: futuresSymbol?.fundingRate ?? null, source: "futures-intelligence", available: Number.isFinite(futuresSymbol?.fundingRate) },
      { id: "trade-buy-flow", label: "Observed buy-initiated quantity", value: trades.length ? buyQty : null, source: "realtime-trade-stream", available: trades.length > 0 },
      { id: "trade-sell-flow", label: "Observed sell-initiated quantity", value: trades.length ? sellQty : null, source: "realtime-trade-stream", available: trades.length > 0 },
      { id: "trade-bid-depth", label: "Observed top-ten bid depth", value: bidDepth, source: "realtime-orderbook", available: bidDepth !== null && bidDepth + (askDepth ?? 0) > 0 },
      { id: "trade-ask-depth", label: "Observed top-ten ask depth", value: askDepth, source: "realtime-orderbook", available: askDepth !== null && askDepth + (bidDepth ?? 0) > 0 },
      { id: "trade-long-liquidations", label: "Observed long liquidation notional", value: longLiq + shortLiq > 0 ? longLiq : null, unit: "USD", source: "realtime-liquidation-stream", available: longLiq + shortLiq > 0 },
      { id: "trade-short-liquidations", label: "Observed short liquidation notional", value: longLiq + shortLiq > 0 ? shortLiq : null, unit: "USD", source: "realtime-liquidation-stream", available: longLiq + shortLiq > 0 },
    ],
    localHeuristicRisk: [
      orderbookPressure.value !== "NO DATA" ? `Local orderbook heuristic: ${orderbookPressure.value}; basis: ${orderbookPressure.reason}` : null,
      tradeFlow.value !== "NO DATA" ? `Local trade-flow heuristic: ${tradeFlow.value}; basis: ${tradeFlow.reason}` : null,
      liquidationPressure.value !== "NO DATA" ? `Local liquidation heuristic: ${liquidationPressure.value}; basis: ${liquidationPressure.reason}` : null,
    ].filter((item): item is string => Boolean(item)),
    plan: plan ? {
      entryCondition: plan.entryArea,
      invalidationCondition: plan.wrongArea,
      modelTargets: plan.targetArea,
      modelAction: plan.action,
      monitoringCondition: selected?.trigger ?? null,
    } : null,
    records: savedSetups,
    hrefs: { replay: "/replay", research: "/research", markets: marketHref, scanner: "/scanner", dashboard: "/dashboard" },
  })

  return <TradeV2View model={tradeV2Model} actions={{ onSelectCandidate: setSelectedSymbol, onTrack: trackSetup, onUpdateStatus: updateStatus, onDelete: deleteSetup }} />

  return (
    <main className="min-h-screen bg-[#070d07] px-3 py-3 text-[#d4dbd4] lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <Card title="Trade Summary" icon={<RadioTower className="h-3.5 w-3.5" />} className="border-[#3a4d2c] bg-[#07120b]">
          {!selected ? (
            <EmptyState title="No Selected Candidate" reason="No focused trade candidate is available." />
          ) : (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Selected Execution Candidate</div>
                    <div className="mt-2 text-3xl font-black uppercase leading-none text-[#d4dbd4] sm:text-4xl">{selected.symbol}</div>
                    <div className="mt-2 text-sm font-black uppercase tracking-[0.1em] text-cyan-100">{setupLabel(selected)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-[#1c2c1c] bg-[#0a0f0a] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#a0b0a0]">{directionLabel(selected)}</span>
                    <Link href={marketHref} className="rounded border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200/60">
                      Inspect Market
                    </Link>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-[0.1em]">
                  <span className="rounded border border-emerald-300/25 bg-emerald-400/10 px-2 py-1 text-emerald-100">{confidenceLabel(selected)}</span>
                  <span className="rounded border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-amber-100">{statusLabel(selected)}</span>
                  {lifecycleLabel(selected) && (
                    <span className={cn("rounded border px-2 py-1", lifecycleTone(lifecycleLabel(selected)))}>{lifecycleLabel(selected)}</span>
                  )}
                  {qualityFields(selected).map((field) => (
                    <span key={`${selected.symbol}-${field}`} className="rounded border border-[#1c2c1c] bg-[#0a0f0a] px-2 py-1 text-[#6b7d6b]">{field}</span>
                  ))}
                </div>
                <div className="mt-3 text-[10px] font-bold uppercase leading-5 tracking-[0.08em] text-[#a0b0a0]">{reasonFromCandidate(selected)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniMetric label="Current Price" value={ticker ? fmt(ticker.price, 2) : "NO DATA"} sub={ticker ? "Binance realtime" : "Ticker stream waiting"} tone="cyan" />
                <MiniMetric label="24h Change" value={pct(ticker?.change24h)} sub={ticker ? "Ticker stream" : "No ticker data"} tone={(ticker?.change24h ?? 0) >= 0 ? "green" : "red"} />
                <MiniMetric label="Candidate Source" value="Market Movers" sub={timeAgo(marketMovers?.updatedAt)} tone="amber" />
                <MiniMetric label="Context" value={requestedSymbol ? "Inherited Symbol" : "Local Selection"} sub={inheritedReplayContext.context ? "Replay context display available" : "Validation context unavailable"} />
              </div>
            </div>
          )}

          <details className="mt-3 rounded border border-[#142014] bg-[#0a0f0a]">
            <summary className="cursor-pointer px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#6b7d6b]">
              Available Candidate Context ({candidates.length + liveTrackedSetups.length})
            </summary>
            <div className="border-t border-[#142014] p-2">
              {candidateListState === "loading" && liveTrackedSetups.length === 0 ? (
                <EmptyState title="Loading Trade Candidates" reason="Keeping the workspace stable while tactical alerts refresh." />
              ) : candidateListState === "empty" && liveTrackedSetups.length === 0 ? (
                <EmptyState title="No Available Candidates" reason={marketMovers?.notes?.[0] ?? moverState.error ?? "No tactical alerts currently meet quality threshold."} />
              ) : (
                <div className="grid gap-2">
                  {candidates.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#3d503d]">Current Candidates</div>
                      <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
                        {candidates.map((candidate) => (
                          <button
                            key={`${candidate.symbol}-${candidate.setup}-${candidate.score}`}
                            type="button"
                            onClick={() => setSelectedSymbol(candidate.symbol)}
                            className={cn(
                              "rounded border bg-[#07120b] p-2 text-left transition hover:border-cyan-300/45",
                              selected?.symbol === candidate.symbol ? "border-cyan-300/55 bg-cyan-400/10" : "border-[#1c2c1c]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div>
                                <div className="text-base font-black leading-none text-[#d4dbd4]">{candidate.symbol}</div>
                                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">{setupLabel(candidate)}</div>
                              </div>
                              <span className="rounded border border-[#1c2c1c] bg-[#0a0f0a] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#a0b0a0]">{directionLabel(candidate)}</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.1em]">
                              <span className="text-emerald-100">{confidenceLabel(candidate)}</span>
                              <span className="text-[#6b7d6b]">{timeAgo(marketMovers?.updatedAt)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {liveTrackedSetups.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#3d503d]">Tracked Setups</div>
                      <div className="grid gap-1.5 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-8">
                        {liveTrackedSetups.slice(0, 12).map((candidate) => (
                          <button
                            key={`${candidate.symbol}-${candidate.firstSeenAt}`}
                            type="button"
                            onClick={() => setSelectedSymbol(candidate.symbol)}
                            className={cn(
                              "rounded border bg-[#07120b] p-2 text-left transition hover:border-cyan-300/45",
                              selected?.symbol === candidate.symbol ? "border-cyan-300/55 bg-cyan-400/10" : "border-[#1c2c1c]",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-black text-[#d4dbd4]">{candidate.symbol}</div>
                              <span className={cn("rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em]", lifecycleTone(candidate.lifecycle))}>{candidate.lifecycle}</span>
                            </div>
                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">{setupLabel(candidate)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </details>
        </Card>

        <Card title="Execution Readiness" icon={<Activity className="h-3.5 w-3.5" />} className="border-amber-500/20 bg-[#0c140c]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <div className="rounded border border-amber-300/20 bg-amber-400/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-[0.1em] text-[#d4dbd4]">Planning State</div>
                {!selected ? <StatusBadge label="MISSING" tone="missing" /> : plan ? <StatusBadge label="PARTIAL" tone="partial" /> : <StatusBadge label="UNAVAILABLE" tone="unavailable" />}
              </div>
              <div className="mt-2 text-[10px] font-bold uppercase leading-5 tracking-[0.08em] text-[#a0b0a0]">
                {!selected
                  ? "A selected candidate is required before execution planning can begin."
                  : !plan
                    ? "Entry and invalidation levels are unavailable for the selected candidate."
                    : inheritedReplayContext.context
                      ? "Execution levels are available from the current candidate source. Inherited Replay context is display-only; user risk inputs remain unavailable."
                      : "Execution levels are available from the current candidate source. Replay validation and user risk inputs are not provided by this Trade data flow."}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded border border-[#142014] bg-[#0a0f0a] p-2">
                <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#6b7d6b]">Candidate</span>{selected ? <StatusBadge label="CURRENT" tone="current" /> : <StatusBadge label="MISSING" tone="missing" />}</div>
                <div className="mt-2 text-[10px] font-bold uppercase text-[#a0b0a0]">{selected?.symbol ?? "No candidate selected"}</div>
              </div>
              <div className="rounded border border-[#142014] bg-[#0a0f0a] p-2">
                <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#6b7d6b]">Execution Levels</span>{plan ? <StatusBadge label="CURRENT" tone="current" /> : <StatusBadge label="MISSING" tone="missing" />}</div>
                <div className="mt-2 text-[10px] font-bold uppercase text-[#a0b0a0]">{plan ? "Entry, stop, and targets available" : "Numeric plan unavailable"}</div>
              </div>
              <div className="rounded border border-[#142014] bg-[#0a0f0a] p-2">
                <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#6b7d6b]">Replay Validation</span><StatusBadge label={inheritedValidationLabel} tone={inheritedValidationTone} /></div>
                <div className="mt-2 text-[10px] font-bold uppercase text-[#a0b0a0]">{inheritedValidationDetail}</div>
              </div>
              <div className="rounded border border-[#142014] bg-[#0a0f0a] p-2">
                <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#6b7d6b]">User Risk Inputs</span><StatusBadge label="UNAVAILABLE" tone="unavailable" /></div>
                <div className="mt-2 text-[10px] font-bold uppercase text-[#a0b0a0]">Account and risk limits not supplied</div>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded border border-[#142014] bg-[#0a0f0a] p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#6b7d6b]">Inherited Replay Context</div>
              <StatusBadge label={inheritedReplayContext.label} tone={inheritedReplayContext.tone} />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MiniMetric label="Validation" value={inheritedValidationLabel} />
              <MiniMetric label="Replay Result" value={inheritedReplayAvailability} />
              <MiniMetric label="Thesis" value={inheritedThesis} />
              <MiniMetric label="Evidence" value={inheritedEvidence} />
              <MiniMetric label="Market Structure" value={inheritedStructure} />
              <MiniMetric label="Opportunity" value={inheritedOpportunity} />
              <MiniMetric label="Signal" value={inheritedSignal} />
              <MiniMetric label="Confidence" value={inheritedConfidence} />
              <MiniMetric label="Freshness" value={inheritedFreshness} />
              <MiniMetric label="Symbol" value={inheritedSymbol} />
              <MiniMetric label="Exchange" value={inheritedExchange} />
              <MiniMetric label="Timeframe" value={inheritedTimeframe} />
            </div>
            <div className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-[#3d503d]">{inheritedReplayContext.detail}</div>
          </div>
        </Card>

        <Card title="Execution Setup" icon={<Zap className="h-3.5 w-3.5" />} className="bg-[#0c140c]">
          {!selected ? (
            <EmptyState title="No Execution Setup" reason="Select an available candidate first." />
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <MiniMetric label="Setup" value={setupLabel(selected)} tone="cyan" />
                <MiniMetric label="Direction" value={directionLabel(selected)} tone="amber" />
                <MiniMetric label="Action" value={statusLabel(selected)} tone="amber" />
                <MiniMetric label="Plan Quality" value={titleCase(selected.planQuality)} />
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                <div className="rounded border border-[#1c2c1c] bg-[#0a0f0a] p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">Trigger</div>
                  <div className="mt-2 text-xs font-bold uppercase leading-5 text-[#d4dbd4]">{selected.trigger || "NO DATA"}</div>
                </div>
                <div className="rounded border border-[#1c2c1c] bg-[#0a0f0a] p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-300">Invalidation Context</div>
                  <div className="mt-2 text-xs font-bold uppercase leading-5 text-[#d4dbd4]">{selected.invalidation || "NO DATA"}</div>
                </div>
              </div>
              <details className="rounded border border-[#142014] bg-[#0a0f0a]">
                <summary className="cursor-pointer px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#6b7d6b]">Existing Tactical Context</summary>
                <div className="grid gap-2 border-t border-[#142014] p-2 md:grid-cols-2 2xl:grid-cols-3">
                  {(evidence.length ? evidence : [{ title: "NO DATA", detail: "No tactical context available." }]).map((item) => (
                    <div key={`${item.title}-${item.detail}`} className="min-h-[72px] rounded border border-[#142014] bg-[#07120b] p-2">
                      <div className="line-clamp-2 text-xs font-black uppercase text-[#d4dbd4]">{item.title}</div>
                      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#6b7d6b]">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </Card>

        <div className="grid gap-3 xl:grid-cols-2">
          <Card title="Entry Plan" icon={<RadioTower className="h-3.5 w-3.5" />} className="bg-[#0c140c]">
            {!selected || !plan ? (
              <EmptyState title="Entry Plan Unavailable" reason="Existing candidate entry levels are unavailable." />
            ) : (
              <div className="grid gap-2">
                <MiniMetric label="Entry Area" value={plan.entryArea} tone="cyan" />
                <MiniMetric label="Entry Action" value={plan.action} tone="amber" />
                <div className="rounded border border-[#142014] bg-[#0a0f0a] p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6b7d6b]">Existing Entry Context</div>
                  <div className="mt-2 text-xs font-bold uppercase leading-5 text-[#a0b0a0]">{selected.entryPlan || "NO DATA"}</div>
                </div>
              </div>
            )}
          </Card>

          <Card title="Exit Plan" icon={<History className="h-3.5 w-3.5" />} className="bg-[#0c140c]">
            {!selected || !plan ? (
              <EmptyState title="Exit Plan Unavailable" reason="Existing stop and target levels are unavailable." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <MiniMetric label="Stop / Invalidation" value={plan.wrongArea} tone="red" />
                <MiniMetric label="Targets" value={plan.targetArea || "NO DATA"} tone="green" />
                <div className="sm:col-span-2 rounded border border-[#142014] bg-[#0a0f0a] p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#6b7d6b]">Invalidation Condition</div>
                  <div className="mt-2 text-xs font-bold uppercase leading-5 text-[#a0b0a0]">{selected.invalidation || "NO DATA"}</div>
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card title="Risk Management" icon={<Activity className="h-3.5 w-3.5" />} className="border-[#142014] bg-[#111911]">
          {!selected || !plan ? (
            <EmptyState title="Risk Context Unavailable" reason="A complete existing execution plan is required." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MiniMetric label="Existing Risk Level" value={plan.riskLevel} tone={plan.riskLevel === "High" ? "red" : plan.riskLevel === "Medium" ? "amber" : "green"} />
              <MiniMetric label="Risk / Reward" value={selected.riskReward || "NO DATA"} tone="amber" />
              <MiniMetric label="Volatility Context" value={selected.volatilityNote || "NO DATA"} />
              <MiniMetric label="Position Sizing" value="UNAVAILABLE" sub="User account and risk inputs not supplied" />
            </div>
          )}
        </Card>

        <Card title="Execution Checklist" icon={<Save className="h-3.5 w-3.5" />} className="border-[#142014] bg-[#111911]">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <div className="grid gap-2">
              <div className="rounded border border-[#142014] bg-[#0a0f0a] p-2">
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#a0b0a0]">Candidate selected</span>{selected ? <StatusBadge label="CURRENT" tone="current" /> : <StatusBadge label="MISSING" tone="missing" />}</div>
              </div>
              <div className="rounded border border-[#142014] bg-[#0a0f0a] p-2">
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#a0b0a0]">Execution levels available</span>{plan ? <StatusBadge label="CURRENT" tone="current" /> : <StatusBadge label="MISSING" tone="missing" />}</div>
              </div>
              <div className="rounded border border-[#142014] bg-[#0a0f0a] p-2">
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#a0b0a0]">Replay validation supplied</span><StatusBadge label={inheritedValidationLabel} tone={inheritedValidationTone} /></div>
              </div>
              <div className="rounded border border-[#142014] bg-[#0a0f0a] p-2">
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#a0b0a0]">User risk inputs supplied</span><StatusBadge label="UNAVAILABLE" tone="unavailable" /></div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#142014] bg-[#0a0f0a] p-2">
                <div>
                  <div className="text-xs font-black uppercase text-[#d4dbd4]">
                    {savedSetups.length === 0
                      ? "No tracked setups yet. Track the selected setup to monitor it locally."
                      : selected ? `${selected.symbol} ${setupLabel(selected)}` : "NO SETUP SELECTED"}
                  </div>
                  <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#3d503d]">LocalStorage only. No backend. No exchange orders.</div>
                </div>
                <button
                  type="button"
                  onClick={trackSetup}
                  disabled={!selected || !plan}
                  className="rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 disabled:border-[#142014] disabled:bg-black/35 disabled:text-zinc-700"
                >
                  Track Setup
                </button>
              </div>
              {savedSetups.length > 0 && (
                <div className="grid gap-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#6b7d6b]">Local Tracked Setups</div>
                  {savedSetups.slice(0, 8).map((setup) => (
                    <article key={setup.id} className="grid gap-2 rounded border border-[#142014] bg-[#0a0f0a] p-2 lg:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                          <span className="text-[#d4dbd4]">{setup.symbol}</span>
                          <span className="text-cyan-100">{setup.direction}</span>
                          <span className="text-amber-100">{setup.status}</span>
                          <span className="text-[#3d503d]">{new Date(setup.createdTime).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 text-xs font-black uppercase text-[#a0b0a0]">{setup.setupType}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-[#6b7d6b]">
                          <span>Entry: {setup.entryArea}</span>
                          <span>Wrong: {setup.wrongArea}</span>
                          <span>Target: {setup.targetArea}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-start gap-1.5">
                        {(["Active", "Won", "Lost", "Expired"] as SetupStatus[]).map((status) => (
                          <button key={status} type="button" onClick={() => updateStatus(setup.id, status)} className="rounded border border-[#1c2c1c] bg-[#07120b] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#a0b0a0] hover:text-white">{status}</button>
                        ))}
                        <button type="button" onClick={() => deleteSetup(setup.id)} className="rounded border border-[#1c2c1c] bg-[#07120b] px-2 py-1 text-[#6b7d6b] hover:text-white" aria-label="Delete setup"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Trade Metadata" icon={<RadioTower className="h-3.5 w-3.5" />} className="border-[#142014] bg-[#0a0f0a]">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MiniMetric label="Symbol" value={activeSymbol} />
              <MiniMetric label="Candidate Source" value="Market Movers" sub={timeAgo(marketMovers?.updatedAt)} />
              <MiniMetric label="Tactical Alerts" value={marketMovers?.ok ? "CURRENT" : "NO DATA"} tone={marketMovers?.ok ? "green" : "amber"} />
              <MiniMetric label="Replay Validation" value={inheritedValidationLabel} />
              <MiniMetric label="Positioning" value={futuresSymbol ? pct(futuresSymbol.fundingRate * 100, 4) : displayDataReason(futuresReason)} tone="amber" />
              <MiniMetric label="Participation" value={compactUsd(futuresSymbol?.oiNotional)} tone="cyan" />
              <MiniMetric label="Market Activity" value={orderbookPressure.value} sub={orderbookPressure.reason} tone="cyan" />
              <MiniMetric label="Persistence" value="LOCAL ONLY" sub="No backend or exchange orders" />
            </div>
            <div className="rounded border border-[#142014] bg-[#07120b] p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#6b7d6b]">Local Outcome Memory</div>
                <StatusBadge label={combinedCompleted < 5 ? "PARTIAL" : "CURRENT"} tone={combinedCompleted < 5 ? "partial" : "current"} />
              </div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#3d503d]">Local setup history only. Not Replay validation.</div>
              {combinedCompleted < 5 ? (
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#6b7d6b]">Not enough completed setups yet: {combinedCompleted}/5</div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <MiniMetric label="Open" value={String(open + activeSetups.filter((setup) => setup.outcome === "OPEN").length)} tone="cyan" />
                  <MiniMetric label="Closed" value={String(combinedCompleted)} />
                  <MiniMetric label="Win Rate" value={winRate === null ? "NO DATA" : `${winRate}%`} tone="amber" />
                  <MiniMetric label="Average Outcome" value={pct(averageOutcome)} tone="cyan" />
                  <MiniMetric label="Wins" value={String(combinedWins)} tone="green" />
                  <MiniMetric label="Losses" value={String(combinedLosses)} tone="red" />
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Navigation Actions" icon={<Activity className="h-3.5 w-3.5" />} className="border-[#142014] bg-[#111911]">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <Link href="/research" className="rounded border border-[#1c2c1c] bg-[#0a0f0a] px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-300/40">
              Research
              <div className="mt-1 text-[9px] text-[#6b7d6b]">Need evidence context</div>
            </Link>
            <Link href="/replay" className="rounded border border-[#1c2c1c] bg-[#0a0f0a] px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100 transition hover:border-amber-300/40">
              Replay
              <div className="mt-1 text-[9px] text-[#6b7d6b]">Need historical validation</div>
            </Link>
            <Link href={marketHref} className="rounded border border-[#1c2c1c] bg-[#0a0f0a] px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-300/40">
              Markets
              <div className="mt-1 text-[9px] text-[#6b7d6b]">Inspect live structure</div>
            </Link>
            <Link href="/scanner" className="rounded border border-[#1c2c1c] bg-[#0a0f0a] px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#a0b0a0] transition hover:border-cyan-300/40">
              Scanner
              <div className="mt-1 text-[9px] text-[#6b7d6b]">Find a new opportunity</div>
            </Link>
            <Link href="/dashboard" className="rounded border border-[#1c2c1c] bg-[#0a0f0a] px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#a0b0a0] transition hover:border-amber-300/40">
              Dashboard
              <div className="mt-1 text-[9px] text-[#6b7d6b]">Return to monitoring</div>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  )
}
