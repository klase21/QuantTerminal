"use client"

import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  createSeriesMarkers,
  SeriesMarker,
} from "lightweight-charts"

import { useEffect, useMemo, useRef } from "react"
import { formatSmartAxisTime } from "@/lib/chartTimeFormatter"

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type TradingChartIndicatorSet = {
  ema9?: boolean
  ema21?: boolean
  ema50?: boolean
  sma20?: boolean
  sma200?: boolean
  anchoredVwap?: boolean
  keyLevels?: boolean
  htfLevels?: boolean
  sessions?: boolean
  mtfDashboard?: boolean
  volumeProfile?: boolean
  macd?: boolean
  stochastic?: boolean
  nma?: boolean
  vwap?: boolean
  bollinger?: boolean
  hullTrend?: boolean
  tradeMarkers?: boolean
  /** Backward-compatible preset flag. Prefer the granular flags above. */
  idealBb?: boolean
}

export type TradingChartSetupOverlay = {
  symbol: string
  bias: string
  direction: "LONG" | "SHORT" | "NEUTRAL"
  entryLow: number
  entryHigh: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  grade?: string
  confidence?: string
  regime?: string
}

interface Props {
  data: Candle[]
  indicators?: TradingChartIndicatorSet
  setupOverlay?: TradingChartSetupOverlay | null
}

type VolumeProfileBucket = {
  price: number
  total: number
  up: number
  down: number
  widthPct: number
  upPct: number
  downPct: number
  isPoc: boolean
}

function sma(values: number[], length: number) {
  const result: Array<number | null> = Array(values.length).fill(null)
  if (values.length < length) return result

  let rollingSum = 0
  values.forEach((value, index) => {
    rollingSum += value
    if (index >= length) rollingSum -= values[index - length]
    if (index >= length - 1) result[index] = rollingSum / length
  })

  return result
}

function ema(values: number[], length: number) {
  if (!values.length) return []

  const multiplier = 2 / (length + 1)
  const result: number[] = [values[0]]

  for (let index = 1; index < values.length; index += 1) {
    result.push(values[index] * multiplier + result[index - 1] * (1 - multiplier))
  }

  return result
}


function rollingWma(values: Array<number | null>, length: number) {
  const period = Math.max(1, Math.round(length))
  const result: Array<number | null> = Array(values.length).fill(null)
  const denominator = (period * (period + 1)) / 2

  values.forEach((_, index) => {
    if (index < period - 1) return
    let weighted = 0
    for (let offset = 0; offset < period; offset += 1) {
      const value = values[index - offset]
      if (value === null || !Number.isFinite(value)) return
      weighted += value * (period - offset)
    }
    result[index] = weighted / denominator
  })

  return result
}

function rollingSmaNullable(values: Array<number | null>, length: number) {
  const period = Math.max(1, Math.round(length))
  const result: Array<number | null> = Array(values.length).fill(null)

  values.forEach((_, index) => {
    const window = values.slice(index - period + 1, index + 1)
    if (window.length < period || window.some((value) => value === null || !Number.isFinite(value))) return
    result[index] = (window as number[]).reduce((sum, value) => sum + value, 0) / period
  })

  return result
}

function rollingEmaNullable(values: Array<number | null>, length: number) {
  const period = Math.max(1, Math.round(length))
  const multiplier = 2 / (period + 1)
  const result: Array<number | null> = Array(values.length).fill(null)
  let previous: number | null = null

  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) return
    if (previous === null) {
      previous = value
    } else {
      previous = value * multiplier + previous * (1 - multiplier)
    }
    result[index] = previous
  })

  return result
}

function rollingStd(values: number[], length: number) {
  const result: Array<number | null> = Array(values.length).fill(null)
  if (values.length < length) return result

  values.forEach((_, index) => {
    if (index < length - 1) return
    const window = values.slice(index - length + 1, index + 1)
    const mean = window.reduce((sum, value) => sum + value, 0) / length
    const variance = window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / length
    result[index] = Math.sqrt(variance)
  })

  return result
}

function toLineData(data: Candle[], values: Array<number | null>): LineData<Time>[] {
  return data.flatMap((candle, index) => {
    const value = values[index]
    if (value === null || !Number.isFinite(value)) return []
    return [{ time: candle.time as Time, value }]
  })
}

