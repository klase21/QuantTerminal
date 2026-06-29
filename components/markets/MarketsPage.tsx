"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Activity, AlertTriangle, BarChart3, BookOpen, Building2, Droplets, Gauge, Layers, LineChart, RadioTower, ShieldCheck, Zap } from "lucide-react"

import AdvancedChartModal from "@/components/charts/AdvancedChartModal"
import MarketCandleChart from "@/components/charts/MarketCandleChart"
import type { MarketMoversResponse, MarketMoverCandidate } from "@/lib/market-movers/types"
import type { MarketStructureIntelligenceResponse } from "@/core/market-structure/marketStructureTypes"
import type { RealMarketRotationResponse, SectorRotationSnapshot } from "@/core/marketDataTypes"
import type { SourceMetadataEnvelope } from "@/lib/data-governance"
import useDepthHeatmap from "@/hooks/useDepthHeatmap"
import useKlineSocket from "@/hooks/useKlineSocket"
import useMarketSocket from "@/hooks/useMarketSocket"
import useOrderbookSocket from "@/hooks/useOrderbookSocket"
import useTradeSocket from "@/hooks/useTradeSocket"
import {
  createContext,
  createMarketsToScannerContext,
  inspectContextCandidate,
  loadProductContext,
  type JsonObject,
  type ProductContextFreshness,
  type SharedProductContextV1,
} from "@/lib/product-context"
import { useMarketStore } from "@/stores/useMarketStore"

const MARKETS_SCANNER_CONTEXT_TTL_MS = 30 * 60 * 1000

type FuturesSymbol = {
  symbol: string
  openInterest: number
  markPrice: number
  oiNotional: number
  fundingRate: number
}

type FuturesResponse = {
  ok?: boolean
  source?: string
  mode?: string
  updatedAt?: string
  symbols?: FuturesSymbol[]
  notes?: string[]
}

type FuturesSymbolContextResponse = {
  ok?: boolean
  symbol?: string | null
  openInterest?: number | null
  openInterestTime?: number | null
  fundingRate?: number | null
  markPrice?: number | null
  indexPrice?: number | null
  oiNotional?: number | null
  nextFundingTime?: number | null
  source?: "binance-direct"
  reason?: string
}

type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

type Ticker24h = {
  highPrice?: string
  lowPrice?: string
  lastPrice?: string
  priceChangePercent?: string
}

type ReplayLiquidation = {
  timestamp: string
  side: string
  price: number | null
  size: number | null
  notional: number | null
  exchange?: string
  symbol?: string
}

type ReplayLiquidationResponse = {
  ok?: boolean
  source?: string
  exchange?: string
  symbol?: string
  liquidations?: ReplayLiquidation[]
  diagnostics?: {
    unavailable?: Array<{ dataset: string; reason: string }>
    errors?: Array<{ dataset: string; message: string }>
  }
  reason?: string
}

type LiquidationLoadState = "idle" | "loading" | "ready" | "unavailable" | "error" | "aborted"

type ExchangeComparisonResponse = {
  ok?: boolean
  symbol?: string
  updatedAt?: string
  binance?: {
    ok?: boolean
    source?: string
    fundingRate?: number
    openInterest?: number
    oiNotional?: number
    reason?: string
  }
  bybit?: {
    ok?: boolean
    source?: string
    fundingRate?: number
    openInterest?: number
    oiNotional?: number
    reason?: string
  }
  fundingRelationship?: string
  openInterestRelationship?: string
}

type InheritedDashboardContextState = {
  label: "LOADING" | "CURRENT" | "PARTIAL" | "STALE" | "DEGRADED" | "MISSING" | "UNAVAILABLE"
  detail: string
  context: SharedProductContextV1 | null
}

type EtfFlowResponse = {
  ok?: boolean
  source?: string
  updatedAt?: string
  _source?: SourceMetadataEnvelope
  flows?: Array<{
    asset: "BTC" | "ETH"
    latestDate: string
    sourceDate: string
    sourceTimestamp?: string
    netFlow: number
    unit: string
    trend1d?: "UP" | "DOWN" | "FLAT"
    isStale?: boolean
    staleReason?: string
  }>
  isStale?: boolean
  staleReason?: string
  unavailableReason?: string
}

type SectorRotationResponse = RealMarketRotationResponse & {
  _source?: SourceMetadataEnvelope
}

