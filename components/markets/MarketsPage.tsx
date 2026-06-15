"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, AlertTriangle, BarChart3, BookOpen, Droplets, RadioTower, TrendingUp, Zap } from "lucide-react"
import { CandlestickSeries, ColorType, HistogramSeries, createChart, type IChartApi, type ISeriesApi } from "lightweight-charts"

import AdvancedChartModal from "@/components/charts/AdvancedChartModal"
import useDepthHeatmap from "@/hooks/useDepthHeatmap"
import useKlineSocket from "@/hooks/useKlineSocket"
import useLiquidationSocket from "@/hooks/useLiquidationSocket"
import useMarketSocket from "@/hooks/useMarketSocket"
import useOrderbookSocket from "@/hooks/useOrderbookSocket"
import useTradeSocket from "@/hooks/useTradeSocket"
import { useMarketStore } from "@/stores/useMarketStore"

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"]

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

type ExchangeVenue = {
  ok?: boolean
  source?: string
  fundingRate?: number
  openInterest?: number
  oiNotional?: number
  reason?: string
}

type ExchangeComparisonResponse = {
  ok?: boolean
  symbol?: string
  updatedAt?: string
  binance?: ExchangeVenue
  bybit?: ExchangeVenue
  fundingRelationship?: "Aligned" | "Divergent" | "Unavailable"
  openInterestRelationship?: "Aligned" | "Divergent" | "Unavailable"
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

function missingFuturesReason(symbol: string, futures: FuturesResponse | null) {
  if (!futures) return "Futures API has not responded yet."
  if (futures.notes?.[0]) return displayDataReason(futures.notes[0])
  if (!futures.ok) return "Futures intelligence returned an unavailable status."
  if (!futures.symbols?.length) return "Futures intelligence returned no symbol rows."
  return `${symbol} was not included in the futures intelligence response.`
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

function ExchangeComparisonGrid({
  binance,
  bybit,
  fundingRelationship,
  openInterestRelationship,
}: {
  binance?: ExchangeVenue
  bybit?: ExchangeVenue
  fundingRelationship?: string
  openInterestRelationship?: string
}) {
  const binanceReason = displayDataReason(binance?.reason)
  const bybitReason = displayDataReason(bybit?.reason)

  return (
    <div className="grid gap-1.5 rounded border border-zinc-900 bg-black/25 p-2">
      <div className="grid gap-1.5 md:grid-cols-[72px_1fr_1fr]">
        <div className="flex items-center text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Binance</div>
        <InlineStatus
          label="Funding"
          value={binance?.ok ? pct((binance.fundingRate ?? 0) * 100, 4) : "NO DATA"}
          tone="amber"
        />
        <InlineStatus
          label="OI"
          value={binance?.ok ? compactUsd(binance.oiNotional) : "NO DATA"}
          tone="cyan"
        />
        {!binance?.ok && <div className="md:col-span-2 md:col-start-2 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{binanceReason}</div>}
        <div className="flex items-center text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Bybit</div>
        <InlineStatus
          label="Funding"
          value={bybit?.ok ? pct((bybit.fundingRate ?? 0) * 100, 4) : "NO DATA"}
          tone="amber"
        />
        <InlineStatus
          label="OI"
          value={bybit?.ok ? compactUsd(bybit.oiNotional) : "NO DATA"}
          tone="cyan"
        />
        {!bybit?.ok && <div className="md:col-span-2 md:col-start-2 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{bybitReason}</div>}
      </div>
      <div className="grid gap-1.5 border-t border-zinc-900 pt-1.5 md:grid-cols-2">
        <InlineStatus
          label="Funding Relationship"
          value={fundingRelationship ?? "Unavailable"}
          tone={fundingRelationship === "Aligned" ? "green" : fundingRelationship === "Divergent" ? "red" : undefined}
        />
        <InlineStatus
          label="OI Relationship"
          value={openInterestRelationship ?? "Unavailable"}
          tone={openInterestRelationship === "Aligned" ? "green" : openInterestRelationship === "Divergent" ? "red" : undefined}
        />
      </div>
    </div>
  )
}

function LiquidationBiasCard({ longNotional, shortNotional }: { longNotional: number; shortNotional: number }) {
  const total = longNotional + shortNotional
  const longPct = total > 0 ? Math.round((longNotional / total) * 100) : null
  const shortPct = total > 0 ? 100 - (longPct ?? 0) : null

  return (
    <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Market Liq Bias</div>
      {total > 0 && longPct !== null && shortPct !== null ? (
        <>
          <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em]">
            <span className="text-emerald-100">Longs Hit {longPct}%</span>
            <span className="text-rose-100">Shorts Hit {shortPct}%</span>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-zinc-900">
            <div className="bg-emerald-400/80" style={{ width: `${longPct}%` }} />
            <div className="bg-rose-400/80" style={{ width: `${shortPct}%` }} />
          </div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{compactUsd(total)} / market-wide feed</div>
        </>
      ) : (
        <>
          <div className="mt-2 text-2xl font-black uppercase leading-none text-zinc-500">NO LIQ DATA</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600">Market-wide liquidation feed</div>
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
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const hasVolume = candles.some((candle) => Number.isFinite(candle.volume) && (candle.volume ?? 0) > 0)

  useEffect(() => {
    if (!ref.current || chartRef.current) return
    const chart = createChart(ref.current, {
      height: Math.max(320, ref.current.clientHeight || 0),
      layout: {
        background: { type: ColorType.Solid, color: "#050505" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "rgba(39,39,42,.55)" },
        horzLines: { color: "rgba(39,39,42,.55)" },
      },
      rightPriceScale: { borderColor: "#27272a" },
      timeScale: { borderColor: "#27272a", timeVisible: true },
    })
    chartRef.current = chart
    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      })
    volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      priceLineVisible: false,
      lastValueVisible: false,
    })
    chart.priceScale("").applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    })
    const resize = () => chart.applyOptions({
      width: ref.current?.clientWidth ?? 600,
      height: Math.max(320, ref.current?.clientHeight ?? 0),
    })
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(resize)
    })
    resizeObserver.observe(ref.current)
    resize()
    window.addEventListener("resize", resize)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", resize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    const volumeSeries = volumeSeriesRef.current
    if (!chart || !series || !candles.length) return
    series.setData(candles.map((candle) => ({
      time: candle.time as any,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })))
    volumeSeries?.setData(candles
      .filter((candle) => Number.isFinite(candle.volume))
      .map((candle) => ({
        time: candle.time as any,
        value: candle.volume ?? 0,
        color: candle.close >= candle.open ? "rgba(34, 197, 94, 0.32)" : "rgba(239, 68, 68, 0.32)",
      })))
    chart.timeScale().fitContent()
  }, [candles])

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
        <div ref={ref} className="h-full w-full" />
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