function buildAdarshIndicatorData(data: Candle[]) {
  const hl2 = data.map((candle) => (candle.high + candle.low) / 2)
  const hlc3 = data.map((candle) => (candle.high + candle.low + candle.close) / 3)
  const closes = data.map((candle) => candle.close)
  const volumes = data.map((candle) => Math.max(1, candle.volume ?? Math.abs(candle.high - candle.low) * 1000))

  const length1 = 120
  const length2 = 12
  const lambda = length1 / length2
  const alpha = lambda * (length1 - 1) / (length1 - lambda)
  const ma1 = rollingEmaNullable(hl2, length1)
  const ma2 = rollingEmaNullable(ma1, length2)
  const nma = ma1.map((value, index) => {
    const second = ma2[index]
    if (value === null || second === null) return null
    return (1 + alpha) * value - alpha * second
  })

  let cumulativePv = 0
  let cumulativeVolume = 0
  const vwap = hlc3.map((price, index) => {
    cumulativePv += price * volumes[index]
    cumulativeVolume += volumes[index]
    return cumulativeVolume > 0 ? cumulativePv / cumulativeVolume : null
  })

  const bbBasis = sma(closes, 20)
  const std = rollingStd(closes, 20)
  const bbUpper = bbBasis.map((value, index) => (value === null || std[index] === null ? null : value + std[index]! * 2))
  const bbLower = bbBasis.map((value, index) => (value === null || std[index] === null ? null : value - std[index]! * 2))

  const hullLength = 24
  const half = Math.round(hullLength / 2)
  const sqrtLength = Math.round(Math.sqrt(hullLength))
  const wmaHalf = rollingWma(hl2, half)
  const wmaFull = rollingWma(hl2, hullLength)
  const hmaSource = hl2.map((_, index) => {
    const fast = wmaHalf[index]
    const slow = wmaFull[index]
    if (fast === null || slow === null) return null
    return 2 * fast - slow
  })
  const hmaA = rollingWma(hmaSource, sqrtLength)

  const p = Math.round(hullLength / 2)
  const hma3Fast = rollingWma(closes, Math.max(1, Math.round(p / 3)))
  const hma3Mid = rollingWma(closes, Math.max(1, Math.round(p / 2)))
  const hma3Slow = rollingWma(closes, p)
  const hma3Source = closes.map((_, index) => {
    const fast = hma3Fast[index]
    const mid = hma3Mid[index]
    const slow = hma3Slow[index]
    if (fast === null || mid === null || slow === null) return null
    return fast * 3 - mid - slow
  })
  const hmaB = rollingWma(hma3Source, p)

  const kahlman = (values: Array<number | null>, gain = 10000) => {
    const result: Array<number | null> = Array(values.length).fill(null)
    let kf: number | null = null
    let velo = 0
    values.forEach((value, index) => {
      if (value === null || !Number.isFinite(value)) return
      if (kf === null) kf = value
      const dk = value - kf
      const smooth = kf + dk * Math.sqrt((gain / 10000) * 2)
      velo += (gain / 10000) * dk
      kf = smooth + velo
      result[index] = kf
    })
    return result
  }

  const hullA = kahlman(hmaA)
  const hullB = kahlman(hmaB)

  const markers: SeriesMarker<Time>[] = []
  let lastMarkerIndex = -999
  const markerStart = Math.max(1, data.length - 180)
  const markerCooldownBars = 8

  for (let index = markerStart; index < data.length; index += 1) {
    const currentA = hullA[index]
    const currentB = hullB[index]
    const previousA = hullA[index - 1]
    const previousB = hullB[index - 1]
    if (currentA === null || currentB === null || previousA === null || previousB === null) continue

    const crossDown = currentA > currentB && previousA < previousB
    const crossUp = currentB > currentA && previousB < previousA
    if (!crossDown && !crossUp) continue
    if (index - lastMarkerIndex < markerCooldownBars) continue

    lastMarkerIndex = index
    if (crossUp) {
      markers.push({
        time: data[index].time as Time,
        position: "belowBar",
        color: "#22c55e",
        shape: "arrowUp",
        text: "Buy",
      })
    } else if (crossDown) {
      markers.push({
        time: data[index].time as Time,
        position: "aboveBar",
        color: "#ef4444",
        shape: "arrowDown",
        text: "Sell",
      })
    }
  }

  return {
    nma: toLineData(data, nma),
    vwap: toLineData(data, vwap),
    bbBasis: toLineData(data, bbBasis),
    bbUpper: toLineData(data, bbUpper),
    bbLower: toLineData(data, bbLower),
    hullA: toLineData(data, hullA),
    hullB: toLineData(data, hullB),
    markers,
  }
}

function buildSmaData(data: Candle[], length: number): LineData<Time>[] {
  const closes = data.map((candle) => candle.close)
  const values = sma(closes, length)

  return data.flatMap((candle, index) => {
    const value = values[index]
    if (value === null) return []
    return [{ time: candle.time as Time, value }]
  })
}