type ReserveIntelligenceResponse = {
  ok?: boolean
  status?: "available" | "unavailable"
  source?: string
  generatedAt?: string
  observedAt?: string | null
  freshness?: "current" | "stale" | "missing"
  coverage?: "full" | "partial" | "unavailable"
  observations?: Array<{
    asset: string
    observationType: string
    quality: string
    currentBalance?: number | null
    currentBalanceUsd?: number | null
    balanceChange?: number | null
    balanceUsdChange?: number | null
    balanceChangePct?: number | null
  }>
  reason?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function fmt(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function compactUsd(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

function pct(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}%`
}

function timeLabel(value: number) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function timeText(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" })
}

function displayDataReason(value?: string | null) {
  const text = value ?? ""
  if (/\b(403|451)\b/i.test(text) || /forbidden|restricted|unavailable for legal reasons/i.test(text)) {
    return "Exchange response blocked"
  }
  if (/timeout|abort/i.test(text)) return "Source timed out"
  if (/not responded/i.test(text)) return "Source waiting"
  if (/unavailable/i.test(text)) return "Source unavailable"
  return text || "Source unavailable"
}

function normalizeMarketSymbol(value: string | null | undefined) {
  const cleaned = value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!cleaned) return null
  return cleaned.endsWith("USDT") ? cleaned : `${cleaned}USDT`
}

function replayDateDefault() {
  const date = new Date()
  date.setUTCMinutes(0, 0, 0)
  date.setUTCHours(date.getUTCHours() - 24)
  const value = date.toISOString().slice(0, 10)
  return value < "2025-07-01" ? "2025-07-01" : value
}

function utcHourDefault() {
  const date = new Date()
  date.setUTCMinutes(0, 0, 0)
  date.setUTCHours(date.getUTCHours() - 24)
  return String(date.getUTCHours())
}

function replayDatasetReason(data: ReplayLiquidationResponse | null, fallback: string) {
  return data?.reason
    ?? data?.diagnostics?.unavailable?.find((item) => item.dataset === "liquidations" || item.dataset === "provider")?.reason
    ?? data?.diagnostics?.errors?.find((item) => item.dataset === "liquidations" || item.dataset === "provider")?.message
    ?? fallback
}

function missingFuturesReason(symbol: string, futures: FuturesResponse | null) {
  if (!futures) return "Futures API has not responded yet."
  if (futures.notes?.[0]) return displayDataReason(futures.notes[0])
  if (!futures.ok) return "Futures intelligence returned an unavailable status."
  if (!futures.symbols?.length) return "Futures intelligence returned no symbol rows."
  return "Funding/OI unavailable for selected symbol."
}

function marketStructureLabel(change24h: number | undefined, cvd: number, fundingRate: number | null) {
  const funding = fundingRate ?? 0
  if ((change24h ?? 0) > 0.35 && cvd > 0 && funding >= 0) return "BULLISH"
  if ((change24h ?? 0) < -0.35 && cvd < 0 && funding <= 0) return "BEARISH"
  return "NEUTRAL"
}

function Card({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col rounded-lg border border-zinc-900 bg-zinc-950/80 p-3", className)}>
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
          {icon}
          {title}
        </div>
      </div>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  sub,
  tone,
  size = "lg",
}: {
  label: string
  value: string
  sub?: string
  tone?: "green" | "red" | "cyan" | "amber"
  size?: "lg" | "md"
}) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className={cn(
        "mt-2 font-black uppercase leading-none text-white",
        size === "lg" ? "text-2xl" : "text-base",
        tone === "green" && "text-emerald-100",
        tone === "red" && "text-rose-100",
        tone === "cyan" && "text-cyan-100",
        tone === "amber" && "text-amber-100",
      )}>{value}</div>
      {sub && <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{sub}</div>}
    </div>
  )
}

function InlineStatus({
  label,
  value,
  tone,
  className,
}: {
  label: string
  value: string
  tone?: "green" | "red" | "cyan" | "amber"
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 rounded border border-zinc-900 bg-black/45 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.1em]", className)}>
      <span className="shrink-0 text-zinc-500">{label}:</span>
      <span className={cn(
        "truncate text-white",
        tone === "green" && "text-emerald-100",
        tone === "red" && "text-rose-100",
        tone === "cyan" && "text-cyan-100",
        tone === "amber" && "text-amber-100",
      )}>
        {value}
      </span>
    </div>
  )
}

function marketsContextFreshness(
  sectorRotation: SectorRotationResponse | null,
  marketStructure: MarketStructureIntelligenceResponse | null,
): ProductContextFreshness {
  const rotationFreshness = sectorRotation?._source?.freshnessStatus
  if (rotationFreshness === "STALE") return "STALE"
  if (
    (rotationFreshness === "LIVE" || rotationFreshness === "CURRENT")
    && sectorRotation?._source?.sourceStatus === "DEGRADED"
  ) return "UNKNOWN"
  if (rotationFreshness === "LIVE" || rotationFreshness === "CURRENT" || marketStructure?.ok) return "CURRENT"
  return "UNAVAILABLE"
}

function marketsScannerContextId(createdAt: Date) {
  const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${createdAt.getTime()}-${Math.abs(createdAt.getTimezoneOffset())}`
  return `markets-scanner-${suffix}`
}

function scannerHrefWithContext(
  symbol: string,
  exchange: string,
  timeframe: string,
  contextId?: string,
) {
  const params = new URLSearchParams({ symbol, exchange, timeframe, source: "markets" })
  if (contextId) params.set("contextId", contextId)
  return `/scanner?${params.toString()}`
}

function dashboardContextValue(value: JsonObject | undefined, key: string) {
  const candidate = value?.[key]
  if (typeof candidate === "string" && candidate.trim()) return candidate
  if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate)
  return "UNAVAILABLE"
}

function dashboardContextArrayCount(value: JsonObject | undefined, key: string) {
  const candidate = value?.[key]
  return Array.isArray(candidate) ? candidate.length : 0
}

function StatusBadge({
  label,
  tone = "missing",
}: {
  label: "CURRENT" | "VERIFIED" | "PARTIAL" | "DEGRADED" | "STALE" | "LOADING" | "MISSING" | "UNAVAILABLE"
  tone?: "verified" | "partial" | "stale" | "missing" | "loading"
}) {
  return (
    <span className={cn(
      "inline-flex items-center rounded border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]",
      tone === "verified" && "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
      tone === "partial" && "border-amber-300/35 bg-amber-400/10 text-amber-100",
      tone === "stale" && "border-yellow-300/30 bg-yellow-400/10 text-yellow-100",
      tone === "loading" && "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
      tone === "missing" && "border-zinc-800 bg-black/35 text-zinc-500",
    )}>
      {label}
    </span>
  )
}

function SectionHeader({
  title,
  subtitle,
  status,
}: {
  title: string
  subtitle?: string
  status?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100">{title}</div>
        {subtitle && <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">{subtitle}</div>}
      </div>
      {status}
    </div>
  )
}

function MarketsSection({
  title,
  subtitle,
  icon,
  status,
  children,
  className,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  status?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-lg border border-amber-300/15 bg-[#0c140c]/90 p-3", className)}>
      <div className="mb-3 flex items-start gap-2">
        {icon && <div className="mt-0.5 text-cyan-200">{icon}</div>}
        <div className="min-w-0 flex-1">
          <SectionHeader title={title} subtitle={subtitle} status={status} />
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded border border-zinc-900 bg-black/40 p-4 text-center">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{title}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-700">{reason}</div>
    </div>
  )
}

function apiStatus(ok?: boolean, partial?: boolean, stale?: boolean) {
  if (stale) return <StatusBadge label="STALE" tone="stale" />
  if (partial) return <StatusBadge label="PARTIAL" tone="partial" />
  if (ok) return <StatusBadge label="CURRENT" tone="verified" />
  return <StatusBadge label="UNAVAILABLE" />
}

function opportunityTone(candidate: Pick<MarketMoverCandidate, "direction" | "qualityState">) {
  if (candidate.qualityState === "TOO_LATE" || candidate.qualityState === "LOW_LIQUIDITY") return "text-amber-100"
  if (candidate.direction === "LONG") return "text-emerald-100"
  if (candidate.direction === "SHORT") return "text-rose-100"
  return "text-zinc-300"
}

function LiquidationBiasCard({
  longNotional,
  shortNotional,
  state,
}: {
  longNotional: number
  shortNotional: number
  state: LiquidationLoadState
}) {
  const total = longNotional + shortNotional
  const longPct = total > 0 ? Math.round((longNotional / total) * 100) : null
  const shortPct = total > 0 ? 100 - (longPct ?? 0) : null

  return (
    <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Market Liq Bias</div>
      {state === "loading" || state === "idle" ? (
        <>
          <div className="mt-2 text-2xl font-black uppercase leading-none text-zinc-300">LOADING</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600">Selected symbol history</div>
        </>
      ) : total > 0 && longPct !== null && shortPct !== null ? (
        <>
          <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em]">
            <span className="text-emerald-100">Longs Hit {longPct}%</span>
            <span className="text-rose-100">Shorts Hit {shortPct}%</span>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-zinc-900">
            <div className="bg-emerald-400/80" style={{ width: `${longPct}%` }} />
            <div className="bg-rose-400/80" style={{ width: `${shortPct}%` }} />
          </div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{compactUsd(total)} / selected symbol history</div>
        </>
      ) : (
        <>
          <div className="mt-2 text-2xl font-black uppercase leading-none text-zinc-500">NO LIQ DATA</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600">Selected symbol history</div>
        </>
      )}
    </div>
  )
}

function ChartPreview({
  candles,
  symbol,
  timeframe,
  onOpen,
}: {
  candles: Candle[]
  symbol: string
  timeframe: string
  onOpen: () => void
}) {
  const hasVolume = candles.some((candle) => Number.isFinite(candle.volume) && (candle.volume ?? 0) > 0)

  return (
    <div className="flex min-h-[390px] flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-900 bg-black/40 px-3 py-2">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.12em] text-white">{symbol}</div>
          <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">Binance Futures / {timeframe} candles</div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="rounded border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 hover:border-cyan-200 hover:bg-cyan-300/15"
        >
          Open Advanced Chart
        </button>
      </div>
      <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-md border border-zinc-900 bg-black">
        <MarketCandleChart candles={candles} minHeight={320} />
        {!candles.length && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center">
            <div className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">NO CANDLE DATA</div>
            <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-700">Waiting for Binance kline history or stream</div>
          </div>
        )}
        {candles.length > 0 && !hasVolume && (
          <div className="pointer-events-none absolute bottom-2 left-2 rounded border border-zinc-900 bg-black/75 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
            NO VOLUME DATA
          </div>
        )}
      </div>
    </div>
  )
}

