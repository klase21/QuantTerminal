"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Activity, BarChart3, Droplets, LineChart, RadioTower, Zap } from "lucide-react"

import MarketCandleChart from "@/components/charts/MarketCandleChart"

type CryptoReplayTrade = {
  timestamp: string
  price: number
  size: number
  side: string
}

type CryptoReplayBookSnapshot = {
  timestamp: string
  bids: Array<[number, number]>
  asks: Array<[number, number]>
}

type CryptoReplayLiquidation = {
  timestamp: string
  side: string
  price: number | null
  size: number | null
  notional: number | null
}

type CryptoReplayFundingPoint = {
  timestamp: string
  fundingRate: number | null
  openInterest: number | null
  openInterestValue: number | null
  source?: "cryptohftdata" | "binance-historical" | "current-fallback"
}

type CryptoReplayCandle = {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

type ReplayChartCandle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

type CryptoReplayResponse = {
  ok: boolean
  source: "cryptohftdata" | "replay-cache"
  exchange: string
  symbol: string
  window?: {
    start: string
    end: string
  }
  trades: CryptoReplayTrade[]
  book: CryptoReplayBookSnapshot[]
  liquidations: CryptoReplayLiquidation[]
  funding: CryptoReplayFundingPoint[]
  candles: CryptoReplayCandle[]
  diagnostics?: {
    cache?: {
      status: string
      generatedAt: string | null
      source: string | null
      schemaVersion: string
    }
    downloaded?: Array<unknown>
    unavailable?: Array<{ dataset: string; reason: string }>
    errors?: Array<{ dataset: string; message: string }>
  }
}

type ReplayEvent = {
  timestamp: string
  type: string
  label: string
  tone: "green" | "red" | "amber" | "cyan"
}

type PricePoint = {
  timestamp: string
  value: number
}

type BinancePositioningResponse = {
  ok: boolean
  source: "binance-historical"
  funding: CryptoReplayFundingPoint[]
  reason?: string | null
}

type CurrentPositioningResponse = {
  ok: boolean
  symbol: string
  openInterest?: number | null
  fundingRate?: number | null
  openInterestTime?: number | null
  time?: number | null
  reason?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function Section({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("border border-zinc-900 bg-zinc-950/80", className)}>
      <div className="flex h-9 items-center justify-between border-b border-zinc-900 px-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
          {icon}
          {title}
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="border border-zinc-900 bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
      <span className="text-zinc-300">{title}</span>
      <span className="ml-2 text-zinc-600">Reason: {reason}</span>
    </div>
  )
}

function SnapshotMetric({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "cyan" | "amber" }) {
  return (
    <div className="border border-zinc-900 bg-black px-3 py-2">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className={cn(
        "mt-1 text-lg font-black uppercase leading-none text-white",
        tone === "green" && "text-emerald-100",
        tone === "red" && "text-rose-100",
        tone === "cyan" && "text-cyan-100",
        tone === "amber" && "text-amber-100",
      )}>{value}</div>
    </div>
  )
}

function numberValue(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  return value.toLocaleString(undefined, { maximumFractionDigits: digits })
}

function pct(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}%`
}

function compactUsd(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function timeOnly(value?: string) {
  if (!value) return "NO DATA"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" })
}

function latestSafeReplayWindow() {
  const date = new Date()
  date.setUTCMinutes(0, 0, 0)
  date.setUTCHours(date.getUTCHours() - 24)
  if (date.toISOString().slice(0, 10) < "2025-07-01") {
    return { date: "2025-07-01", hour: "0" }
  }
  return {
    date: date.toISOString().slice(0, 10),
    hour: String(date.getUTCHours()),
  }
}

function replayDateDefault() {
  return latestSafeReplayWindow().date
}

function replayHourDefault() {
  return latestSafeReplayWindow().hour
}

function changePct(first: number | null | undefined, last: number | null | undefined) {
  if (!first || last === null || last === undefined || !Number.isFinite(first) || !Number.isFinite(last)) return null
  return ((last - first) / first) * 100
}

function candleHasRange(candle: CryptoReplayCandle) {
  return [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite) && candle.high >= candle.low && candle.high > candle.low
}

function candleHasBody(candle: CryptoReplayCandle) {
  return [candle.open, candle.close].every(Number.isFinite) && candle.open !== candle.close
}

function aggregateTradesToCandles(trades: CryptoReplayTrade[]) {
  const buckets = new Map<number, { time: number; open: number; high: number; low: number; close: number; volume: number }>()
  for (const trade of trades) {
    const timestamp = Math.floor(new Date(trade.timestamp).getTime() / 1000)
    const price = Number(trade.price)
    const size = Number(trade.size)
    if (!Number.isFinite(timestamp) || !Number.isFinite(price) || price <= 0) continue
    const bucketTime = Math.floor(timestamp / 60) * 60
    const existing = buckets.get(bucketTime)
    if (!existing) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: Number.isFinite(size) ? Math.max(0, size) : 0,
      })
    } else {
      existing.high = Math.max(existing.high, price)
      existing.low = Math.min(existing.low, price)
      existing.close = price
      existing.volume += Number.isFinite(size) ? Math.max(0, size) : 0
    }
  }
  return [...buckets.values()].sort((left, right) => left.time - right.time)
}

type ReplayCandleSelection = {
  source: "decoded-candles" | "trade-derived-ohlc" | "decoded-candles-fallback"
  candles: ReplayChartCandle[]
  diagnostics: {
    decodedCount: number
    tradeCount: number
    tradeDerivedCount: number
    flatRangeRatio: number
    flatBodyRatio: number
  }
}

function sanitizeReplayChartCandles(candles: ReplayChartCandle[]) {
  const byTime = new Map<number, ReplayChartCandle>()
  for (const candle of candles) {
    if (
      !Number.isFinite(candle.time)
      || !Number.isFinite(candle.open)
      || !Number.isFinite(candle.high)
      || !Number.isFinite(candle.low)
      || !Number.isFinite(candle.close)
      || candle.high < candle.low
    ) {
      continue
    }
    byTime.set(candle.time, {
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume ?? null,
    })
  }
  return [...byTime.values()].sort((left, right) => left.time - right.time)
}

function chooseReplayCandles(candles: CryptoReplayCandle[], trades: CryptoReplayTrade[]): ReplayCandleSelection {
  const normalizedCandles = sanitizeReplayChartCandles(candles.map((candle) => ({
    time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume ?? null,
  })))
  const flatRangeCount = candles.filter((candle) => candle.high === candle.low).length
  const flatBodyCount = candles.filter((candle) => candle.open === candle.close).length
  const flatRangeRatio = candles.length ? flatRangeCount / candles.length : 1
  const flatBodyRatio = candles.length ? flatBodyCount / candles.length : 1
  const structuredCount = candles.filter((candle) => candleHasRange(candle) || candleHasBody(candle)).length
  const structuredRatio = candles.length ? structuredCount / candles.length : 0
  const tradeCandles = aggregateTradesToCandles(trades)
  const diagnostics = {
    decodedCount: normalizedCandles.length,
    tradeCount: trades.length,
    tradeDerivedCount: tradeCandles.length,
    flatRangeRatio: Number(flatRangeRatio.toFixed(3)),
    flatBodyRatio: Number(flatBodyRatio.toFixed(3)),
  }

  if (
    normalizedCandles.length >= 2
    && structuredRatio >= 0.35
    && flatRangeRatio < 0.8
    && flatBodyRatio < 0.8
  ) {
    return {
      source: "decoded-candles",
      candles: normalizedCandles,
      diagnostics,
    }
  }
  if (tradeCandles.length >= 2) {
    return {
      source: "trade-derived-ohlc",
      candles: tradeCandles,
      diagnostics,
    }
  }
  return {
    source: "decoded-candles-fallback",
    candles: normalizedCandles,
    diagnostics,
  }
}

function binanceKlineEndpoint(exchange: string) {
  if (exchange === "binance_futures") return "https://fapi.binance.com/fapi/v1/klines"
  if (exchange === "binance_spot") return "https://api.binance.com/api/v3/klines"
  return null
}

function replayWindowBounds(date: string, hour: string) {
  const start = new Date(`${date}T${String(Number(hour)).padStart(2, "0")}:00:00.000Z`)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { startMs: start.getTime(), endMs: end.getTime() }
}

function normalizeBinanceKlines(rows: unknown): ReplayChartCandle[] {
  if (!Array.isArray(rows)) return []
  return sanitizeReplayChartCandles(rows.map((row) => {
    if (!Array.isArray(row)) return null
    const openTime = Number(row[0])
    const open = Number(row[1])
    const high = Number(row[2])
    const low = Number(row[3])
    const close = Number(row[4])
    const volume = Number(row[5])
    if (![openTime, open, high, low, close].every(Number.isFinite)) return null
    return {
      time: Math.floor(openTime / 1000),
      open,
      high,
      low,
      close,
      volume: Number.isFinite(volume) ? volume : null,
    }
  }).filter((row): row is ReplayChartCandle => Boolean(row)))
}

function priceSeriesFromChartCandles(candles: ReplayChartCandle[]): PricePoint[] {
  return candles.map((candle) => ({
    timestamp: new Date(candle.time * 1000).toISOString(),
    value: candle.close,
  }))
}

function datasetReason(data: CryptoReplayResponse | null, dataset: string) {
  return data?.diagnostics?.unavailable?.find((item) => item.dataset === dataset || item.dataset === "provider")?.reason
    ?? data?.diagnostics?.errors?.find((item) => item.dataset === dataset || item.dataset === "provider")?.message
    ?? "Dataset returned no usable rows."
}

function emptyReplayResponse(exchange: string, symbol: string, date: string, hour: string): CryptoReplayResponse {
  const start = new Date(`${date}T${String(Number(hour)).padStart(2, "0")}:00:00.000Z`)
  return {
    ok: false,
    source: "cryptohftdata",
    exchange,
    symbol,
    window: {
      start: start.toISOString(),
      end: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
    },
    trades: [],
    book: [],
    liquidations: [],
    funding: [],
    candles: [],
    diagnostics: { downloaded: [], unavailable: [], errors: [] },
  }
}

function mergeReplayData(previous: CryptoReplayResponse | null, next: CryptoReplayResponse): CryptoReplayResponse {
  const base = previous ?? emptyReplayResponse(next.exchange, next.symbol, next.window.start.slice(0, 10), String(new Date(next.window.start).getUTCHours()))
  return {
    ...base,
    ok: base.ok || next.ok,
    source: next.source,
    exchange: next.exchange,
    symbol: next.symbol,
    window: next.window ?? base.window,
    trades: next.trades.length ? next.trades : base.trades,
    book: next.book.length ? next.book : base.book,
    liquidations: next.liquidations.length ? next.liquidations : base.liquidations,
    funding: next.funding.length ? [...base.funding, ...next.funding] : base.funding,
    candles: next.candles.length ? next.candles : base.candles,
    diagnostics: {
      cache: next.diagnostics?.cache ?? base.diagnostics?.cache,
      downloaded: [...(base.diagnostics?.downloaded ?? []), ...(next.diagnostics?.downloaded ?? [])],
      unavailable: [...(base.diagnostics?.unavailable ?? []), ...(next.diagnostics?.unavailable ?? [])],
      errors: [...(base.diagnostics?.errors ?? []), ...(next.diagnostics?.errors ?? [])],
    },
  }
}

function hasUsablePositioning(data: CryptoReplayResponse | null) {
  return Boolean(data?.funding.some((item) => item.fundingRate !== null || item.openInterest !== null || item.openInterestValue !== null))
}

function positioningSourceLabel(rows: CryptoReplayFundingPoint[]) {
  const source = rows.find((row) => row.fundingRate !== null || row.openInterest !== null || row.openInterestValue !== null)?.source
  if (source === "binance-historical") return "Binance historical fallback"
  if (source === "current-fallback") return "Current fallback"
  if (rows.length) return "CryptoHFTData"
  return "No data"
}

function positioningReason(data: CryptoReplayResponse | null) {
  if (hasUsablePositioning(data)) return null
  return datasetReason(data, "open_interest") || datasetReason(data, "mark_price") || "No OI/Funding data returned."
}

function buildPositioningReplayResponse(base: CryptoReplayResponse | null, funding: CryptoReplayFundingPoint[], reason?: string | null): CryptoReplayResponse {
  const exchangeValue = base?.exchange ?? "binance_futures"
  const symbolValue = base?.symbol ?? "BTCUSDT"
  const windowStart = base?.window?.start ?? new Date().toISOString()
  const dateValue = windowStart.slice(0, 10)
  const hourValue = String(new Date(windowStart).getUTCHours())
  return {
    ...(base ?? emptyReplayResponse(exchangeValue, symbolValue, dateValue, hourValue)),
    ok: funding.length > 0,
    funding,
    diagnostics: {
      downloaded: [],
      unavailable: funding.length ? [] : [{ dataset: "positioning", reason: reason ?? "No OI/Funding data returned." }],
      errors: [],
    },
  }
}

function percentile(values: number[], p: number) {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))]
}

function priceSeriesFrom(data: CryptoReplayResponse | null): PricePoint[] {
  if (!data) return []
  if (data.candles.length) return data.candles.map((item) => ({ timestamp: item.timestamp, value: item.close }))
  return data.trades.map((item) => ({ timestamp: item.timestamp, value: item.price }))
}

function bounds(points: Array<{ value: number | null | undefined }>) {
  const clean = points.map((point) => point.value).filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))
  if (!clean.length) return null
  let min = clean[0]
  let max = clean[0]
  for (const value of clean) {
    if (value < min) min = value
    if (value > max) max = value
  }
  return { min, max, span: max - min || 1 }
}

function pathFor(points: Array<{ value: number | null | undefined }>, width: number, height: number, padX = 44, padY = 26) {
  const clean = points.filter((point): point is { value: number } => point.value !== null && point.value !== undefined && Number.isFinite(point.value))
  const limits = bounds(clean)
  if (!limits || clean.length < 2) return ""
  const innerWidth = width - padX * 2
  const innerHeight = height - padY * 2
  return clean.map((point, index) => {
    const x = padX + (index / Math.max(1, clean.length - 1)) * innerWidth
    const y = padY + innerHeight - ((point.value - limits.min) / limits.span) * innerHeight
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
  }).join(" ")
}

function PriceReplayChart({ points, candles, priceChange }: { points: PricePoint[]; candles: CryptoReplayCandle[]; priceChange: number | null }) {
  if (points.length < 2) return <EmptyState title="Price Chart Unavailable" reason="No decoded ticker, candle, or trade price series." />

  const width = 980
  const height = 430
  const padX = 56
  const padY = 34
  const volumeHeight = 56
  const priceHeight = height - volumeHeight - padY
  const limits = bounds(points)
  if (!limits) return <EmptyState title="Price Chart Unavailable" reason="Price rows could not be normalized." />

  const path = pathFor(points, width, height - volumeHeight, padX, padY)
  const last = points.at(-1)
  const first = points[0]
  const stroke = priceChange !== null && priceChange < 0 ? "#fb7185" : "#34d399"
  const lastY = last ? padY + (priceHeight - padY) - ((last.value - limits.min) / limits.span) * (priceHeight - padY) : null
  const yLabels = [limits.max, limits.min + limits.span * 0.66, limits.min + limits.span * 0.33, limits.min]
  const volumeMax = candles.length ? Math.max(1, ...candles.map((item) => item.volume ?? 0)) : 1
  const xLabels = [
    { label: timeOnly(first?.timestamp), x: padX },
    { label: timeOnly(points[Math.floor(points.length / 2)]?.timestamp), x: width / 2 },
    { label: timeOnly(last?.timestamp), x: width - padX },
  ]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[430px] w-full bg-black">
      <defs>
        <linearGradient id="priceFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="#000" />
      {Array.from({ length: 9 }, (_, index) => {
        const x = padX + (index / 8) * (width - padX * 2)
        return <line key={`grid-x-${index}`} x1={x} x2={x} y1={padY} y2={height - padY} stroke="#18181b" strokeWidth="1" />
      })}
      {Array.from({ length: 6 }, (_, index) => {
        const y = padY + (index / 5) * (priceHeight - padY)
        return <line key={`grid-y-${index}`} x1={padX} x2={width - padX} y1={y} y2={y} stroke="#18181b" strokeWidth="1" />
      })}
      {candles.length ? candles.map((candle, index) => {
        const x = padX + (index / Math.max(1, candles.length - 1)) * (width - padX * 2)
        const yOpen = padY + (priceHeight - padY) - ((candle.open - limits.min) / limits.span) * (priceHeight - padY)
        const yClose = padY + (priceHeight - padY) - ((candle.close - limits.min) / limits.span) * (priceHeight - padY)
        const yHigh = padY + (priceHeight - padY) - ((candle.high - limits.min) / limits.span) * (priceHeight - padY)
        const yLow = padY + (priceHeight - padY) - ((candle.low - limits.min) / limits.span) * (priceHeight - padY)
        const up = candle.close >= candle.open
        const bodyTop = Math.min(yOpen, yClose)
        const bodyHeight = Math.max(2, Math.abs(yClose - yOpen))
        const barWidth = Math.max(3, Math.min(8, (width - padX * 2) / Math.max(1, candles.length) * 0.55))
        const volumeBarHeight = ((candle.volume ?? 0) / volumeMax) * (volumeHeight - 12)
        return (
          <g key={`${candle.timestamp}-${index}`}>
            <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={up ? "#34d399" : "#ef4444"} strokeWidth="1.4" />
            <rect x={x - barWidth / 2} y={bodyTop} width={barWidth} height={bodyHeight} fill={up ? "#10b981" : "#ef4444"} />
            <rect x={x - barWidth / 2} y={height - padY - volumeBarHeight} width={barWidth} height={volumeBarHeight} fill={up ? "#059669" : "#991b1b"} opacity="0.72" />
          </g>
        )
      }) : (
        <>
          <path d={`${path} L${width - padX},${height - padY - volumeHeight} L${padX},${height - padY - volumeHeight} Z`} fill="url(#priceFill)" />
          <path d={path} fill="none" stroke={stroke} strokeWidth="2.4" />
        </>
      )}
      <line x1={padX} x2={width - padX} y1={height - padY - volumeHeight} y2={height - padY - volumeHeight} stroke="#27272a" />
      {last && lastY !== null ? (
        <>
          <line x1={padX} x2={width - padX} y1={lastY} y2={lastY} stroke={stroke} strokeDasharray="6 6" strokeOpacity="0.55" />
          <circle cx={width - padX} cy={lastY} r="4.5" fill={stroke} />
          <rect x={width - padX - 104} y={lastY - 15} width="98" height="24" fill="#020617" stroke={stroke} />
          <text x={width - padX - 55} y={lastY + 1} fill="#fff" fontSize="11" fontWeight="900" textAnchor="middle">{numberValue(last.value)}</text>
        </>
      ) : null}
      {yLabels.map((value, index) => {
        const y = padY + (index / 3) * (priceHeight - padY)
        return <text key={`price-y-${index}`} x={width - padX + 8} y={y + 4} fill="#71717a" fontSize="10" fontWeight="900">{numberValue(value)}</text>
      })}
      {xLabels.map((item, index) => (
        <text key={`price-x-${index}`} x={item.x} y={height - 10} fill="#71717a" fontSize="10" fontWeight="900" textAnchor={index === 0 ? "start" : index === 1 ? "middle" : "end"}>{item.label}</text>
      ))}
    </svg>
  )
}

function MiniTrendChart({ points, tone = "cyan", height = 145 }: { points: Array<{ value: number | null | undefined }>; tone?: "cyan" | "green" | "red" | "amber"; height?: number }) {
  const clean = points.filter((point): point is { value: number } => point.value !== null && point.value !== undefined && Number.isFinite(point.value))
  if (clean.length < 2) return <EmptyState title="No Trend Data" reason="Not enough decoded points." />
  const width = 460
  const path = pathFor(clean, width, height, 12, 14)
  const stroke = tone === "green" ? "#34d399" : tone === "red" ? "#fb7185" : tone === "amber" ? "#f59e0b" : "#22d3ee"
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-[120px] w-full bg-black">
      {Array.from({ length: 5 }, (_, index) => {
        const y = 14 + (index / 4) * (height - 28)
        return <line key={`mini-grid-${index}`} x1="12" x2={width - 12} y1={y} y2={y} stroke="#18181b" strokeWidth="1" />
      })}
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  )
}

function DualTrendChart({ primary, secondary }: { primary: Array<{ value: number | null | undefined }>; secondary: Array<{ value: number | null | undefined }> }) {
  const width = 460
  const height = 145
  const primaryPath = pathFor(primary, width, height, 12, 14)
  const secondaryPath = pathFor(secondary, width, height, 12, 14)
  if (!primaryPath && !secondaryPath) return <EmptyState title="No Trend Data" reason="Not enough decoded points." />
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-[120px] w-full bg-black">
      {Array.from({ length: 5 }, (_, index) => {
        const y = 14 + (index / 4) * (height - 28)
        return <line key={`dual-grid-${index}`} x1="12" x2={width - 12} y1={y} y2={y} stroke="#18181b" strokeWidth="1" />
      })}
      {secondaryPath ? <path d={secondaryPath} fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeOpacity="0.78" /> : null}
      {primaryPath ? <path d={primaryPath} fill="none" stroke="#22d3ee" strokeWidth="2" /> : null}
    </svg>
  )
}

function liquidationStats(liquidations: CryptoReplayLiquidation[]) {
  const longNotional = liquidations.filter((item) => item.side === "long").reduce((sum, item) => sum + (item.notional ?? 0), 0)
  const shortNotional = liquidations.filter((item) => item.side === "short").reduce((sum, item) => sum + (item.notional ?? 0), 0)
  const total = longNotional + shortNotional
  const largest = liquidations.reduce((max, item) => Math.max(max, item.notional ?? 0), 0)
  const bias = total === 0 ? "NO DATA" : longNotional > shortNotional ? "LONG" : shortNotional > longNotional ? "SHORT" : "BALANCED"
  return { longNotional, shortNotional, total, largest, bias }
}

function liquidationBuckets(liquidations: CryptoReplayLiquidation[]) {
  const buckets = new Map<string, { timestamp: string; long: number; short: number }>()
  for (const item of liquidations) {
    const date = new Date(item.timestamp)
    date.setUTCSeconds(0, 0)
    const key = date.toISOString()
    const bucket = buckets.get(key) ?? { timestamp: key, long: 0, short: 0 }
    if (item.side === "long") bucket.long += item.notional ?? 0
    if (item.side === "short") bucket.short += item.notional ?? 0
    buckets.set(key, bucket)
  }
  return [...buckets.values()].sort((left, right) => left.timestamp.localeCompare(right.timestamp))
}

function orderbookMetrics(book?: CryptoReplayBookSnapshot) {
  const bids = book?.bids ?? []
  const asks = book?.asks ?? []
  const bidLiquidity = bids.reduce((sum, [, size]) => sum + size, 0)
  const askLiquidity = asks.reduce((sum, [, size]) => sum + size, 0)
  const total = bidLiquidity + askLiquidity
  const bestBid = bids[0]?.[0] ?? null
  const bestAsk = asks[0]?.[0] ?? null
  return {
    bidLiquidity,
    askLiquidity,
    imbalance: total > 0 ? ((bidLiquidity - askLiquidity) / total) * 100 : null,
    bestBid,
    bestAsk,
    spread: bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null,
  }
}

function DepthCurve({ book, reason }: { book?: CryptoReplayBookSnapshot; reason?: string | null }) {
  if (!book || (!book.bids.length && !book.asks.length)) return <EmptyState title="Orderbook Unavailable" reason={reason ?? "Decoded orderbook snapshot has no usable levels."} />

  const width = 440
  const height = 160
  const bidDepth = book.bids.slice(0, 28).map(([price, size], index, rows) => ({
    price,
    cumulative: rows.slice(0, index + 1).reduce((sum, [, levelSize]) => sum + levelSize, 0),
  })).reverse()
  const askDepth = book.asks.slice(0, 28).map(([price, size], index, rows) => ({
    price,
    cumulative: rows.slice(0, index + 1).reduce((sum, [, levelSize]) => sum + levelSize, 0),
  }))
  const all = [...bidDepth, ...askDepth]
  const maxDepth = Math.max(1, ...all.map((item) => item.cumulative))
  const bidPath = bidDepth.map((item, index) => {
    const x = 18 + (index / Math.max(1, bidDepth.length - 1)) * 190
    const y = height - 18 - (item.cumulative / maxDepth) * 120
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
  }).join(" ")
  const askPath = askDepth.map((item, index) => {
    const x = 232 + (index / Math.max(1, askDepth.length - 1)) * 190
    const y = height - 18 - (item.cumulative / maxDepth) * 120
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
  }).join(" ")

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[160px] w-full bg-black">
      <line x1="220" x2="220" y1="10" y2={height - 14} stroke="#27272a" />
      {Array.from({ length: 4 }, (_, index) => {
        const y = 18 + (index / 3) * 118
        return <line key={`depth-grid-${index}`} x1="16" x2={width - 16} y1={y} y2={y} stroke="#18181b" />
      })}
      {bidPath ? <path d={bidPath} fill="none" stroke="#34d399" strokeWidth="2.2" /> : null}
      {askPath ? <path d={askPath} fill="none" stroke="#fb7185" strokeWidth="2.2" /> : null}
      <text x="20" y="16" fill="#34d399" fontSize="10" fontWeight="900">BID DEPTH</text>
      <text x={width - 20} y="16" fill="#fb7185" fontSize="10" fontWeight="900" textAnchor="end">ASK DEPTH</text>
    </svg>
  )
}

function LiquidationBars({ buckets }: { buckets: Array<{ timestamp: string; long: number; short: number }> }) {
  if (!buckets.length) return <EmptyState title="Liquidations Unavailable" reason="Decoded liquidation dataset returned no rows." />
  const rows = buckets.slice(-18)
  const max = Math.max(1, ...rows.map((item) => item.long + item.short))
  return (
    <div className="grid h-[145px] items-end gap-1 bg-black p-3" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
      {rows.map((bucket) => (
        <div key={bucket.timestamp} className="flex h-full flex-col justify-end gap-0.5" title={timeOnly(bucket.timestamp)}>
          <div className="bg-rose-300/75" style={{ height: `${Math.max(2, (bucket.short / max) * 100)}%` }} />
          <div className="bg-emerald-300/75" style={{ height: `${Math.max(2, (bucket.long / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  )
}

function replayEvents(data: CryptoReplayResponse | null) {
  if (!data) return []
  const events: ReplayEvent[] = []
  const priceSeries = priceSeriesFrom(data)
  const firstPrice = priceSeries[0]?.value ?? null
  const lastPrice = priceSeries.at(-1)?.value ?? null
  const priceChange = changePct(firstPrice, lastPrice)

  if (priceChange !== null && priceChange >= 0.5) events.push({ timestamp: priceSeries.at(-1)?.timestamp ?? data.window?.end ?? "", type: "Price Shock", label: `${pct(priceChange)} move`, tone: "green" })
  if (priceChange !== null && priceChange <= -0.5) events.push({ timestamp: priceSeries.at(-1)?.timestamp ?? data.window?.end ?? "", type: "Price Shock", label: `${pct(priceChange)} move`, tone: "red" })

  const notionals = data.liquidations.map((item) => item.notional ?? 0).filter((value) => value > 0)
  const largeThreshold = percentile(notionals, 0.9)
  if (largeThreshold !== null) {
    data.liquidations
      .filter((item) => (item.notional ?? 0) >= largeThreshold)
      .slice(-4)
      .forEach((item) => events.push({ timestamp: item.timestamp, type: "Large Liquidation", label: compactUsd(item.notional), tone: item.side === "long" ? "green" : "red" }))
  }

  const buckets = liquidationBuckets(data.liquidations)
  for (const bucket of buckets) {
    const count = data.liquidations.filter((item) => {
      const minute = new Date(item.timestamp)
      minute.setUTCSeconds(0, 0)
      return minute.toISOString() === bucket.timestamp
    }).length
    if (count >= 3) events.push({ timestamp: bucket.timestamp, type: "Liquidation Cluster", label: `${count} events`, tone: "amber" })
  }

  const oiRows = data.funding.filter((item) => item.openInterest !== null)
  const oiChange = changePct(oiRows[0]?.openInterest, oiRows.at(-1)?.openInterest)
  if (oiChange !== null && Math.abs(oiChange) >= 0.25) {
    events.push({ timestamp: oiRows.at(-1)?.timestamp ?? "", type: oiChange > 0 ? "OI Spike" : "OI Drop", label: pct(oiChange), tone: oiChange > 0 ? "cyan" : "amber" })
  }

  const fundingRows = data.funding.filter((item) => item.fundingRate !== null)
  const fundingChange = fundingRows.length >= 2 && fundingRows[0].fundingRate !== null && fundingRows.at(-1)?.fundingRate !== null
    ? fundingRows.at(-1)!.fundingRate! - fundingRows[0].fundingRate!
    : null
  if (fundingChange !== null && Math.abs(fundingChange) >= 0.000001) {
    events.push({ timestamp: fundingRows.at(-1)?.timestamp ?? "", type: "Funding Shift", label: `${(fundingChange * 100).toFixed(5)}%`, tone: fundingChange > 0 ? "green" : "red" })
  }

  return events.sort((left, right) => left.timestamp.localeCompare(right.timestamp)).slice(-10)
}

function whatHappenedLines(symbol: string, priceChange: number | null, oiChange: number | null, fundingRows: CryptoReplayFundingPoint[], liquidationCount: number) {
  const lines: string[] = []
  if (priceChange !== null) lines.push(`${symbol} moved ${pct(priceChange)} during the replay hour.`)
  if (oiChange !== null) lines.push(`Open interest ${oiChange >= 0 ? "increased" : "decreased"} ${pct(Math.abs(oiChange))}.`)
  if (fundingRows.length) {
    const first = fundingRows[0]?.fundingRate
    const last = fundingRows.at(-1)?.fundingRate
    if (first !== null && first !== undefined && last !== null && last !== undefined) {
      const direction = last > 0 ? "positive" : last < 0 ? "negative" : "neutral"
      lines.push(`Funding ended ${direction} at ${(last * 100).toFixed(4)}%.`)
    }
  }
  lines.push(`${liquidationCount} liquidations occurred in the selected window.`)
  return lines
}

export default function ReplayV1Page() {
  const searchParams = useSearchParams()
  const initialExchange = searchParams.get("exchange") ?? "binance_futures"
  const initialSymbol = searchParams.get("symbol")?.toUpperCase() ?? "BTCUSDT"
  const initialDate = searchParams.get("date") ?? replayDateDefault()
  const initialHour = searchParams.get("hour") ?? replayHourDefault()
  const [exchange, setExchange] = useState(initialExchange)
  const [symbol, setSymbol] = useState(initialSymbol)
  const [date, setDate] = useState(initialDate)
  const [hour, setHour] = useState(initialHour)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<string | null>(null)
  const [replayData, setReplayData] = useState<CryptoReplayResponse | null>(null)
  const [chartCandles, setChartCandles] = useState<ReplayChartCandle[]>([])
  const [chartSource, setChartSource] = useState<string | null>(null)
  const [chartReason, setChartReason] = useState<string | null>(null)
  const [orderbookLoading, setOrderbookLoading] = useState(false)
  const [orderbookReason, setOrderbookReason] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const abortControllersRef = useRef<AbortController[]>([])
  const orderbookControllerRef = useRef<AbortController | null>(null)
  const orderbookInFlightRef = useRef(false)
  const loadIdRef = useRef(0)
  const requestedDatasetsRef = useRef<Set<string>>(new Set())

  const priceSeries = useMemo(() => {
    if (chartCandles.length) return priceSeriesFromChartCandles(chartCandles)
    return priceSeriesFrom(replayData)
  }, [chartCandles, replayData])
  const firstPrice = priceSeries[0]?.value ?? null
  const lastPrice = priceSeries.at(-1)?.value ?? null
  const highPrice = priceSeries.length ? Math.max(...priceSeries.map((point) => point.value)) : null
  const lowPrice = priceSeries.length ? Math.min(...priceSeries.map((point) => point.value)) : null
  const priceChange = changePct(firstPrice, lastPrice)
  const oiRows = replayData?.funding.filter((item) => item.openInterest !== null) ?? []
  const fundingRows = replayData?.funding.filter((item) => item.fundingRate !== null) ?? []
  const positioningRows = replayData?.funding ?? []
  const positioningSource = positioningSourceLabel(positioningRows)
  const positioningUnavailableReason = positioningReason(replayData)
  const liqStats = liquidationStats(replayData?.liquidations ?? [])
  const liqBuckets = liquidationBuckets(replayData?.liquidations ?? [])
  const latestBook = replayData?.book.at(-1)
  const bookMetrics = orderbookMetrics(latestBook)
  const events = replayEvents(replayData)
  const oiChange = changePct(oiRows[0]?.openInterest, oiRows.at(-1)?.openInterest)
  const fundingChange = fundingRows.length >= 2 && fundingRows[0].fundingRate !== null && fundingRows.at(-1)?.fundingRate !== null
    ? fundingRows.at(-1)!.fundingRate! - fundingRows[0].fundingRate!
    : null
  const topLiquidations = [...(replayData?.liquidations ?? [])]
    .filter((item) => (item.notional ?? 0) > 0)
    .sort((left, right) => (right.notional ?? 0) - (left.notional ?? 0))
    .slice(0, 6)
  const summaryLines = replayData ? whatHappenedLines(replayData.symbol, priceChange, oiChange, fundingRows, replayData.liquidations.length) : []
  const timelineEvents = useMemo(() => {
    const lastVisibleByLane = [-100, -100, -100]
    const laneCycle = lastVisibleByLane.length
    return events.map((event, index) => {
      const rawLeft = events.length === 1 ? 50 : (index / Math.max(1, events.length - 1)) * 100
      const left = Math.min(96, Math.max(4, rawLeft))
      const align = index === 0 ? "left" : index === events.length - 1 ? "right" : "center"
      const preferredLane = index % laneCycle
      const lane = index === 0 || index === events.length - 1
        ? preferredLane
        : lastVisibleByLane.findIndex((value) => left - value >= 14)
      const resolvedLane = lane >= 0 ? lane : preferredLane
      const showLabel = index === 0 || index === events.length - 1 || left - lastVisibleByLane[resolvedLane] >= 10
      if (showLabel) lastVisibleByLane[resolvedLane] = left
      return { ...event, left, align, showLabel, lane: resolvedLane }
    })
  }, [events])

  useEffect(() => {
    if (!chartCandles.length) return
    console.debug("Replay candle source", {
      source: chartSource,
      candleCount: chartCandles.length,
      firstFive: chartCandles.slice(0, 5).map((sample) => ({
        time: sample.time,
        open: sample.open,
        high: sample.high,
        low: sample.low,
        close: sample.close,
        volume: sample.volume ?? null,
      })),
    })
  }, [chartCandles, chartSource])

  function abortReplayRequests() {
    for (const controller of abortControllersRef.current) controller.abort()
    abortControllersRef.current = []
  }

  function abortOrderbookRequest() {
    orderbookControllerRef.current?.abort()
    orderbookControllerRef.current = null
    orderbookInFlightRef.current = false
    if (mountedRef.current) setOrderbookLoading(false)
  }

  async function fetchReplayDatasets(datasets: string[], stage: string, signal: AbortSignal, loadId: number, foreground = false) {
    const key = datasets.slice().sort().join(",")
    if (requestedDatasetsRef.current.has(key)) return null
    requestedDatasetsRef.current.add(key)
    if (foreground && mountedRef.current && loadIdRef.current === loadId) setLoadingStage(stage)
    const params = new URLSearchParams({
      exchange,
      symbol,
      date,
      hour,
      datasets: datasets.join(","),
    })
    try {
      const response = await fetch(`/api/replay/cryptohftdata?${params.toString()}`, { cache: "no-store", signal })
      const payload = await response.json() as CryptoReplayResponse | { reason?: string }
      if (signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return null
      if (!response.ok) {
        setError("reason" in payload ? payload.reason ?? `${stage} unavailable.` : `${stage} unavailable.`)
        return null
      }
      return payload as CryptoReplayResponse
    } catch (loadError) {
      if (signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return null
      setError(loadError instanceof Error ? loadError.message : `${stage} unavailable.`)
      return null
    }
  }

  async function fetchBinancePositioningFallback(signal: AbortSignal, loadId: number) {
    const params = new URLSearchParams({ symbol, date, hour })
    try {
      const response = await fetch(`/api/replay/binance-positioning?${params.toString()}`, { cache: "no-store", signal })
      const payload = await response.json() as BinancePositioningResponse
      if (signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return null
      if (payload.ok && payload.funding.length) {
        return buildPositioningReplayResponse(replayData, payload.funding)
      }
      return buildPositioningReplayResponse(replayData, [], payload.reason ?? "Binance historical fallback returned no OI/Funding rows.")
    } catch (loadError) {
      if (signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return null
      return buildPositioningReplayResponse(replayData, [], loadError instanceof Error ? loadError.message : "Binance historical positioning unavailable.")
    }
  }

  async function fetchCurrentPositioningFallback(signal: AbortSignal, loadId: number) {
    try {
      const response = await fetch(`/api/market/futures-symbol-context?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store", signal })
      const payload = await response.json() as CurrentPositioningResponse
      if (signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return null
      if (!response.ok || !payload.ok) {
        return buildPositioningReplayResponse(replayData, [], payload.reason ?? "Current futures context unavailable.")
      }
      const timestampMs = payload.openInterestTime ?? payload.time ?? replayWindowBounds(date, hour).endMs
      const row: CryptoReplayFundingPoint = {
        timestamp: new Date(timestampMs).toISOString(),
        fundingRate: payload.fundingRate ?? null,
        openInterest: payload.openInterest ?? null,
        openInterestValue: null,
        source: "current-fallback",
      }
      return buildPositioningReplayResponse(replayData, [row].filter((item) => item.fundingRate !== null || item.openInterest !== null), "Current futures context returned no OI/Funding values.")
    } catch (loadError) {
      if (signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return null
      return buildPositioningReplayResponse(replayData, [], loadError instanceof Error ? loadError.message : "Current futures context unavailable.")
    }
  }

  async function loadPositioning(loadId: number) {
    const controller = new AbortController()
    abortControllersRef.current.push(controller)
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    const cryptoData = await fetchReplayDatasets(["open_interest", "mark_price"], "open interest and funding", controller.signal, loadId)
    try {
      if (controller.signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return
      if (hasUsablePositioning(cryptoData)) {
        setReplayData((previous) => mergeReplayData(previous, cryptoData!))
        return
      }

      const binanceData = await fetchBinancePositioningFallback(controller.signal, loadId)
      if (controller.signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return
      if (hasUsablePositioning(binanceData)) {
        setReplayData((previous) => mergeReplayData(previous, binanceData!))
        return
      }

      const currentData = await fetchCurrentPositioningFallback(controller.signal, loadId)
      if (controller.signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return
      setReplayData((previous) => mergeReplayData(previous, currentData ?? binanceData ?? cryptoData ?? buildPositioningReplayResponse(replayData, [], "No OI/Funding data returned.")))
    } finally {
      window.clearTimeout(timeout)
    }
  }

  async function fetchReplayChartCandles(signal: AbortSignal, loadId: number) {
    if (mountedRef.current && loadIdRef.current === loadId) setLoadingStage("chart data")
    const endpoint = binanceKlineEndpoint(exchange)
    if (!endpoint) {
      setChartReason("Binance kline chart only available for Binance exchanges.")
      return null
    }

    try {
      const { startMs, endMs } = replayWindowBounds(date, hour)
      const url = new URL(endpoint)
      url.searchParams.set("symbol", symbol)
      url.searchParams.set("interval", "1m")
      url.searchParams.set("startTime", String(startMs))
      url.searchParams.set("endTime", String(endMs))
      url.searchParams.set("limit", "60")
      const response = await fetch(url.toString(), { cache: "no-store", signal })
      if (!response.ok) {
        setChartReason(`Binance kline request failed with ${response.status}.`)
        return null
      }
      const payload = await response.json()
      if (signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return null
      const candles = normalizeBinanceKlines(payload)
      if (!candles.length) {
        setChartReason("Binance kline request returned no usable candles.")
        return null
      }
      return {
        source: exchange === "binance_futures" ? "binance-futures-klines" : "binance-spot-klines",
        candles,
      }
    } catch (loadError) {
      if (signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return null
      setChartReason(loadError instanceof Error ? loadError.message : "Binance kline request failed.")
      return null
    }
  }

  async function loadReplay() {
    abortOrderbookRequest()
    abortReplayRequests()
    const loadId = loadIdRef.current + 1
    loadIdRef.current = loadId
    requestedDatasetsRef.current = new Set()
    setHasLoaded(true)
    setLoading(true)
    setLoadingStage("metadata")
    setError(null)
    setChartCandles([])
    setChartSource(null)
    setChartReason(null)
    setOrderbookReason(null)
    setReplayData(emptyReplayResponse(exchange, symbol, date, hour))
    const chartController = new AbortController()
    abortControllersRef.current.push(chartController)
    const chartTimeout = window.setTimeout(() => chartController.abort(), 6000)
    try {
      const klineChart = await fetchReplayChartCandles(chartController.signal, loadId)
      if (!mountedRef.current || loadIdRef.current !== loadId || chartController.signal.aborted) return
      if (klineChart) {
        setChartCandles(klineChart.candles)
        setChartSource(klineChart.source)
      }

      setLoading(false)
      setLoadingStage(null)
      const backgroundStages = [
        { datasets: ["liquidations"], stage: "liquidations" },
      ]
      void loadPositioning(loadId)
      for (const item of backgroundStages) {
        const controller = new AbortController()
        abortControllersRef.current.push(controller)
        const timeout = window.setTimeout(() => controller.abort(), 10000)
        void fetchReplayDatasets(item.datasets, item.stage, controller.signal, loadId).then((data) => {
          if (!data || controller.signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return
          setReplayData((previous) => mergeReplayData(previous, data))
        }).finally(() => {
          window.clearTimeout(timeout)
        })
      }
    } finally {
      window.clearTimeout(chartTimeout)
      if (mountedRef.current && loadIdRef.current === loadId) {
        setLoading(false)
        setLoadingStage(null)
      }
    }
  }

  async function loadManualDatasets(datasets: string[], stage: string) {
    const loadId = loadIdRef.current || 1
    if (!loadIdRef.current) loadIdRef.current = loadId
    setHasLoaded(true)
    const controller = new AbortController()
    abortControllersRef.current.push(controller)
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      const data = await fetchReplayDatasets(datasets, stage, controller.signal, loadId, true)
      if (!data || controller.signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return
      setReplayData((previous) => mergeReplayData(previous, data))
      setLoadingStage(null)
    } finally {
      window.clearTimeout(timeout)
    }
  }

  async function loadOrderbook() {
    if (orderbookInFlightRef.current) {
      orderbookControllerRef.current?.abort()
      orderbookControllerRef.current = null
      orderbookInFlightRef.current = false
    }
    const loadId = loadIdRef.current || 1
    if (!loadIdRef.current) loadIdRef.current = loadId
    orderbookInFlightRef.current = true
    setHasLoaded(true)
    setOrderbookLoading(true)
    setOrderbookReason(null)

    const controller = new AbortController()
    orderbookControllerRef.current = controller
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 12000)

    const params = new URLSearchParams({
      exchange,
      symbol,
      date,
      hour,
    })
    const requestUrl = `/api/replay/orderbook-cache?${params.toString()}`

    try {
      const response = await fetch(requestUrl, { cache: "no-store", signal: controller.signal })
      const payload = await response.json() as CryptoReplayResponse | { reason?: string }
      if (controller.signal.aborted || !mountedRef.current || loadIdRef.current !== loadId) return
      if (!response.ok) {
        setOrderbookReason("Orderbook provider fetch failed.")
        return
      }

      const data = payload as CryptoReplayResponse
      const latest = data.book.at(-1)
      setReplayData((previous) => mergeReplayData(previous, data))
      if (!latest || (!latest.bids.length && !latest.asks.length)) {
        setOrderbookReason(datasetReason(data, "orderbook") ?? "No usable orderbook levels.")
      }
    } catch {
      if (controller.signal.aborted || !mountedRef.current) return
      setOrderbookReason(timedOut ? "Orderbook request timed out." : "Orderbook provider fetch failed.")
    } finally {
      window.clearTimeout(timeout)
      if (orderbookControllerRef.current === controller) orderbookControllerRef.current = null
      orderbookInFlightRef.current = false
      if (mountedRef.current) setOrderbookLoading(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortOrderbookRequest()
      abortReplayRequests()
    }
  }, [])

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1900px] gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-teal-300">
            <RadioTower className="h-4 w-4" />
            Advanced Market Replay
          </div>
          <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">How it works</div>
        </div>

        <div className="grid gap-2 lg:grid-cols-[210px_190px_220px_220px_220px_180px_1fr]">
          <label className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Exchange</div>
            <select value={exchange} onChange={(event) => setExchange(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-black text-white outline-none">
              <option value="binance_futures">Binance Futures</option>
              <option value="binance_spot">Binance Spot</option>
            </select>
          </label>
          <label className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Symbol</div>
            <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} className="mt-1 w-full bg-transparent text-sm font-black uppercase text-white outline-none" />
          </label>
          <label className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Date</div>
            <input type="date" min="2025-07-01" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-black uppercase text-white outline-none" />
          </label>
          <label className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Hour UTC</div>
            <select value={hour} onChange={(event) => setHour(event.target.value)} className="mt-1 w-full bg-zinc-950 text-sm font-black uppercase text-white outline-none [color-scheme:dark]">
              {Array.from({ length: 24 }, (_, index) => (
                <option key={index} value={String(index)} className="bg-zinc-950 text-white">
                  {String(index).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={loadReplay} disabled={loading} className="border border-teal-300/40 bg-teal-400/20 px-4 text-[12px] font-black uppercase tracking-[0.16em] text-teal-50 shadow-[0_0_28px_rgba(45,212,191,0.18)] disabled:cursor-wait disabled:opacity-50">
            {loading ? `Loading ${loadingStage ?? "replay"}` : "Load Replay"}
          </button>
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Replay Duration</div>
            <div className="mt-1 text-sm font-black text-white">00:00 - 01:00 UTC</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">1 Hour</div>
          </div>
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Data Source</div>
            <div className="mt-1 text-sm font-black text-white">Binance Klines + CryptoHFTData</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">Chart + Microstructure</div>
          </div>
        </div>
        {!hasLoaded && !loading ? (
          <EmptyState title="Replay Ready" reason="Select a market window and click Load Replay." />
        ) : null}
        {hasLoaded && error ? <EmptyState title="Replay Provider Error" reason={error} /> : null}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(360px,3fr)]">
          <Section title="Price Replay Chart" icon={<LineChart className="h-3.5 w-3.5" />} className="min-h-[520px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 px-3 py-2">
              <div className="text-[11px] font-black uppercase tracking-[0.08em] text-zinc-300">
                {symbol} · {exchange.replace("_", " ")}
                <span className="ml-4 text-emerald-300">
                  O{numberValue(firstPrice)} H{numberValue(highPrice)} L{numberValue(lowPrice)} C{numberValue(lastPrice)} {pct(priceChange)}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="border border-zinc-800 bg-black px-3 py-1 text-[10px] font-black uppercase text-zinc-300">{chartSource ?? "chart pending"}</div>
                <div className="border border-zinc-800 bg-black px-3 py-1 text-[10px] font-black uppercase text-zinc-300">1m</div>
                <div className="border border-zinc-800 bg-black px-3 py-1 text-[10px] font-black uppercase text-zinc-300">Candles</div>
                <div className="border border-zinc-800 bg-black px-3 py-1 text-[10px] font-black uppercase text-zinc-300">Fit to Data</div>
              </div>
            </div>
            <div className="p-3">
              {chartCandles.length ? (
                <div className="h-[430px] w-full bg-black">
                  <MarketCandleChart candles={chartCandles} minHeight={430} />
                </div>
              ) : priceSeries.length ? (
                <PriceReplayChart points={priceSeries} candles={[]} priceChange={priceChange} />
              ) : !hasLoaded ? (
                <EmptyState title="Price Chart Ready" reason="Select a market window and click Load Replay." />
              ) : (
                <EmptyState title="Price Chart Unavailable" reason={chartReason ?? datasetReason(replayData, "trades")} />
              )}
              {chartReason ? <div className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600">{chartReason}</div> : null}
            </div>
          </Section>

          <div className="grid gap-3">
            <Section title="Market Snapshot" icon={<Activity className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 gap-2 p-3">
                <SnapshotMetric label="Price" value={numberValue(lastPrice)} tone="cyan" />
                <SnapshotMetric label="Funding Rate" value={fundingRows.at(-1)?.fundingRate === null || fundingRows.at(-1)?.fundingRate === undefined ? "NO DATA" : `${(fundingRows.at(-1)!.fundingRate! * 100).toFixed(4)}%`} />
                <SnapshotMetric label="Open Interest" value={numberValue(oiRows.at(-1)?.openInterest)} />
                <SnapshotMetric label="OI Value" value={compactUsd(oiRows.at(-1)?.openInterestValue)} />
                <SnapshotMetric label="Liquidations" value={compactUsd(liqStats.total)} tone="amber" />
                <SnapshotMetric label="Liq Bias" value={liqStats.bias} tone={liqStats.bias === "SHORT" ? "red" : liqStats.bias === "LONG" ? "green" : "amber"} />
                <div className="col-span-2 border border-zinc-900 bg-black px-3 py-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">OI / Funding Source</div>
                  <div className="mt-1 text-xs font-black uppercase text-zinc-200">{positioningSource}</div>
                  {positioningSource === "No data" && positioningUnavailableReason ? (
                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{positioningUnavailableReason}</div>
                  ) : null}
                </div>
              </div>
            </Section>

            <Section title="Orderbook Snapshot" icon={<BarChart3 className="h-3.5 w-3.5" />}>
              <div className="grid gap-2 p-3">
                <button
                  type="button"
                  onClick={() => void loadOrderbook()}
                  aria-busy={orderbookLoading}
                  className="w-fit border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-100"
                >
                  {orderbookLoading ? "Loading Orderbook" : "Load Orderbook"}
                </button>
                <DepthCurve book={latestBook} reason={orderbookReason} />
                <div className="grid grid-cols-2 gap-2">
                  <SnapshotMetric label="Bid Liquidity" value={numberValue(bookMetrics.bidLiquidity, 4)} tone="green" />
                  <SnapshotMetric label="Ask Liquidity" value={numberValue(bookMetrics.askLiquidity, 4)} tone="red" />
                  <SnapshotMetric label="Imbalance" value={pct(bookMetrics.imbalance)} tone={bookMetrics.imbalance !== null && bookMetrics.imbalance < 0 ? "red" : "green"} />
                  <SnapshotMetric label="Spread" value={numberValue(bookMetrics.spread, 4)} />
                </div>
              </div>
            </Section>
          </div>
        </div>

        <Section title="Event Timeline" icon={<Zap className="h-3.5 w-3.5" />}>
          <div className="p-3">
            <button
              type="button"
              onClick={() => void loadManualDatasets(["trades"], "trades")}
              className="mb-2 border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-100"
            >
              Load Trades
            </button>
            {timelineEvents.length ? (
              <div className="overflow-x-auto border border-zinc-900 bg-black">
                <div className="relative h-[128px] min-w-[760px] px-10">
                  <div className="absolute left-10 right-10 top-1/2 h-px bg-zinc-800" />
                  {timelineEvents.map((event, index) => {
                  return (
                    <div
                      key={`${event.timestamp}-${event.type}-${index}`}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2",
                        event.align === "left" && "-translate-x-0",
                        event.align === "center" && "-translate-x-1/2",
                        event.align === "right" && "-translate-x-full",
                      )}
                      style={{ left: `${event.left}%` }}
                    >
                      <div className={cn(
                        "mx-auto h-3.5 w-3.5 rounded-full border-2 border-black",
                        event.tone === "green" && "bg-emerald-300",
                        event.tone === "red" && "bg-rose-300",
                        event.tone === "amber" && "bg-amber-300",
                        event.tone === "cyan" && "bg-cyan-300",
                      )} />
                      {event.showLabel ? (
                        <div className={cn(
                          "w-32 text-[9px] font-black uppercase tracking-[0.08em] text-zinc-500",
                          event.lane === 0 ? "mt-3" : event.lane === 1 ? "mt-7" : "mt-11",
                          event.align === "left" && "text-left",
                          event.align === "center" && "text-center",
                          event.align === "right" && "text-right",
                        )}>
                          <div className="text-zinc-300">{event.type}</div>
                          <div>{timeOnly(event.timestamp)}</div>
                          <div className="text-zinc-600">{event.label}</div>
                        </div>
                      ) : null}
                    </div>
                  )
                  })}
                </div>
              </div>
            ) : (
              <EmptyState title={hasLoaded ? "No Significant Replay Events" : "Event Timeline Ready"} reason={hasLoaded ? "No significant replay events detected in this hour." : "Select a market window and click Load Replay."} />
            )}
          </div>
        </Section>

        <div className="grid gap-3 xl:grid-cols-3">
          <Section title="Open Interest" icon={<BarChart3 className="h-3.5 w-3.5" />}>
            <div className="grid gap-2 p-3">
              <DualTrendChart primary={oiRows.map((item) => ({ value: item.openInterest }))} secondary={oiRows.map((item) => ({ value: item.openInterestValue }))} />
              <div className="grid grid-cols-3 gap-2">
                <SnapshotMetric label="OI First" value={numberValue(oiRows[0]?.openInterest)} />
                <SnapshotMetric label="OI Last" value={numberValue(oiRows.at(-1)?.openInterest)} />
                <SnapshotMetric label="OI Change" value={pct(oiChange)} tone={oiChange !== null && oiChange < 0 ? "red" : "green"} />
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">Source: {positioningSource}{positioningSource === "No data" && positioningUnavailableReason ? ` - ${positioningUnavailableReason}` : ""}</div>
            </div>
          </Section>

          <Section title="Funding" icon={<Zap className="h-3.5 w-3.5" />}>
            <div className="grid gap-2 p-3">
              <MiniTrendChart points={fundingRows.map((item) => ({ value: item.fundingRate }))} tone={fundingChange !== null && fundingChange < 0 ? "red" : "green"} />
              <div className="grid grid-cols-3 gap-2">
                <SnapshotMetric label="First" value={fundingRows[0]?.fundingRate === null || fundingRows[0]?.fundingRate === undefined ? "NO DATA" : `${(fundingRows[0].fundingRate * 100).toFixed(4)}%`} />
                <SnapshotMetric label="Last" value={fundingRows.at(-1)?.fundingRate === null || fundingRows.at(-1)?.fundingRate === undefined ? "NO DATA" : `${(fundingRows.at(-1)!.fundingRate! * 100).toFixed(4)}%`} />
                <SnapshotMetric label="Change" value={fundingChange === null ? "NO DATA" : `${(fundingChange * 100).toFixed(5)}%`} />
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">Source: {positioningSource}{positioningSource === "No data" && positioningUnavailableReason ? ` - ${positioningUnavailableReason}` : ""}</div>
            </div>
          </Section>

          <Section title="Liquidations" icon={<Droplets className="h-3.5 w-3.5" />}>
            <div className="grid gap-2 p-3">
              <LiquidationBars buckets={liqBuckets} />
              <div className="grid grid-cols-3 gap-2">
                <SnapshotMetric label="Long" value={compactUsd(liqStats.longNotional)} tone="green" />
                <SnapshotMetric label="Short" value={compactUsd(liqStats.shortNotional)} tone="red" />
                <SnapshotMetric label="Total" value={compactUsd(liqStats.total)} tone="amber" />
              </div>
            </div>
          </Section>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px_320px]">
          <Section title="Top Liquidations" icon={<Droplets className="h-3.5 w-3.5" />}>
            <div className="p-3">
              {topLiquidations.length ? (
                <div className="overflow-hidden border border-zinc-900">
                  <div className="grid grid-cols-4 border-b border-zinc-900 bg-black px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    <div>Time</div>
                    <div>Side</div>
                    <div>Size</div>
                    <div>Price</div>
                  </div>
                  {topLiquidations.map((item, index) => (
                    <div key={`${item.timestamp}-${index}`} className="grid grid-cols-4 border-b border-zinc-900/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300 last:border-b-0">
                      <div className="text-zinc-500">{timeOnly(item.timestamp)}</div>
                      <div className={item.side === "long" ? "text-emerald-200" : "text-rose-200"}>{item.side}</div>
                      <div>{numberValue(item.size, 4)}</div>
                      <div>{numberValue(item.price)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Top Liquidations Unavailable" reason={datasetReason(replayData, "liquidations")} />
              )}
            </div>
          </Section>

          <Section title="What Happened" icon={<Activity className="h-3.5 w-3.5" />}>
            <div className="grid gap-2 p-3">
              {summaryLines.length ? summaryLines.map((line) => (
                <div key={line} className="border border-zinc-900 bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">{line}</div>
              )) : <EmptyState title={hasLoaded ? "Replay Summary Unavailable" : "Replay Summary Ready"} reason={hasLoaded ? "Replay summary will appear after replay data loads." : "Select a market window and click Load Replay."} />}
            </div>
          </Section>

          <Section title="If You Traded It" icon={<LineChart className="h-3.5 w-3.5" />}>
            <div className="grid gap-2 p-3">
              {priceChange !== null ? (
                <>
                  <SnapshotMetric label="1H Hold Return" value={pct(priceChange)} tone={priceChange < 0 ? "red" : "green"} />
                  <SnapshotMetric label="4H Hold Return" value="INSUFFICIENT REPLAY COVERAGE" />
                  <SnapshotMetric label="24H Hold Return" value="INSUFFICIENT REPLAY COVERAGE" />
                </>
              ) : (
                <EmptyState title="Insufficient Replay Coverage" reason="Replay price series is unavailable." />
              )}
            </div>
          </Section>
        </div>
      </div>
    </main>
  )
}