function buildEmaData(data: Candle[], length: number): LineData<Time>[] {
  const closes = data.map((candle) => candle.close)
  const values = ema(closes, length)
  return data.flatMap((candle, index) => {
    const value = values[index]
    if (!Number.isFinite(value)) return []
    return [{ time: candle.time as Time, value }]
  })
}

function buildAnchoredVwapData(data: Candle[], lookbackBars = 180): LineData<Time>[] {
  const startIndex = Math.max(0, data.length - lookbackBars)
  let cumulativePv = 0
  let cumulativeVolume = 0

  return data.flatMap((candle, index) => {
    if (index < startIndex) return []
    const typical = (candle.high + candle.low + candle.close) / 3
    const volume = Math.max(1, candle.volume ?? Math.abs(candle.high - candle.low) * 1000)
    cumulativePv += typical * volume
    cumulativeVolume += volume
    if (cumulativeVolume <= 0) return []
    return [{ time: candle.time as Time, value: cumulativePv / cumulativeVolume }]
  })
}

type KeyLevel = { label: string; price: number; color: string; lineStyle?: 0 | 1 | 2 | 3 | 4 }

function utcDayKey(seconds: number) {
  const date = new Date(seconds * 1000)
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
}

function utcWeekKey(seconds: number) {
  const date = new Date(seconds * 1000)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - day + 1)
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
}

function buildPreviousPeriodLevels(data: Candle[]): KeyLevel[] {
  if (data.length < 10) return []
  const last = data[data.length - 1]
  const currentDay = utcDayKey(last.time)
  const currentWeek = utcWeekKey(last.time)

  const previousDayCandles = data.filter((candle) => utcDayKey(candle.time) !== currentDay)
  const lastPreviousDay = previousDayCandles[previousDayCandles.length - 1]
  const previousDayKey = lastPreviousDay ? utcDayKey(lastPreviousDay.time) : null
  const dayCandles = previousDayKey ? data.filter((candle) => utcDayKey(candle.time) === previousDayKey) : []

  const previousWeekCandles = data.filter((candle) => utcWeekKey(candle.time) !== currentWeek)
  const lastPreviousWeek = previousWeekCandles[previousWeekCandles.length - 1]
  const previousWeekKey = lastPreviousWeek ? utcWeekKey(lastPreviousWeek.time) : null
  const weekCandles = previousWeekKey ? data.filter((candle) => utcWeekKey(candle.time) === previousWeekKey) : []

  const levels: KeyLevel[] = []
  if (dayCandles.length) {
    levels.push({ label: 'PDH', price: Math.max(...dayCandles.map((candle) => candle.high)), color: '#94a3b8', lineStyle: 2 })
    levels.push({ label: 'PDL', price: Math.min(...dayCandles.map((candle) => candle.low)), color: '#94a3b8', lineStyle: 2 })
  }
  if (weekCandles.length) {
    levels.push({ label: 'PWH', price: Math.max(...weekCandles.map((candle) => candle.high)), color: '#14b8a6', lineStyle: 1 })
    levels.push({ label: 'PWL', price: Math.min(...weekCandles.map((candle) => candle.low)), color: '#14b8a6', lineStyle: 1 })
  }
  return levels
}

function aggregateBars(data: Candle[], bucketSeconds: number): Candle[] {
  const buckets = new Map<number, Candle>()
  data.forEach((candle) => {
    const bucketTime = Math.floor(candle.time / bucketSeconds) * bucketSeconds
    const existing = buckets.get(bucketTime)
    if (!existing) {
      buckets.set(bucketTime, { ...candle, time: bucketTime })
      return
    }
    existing.high = Math.max(existing.high, candle.high)
    existing.low = Math.min(existing.low, candle.low)
    existing.close = candle.close
    existing.volume = (existing.volume ?? 0) + (candle.volume ?? 0)
  })
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time)
}

function buildHtfLevels(data: Candle[]): KeyLevel[] {
  const htf = aggregateBars(data, 4 * 60 * 60)
  const lastClosed = htf.length > 1 ? htf[htf.length - 2] : htf[htf.length - 1]
  if (!lastClosed) return []
  return [
    { label: '4H High', price: lastClosed.high, color: '#22c55e', lineStyle: 1 },
    { label: '4H Low', price: lastClosed.low, color: '#ef4444', lineStyle: 1 },
    { label: '4H Close', price: lastClosed.close, color: '#64748b', lineStyle: 2 },
  ]
}

function getSessionName(seconds: number) {
  const hour = new Date(seconds * 1000).getUTCHours()
  if (hour >= 0 && hour < 7) return 'Asia'
  if (hour >= 7 && hour < 12) return 'London'
  if (hour >= 12 && hour < 20) return 'New York'
  return 'After-hours'
}