function OrderbookDepth({ orderbook, depthFrames }: { orderbook: ReturnType<typeof useMarketStore.getState>["orderbook"]; depthFrames: ReturnType<typeof useDepthHeatmap> }) {
  const bids = orderbook?.bids ?? []
  const asks = orderbook?.asks ?? []
  const bestBid = bids[0]?.price
  const bestAsk = asks[0]?.price
  const spread = Number.isFinite(bestBid) && Number.isFinite(bestAsk) ? bestAsk - bestBid : null
  const latestDepth = depthFrames[depthFrames.length - 1]

  return (
    <Card title="Orderbook / Depth" icon={<BookOpen className="h-3.5 w-3.5" />} className="min-h-[438px]">
      <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
        <span>Spread</span>
        <span className="text-cyan-100">{spread === null ? "NO DATA" : fmt(spread, 4)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">Bids</div>
          {bids.slice(0, 12).map((bid) => (
            <div key={`bid-${bid.price}`} className="flex justify-between rounded bg-emerald-400/5 px-2 py-1 text-[11px] font-bold">
              <span className="text-emerald-100">{fmt(bid.price, 2)}</span>
              <span className="text-zinc-400">{fmt(bid.quantity, 3)}</span>
            </div>
          ))}
          {!bids.length && <div className="rounded border border-zinc-900 bg-black/40 p-4 text-center text-xs font-black text-zinc-600">NO BID DATA</div>}
        </div>
        <div className="grid gap-1">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-rose-200">Asks</div>
          {asks.slice(0, 12).map((ask) => (
            <div key={`ask-${ask.price}`} className="flex justify-between rounded bg-rose-400/5 px-2 py-1 text-[11px] font-bold">
              <span className="text-rose-100">{fmt(ask.price, 2)}</span>
              <span className="text-zinc-400">{fmt(ask.quantity, 3)}</span>
            </div>
          ))}
          {!asks.length && <div className="rounded border border-zinc-900 bg-black/40 p-4 text-center text-xs font-black text-zinc-600">NO ASK DATA</div>}
        </div>
      </div>
      <div className="mt-3 rounded border border-zinc-900 bg-black/40 p-2">
        <div className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Depth View</div>
        {latestDepth ? (
          <div className="grid gap-1">
            {[...latestDepth.asks.slice(0, 5).reverse(), ...latestDepth.bids.slice(0, 5)].map((level, index) => (
              <div key={`${level.side}-${level.price}-${index}`} className="grid grid-cols-[80px_1fr_64px] items-center gap-2 text-[10px] font-bold">
                <span className={level.side === "bid" ? "text-emerald-100" : "text-rose-100"}>{fmt(level.price, 2)}</span>
                <div className="h-1.5 rounded bg-zinc-900">
                  <div className={cn("h-full rounded", level.side === "bid" ? "bg-emerald-400/60" : "bg-rose-400/60")} style={{ width: `${Math.min(100, level.liquidity * 8)}%` }} />
                </div>
                <span className="text-right text-zinc-500">{fmt(level.liquidity, 2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">NO DEPTH DATA</div>
        )}
      </div>
    </Card>
  )
}

function SelectedSymbolLiquidations({
  symbol,
  onSummary,
  onStateChange,
}: {
  symbol: string
  onSummary?: (summary: { longNotional: number; shortNotional: number }) => void
  onStateChange?: (state: LiquidationLoadState) => void
}) {
  const [liqDate, setLiqDate] = useState(replayDateDefault)
  const [liqHour, setLiqHour] = useState(utcHourDefault)
  const [liquidationHistory, setLiquidationHistory] = useState<ReplayLiquidationResponse | null>(null)
  const [liquidationState, setLiquidationState] = useState<LiquidationLoadState>("idle")
  const [liquidationHistoryReason, setLiquidationHistoryReason] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    onStateChange?.(liquidationState)
  }, [liquidationState, onStateChange])

  useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 7000)

    async function loadLiquidationHistory() {
      setLiquidationState("loading")
      setLiquidationHistoryReason(null)
      setLiquidationHistory(null)
      console.debug("Markets liquidation request", { symbol, date: liqDate, hour: liqHour, state: "loading" })
      try {
        const params = new URLSearchParams({
          exchange: "binance_futures",
          symbol,
          date: liqDate,
          hour: liqHour,
          datasets: "liquidations",
        })
        const response = await fetch(`/api/replay/cryptohftdata?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await response.json() as ReplayLiquidationResponse
        if (!active || requestIdRef.current !== requestId || controller.signal.aborted) return
        if (!response.ok) {
          setLiquidationHistory(null)
          setLiquidationHistoryReason(replayDatasetReason(payload, "Liquidation history unavailable for selected symbol/window."))
          setLiquidationState("unavailable")
          console.debug("Markets liquidation request", { symbol, date: liqDate, hour: liqHour, state: "unavailable", reason: replayDatasetReason(payload, "Liquidation history unavailable for selected symbol/window.") })
          return
        }
        setLiquidationHistory(payload)
        if (!payload.liquidations?.length) {
          setLiquidationHistoryReason(replayDatasetReason(payload, "Liquidation history unavailable for selected symbol/window."))
          setLiquidationState("unavailable")
          console.debug("Markets liquidation request", { symbol, date: liqDate, hour: liqHour, state: "unavailable", reason: replayDatasetReason(payload, "Liquidation history unavailable for selected symbol/window.") })
          return
        }
        setLiquidationState("ready")
        console.debug("Markets liquidation request", { symbol, date: liqDate, hour: liqHour, state: "ready", rows: payload.liquidations.length })
      } catch (error) {
        if (!active || requestIdRef.current !== requestId) return
        if (controller.signal.aborted) {
          setLiquidationHistory(null)
          setLiquidationHistoryReason(timedOut ? "Liquidation history request timed out." : "Liquidation history request was cancelled.")
          setLiquidationState(timedOut ? "unavailable" : "aborted")
          console.debug("Markets liquidation request", { symbol, date: liqDate, hour: liqHour, state: timedOut ? "unavailable" : "aborted", reason: timedOut ? "Liquidation history request timed out." : "Liquidation history request was cancelled." })
          return
        }
        setLiquidationHistory(null)
        setLiquidationHistoryReason(displayDataReason(error instanceof Error ? error.message : "Liquidation history unavailable for selected symbol/window."))
        setLiquidationState("error")
        console.debug("Markets liquidation request", { symbol, date: liqDate, hour: liqHour, state: "error", reason: displayDataReason(error instanceof Error ? error.message : "Liquidation history unavailable for selected symbol/window.") })
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void loadLiquidationHistory()
    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [liqDate, liqHour, symbol])

  const selectedLiquidations = liquidationHistory?.liquidations ?? []
  const recentSelectedLiquidations = [...selectedLiquidations]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 14)
  const longLiquidationNotional = selectedLiquidations.filter((item) => item.side.toLowerCase() === "long").reduce((sum, item) => sum + (item.notional ?? 0), 0)
  const shortLiquidationNotional = selectedLiquidations.filter((item) => item.side.toLowerCase() === "short").reduce((sum, item) => sum + (item.notional ?? 0), 0)
  const totalLiquidationNotional = longLiquidationNotional + shortLiquidationNotional
  const unavailableReason = liquidationHistoryReason ?? replayDatasetReason(liquidationHistory, "No decoded liquidation rows returned.")

  useEffect(() => {
    if (liquidationState === "ready") {
      onSummary?.({ longNotional: longLiquidationNotional, shortNotional: shortLiquidationNotional })
      return
    }
    onSummary?.({ longNotional: 0, shortNotional: 0 })
  }, [liquidationState, longLiquidationNotional, onSummary, shortLiquidationNotional])

  const totalValue = liquidationState === "ready" ? compactUsd(totalLiquidationNotional) : liquidationState === "loading" ? "LOADING" : "NO DATA"
  const longValue = liquidationState === "ready" ? compactUsd(longLiquidationNotional) : liquidationState === "loading" ? "LOADING" : "NO DATA"
  const shortValue = liquidationState === "ready" ? compactUsd(shortLiquidationNotional) : liquidationState === "loading" ? "LOADING" : "NO DATA"
  const biasValue = liquidationState === "ready"
    ? totalLiquidationNotional === 0
      ? "NO DATA"
      : longLiquidationNotional > shortLiquidationNotional
        ? "LONG"
        : shortLiquidationNotional > longLiquidationNotional
          ? "SHORT"
          : "BALANCED"
    : liquidationState === "loading"
      ? "LOADING"
      : "NO DATA"

  return (
    <Card title="Selected Symbol Liquidations" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
      <div className="mb-2 grid gap-2 lg:grid-cols-[130px_1fr_96px_96px]">
        <div className="rounded border border-zinc-800 bg-black px-2 py-1.5 text-[10px] font-black uppercase text-cyan-100">Binance Futures</div>
        <input type="date" min="2025-07-01" value={liqDate} onChange={(event) => setLiqDate(event.target.value)} className="rounded border border-zinc-800 bg-black px-2 py-1.5 text-[10px] font-black uppercase text-white" />
        <select value={liqHour} onChange={(event) => setLiqHour(event.target.value)} className="rounded border border-zinc-800 bg-black px-2 py-1.5 text-[10px] font-black uppercase text-white">
          {Array.from({ length: 24 }, (_, index) => <option key={index} value={String(index)}>{String(index).padStart(2, "0")}:00</option>)}
        </select>
        <div className="rounded border border-zinc-900 bg-black/45 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{liquidationState === "loading" ? "Loading" : symbol}</div>
      </div>
      <div className="mb-2 grid grid-cols-4 gap-1.5">
        <InlineStatus label="Total" value={totalValue} tone="amber" />
        <InlineStatus label="Long" value={longValue} tone="green" />
        <InlineStatus label="Short" value={shortValue} tone="red" />
        <InlineStatus label="Bias" value={biasValue} tone="cyan" />
      </div>
      <div className="grid gap-1">
        <div className="grid grid-cols-[72px_64px_1fr_80px_92px] rounded border border-zinc-900 bg-black/60 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
          <span>Time</span>
          <span>Side</span>
          <span>Price</span>
          <span className="text-right">Size</span>
          <span className="text-right">Notional</span>
        </div>
        {liquidationState === "ready" && recentSelectedLiquidations.map((liq, index) => (
          <div key={`${liq.timestamp}-${index}`} className="grid grid-cols-[72px_64px_1fr_80px_92px] rounded border border-zinc-900 bg-black/35 px-2 py-1 text-[11px] font-bold">
            <span className="text-zinc-500">{timeText(liq.timestamp)}</span>
            <span className={liq.side.toLowerCase() === "long" ? "text-emerald-100" : "text-rose-100"}>{liq.side.toUpperCase()}</span>
            <span className="text-zinc-300">{fmt(liq.price, 2)}</span>
            <span className="text-right text-zinc-500">{fmt(liq.size, 4)}</span>
            <span className="text-right text-zinc-400">{compactUsd(liq.notional)}</span>
          </div>
        ))}
        {liquidationState === "loading" && (
          <div className="rounded border border-zinc-900 bg-black/40 p-4 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
            Loading selected symbol liquidation history.
          </div>
        )}
        {liquidationState === "idle" && (
          <div className="rounded border border-zinc-900 bg-black/40 p-4 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
            Preparing liquidation history request.
          </div>
        )}
        {(liquidationState === "unavailable" || liquidationState === "error" || liquidationState === "aborted") && (
          <div className="rounded border border-zinc-900 bg-black/40 p-4 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
            Liquidation history unavailable for selected symbol/window.
            <span className="mt-2 block text-[10px] text-zinc-700">{unavailableReason}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function MarketsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [symbol, setSymbol] = useState("BTCUSDT")
  const [futures, setFutures] = useState<FuturesResponse | null>(null)
  const [directFutures, setDirectFutures] = useState<FuturesSymbolContextResponse | null>(null)
  const [ticker24h, setTicker24h] = useState<Ticker24h | null>(null)
  const [ticker24hReason, setTicker24hReason] = useState<string | null>(null)
  const [previousOi, setPreviousOi] = useState<Record<string, number>>({})
  const [advancedChartOpen, setAdvancedChartOpen] = useState(false)
  const [liquidationSummary, setLiquidationSummary] = useState({ longNotional: 0, shortNotional: 0 })
  const [liquidationLoadState, setLiquidationLoadState] = useState<LiquidationLoadState>("idle")
  const [marketMovers, setMarketMovers] = useState<MarketMoversResponse | null>(null)
  const [marketMoversReason, setMarketMoversReason] = useState<string | null>(null)
  const [sectorRotation, setSectorRotation] = useState<SectorRotationResponse | null>(null)
  const [sectorRotationReason, setSectorRotationReason] = useState<string | null>(null)
  const [exchangeComparison, setExchangeComparison] = useState<ExchangeComparisonResponse | null>(null)
  const [exchangeComparisonReason, setExchangeComparisonReason] = useState<string | null>(null)
  const [marketStructure, setMarketStructure] = useState<MarketStructureIntelligenceResponse | null>(null)
  const [marketStructureReason, setMarketStructureReason] = useState<string | null>(null)
  const [etfFlow, setEtfFlow] = useState<EtfFlowResponse | null>(null)
  const [etfFlowReason, setEtfFlowReason] = useState<string | null>(null)
  const [reserveIntelligence, setReserveIntelligence] = useState<ReserveIntelligenceResponse | null>(null)
  const [reserveReason, setReserveReason] = useState<string | null>(null)
  const tickers = useMarketStore((state) => state.tickers)
  const orderbook = useMarketStore((state) => state.orderbook)
  const requestedSymbol = normalizeMarketSymbol(searchParams.get("symbol"))
  const productContextId = searchParams.get("contextId")?.trim() || null
  const signalSource = searchParams.get("source")
  const signalSetup = searchParams.get("setup")
  const signalDirection = searchParams.get("direction")
  const signalConfidence = searchParams.get("confidence")
  const signalReason = searchParams.get("reason")
  const effectiveSource = signalSource ?? "default-market-view"
  const selectedExchange = searchParams.get("exchange") ?? "binance_futures"
  const selectedTimeframe = searchParams.get("timeframe") ?? "1m"
  const hasSignalContext = Boolean(signalSource || signalSetup || signalDirection || signalConfidence || signalReason)
  const ticker = tickers[symbol]
  const candles = useKlineSocket(symbol, "1m")
  const { trades } = useTradeSocket(symbol)
  const depthFrames = useDepthHeatmap(symbol)
  const [inheritedDashboardContext, setInheritedDashboardContext] = useState<InheritedDashboardContextState>({
    label: productContextId ? "LOADING" : "UNAVAILABLE",
    detail: productContextId
      ? "Loading inherited Dashboard context."
      : "No shared contextId supplied. Direct Markets remains available.",
    context: null,
  })

  useMarketSocket()
  useOrderbookSocket(symbol)

  useEffect(() => {
    if (!requestedSymbol) return
    setSymbol(requestedSymbol)
  }, [requestedSymbol])

  useEffect(() => {
    if (!productContextId) {
      setInheritedDashboardContext({
        label: "UNAVAILABLE",
        detail: "No shared contextId supplied. Direct Markets remains available.",
        context: null,
      })
      return
    }

    setInheritedDashboardContext({
      label: "LOADING",
      detail: "Loading inherited Dashboard context.",
      context: null,
    })
    const loaded = loadProductContext(productContextId)
    if (loaded.success === false) {
      setInheritedDashboardContext({ label: "UNAVAILABLE", detail: loaded.error.message, context: null })
      return
    }

    const lifecycle = inspectContextCandidate(loaded.value)
    if (lifecycle.status !== "SUCCESS" || !lifecycle.value) {
      setInheritedDashboardContext({
        label: "UNAVAILABLE",
        detail: lifecycle.issues[0]?.message ?? "Shared Dashboard context is not active.",
        context: null,
      })
      return
    }
    if (lifecycle.value.sourcePage !== "dashboard" || lifecycle.value.destinationIntent !== "explore_market") {
      setInheritedDashboardContext({
        label: "UNAVAILABLE",
        detail: "Shared context does not describe a Dashboard to Markets handoff.",
        context: null,
      })
      return
    }

    const inheritedFreshness = lifecycle.value.freshness?.freshness ?? "UNKNOWN"
    const label = inheritedFreshness === "STALE"
      ? "STALE" as const
      : inheritedFreshness === "UNAVAILABLE" || inheritedFreshness === "MISSING"
        ? "UNAVAILABLE" as const
        : lifecycle.value.confidenceContext || lifecycle.value.evidenceSummary
          ? inheritedFreshness === "CURRENT" ? "CURRENT" as const : "PARTIAL" as const
          : "PARTIAL" as const
    setInheritedDashboardContext({
      label,
      detail: "Dashboard conclusion context loaded for display only. Markets exploration remains independent.",
      context: lifecycle.value,
    })
  }, [productContextId])

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadJson<T>(
      url: string,
      setData: (value: T | null) => void,
      setReason: (value: string | null) => void,
    ) {
      setReason(null)
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal })
        const payload = await response.json() as T
        if (!active || controller.signal.aborted) return
        if (!response.ok) {
          setData(null)
          setReason(`Request returned ${response.status}`)
          return
        }
        setData(payload)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        setData(null)
        setReason(displayDataReason(error instanceof Error ? error.message : "Source unavailable."))
      }
    }

    void loadJson<MarketMoversResponse>(
      `/api/market/movers?focus=${encodeURIComponent(symbol)}`,
      setMarketMovers,
      setMarketMoversReason,
    )
    void loadJson<SectorRotationResponse>(
      "/api/market/sector-rotation",
      setSectorRotation,
      setSectorRotationReason,
    )
    void loadJson<ExchangeComparisonResponse>(
      `/api/market/exchange-comparison?symbol=${encodeURIComponent(symbol)}`,
      setExchangeComparison,
      setExchangeComparisonReason,
    )
    void loadJson<MarketStructureIntelligenceResponse>(
      "/api/intelligence/market-structure",
      setMarketStructure,
      setMarketStructureReason,
    )
    void loadJson<EtfFlowResponse>(
      "/api/etf-flow",
      setEtfFlow,
      setEtfFlowReason,
    )
    void loadJson<ReserveIntelligenceResponse>(
      `/api/dashboard/reserve-intelligence?symbol=${encodeURIComponent(symbol)}`,
      setReserveIntelligence,
      setReserveReason,
    )

    return () => {
      active = false
      controller.abort()
    }
  }, [symbol])

  useEffect(() => {
    let active = true
    let currentController: AbortController | null = null
    async function loadTicker24h() {
      const controller = new AbortController()
      currentController = controller
      const timeout = window.setTimeout(() => controller.abort(), 5000)
      try {
        setTicker24h(null)
        setTicker24hReason(null)
        const response = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store", signal: controller.signal })
        if (!response.ok) throw new Error(`Binance 24h ticker returned ${response.status}`)
        const payload = await response.json()
        if (active && !controller.signal.aborted) setTicker24h(payload)
      } catch (error) {
        if (active && !controller.signal.aborted) setTicker24hReason(displayDataReason(error instanceof Error ? error.message : "Binance 24h range unavailable"))
      } finally {
        window.clearTimeout(timeout)
      }
    }
    void loadTicker24h()
    const timer = setInterval(loadTicker24h, 30000)
    return () => {
      active = false
      currentController?.abort()
      clearInterval(timer)
    }
  }, [symbol])

  useEffect(() => {
    let active = true
    let currentController: AbortController | null = null
    async function loadFutures() {
      const controller = new AbortController()
      currentController = controller
      const timeout = window.setTimeout(() => controller.abort(), 5000)
      try {
        const response = await fetch(`/api/market/futures-intelligence?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store", signal: controller.signal })
        const payload = await response.json()
        if (active && !controller.signal.aborted) setFutures(payload)
      } catch {
        if (active && !controller.signal.aborted) setFutures({ ok: false, notes: ["Futures intelligence unavailable"] })
      } finally {
        window.clearTimeout(timeout)
      }
    }
    void loadFutures()
    const timer = setInterval(loadFutures, 30000)
    return () => {
      active = false
      currentController?.abort()
      clearInterval(timer)
    }
  }, [symbol])

  const futuresSymbol = futures?.symbols?.find((item) => item.symbol === symbol)
  const aggregateFundingRate = Number.isFinite(futuresSymbol?.fundingRate) ? futuresSymbol?.fundingRate ?? null : null
  const aggregateOiNotional = Number.isFinite(futuresSymbol?.oiNotional) ? futuresSymbol?.oiNotional ?? null : null
  const needsDirectFutures = !futuresSymbol || aggregateFundingRate === null || aggregateOiNotional === null

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setDirectFutures(null)

    if (!needsDirectFutures) {
      return () => {
        active = false
        controller.abort()
      }
    }

    async function loadDirectFutures() {
      const timeout = window.setTimeout(() => controller.abort(), 5000)
      try {
        const response = await fetch(`/api/market/futures-symbol-context?symbol=${encodeURIComponent(symbol)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = await response.json() as FuturesSymbolContextResponse
        if (!active || controller.signal.aborted) return
        setDirectFutures(payload)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        setDirectFutures({
          ok: false,
          symbol,
          reason: displayDataReason(error instanceof Error ? error.message : "Funding/OI unavailable for selected symbol."),
          source: "binance-direct",
        })
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void loadDirectFutures()
    return () => {
      active = false
      controller.abort()
    }
  }, [aggregateFundingRate, aggregateOiNotional, needsDirectFutures, symbol])

  const directMatchesSymbol = directFutures?.symbol === symbol
  const directFundingRate = directMatchesSymbol && directFutures?.ok && Number.isFinite(directFutures.fundingRate)
    ? directFutures.fundingRate ?? null
    : null
  const directOiNotional = directMatchesSymbol && directFutures?.ok && Number.isFinite(directFutures.oiNotional)
    ? directFutures.oiNotional ?? null
    : null
  const liveFundingRate = aggregateFundingRate ?? directFundingRate
  const liveOiNotional = aggregateOiNotional ?? directOiNotional
  const liveFundingReason = liveFundingRate !== null
    ? (aggregateFundingRate !== null ? "Binance futures" : "Binance direct")
    : "Funding unavailable for selected symbol."
  const liveOiSource = liveOiNotional !== null
    ? (aggregateOiNotional !== null ? "Binance futures" : "Binance direct")
    : null
  const liveOiReason = liveOiNotional !== null
    ? liveOiSource
    : directFutures?.reason ?? missingFuturesReason(symbol, futures)

  useEffect(() => {
    console.debug("Markets futures trace", {
      selectedSymbol: symbol,
      requestSymbol: requestedSymbol ?? "BTCUSDT",
      responseSymbol: futuresSymbol?.symbol ?? null,
      responseSymbolCount: futures?.symbols?.length ?? 0,
      directSymbol: directFutures?.symbol ?? null,
      directOk: directFutures?.ok ?? null,
      fundingSource: aggregateFundingRate !== null ? "aggregate" : directFundingRate !== null ? "direct" : "unavailable",
      oiSource: aggregateOiNotional !== null ? "aggregate" : directOiNotional !== null ? "direct" : "unavailable",
    })
  }, [aggregateFundingRate, aggregateOiNotional, directFundingRate, directFutures?.ok, directFutures?.symbol, directOiNotional, futures?.symbols, futuresSymbol?.symbol, requestedSymbol, symbol])
  const buyVolume = trades.filter((trade) => trade.side === "buy").reduce((sum, trade) => sum + trade.qty, 0)
  const sellVolume = trades.filter((trade) => trade.side === "sell").reduce((sum, trade) => sum + trade.qty, 0)
  const cvd = buyVolume - sellVolume
  const sourceStatus = useMemo(() => {
    const parts = [
      ticker ? "Binance Ticker Live" : "Binance Ticker No Data",
      orderbook ? "Orderbook Live" : "Orderbook No Data",
      trades.length ? "Trades Live" : "Trades Waiting",
      liveFundingRate !== null || liveOiNotional !== null ? "Funding/OI Live" : "Funding/OI No Data",
    ]
    return parts.join(" / ")
  }, [liveFundingRate, liveOiNotional, ticker, orderbook, trades.length])
  const rangeHigh = Number(ticker24h?.highPrice)
  const rangeLow = Number(ticker24h?.lowPrice)
  const rangeValue = Number.isFinite(rangeHigh) && Number.isFinite(rangeLow) ? `${fmt(rangeLow, 2)} - ${fmt(rangeHigh, 2)}` : "NO DATA"
  const currentOi = liveOiNotional
  const previousSymbolOi = previousOi[symbol]
  const oiTrend = currentOi === null || currentOi === undefined
    ? { label: "NO DATA", reason: liveOiReason }
    : previousSymbolOi === undefined
      ? { label: "NO DATA", reason: "Waiting for next OI refresh" }
      : Math.abs(currentOi - previousSymbolOi) / Math.max(previousSymbolOi, 1) < 0.005
        ? { label: "Stable", reason: "No major OI change" }
        : currentOi > previousSymbolOi
          ? { label: "Increasing", reason: "Open interest rising this session" }
          : { label: "Decreasing", reason: "Open interest falling this session" }
  const liquidationRead: string = "NO DATA"
  const structureRead = marketStructureLabel(ticker?.change24h, cvd, liveFundingRate)
  const hasStructureInputs = Boolean(ticker && trades.length && liveFundingRate !== null)
  const structureValue = hasStructureInputs ? structureRead : "INSUFFICIENT DATA"
  const structureReason = hasStructureInputs ? "Price + flow + funding" : "Needs price, trades, and funding"

  useEffect(() => {
    if (currentOi === null || currentOi === undefined) return
    setPreviousOi((prev) => prev[symbol] === undefined ? { ...prev, [symbol]: currentOi } : prev)
  }, [currentOi, symbol])

  const marketMoverRows = marketMovers?.candidates?.length
    ? marketMovers.candidates
    : marketMovers?.suppressed?.slice(0, 4) ?? []
  const sectorFreshness = sectorRotation?._source?.freshnessStatus ?? "UNAVAILABLE"
  const sectorUsable = sectorFreshness === "LIVE" || sectorFreshness === "CURRENT" || sectorFreshness === "STALE"
  const sectorPartial = sectorRotation?._source?.sourceStatus === "DEGRADED" && sectorFreshness !== "STALE"
  const sectorUnavailableReason = sectorRotation?.notes?.[0]
    ?? sectorRotation?._source?.unavailableReason
    ?? sectorRotationReason
  const topSectors = sectorUsable ? sectorRotation?.sectors?.slice(0, 4) ?? [] : []
  const sectorAssets = sectorUsable ? sectorRotation?.assets ?? [] : []
  const advancingAssets = sectorAssets.filter((asset) => asset.priceChange24h > 0).length
  const decliningAssets = sectorAssets.filter((asset) => asset.priceChange24h < 0).length
  const mappedAssets = sectorUsable ? sectorRotation?.coverage?.mappedAssets ?? sectorAssets.length : 0
  const breadthState = mappedAssets
    ? advancingAssets > decliningAssets ? "BROAD BID" : decliningAssets > advancingAssets ? "BROAD OFFER" : "MIXED"
    : "UNAVAILABLE"
  const topStructureSectors = marketStructure?.sectors?.slice(0, 3) ?? []
  const etfRows = etfFlow?.flows ?? []
  const etfFreshness = etfFlow?._source?.freshnessStatus ?? (etfFlow?.isStale ? "STALE" : "UNAVAILABLE")
  const etfPartial = etfFlow?._source?.sourceStatus === "DEGRADED" && etfFreshness !== "STALE"
  const reserveRows = reserveIntelligence?.observations ?? []
  const marketMoverSuppressed = marketMovers?.suppressed?.slice(0, 5) ?? []
  const selectedAsset = symbol.replace(/USDT$/, "")
  const selectedEtf = etfRows.find((row) => row.asset === selectedAsset)
  const selectedReserve = reserveRows.find((row) => row.asset?.toUpperCase() === selectedAsset)
  const discoveryHealth = [
    marketMovers?.ok,
    sectorUsable,
    exchangeComparison?.ok,
    marketStructure?.ok,
    etfFlow?.ok,
    reserveIntelligence?.status === "available",
  ].filter(Boolean).length
  const discoveryHealthLabel = discoveryHealth >= 4 ? "CURRENT" : discoveryHealth >= 2 ? "PARTIAL" : discoveryHealth === 1 ? "DEGRADED" : "UNAVAILABLE"
  const discoveryHealthTone = discoveryHealth >= 4 ? "verified" : discoveryHealth >= 2 ? "partial" : discoveryHealth === 1 ? "stale" : "missing"
  const inheritedDashboard = inheritedDashboardContext.context
  const inheritedDirection = dashboardContextValue(inheritedDashboard?.confidenceContext?.value, "direction")
  const inheritedDriverCount = dashboardContextValue(inheritedDashboard?.evidenceSummary?.value, "driverCount")
  const inheritedEvidenceCount = dashboardContextArrayCount(inheritedDashboard?.evidenceSummary?.value, "primaryDrivers")
  const inheritedFreshness = inheritedDashboard?.freshness?.freshness ?? "UNAVAILABLE"

  function openScannerWithSharedContext() {
    const createdAt = new Date()
    const createdAtIso = createdAt.toISOString()
    const freshness = marketsContextFreshness(sectorRotation, marketStructure)
    const topSector = topSectors[0] ?? marketStructure?.topSector
    const usesSectorRotation = Boolean(topSectors[0])
    const observedAtSource = usesSectorRotation ? sectorRotation?._source?.lastUpdatedAt : marketStructure?.updatedAt
    const observedAt = observedAtSource && Number.isFinite(Date.parse(observedAtSource))
      ? new Date(observedAtSource).toISOString()
      : undefined
    const source = usesSectorRotation
      ? sectorRotation?._source?.sourceId ?? sectorRotation?.source ?? "sector-rotation"
      : marketStructure?.source ?? "markets"
    const handoff = createMarketsToScannerContext({
      contextId: marketsScannerContextId(createdAt),
      symbol,
      exchange: selectedExchange,
      timeframe: selectedTimeframe,
      createdAt: createdAtIso,
      expiresAt: new Date(createdAt.getTime() + MARKETS_SCANNER_CONTEXT_TTL_MS).toISOString(),
      context: {
        marketStructureContext: {
          value: {
            structure: structureValue,
            structureReason,
            breadth: breadthState,
            sector: topSector?.sector ?? null,
            advancingAssets: mappedAssets ? advancingAssets : null,
            decliningAssets: mappedAssets ? decliningAssets : null,
            mappedAssets: mappedAssets || null,
          },
          owner: "markets",
          source,
          observedAt,
          freshness,
          revision: 1,
        },
        freshness: {
          value: {
            status: freshness,
            ...(observedAt ? { observedAt } : {}),
          },
          owner: "markets",
          source,
          observedAt,
          freshness,
          revision: 1,
        },
      },
    })

    if (handoff.success === true) {
      const persisted = createContext(handoff.value)
      if (persisted.status === "SUCCESS") {
        router.push(scannerHrefWithContext(symbol, selectedExchange, selectedTimeframe, handoff.value.contextId))
        return
      }
    }

    router.push(scannerHrefWithContext(symbol, selectedExchange, selectedTimeframe))
  }

  return (
    <main className="min-h-screen bg-[#070d07] px-3 py-3 text-zinc-100 lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <MarketsSection
          title="Market Context"
          subtitle="Active universe and source health before ranking"
          icon={<RadioTower className="h-3.5 w-3.5" />}
          status={<StatusBadge label={discoveryHealthLabel as "CURRENT" | "PARTIAL" | "DEGRADED" | "UNAVAILABLE"} tone={discoveryHealthTone as "verified" | "partial" | "stale" | "missing"} />}
          className="border-amber-300/25 bg-[#0f1a0f]"
        >
          <div className="mb-3 rounded border border-zinc-900 bg-black/35 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Inherited Dashboard Context</div>
              <StatusBadge
                label={inheritedDashboardContext.label}
                tone={inheritedDashboardContext.label === "CURRENT" ? "verified" : inheritedDashboardContext.label === "LOADING" ? "loading" : inheritedDashboardContext.label === "PARTIAL" || inheritedDashboardContext.label === "DEGRADED" || inheritedDashboardContext.label === "STALE" ? "partial" : "missing"}
              />
            </div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
              <InlineStatus label="Direction" value={inheritedDirection} tone={inheritedDirection === "Bullish" ? "green" : inheritedDirection === "Bearish" ? "red" : inheritedDirection === "Neutral" ? "amber" : undefined} />
              <InlineStatus label="Drivers" value={inheritedDriverCount === "UNAVAILABLE" ? inheritedDriverCount : `${inheritedDriverCount} AVAILABLE`} tone={inheritedDriverCount === "UNAVAILABLE" ? undefined : "cyan"} />
              <InlineStatus label="Evidence Preview" value={inheritedEvidenceCount ? `${inheritedEvidenceCount} AVAILABLE` : "UNAVAILABLE"} tone={inheritedEvidenceCount ? "cyan" : undefined} />
              <InlineStatus label="Freshness" value={inheritedFreshness} tone={inheritedFreshness === "CURRENT" ? "green" : inheritedFreshness === "STALE" ? "amber" : undefined} />
            </div>
            <div className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-700">{inheritedDashboardContext.detail}</div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
            <div className="rounded-lg border border-cyan-300/20 bg-black/35 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-4xl font-black uppercase leading-none tracking-[0.03em] text-white">{symbol}</div>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                    {hasSignalContext ? `Inspecting ${effectiveSource.replaceAll("-", " ")}` : "All Futures Discovery / Binance Focus / 1m Live Detail"}
                  </div>
                </div>
                <div className="grid justify-items-end gap-2">
                  <div className="max-w-xl text-right text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">{sourceStatus}</div>
                  <button
                    type="button"
                    onClick={openScannerWithSharedContext}
                    className="inline-flex items-center gap-1.5 rounded border border-amber-300/25 bg-amber-300/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100 hover:border-amber-300/45 hover:bg-amber-300/10"
                  >
                    <Zap className="h-3 w-3" />
                    Open Scanner
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 md:grid-cols-4">
                <InlineStatus label="Universe" value="USDT Futures" tone="amber" />
                <InlineStatus label="Exchange" value="Binance Futures" tone="cyan" />
                <InlineStatus label="Focus" value={symbol} tone="cyan" />
                <InlineStatus label="Health" value={discoveryHealthLabel} tone={discoveryHealth >= 4 ? "green" : discoveryHealth >= 2 ? "amber" : "red"} />
              </div>
              {hasSignalContext ? (
                <div className="mt-2 grid gap-1.5 md:grid-cols-4">
                  <InlineStatus label="Setup" value={signalSetup ?? "NO DATA"} tone="cyan" />
                  <InlineStatus label="Direction" value={signalDirection ?? "NO DATA"} tone={signalDirection?.toLowerCase().includes("down") ? "red" : signalDirection?.toLowerCase().includes("up") ? "green" : "amber"} />
                  <InlineStatus label="Confidence" value={signalConfidence ?? "NO DATA"} tone="amber" />
                  <InlineStatus label="Reason" value={signalReason ?? "NO DATA"} />
                </div>
              ) : (
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">No external signal selected. Markets is showing live opportunity discovery and selected-symbol verification.</div>
              )}
            </div>
            <div className="grid gap-2 rounded-lg border border-amber-300/15 bg-black/35 p-3">
              <InlineStatus label="Mover Scan" value={marketMovers?.summary?.attention ?? marketMoversReason ?? "LOADING"} tone={marketMovers?.ok ? "green" : "amber"} />
              <InlineStatus label="Breadth" value={breadthState} tone={breadthState === "BROAD BID" ? "green" : breadthState === "BROAD OFFER" ? "red" : "amber"} />
              <InlineStatus label="Top Sector" value={topSectors[0]?.sector ?? marketStructure?.topSector?.sector ?? "NO DATA"} tone="cyan" />
              <InlineStatus label="Capital Flow" value={selectedEtf ? `${selectedEtf.asset} ${compactUsd(selectedEtf.netFlow * 1_000_000)}` : reserveRows.length ? `${reserveRows.length} reserve observations` : etfFlowReason ?? reserveReason ?? "NO DATA"} tone={selectedEtf || reserveRows.length ? "cyan" : "amber"} />
            </div>
          </div>
        </MarketsSection>

        <MarketsSection
          title="Market Movers"
          subtitle="Existing mover feed for live exploration; prioritization remains in Scanner"
          icon={<Activity className="h-3.5 w-3.5" />}
          status={apiStatus(marketMovers?.ok, marketMovers?.mode === "fallback")}
          className="border-amber-300/25"
        >
          {marketMoverRows.length ? (
            <div className="grid gap-1.5">
              <div className="grid grid-cols-[96px_96px_minmax(180px,1fr)_92px] rounded border border-zinc-900 bg-black/60 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600 max-lg:hidden">
                <span>Symbol</span>
                <span>State</span>
                <span>Reason</span>
                <span className="text-right">Next</span>
              </div>
              {marketMoverRows.slice(0, 6).map((candidate, index) => (
                <div key={`mover-${candidate.symbol}-${index}`} className="grid gap-2 rounded border border-zinc-900 bg-black/35 px-2 py-2 text-[11px] font-black uppercase tracking-[0.08em] lg:grid-cols-[96px_96px_minmax(180px,1fr)_92px] lg:items-center">
                  <button
                    type="button"
                    onClick={() => setSymbol(candidate.symbol)}
                    className="text-left text-sm font-black text-white hover:text-cyan-100"
                  >
                    {candidate.symbol}
                  </button>
                  <div className={opportunityTone(candidate)}>{candidate.qualityState}</div>
                  <div className="text-zinc-500">{candidate.reason}</div>
                  <div className="text-right text-zinc-500">{candidate.action}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="UNAVAILABLE" reason={marketMoversReason ?? "Market movers feed has not returned symbols."} />
          )}
        </MarketsSection>

        <div className="grid gap-3 xl:grid-cols-2">
          <MarketsSection
            title="Market Breadth"
            subtitle="Advancing and declining mapped assets"
            icon={<Gauge className="h-3.5 w-3.5" />}
            status={apiStatus(sectorUsable, sectorPartial, sectorFreshness === "STALE")}
          >
            {sectorUsable && mappedAssets ? (
              <div className="grid gap-2 md:grid-cols-4">
                <MetricCard label="Breadth" value={breadthState} sub={`Mapped universe / ${sectorFreshness}`} tone={breadthState === "BROAD BID" ? "green" : breadthState === "BROAD OFFER" ? "red" : "amber"} size="md" />
                <MetricCard label="Advancers" value={fmt(advancingAssets, 0)} sub={`${mappedAssets} mapped assets`} tone="green" size="md" />
                <MetricCard label="Decliners" value={fmt(decliningAssets, 0)} sub={`${sectorRotation?.coverage?.sectors ?? 0} sectors`} tone="red" size="md" />
                <MetricCard label="Coverage" value={fmt(sectorRotation?.coverage?.mappedAssets, 0)} sub={sectorRotation?.mode ?? "NO DATA"} tone="cyan" size="md" />
              </div>
            ) : (
              <EmptyState title="UNAVAILABLE" reason={sectorUnavailableReason ?? "Market breadth requires source-backed sector rotation data."} />
            )}
          </MarketsSection>

          <MarketsSection
            title="Sector Rotation"
            subtitle="Category leadership from existing rotation source"
            icon={<Layers className="h-3.5 w-3.5" />}
            status={apiStatus(sectorUsable, sectorPartial, sectorFreshness === "STALE")}
          >
            {topSectors.length ? (
              <div className="grid gap-1.5">
                {topSectors.map((sector: SectorRotationSnapshot) => (
                  <div key={sector.sector} className="grid gap-2 rounded border border-zinc-900 bg-black/35 px-2 py-2 text-[11px] font-black uppercase tracking-[0.08em] md:grid-cols-[44px_96px_92px_1fr_72px] md:items-center">
                    <span className="text-amber-100">#{sector.rank}</span>
                    <span className="text-white">{sector.sector}</span>
                    <span className={sector.direction === "INFLOW" ? "text-emerald-100" : sector.direction === "OUTFLOW" ? "text-rose-100" : "text-amber-100"}>{sector.direction}</span>
                    <span className="text-zinc-500">{sector.topSymbols.join(", ") || "NO LEADERS"}</span>
                    <span className="text-right text-cyan-100">{fmt(sector.rotationScore, 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="UNAVAILABLE" reason={sectorUnavailableReason ?? "Sector rotation has not returned source-backed sector rows."} />
            )}
          </MarketsSection>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <MarketsSection
            title="Exchange Overview"
            subtitle={`Venue confirmation for ${symbol}`}
            icon={<Building2 className="h-3.5 w-3.5" />}
            status={apiStatus(exchangeComparison?.ok)}
          >
            {exchangeComparison?.ok ? (
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  { name: "Binance", data: exchangeComparison.binance },
                  { name: "Bybit", data: exchangeComparison.bybit },
                ].map((venue) => (
                  <div key={venue.name} className="rounded border border-zinc-900 bg-black/35 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{venue.name}</div>
                      {venue.data?.ok ? <StatusBadge label="CURRENT" tone="verified" /> : <StatusBadge label="UNAVAILABLE" />}
                    </div>
                    <div className="mt-3 grid gap-1.5">
                      <InlineStatus label="Funding" value={venue.data?.ok ? pct((venue.data.fundingRate ?? 0) * 100, 4) : venue.data?.reason ?? "NO DATA"} tone={venue.data?.ok ? "amber" : undefined} />
                      <InlineStatus label="OI" value={venue.data?.ok ? compactUsd(venue.data.oiNotional) : "NO DATA"} tone={venue.data?.ok ? "cyan" : undefined} />
                    </div>
                  </div>
                ))}
                <div className="md:col-span-2 grid gap-1.5 md:grid-cols-2">
                  <InlineStatus label="Funding Relationship" value={exchangeComparison.fundingRelationship ?? "NO DATA"} tone="amber" />
                  <InlineStatus label="OI Relationship" value={exchangeComparison.openInterestRelationship ?? "NO DATA"} tone="cyan" />
                </div>
              </div>
            ) : (
              <EmptyState title="UNAVAILABLE" reason={exchangeComparisonReason ?? "Exchange comparison has not returned venue rows."} />
            )}
          </MarketsSection>

          <MarketsSection
            title="ETF / Capital Flow"
            subtitle="Existing ETF and reserve intelligence only"
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            status={apiStatus(Boolean(etfRows.length || reserveIntelligence?.status === "available"), Boolean(etfPartial || reserveIntelligence?.coverage === "partial"), etfFreshness === "STALE" || reserveIntelligence?.freshness === "stale")}
          >
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded border border-zinc-900 bg-black/35 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">ETF Flow</div>
                  {apiStatus(Boolean(etfRows.length), etfPartial, etfFreshness === "STALE")}
                </div>
                <div className="mt-3 text-2xl font-black uppercase leading-none text-white">{selectedEtf ? compactUsd(selectedEtf.netFlow * 1_000_000) : "NO DATA"}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">{selectedEtf ? `${selectedEtf.asset} / ${selectedEtf.sourceDate} / ${etfFreshness}` : etfFlow?.unavailableReason ?? etfFlowReason ?? "ETF flow unavailable for selected asset."}</div>
              </div>
              <div className="rounded border border-zinc-900 bg-black/35 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Reserve Intelligence</div>
                  {apiStatus(reserveIntelligence?.status === "available", reserveIntelligence?.coverage === "partial", reserveIntelligence?.freshness === "stale")}
                </div>
                <div className="mt-3 text-2xl font-black uppercase leading-none text-white">{selectedReserve ? compactUsd(selectedReserve.balanceUsdChange ?? selectedReserve.currentBalanceUsd) : reserveRows.length ? `${reserveRows.length} OBS` : "NO DATA"}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">{selectedReserve ? `${selectedReserve.asset} / ${selectedReserve.observationType}` : reserveIntelligence?.reason ?? reserveReason ?? "Reserve observations unavailable for selected asset."}</div>
              </div>
            </div>
          </MarketsSection>
        </div>

        <MarketsSection
          title="Market Movers"
          subtitle="Price and volume movement from the existing movers scan"
          icon={<LineChart className="h-3.5 w-3.5" />}
          status={apiStatus(marketMovers?.ok, marketMovers?.mode === "fallback")}
        >
          {marketMovers ? (
            <div className="grid gap-3 xl:grid-cols-[0.45fr_0.55fr]">
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
                <MetricCard label="Scanned" value={fmt(marketMovers.summary.scanned, 0)} sub={marketMovers.source} tone="cyan" size="md" />
                <MetricCard label="Tradable" value={fmt(marketMovers.summary.tradable, 0)} sub={marketMovers.summary.filterMode} tone="amber" size="md" />
                <MetricCard label="Strongest" value={marketMovers.summary.strongestSymbol ?? "NO DATA"} sub={marketMovers.mode} tone="green" size="md" />
              </div>
              <div className="grid gap-1.5">
                {marketMoverSuppressed.length ? marketMoverSuppressed.map((candidate) => (
                  <div key={`mover-${candidate.symbol}`} className="grid gap-2 rounded border border-zinc-900 bg-black/35 px-2 py-2 text-[11px] font-black uppercase tracking-[0.08em] md:grid-cols-[96px_90px_80px_1fr] md:items-center">
                    <span className="text-white">{candidate.symbol}</span>
                    <span className={opportunityTone(candidate)}>{pct(candidate.priceChangePercent)}</span>
                    <span className="text-cyan-100">{compactUsd(candidate.quoteVolume)}</span>
                    <span className="text-zinc-500">{candidate.qualityReason}</span>
                  </div>
                )) : (
                  <EmptyState title="NO SUPPRESSED MOVERS" reason="The current scan did not return additional mover diagnostics." />
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="UNAVAILABLE" reason={marketMoversReason ?? "Market mover source is loading or unavailable."} />
          )}
        </MarketsSection>

        <MarketsSection
          title="Supporting Analytics"
          subtitle="Selected-symbol verification; preserved from Markets V1"
          icon={<Activity className="h-3.5 w-3.5" />}
          className="border-zinc-900 bg-[#0a0f0a]"
        >
          <div className="grid gap-3">
            <Card title="Live Market State" icon={<Activity className="h-3.5 w-3.5" />}>
              <div className="grid gap-2 md:grid-cols-3 2xl:grid-cols-6">
                <MetricCard label="Price" value={ticker ? fmt(ticker.price, 2) : "NO DATA"} sub="Binance realtime" tone="cyan" />
                <MetricCard label="24h Change" value={pct(ticker?.change24h)} sub={ticker ? "Ticker stream" : "No ticker data"} tone={(ticker?.change24h ?? 0) >= 0 ? "green" : "red"} />
                <MetricCard label="Funding" value={liveFundingRate !== null ? pct(liveFundingRate * 100, 4) : "NO DATA"} sub={liveFundingRate !== null ? liveFundingReason : displayDataReason(liveFundingReason)} tone="amber" />
                <MetricCard label="Open Int." value={compactUsd(liveOiNotional)} sub={liveOiNotional !== null ? liveOiSource ?? "Binance futures" : displayDataReason(liveOiReason)} tone="cyan" />
                <LiquidationBiasCard longNotional={liquidationSummary.longNotional} shortNotional={liquidationSummary.shortNotional} state={liquidationLoadState} />
                <MetricCard label="24h Range" value={rangeValue} sub={rangeValue === "NO DATA" ? displayDataReason(ticker24hReason ?? "Binance 24h range unavailable") : "High / Low"} tone="cyan" size="md" />
              </div>
            </Card>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(340px,3fr)]">
              <Card title="Advanced Chart" icon={<BarChart3 className="h-3.5 w-3.5" />}>
                <ChartPreview candles={candles} symbol={symbol} timeframe="1m" onOpen={() => setAdvancedChartOpen(true)} />
              </Card>
              <OrderbookDepth orderbook={orderbook} depthFrames={depthFrames} />
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <Card title="Trade Flow" icon={<Zap className="h-3.5 w-3.5" />}>
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-zinc-900 bg-black/40 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.1em]">
                  <span className="text-zinc-500">Buy: <span className="text-emerald-100">{fmt(buyVolume, 3)}</span></span>
                  <span className="text-zinc-700">/</span>
                  <span className="text-zinc-500">Sell: <span className="text-rose-100">{fmt(sellVolume, 3)}</span></span>
                  <span className="text-zinc-700">/</span>
                  <span className="text-zinc-500">CVD: <span className={cvd >= 0 ? "text-emerald-100" : "text-rose-100"}>{fmt(cvd, 3)}</span></span>
                </div>
                <div className="grid gap-1">
                  {trades.slice(0, 12).map((trade, index) => (
                    <div key={`${trade.time}-${index}`} className="grid grid-cols-[72px_1fr_80px_80px] rounded border border-zinc-900 bg-black/35 px-2 py-1 text-[11px] font-bold">
                      <span className="text-zinc-500">{timeLabel(trade.time)}</span>
                      <span className={trade.side === "buy" ? "text-emerald-100" : "text-rose-100"}>{trade.side.toUpperCase()}</span>
                      <span className="text-right text-zinc-300">{fmt(trade.price, 2)}</span>
                      <span className="text-right text-zinc-500">{fmt(trade.qty, 4)}</span>
                    </div>
                  ))}
                  {!trades.length && <div className="rounded border border-zinc-900 bg-black/40 p-6 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">NO TRADE FLOW DATA</div>}
                </div>
              </Card>

              <SelectedSymbolLiquidations symbol={symbol} onSummary={setLiquidationSummary} onStateChange={setLiquidationLoadState} />
            </div>

            <Card title="Market Structure Insights" icon={<Droplets className="h-3.5 w-3.5" />}>
              <div className="flex flex-wrap items-center gap-2 rounded border border-zinc-900 bg-black/40 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.1em]">
                <InlineStatus
                  label="Funding Pressure"
                  value={liveFundingRate === null ? "NO DATA" : liveFundingRate > 0.00008 ? "Bullish" : liveFundingRate < -0.00008 ? "Bearish" : "Neutral"}
                  tone={liveFundingRate === null ? undefined : liveFundingRate >= 0 ? "green" : "red"}
                  className="border-transparent bg-transparent px-0 py-0"
                />
                <InlineStatus
                  label="OI Trend"
                  value={oiTrend.label}
                  tone={oiTrend.label === "Increasing" ? "green" : oiTrend.label === "Decreasing" ? "red" : "amber"}
                  className="border-transparent bg-transparent px-0 py-0"
                />
                <InlineStatus
                  label="Liquidation Pressure"
                  value={liquidationRead}
                  tone={liquidationRead === "Longs Hit" ? "red" : liquidationRead === "Shorts Hit" ? "green" : "amber"}
                  className="border-transparent bg-transparent px-0 py-0"
                />
                <InlineStatus
                  label="Structure"
                  value={structureValue}
                  tone={structureValue === "BULLISH" ? "green" : structureValue === "BEARISH" ? "red" : "amber"}
                  className="border-transparent bg-transparent px-0 py-0"
                />
                <span className="text-[9px] text-zinc-600">{structureReason}</span>
              </div>
              {topStructureSectors.length > 0 && (
                <div className="mt-2 grid gap-1.5 md:grid-cols-3">
                  {topStructureSectors.map((sector) => (
                    <InlineStatus
                      key={`structure-${sector.sector}`}
                      label={sector.sector}
                      value={`${sector.operatorState} / ${fmt(sector.marketStructureScore, 0)}`}
                      tone={sector.operatorState === "EXPANDING" || sector.operatorState === "BUILDING" ? "green" : sector.operatorState === "COOLING" ? "red" : "amber"}
                    />
                  ))}
                </div>
              )}
              {!marketStructure?.ok && (
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-700">{marketStructureReason ?? "Market structure intelligence unavailable."}</div>
              )}
            </Card>
          </div>
        </MarketsSection>
      </div>
      {advancedChartOpen && (
        <AdvancedChartModal
          symbol={symbol}
          timeframe="1m"
          onClose={() => setAdvancedChartOpen(false)}
        />
      )}
    </main>
  )
}
