"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Activity, AlertTriangle, BarChart3, BookOpen, Droplets, RadioTower, Zap } from "lucide-react"

import AdvancedChartModal from "@/components/charts/AdvancedChartModal"
import MarketCandleChart from "@/components/charts/MarketCandleChart"
import useDepthHeatmap from "@/hooks/useDepthHeatmap"
import useKlineSocket from "@/hooks/useKlineSocket"
import useMarketSocket from "@/hooks/useMarketSocket"
import useOrderbookSocket from "@/hooks/useOrderbookSocket"
import useTradeSocket from "@/hooks/useTradeSocket"
import { useMarketStore } from "@/stores/useMarketStore"

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
  const searchParams = useSearchParams()
  const [symbol, setSymbol] = useState("BTCUSDT")
  const [futures, setFutures] = useState<FuturesResponse | null>(null)
  const [ticker24h, setTicker24h] = useState<Ticker24h | null>(null)
  const [ticker24hReason, setTicker24hReason] = useState<string | null>(null)
  const [previousOi, setPreviousOi] = useState<Record<string, number>>({})
  const [advancedChartOpen, setAdvancedChartOpen] = useState(false)
  const [liquidationSummary, setLiquidationSummary] = useState({ longNotional: 0, shortNotional: 0 })
  const [liquidationLoadState, setLiquidationLoadState] = useState<LiquidationLoadState>("idle")
  const tickers = useMarketStore((state) => state.tickers)
  const orderbook = useMarketStore((state) => state.orderbook)
  const requestedSymbol = searchParams.get("symbol")?.toUpperCase().trim() || null
  const signalSource = searchParams.get("source")
  const signalSetup = searchParams.get("setup")
  const signalDirection = searchParams.get("direction")
  const signalConfidence = searchParams.get("confidence")
  const signalReason = searchParams.get("reason")
  const effectiveSource = signalSource ?? "default-market-view"
  const hasSignalContext = Boolean(signalSource || signalSetup || signalDirection || signalConfidence || signalReason)
  const ticker = tickers[symbol]
  const candles = useKlineSocket(symbol, "1m")
  const { trades } = useTradeSocket(symbol)
  const depthFrames = useDepthHeatmap(symbol)

  useMarketSocket()
  useOrderbookSocket(symbol)

  useEffect(() => {
    if (!requestedSymbol) return
    setSymbol(requestedSymbol)
  }, [requestedSymbol])

  useEffect(() => {
    let active = true
    async function loadTicker24h() {
      try {
        setTicker24h(null)
        setTicker24hReason(null)
        const response = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" })
        if (!response.ok) throw new Error(`Binance 24h ticker returned ${response.status}`)
        const payload = await response.json()
        if (active) setTicker24h(payload)
      } catch (error) {
        if (active) setTicker24hReason(displayDataReason(error instanceof Error ? error.message : "Binance 24h range unavailable"))
      }
    }
    void loadTicker24h()
    const timer = setInterval(loadTicker24h, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [symbol])

  useEffect(() => {
    let active = true
    async function loadFutures() {
      try {
        const response = await fetch("/api/market/futures-intelligence", { cache: "no-store" })
        const payload = await response.json()
        if (active) setFutures(payload)
      } catch {
        if (active) setFutures({ ok: false, notes: ["Futures intelligence unavailable"] })
      }
    }
    void loadFutures()
    const timer = setInterval(loadFutures, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const futuresSymbol = futures?.symbols?.find((item) => item.symbol === symbol)
  const liveFundingRate = futuresSymbol?.fundingRate ?? null
  const liveOiNotional = futuresSymbol?.oiNotional ?? null
  const liveOiReason = futuresSymbol ? "Binance futures" : missingFuturesReason(symbol, futures)

  useEffect(() => {
    console.debug("Markets futures trace", {
      selectedSymbol: symbol,
      requestSymbol: requestedSymbol ?? "BTCUSDT",
      responseSymbol: futuresSymbol?.symbol ?? null,
      responseSymbolCount: futures?.symbols?.length ?? 0,
    })
  }, [futures?.symbols, futuresSymbol?.symbol, requestedSymbol, symbol])
  const buyVolume = trades.filter((trade) => trade.side === "buy").reduce((sum, trade) => sum + trade.qty, 0)
  const sellVolume = trades.filter((trade) => trade.side === "sell").reduce((sum, trade) => sum + trade.qty, 0)
  const cvd = buyVolume - sellVolume
  const sourceStatus = useMemo(() => {
    const parts = [
      ticker ? "Binance Ticker Live" : "Binance Ticker No Data",
      orderbook ? "Orderbook Live" : "Orderbook No Data",
      trades.length ? "Trades Live" : "Trades Waiting",
      futures?.ok ? "Funding/OI Live" : "Funding/OI No Data",
    ]
    return parts.join(" / ")
  }, [ticker, orderbook, trades.length, futures?.ok])
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

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <Card title="Markets" icon={<RadioTower className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-3xl font-black leading-none text-white">{symbol}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                    {hasSignalContext ? `Inspecting ${effectiveSource.replaceAll("-", " ")}` : "Live Market View"}
                  </div>
                </div>
                <div className="text-right text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{sourceStatus}</div>
              </div>
              {hasSignalContext ? (
                <div className="mt-3 grid gap-1.5 md:grid-cols-4">
                  <InlineStatus label="Setup" value={signalSetup ?? "NO DATA"} tone="cyan" />
                  <InlineStatus label="Direction" value={signalDirection ?? "NO DATA"} tone={signalDirection?.toLowerCase().includes("down") ? "red" : signalDirection?.toLowerCase().includes("up") ? "green" : "amber"} />
                  <InlineStatus label="Confidence" value={signalConfidence ?? "NO DATA"} tone="amber" />
                  <InlineStatus label="Reason" value={signalReason ?? "NO DATA"} />
                </div>
              ) : (
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">No signal selected. Showing default active market state.</div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Live Market State" icon={<Activity className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 md:grid-cols-3 2xl:grid-cols-6">
            <MetricCard label="Price" value={ticker ? fmt(ticker.price, 2) : "NO DATA"} sub="Binance realtime" tone="cyan" />
            <MetricCard label="24h Change" value={pct(ticker?.change24h)} sub={ticker ? "Ticker stream" : "No ticker data"} tone={(ticker?.change24h ?? 0) >= 0 ? "green" : "red"} />
            <MetricCard label="Funding" value={liveFundingRate !== null ? pct(liveFundingRate * 100, 4) : "NO DATA"} sub={liveFundingRate !== null ? "8h estimate" : displayDataReason(liveOiReason)} tone="amber" />
            <MetricCard label="Open Int." value={compactUsd(liveOiNotional)} sub={liveOiNotional !== null ? "Binance futures" : displayDataReason(liveOiReason)} tone="cyan" />
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

        <div className="grid gap-3">
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
          </Card>
        </div>
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