function buildMtfContext(data: Candle[]) {
  const frames = [
    { label: '15m', seconds: 15 * 60 },
    { label: '1H', seconds: 60 * 60 },
    { label: '4H', seconds: 4 * 60 * 60 },
    { label: '1D', seconds: 24 * 60 * 60 },
  ]

  return frames.map((frame) => {
    const bars = aggregateBars(data, frame.seconds)
    const closes = bars.map((bar) => bar.close)
    const fast = ema(closes, 21)
    const slow = ema(closes, 50)
    const latest = bars[bars.length - 1]
    const previous = bars[bars.length - 2]
    const trendUp = fast.length > 1 && slow.length > 1 ? fast[fast.length - 1] >= slow[slow.length - 1] : latest?.close >= latest?.open
    const change = latest && previous ? ((latest.close - previous.close) / previous.close) * 100 : 0
    return { label: frame.label, trend: trendUp ? 'BULL' : 'BEAR', change }
  })
}

function buildVolumeData(data: Candle[]): HistogramData<Time>[] {
  return data.map((candle) => ({
    time: candle.time as Time,
    value: Math.max(0, candle.volume ?? Math.abs(candle.close - candle.open) * 1000),
    color: candle.close >= candle.open ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)",
  }))
}

function buildMacdData(data: Candle[]) {
  const closes = data.map((candle) => candle.close)
  if (closes.length < 35) {
    return { macd: [], signal: [], histogram: [] }
  }

  const fast = ema(closes, 12)
  const slow = ema(closes, 26)
  const macdValues = closes.map((_, index) => fast[index] - slow[index])
  const signalValues = ema(macdValues, 9)

  const macd: LineData<Time>[] = []
  const signal: LineData<Time>[] = []
  const histogram: HistogramData<Time>[] = []

  data.forEach((candle, index) => {
    const macdValue = macdValues[index]
    const signalValue = signalValues[index]
    const histValue = macdValue - signalValue
    if (!Number.isFinite(macdValue) || !Number.isFinite(signalValue)) return

    macd.push({ time: candle.time as Time, value: macdValue })
    signal.push({ time: candle.time as Time, value: signalValue })
    histogram.push({
      time: candle.time as Time,
      value: histValue,
      color: histValue >= 0 ? "rgba(45, 212, 191, 0.75)" : "rgba(248, 113, 113, 0.75)",
    })
  })

  return { macd, signal, histogram }
}

function buildStochasticData(data: Candle[], kLength = 14, smoothK = 1, dLength = 3) {
  if (data.length < kLength + dLength) return { k: [], d: [] }

  const rawK: Array<number | null> = data.map((candle, index) => {
    if (index < kLength - 1) return null
    const window = data.slice(index - kLength + 1, index + 1)
    const highest = Math.max(...window.map((item) => item.high))
    const lowest = Math.min(...window.map((item) => item.low))
    const range = highest - lowest
    if (!Number.isFinite(range) || range <= 0) return 50
    return ((candle.close - lowest) / range) * 100
  })

  const smooth = (values: Array<number | null>, length: number) =>
    values.map((_, index) => {
      const window = values.slice(Math.max(0, index - length + 1), index + 1).filter((value): value is number => value !== null)
      if (window.length < length) return null
      return window.reduce((sum, value) => sum + value, 0) / window.length
    })

  const kValues = smooth(rawK, smoothK)
  const dValues = smooth(kValues, dLength)

  const k: LineData<Time>[] = []
  const d: LineData<Time>[] = []

  data.forEach((candle, index) => {
    const kValue = kValues[index]
    const dValue = dValues[index]
    if (kValue !== null && Number.isFinite(kValue)) k.push({ time: candle.time as Time, value: kValue })
    if (dValue !== null && Number.isFinite(dValue)) d.push({ time: candle.time as Time, value: dValue })
  })

  return { k, d }
}

function buildVolumeProfile(data: Candle[]): VolumeProfileBucket[] {
  const visibleData = data.slice(-160)
  if (!visibleData.length) return []

  const lows = visibleData.map((candle) => candle.low)
  const highs = visibleData.map((candle) => candle.high)
  const minPrice = Math.min(...lows)
  const maxPrice = Math.max(...highs)
  const range = maxPrice - minPrice

  if (!Number.isFinite(range) || range <= 0) return []

  const bucketCount = 36
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    price: maxPrice - (range / bucketCount) * index,
    total: 0,
    up: 0,
    down: 0,
    widthPct: 0,
    upPct: 0,
    downPct: 0,
    isPoc: false,
  }))

  visibleData.forEach((candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3
    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor(((maxPrice - typicalPrice) / range) * bucketCount))
    )
    const volume = Math.max(1, candle.volume ?? Math.abs(candle.high - candle.low) * 1000)
    buckets[bucketIndex].total += volume
    if (candle.close >= candle.open) buckets[bucketIndex].up += volume
    else buckets[bucketIndex].down += volume
  })

  const maxVolume = Math.max(...buckets.map((bucket) => bucket.total), 1)

  return buckets.map((bucket) => ({
    ...bucket,
    widthPct: Math.max(4, (bucket.total / maxVolume) * 100),
    upPct: bucket.total > 0 ? (bucket.up / bucket.total) * 100 : 50,
    downPct: bucket.total > 0 ? (bucket.down / bucket.total) * 100 : 50,
    isPoc: bucket.total === maxVolume,
  }))
}