export default function MarketsPage() {
  const [symbol, setSymbol] = useState("BTCUSDT")
  const [futures, setFutures] = useState<FuturesResponse | null>(null)
  const [exchangeComparison, setExchangeComparison] = useState<ExchangeComparisonResponse | null>(null)
  const [ticker24h, setTicker24h] = useState<Ticker24h | null>(null)
  const [ticker24hReason, setTicker24hReason] = useState<string | null>(null)
  const [previousOi, setPreviousOi] = useState<Record<string, number>>({})
  const [advancedChartOpen, setAdvancedChartOpen] = useState(false)
  const [liquidationMinNotional, setLiquidationMinNotional] = useState(() => {
    if (typeof window === "undefined") return 0
    const stored = Number(window.localStorage.getItem("qt.markets.liqFilter"))
    return stored === 500 || stored === 1000 ? stored : 0
  })
  const tickers = useMarketStore((state) => state.tickers)
  const orderbook = useMarketStore((state) => state.orderbook)
  const ticker = tickers[symbol]
  const candles = useKlineSocket(symbol, "1m")
  const { trades } = useTradeSocket(symbol)
  const { liquidations } = useLiquidationSocket()
  const depthFrames = useDepthHeatmap(symbol)

  useMarketSocket()
  useOrderbookSocket(symbol)

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

  useEffect(() => {
    let active = true
    async function loadExchangeComparison() {
      try {
        setExchangeComparison(null)
        const response = await fetch(`/api/market/exchange-comparison?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" })
        const payload = await response.json()
        if (active) setExchangeComparison(payload)
      } catch (error) {
        if (active) {
          setExchangeComparison({
            ok: false,
            symbol,
            binance: { ok: false, source: "binance-futures", reason: "Exchange comparison request failed." },
            bybit: { ok: false, source: "bybit-linear", reason: displayDataReason(error instanceof Error ? error.message : "Bybit comparison request failed.") },
            fundingRelationship: "Unavailable",
            openInterestRelationship: "Unavailable",
          })
        }
      }
    }
    void loadExchangeComparison()
    const timer = setInterval(loadExchangeComparison, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [symbol])

  const futuresSymbol = futures?.symbols?.find((item) => item.symbol === symbol)
  const binanceComparison = exchangeComparison?.binance?.ok ? exchangeComparison.binance : null
  const liveFundingRate = futuresSymbol?.fundingRate ?? binanceComparison?.fundingRate ?? null
  const liveOiNotional = futuresSymbol?.oiNotional ?? binanceComparison?.oiNotional ?? null
  const liveOiReason = futuresSymbol || binanceComparison ? "Binance futures" : missingFuturesReason(symbol, futures)
  const longLiquidationNotional = liquidations.filter((item) => item.side === "LONG").reduce((sum, item) => sum + item.value, 0)
  const shortLiquidationNotional = liquidations.filter((item) => item.side === "SHORT").reduce((sum, item) => sum + item.value, 0)
  const buyVolume = trades.filter((trade) => trade.side === "buy").reduce((sum, trade) => sum + trade.qty, 0)
  const sellVolume = trades.filter((trade) => trade.side === "sell").reduce((sum, trade) => sum + trade.qty, 0)
  const cvd = buyVolume - sellVolume
  const visibleLiquidations = liquidationMinNotional > 0
    ? liquidations.filter((item) => item.value >= liquidationMinNotional)
    : liquidations
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
  const liquidationRead = longLiquidationNotional + shortLiquidationNotional === 0
    ? "NO DATA"
    : longLiquidationNotional > shortLiquidationNotional * 1.15
      ? "Longs Hit"
      : shortLiquidationNotional > longLiquidationNotional * 1.15
        ? "Shorts Hit"
        : "Balanced"
  const structureRead = marketStructureLabel(ticker?.change24h, cvd, liveFundingRate)
  const hasStructureInputs = Boolean(ticker && trades.length && liveFundingRate !== null)
  const structureValue = hasStructureInputs ? structureRead : "INSUFFICIENT DATA"
  const structureReason = hasStructureInputs ? "Price + flow + funding" : "Needs price, trades, and funding"

  useEffect(() => {
    if (currentOi === null || currentOi === undefined) return
    setPreviousOi((prev) => prev[symbol] === undefined ? { ...prev, [symbol]: currentOi } : prev)
  }, [currentOi, symbol])

  useEffect(() => {
    window.localStorage.setItem("qt.markets.liqFilter", String(liquidationMinNotional))
  }, [liquidationMinNotional])

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <Card title="Markets" icon={<RadioTower className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {SYMBOLS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSymbol(item)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.12em]",
                    item === symbol ? "border-cyan-300/45 bg-cyan-400/10 text-cyan-100" : "border-zinc-900 bg-black/45 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{sourceStatus}</div>
          </div>
        </Card>

        <Card title="Live Market State" icon={<Activity className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 md:grid-cols-3 2xl:grid-cols-6">
            <MetricCard label="Price" value={ticker ? fmt(ticker.price, 2) : "NO DATA"} sub="Binance realtime" tone="cyan" />
            <MetricCard label="24h Change" value={pct(ticker?.change24h)} sub={ticker ? "Ticker stream" : "No ticker data"} tone={(ticker?.change24h ?? 0) >= 0 ? "green" : "red"} />
            <MetricCard label="Funding" value={liveFundingRate !== null ? pct(liveFundingRate * 100, 4) : "NO DATA"} sub={liveFundingRate !== null ? "8h estimate" : displayDataReason(liveOiReason)} tone="amber" />
            <MetricCard label="Open Int." value={compactUsd(liveOiNotional)} sub={liveOiNotional !== null ? "Binance futures" : displayDataReason(liveOiReason)} tone="cyan" />
            <LiquidationBiasCard longNotional={longLiquidationNotional} shortNotional={shortLiquidationNotional} />
            <MetricCard label="24h Range" value={rangeValue} sub={rangeValue === "NO DATA" ? displayDataReason(ticker24hReason ?? "Binance 24h range unavailable") : "High / Low"} tone="cyan" size="md" />
          </div>
        </Card>

        <Card title="Exchange Comparison" icon={<TrendingUp className="h-3.5 w-3.5" />}>
          <ExchangeComparisonGrid
            binance={exchangeComparison?.binance ?? (futuresSymbol ? {
              ok: true,
              source: "binance-futures",
              fundingRate: futuresSymbol.fundingRate,
              openInterest: futuresSymbol.openInterest,
              oiNotional: futuresSymbol.oiNotional,
            } : {
              ok: false,
              source: "binance-futures",
              reason: missingFuturesReason(symbol, futures),
            })}
            bybit={exchangeComparison?.bybit ?? {
              ok: false,
              source: "bybit-linear",
              reason: "Bybit public API has not responded yet.",
            }}
            fundingRelationship={exchangeComparison?.fundingRelationship}
            openInterestRelationship={exchangeComparison?.openInterestRelationship}
          />
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

          <Card title="Market-Wide Liquidation Feed" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">
              <span>Shows latest liquidation events across tracked symbols. Bybit liquidation: NO DATA / not connected in this pass.</span>
              <div className="flex items-center gap-1">
                <span>Hide below</span>
                {[0, 500, 1000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLiquidationMinNotional(value)}
                    className={cn(
                      "rounded border px-2 py-1 text-[9px] font-black uppercase",
                      liquidationMinNotional === value ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100" : "border-zinc-900 bg-black/40 text-zinc-500",
                    )}
                  >
                    {value === 0 ? "Off" : compactUsd(value)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1">
              {visibleLiquidations.slice(0, 14).map((liq, index) => (
                <div key={`${liq.time}-${liq.symbol}-${index}`} className="grid grid-cols-[72px_78px_64px_1fr_92px] rounded border border-zinc-900 bg-black/35 px-2 py-1 text-[11px] font-bold">
                  <span className="text-zinc-500">{timeLabel(liq.time)}</span>
                  <span className="text-cyan-100">BINANCE</span>
                  <span className={liq.side === "LONG" ? "text-rose-100" : "text-emerald-100"}>{liq.side}</span>
                  <span className="text-zinc-300">{liq.symbol}</span>
                  <span className="text-right text-zinc-400">{compactUsd(liq.value)}</span>
                </div>
              ))}
              {!visibleLiquidations.length && <div className="rounded border border-zinc-900 bg-black/40 p-6 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">{liquidations.length ? "NO EVENTS ABOVE FILTER" : "NO LIQUIDATION DATA"}</div>}
            </div>
          </Card>
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