function createBaseChart(container: HTMLDivElement, height: number, showTime = false) {
  const width = Math.max(320, Math.floor(container.clientWidth || container.getBoundingClientRect().width || 320))

  return createChart(container, {
    layout: {
      background: { type: ColorType.Solid, color: "#05070b" },
      textColor: "#8b94a7",
    },
    grid: {
      vertLines: { color: "rgba(71, 85, 105, 0.22)" },
      horzLines: { color: "rgba(71, 85, 105, 0.22)" },
    },
    width,
    height,
    crosshair: { mode: 1 },
    rightPriceScale: {
      borderColor: "rgba(63, 63, 70, 0.8)",
      scaleMargins: { top: 0.08, bottom: 0.08 },
    },
    timeScale: {
      visible: showTime,
      tickMarkFormatter: (time: unknown) => formatSmartAxisTime(time, "1m"),
      borderColor: "rgba(63, 63, 70, 0.8)",
      rightOffset: 8,
      barSpacing: 6,
    },
  })
}

function resizeChart(chart: IChartApi | null, container: HTMLDivElement | null, height: number, sizeRef: { current: { width: number; height: number } }) {
  if (!chart || !container) return
  const width = Math.max(320, Math.floor(container.clientWidth || container.getBoundingClientRect().width || 320))
  const nextHeight = Math.max(80, height)
  if (sizeRef.current.width === width && sizeRef.current.height === nextHeight) return
  sizeRef.current = { width, height: nextHeight }
  chart.applyOptions({ width, height: nextHeight })
}

function overlayPct(price: number, min: number, max: number) {
  if (!Number.isFinite(price) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null
  return Math.max(4, Math.min(96, ((max - price) / (max - min)) * 100))
}

function SetupLine({ label, value, pct, tone }: { label: string; value: string; pct: number | null; tone: "entry" | "sl" | "tp" }) {
  if (pct === null) return null
  const toneClass = tone === "sl" ? "border-red-300/70 text-red-100" : tone === "tp" ? "border-emerald-300/70 text-emerald-100" : "border-cyan-300/70 text-cyan-100"
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top: `${pct}%` }}>
      <div className={`mx-3 border-t border-dashed ${toneClass}`} />
      <div className={`absolute right-14 -translate-y-1/2 rounded-md border bg-black/80 px-2 py-0.5 text-[10px] font-black ${toneClass}`}>
        {label} {value}
      </div>
    </div>
  )
}

function PanelLabel({ title, value }: { title: string; value?: string }) {
  return (
    <div className="pointer-events-none absolute left-3 top-2 z-20 flex items-center gap-2 text-xs text-zinc-400">
      <span>{title}</span>
      {value ? <span className="font-semibold text-zinc-200">{value}</span> : null}
    </div>
  )
}

export default function TradingChart({ data, indicators, setupOverlay }: Props) {
  const mainRef = useRef<HTMLDivElement | null>(null)
  const macdRef = useRef<HTMLDivElement | null>(null)
  const stochRef = useRef<HTMLDivElement | null>(null)

  const mainChartRef = useRef<IChartApi | null>(null)
  const macdChartRef = useRef<IChartApi | null>(null)
  const stochChartRef = useRef<IChartApi | null>(null)

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const sma200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const nmaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const anchoredVwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const bbBasisSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const hullASeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const hullBSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const markerPrimitiveRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null)
  const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null)
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const stochKRef = useRef<ISeriesApi<"Line"> | null>(null)
  const stochDRef = useRef<ISeriesApi<"Line"> | null>(null)
  const stochUpperRef = useRef<ISeriesApi<"Line"> | null>(null)
  const stochLowerRef = useRef<ISeriesApi<"Line"> | null>(null)

  const mainSizeRef = useRef({ width: 0, height: 0 })
  const macdSizeRef = useRef({ width: 0, height: 0 })
  const stochSizeRef = useRef({ width: 0, height: 0 })
  const fittedRef = useRef(false)

  const formattedData = useMemo<CandlestickData<Time>[]>(
    () => data.map((candle) => ({ time: candle.time as Time, open: candle.open, high: candle.high, low: candle.low, close: candle.close })),
    [data]
  )
  const volumeData = useMemo(() => buildVolumeData(data), [data])
  const ema9Data = useMemo(() => buildEmaData(data, 9), [data])
  const ema21Data = useMemo(() => buildEmaData(data, 21), [data])
  const ema50Data = useMemo(() => buildEmaData(data, 50), [data])
  const anchoredVwapData = useMemo(() => buildAnchoredVwapData(data), [data])
  const keyLevels = useMemo(() => (indicators?.keyLevels ? buildPreviousPeriodLevels(data) : []), [data, indicators?.keyLevels])
  const htfLevels = useMemo(() => (indicators?.htfLevels ? buildHtfLevels(data) : []), [data, indicators?.htfLevels])
  const mtfContext = useMemo(() => (indicators?.mtfDashboard ? buildMtfContext(data) : []), [data, indicators?.mtfDashboard])
  const currentSession = useMemo(() => data.length ? getSessionName(data[data.length - 1].time) : '—', [data])
  const sma20Data = useMemo(() => buildSmaData(data, 20), [data])
  const sma200Data = useMemo(() => buildSmaData(data, 200), [data])
  const macdData = useMemo(() => buildMacdData(data), [data])
  const stochData = useMemo(() => buildStochasticData(data), [data])
  const volumeProfile = useMemo(
    () => (indicators?.volumeProfile ? buildVolumeProfile(data) : []),
    [data, indicators?.volumeProfile]
  )
  const adarshData = useMemo(() => buildAdarshIndicatorData(data), [data])
  const overlayRange = useMemo(() => {
    const recent = data.slice(-160)
    const levels = setupOverlay ? [setupOverlay.entryLow, setupOverlay.entryHigh, setupOverlay.stopLoss, setupOverlay.takeProfit1, setupOverlay.takeProfit2] : []
    const lows = [...recent.map((candle) => candle.low), ...levels]
    const highs = [...recent.map((candle) => candle.high), ...levels]
    return { min: Math.min(...lows), max: Math.max(...highs) }
  }, [data, setupOverlay])

  useEffect(() => {
    if (!mainRef.current || !macdRef.current || !stochRef.current) return

    const mainChart = createBaseChart(mainRef.current, 500)
    const macdChart = createBaseChart(macdRef.current, 142)
    const stochChart = createBaseChart(stochRef.current, 178, true)

    mainChartRef.current = mainChart
    macdChartRef.current = macdChart
    stochChartRef.current = stochChart

    candleSeriesRef.current = mainChart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    })

    ema9SeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#34d399",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    ema21SeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    ema50SeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    sma20SeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#c084fc",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    sma200SeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    nmaSeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#e5e7eb",
      lineWidth: 2,
      lineStyle: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    vwapSeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#ec4899",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    anchoredVwapSeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      lineStyle: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    bbBasisSeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    bbUpperSeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    bbLowerSeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    hullASeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "rgba(34, 197, 94, 0.78)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    hullBSeriesRef.current = mainChart.addSeries(LineSeries, {
      color: "rgba(34, 197, 94, 0.78)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    markerPrimitiveRef.current = createSeriesMarkers(candleSeriesRef.current, [])

    volumeSeriesRef.current = mainChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      priceLineVisible: false,
      lastValueVisible: false,
    })
    mainChart.priceScale("").applyOptions({
      scaleMargins: { top: 0.76, bottom: 0 },
    })

    macdHistRef.current = macdChart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    })
    macdLineRef.current = macdChart.addSeries(LineSeries, {
      color: "#0ea5e9",
      lineWidth: 2,
      priceLineVisible: false,
    })
    macdSignalRef.current = macdChart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 2,
      priceLineVisible: false,
    })

    stochKRef.current = stochChart.addSeries(LineSeries, {
      color: "#0ea5e9",
      lineWidth: 2,
      priceLineVisible: false,
    })
    stochDRef.current = stochChart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 2,
      priceLineVisible: false,
    })
    stochUpperRef.current = stochChart.addSeries(LineSeries, {
      color: "rgba(148, 163, 184, 0.65)",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    stochLowerRef.current = stochChart.addSeries(LineSeries, {
      color: "rgba(148, 163, 184, 0.65)",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const resizeAll = () => {
      resizeChart(mainChartRef.current, mainRef.current, 500, mainSizeRef)
      resizeChart(macdChartRef.current, macdRef.current, 142, macdSizeRef)
      resizeChart(stochChartRef.current, stochRef.current, 178, stochSizeRef)
    }

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(resizeAll)
    })
    resizeObserver.observe(mainRef.current)
    resizeObserver.observe(macdRef.current)
    resizeObserver.observe(stochRef.current)

    const resizeFrame = window.requestAnimationFrame(resizeAll)
    const resizeTimeout = window.setTimeout(resizeAll, 120)
    window.addEventListener("resize", resizeAll)

    return () => {
      window.cancelAnimationFrame(resizeFrame)
      window.clearTimeout(resizeTimeout)
      resizeObserver.disconnect()
      window.removeEventListener("resize", resizeAll)
      mainChart.remove()
      macdChart.remove()
      stochChart.remove()
    }
  }, [])

  useEffect(() => {
    candleSeriesRef.current?.setData(formattedData)
    volumeSeriesRef.current?.setData(volumeData)
    ema9SeriesRef.current?.setData(indicators?.ema9 ? ema9Data : [])
    ema21SeriesRef.current?.setData(indicators?.ema21 ? ema21Data : [])
    ema50SeriesRef.current?.setData(indicators?.ema50 ? ema50Data : [])
    sma20SeriesRef.current?.setData(indicators?.sma20 ? sma20Data : [])
    sma200SeriesRef.current?.setData(indicators?.sma200 ? sma200Data : [])
    const legacyIdeal = Boolean(indicators?.idealBb)
    const showNma = Boolean(indicators?.nma ?? legacyIdeal)
    const showVwap = Boolean(indicators?.vwap ?? legacyIdeal)
    const showBollinger = Boolean(indicators?.bollinger ?? legacyIdeal)
    const showHull = Boolean(indicators?.hullTrend ?? legacyIdeal)
    const showMarkers = Boolean(indicators?.tradeMarkers ?? legacyIdeal)

    nmaSeriesRef.current?.setData(showNma ? adarshData.nma : [])
    vwapSeriesRef.current?.setData(showVwap ? adarshData.vwap : [])
    anchoredVwapSeriesRef.current?.setData(indicators?.anchoredVwap ? anchoredVwapData : [])

    if (candleSeriesRef.current) {
      priceLinesRef.current.forEach((line) => candleSeriesRef.current?.removePriceLine(line))
      priceLinesRef.current = []
      ;[...keyLevels, ...htfLevels].forEach((level) => {
        if (!Number.isFinite(level.price)) return
        priceLinesRef.current.push(candleSeriesRef.current!.createPriceLine({
          price: level.price,
          color: level.color,
          lineWidth: 1,
          lineStyle: level.lineStyle ?? 2,
          axisLabelVisible: true,
          title: level.label,
        }))
      })
    }
    bbBasisSeriesRef.current?.setData(showBollinger ? adarshData.bbBasis : [])
    bbUpperSeriesRef.current?.setData(showBollinger ? adarshData.bbUpper : [])
    bbLowerSeriesRef.current?.setData(showBollinger ? adarshData.bbLower : [])
    hullASeriesRef.current?.setData(showHull ? adarshData.hullA : [])
    hullBSeriesRef.current?.setData(showHull ? adarshData.hullB : [])
    markerPrimitiveRef.current?.setMarkers(showHull && showMarkers ? adarshData.markers : [])
    macdHistRef.current?.setData(indicators?.macd ? macdData.histogram : [])
    macdLineRef.current?.setData(indicators?.macd ? macdData.macd : [])
    macdSignalRef.current?.setData(indicators?.macd ? macdData.signal : [])
    stochKRef.current?.setData(indicators?.stochastic ? stochData.k : [])
    stochDRef.current?.setData(indicators?.stochastic ? stochData.d : [])

    const stochLevelData = data.map((candle) => ({ time: candle.time as Time, value: 80 }))
    const stochLowerData = data.map((candle) => ({ time: candle.time as Time, value: 20 }))
    stochUpperRef.current?.setData(indicators?.stochastic ? stochLevelData : [])
    stochLowerRef.current?.setData(indicators?.stochastic ? stochLowerData : [])

    if (!fittedRef.current && formattedData.length > 20) {
      ;[mainChartRef.current, macdChartRef.current, stochChartRef.current].forEach((chart) => {
        chart?.timeScale().fitContent()
      })
      fittedRef.current = true
    }
  }, [data, formattedData, indicators, macdData, ema9Data, ema21Data, ema50Data, anchoredVwapData, keyLevels, htfLevels, sma20Data, sma200Data, stochData, volumeData, adarshData])

  return (
    <div className="relative h-full min-h-[820px] w-full overflow-hidden bg-[#05070b]">

      <div className="relative h-[500px] border-b border-zinc-800/80">
        <div ref={mainRef} className="h-full w-full" />
        {setupOverlay ? (
          <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-xl border border-zinc-700/80 bg-black/70 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
            <div className={setupOverlay.direction === "LONG" ? "font-black text-emerald-200" : setupOverlay.direction === "SHORT" ? "font-black text-red-200" : "font-black text-zinc-200"}>
              {setupOverlay.symbol} · {setupOverlay.bias}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              {setupOverlay.grade ? `Grade ${setupOverlay.grade}` : "Setup"} · {setupOverlay.confidence ?? "confidence"} · {setupOverlay.regime ?? "regime"}
            </div>
          </div>
        ) : null}
        {setupOverlay ? (
          <>
            <div
              className="pointer-events-none absolute left-0 right-0 z-10 bg-cyan-300/10"
              style={{
                top: `${overlayPct(setupOverlay.entryHigh, overlayRange.min, overlayRange.max) ?? 0}%`,
                height: `${Math.max(4, Math.abs((overlayPct(setupOverlay.entryLow, overlayRange.min, overlayRange.max) ?? 0) - (overlayPct(setupOverlay.entryHigh, overlayRange.min, overlayRange.max) ?? 0)))}%`,
              }}
            />
            <SetupLine label="ENTRY" value={`${setupOverlay.entryLow.toPrecision(5)}–${setupOverlay.entryHigh.toPrecision(5)}`} pct={overlayPct((setupOverlay.entryLow + setupOverlay.entryHigh) / 2, overlayRange.min, overlayRange.max)} tone="entry" />
            <SetupLine label="SL" value={setupOverlay.stopLoss.toPrecision(5)} pct={overlayPct(setupOverlay.stopLoss, overlayRange.min, overlayRange.max)} tone="sl" />
            <SetupLine label="TP1" value={setupOverlay.takeProfit1.toPrecision(5)} pct={overlayPct(setupOverlay.takeProfit1, overlayRange.min, overlayRange.max)} tone="tp" />
            <SetupLine label="TP2" value={setupOverlay.takeProfit2.toPrecision(5)} pct={overlayPct(setupOverlay.takeProfit2, overlayRange.min, overlayRange.max)} tone="tp" />
          </>
        ) : null}
        {indicators?.sessions ? (
          <div className="pointer-events-none absolute left-3 bottom-3 z-20 rounded-lg border border-zinc-700/70 bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
            Session · {currentSession}
          </div>
        ) : null}
        {indicators?.mtfDashboard && mtfContext.length > 0 ? (
          <div className="pointer-events-none absolute right-3 top-3 z-20 w-[245px] rounded-xl border border-zinc-700/80 bg-black/75 p-2 text-[10px] shadow-xl backdrop-blur-sm">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">MTF Context</div>
            <div className="grid grid-cols-4 gap-1">
              {mtfContext.map((row) => (
                <div key={row.label} className="rounded-md border border-zinc-800 bg-zinc-950 px-1.5 py-1 text-center">
                  <div className="text-zinc-500">{row.label}</div>
                  <div className={row.trend === 'BULL' ? 'font-black text-emerald-300' : 'font-black text-red-300'}>{row.trend}</div>
                  <div className={row.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>{row.change.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {volumeProfile.length > 0 && (
          <div className="pointer-events-none absolute bottom-5 right-12 top-10 z-10 flex w-[22%] flex-col justify-between opacity-95">
            {volumeProfile.map((bucket, index) => (
              <div key={`${bucket.price}-${index}`} className="flex h-[8px] justify-end">
                <div
                  className={`flex h-[7px] overflow-hidden rounded-[1px] ${bucket.isPoc ? "ring-1 ring-yellow-200/70" : ""}`}
                  style={{ width: `${bucket.widthPct}%` }}
                >
                  <div className={bucket.isPoc ? "bg-yellow-300" : "bg-yellow-400/90"} style={{ width: `${bucket.upPct}%` }} />
                  <div className={bucket.isPoc ? "bg-sky-300" : "bg-sky-500/90"} style={{ width: `${bucket.downPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="relative h-[142px] border-b border-zinc-800/80">
        <div ref={macdRef} className="h-full w-full" />
      </div>

      <div className="relative h-[178px]">
        <div className="pointer-events-none absolute left-0 right-0 top-[20%] z-10 border-t border-dashed border-slate-500/35" />
        <div className="pointer-events-none absolute left-0 right-0 top-[80%] z-10 border-t border-dashed border-slate-500/35" />
        <div ref={stochRef} className="h-full w-full" />
      </div>

      {data.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/30 text-xs text-zinc-500">
          Loading candles…
        </div>
      )}
    </div>
  )
}
