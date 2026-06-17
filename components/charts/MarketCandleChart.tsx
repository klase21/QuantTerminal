"use client"

import { useEffect, useRef } from "react"
import { CandlestickSeries, ColorType, HistogramSeries, createChart, type IChartApi, type ISeriesApi } from "lightweight-charts"

export type MarketChartCandle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number | null
}

export function sanitizeCandlesForLightweightChart(candles: MarketChartCandle[]) {
  const byTime = new Map<number, MarketChartCandle>()
  for (const candle of candles) {
    const time = Number(candle.time)
    const open = Number(candle.open)
    const high = Number(candle.high)
    const low = Number(candle.low)
    const close = Number(candle.close)
    const volume = candle.volume === null || candle.volume === undefined ? null : Number(candle.volume)
    if (![time, open, high, low, close].every(Number.isFinite)) continue
    if (time <= 0) continue
    if (high < low) continue
    if (open < 0 || high < 0 || low < 0 || close < 0) continue
    if (volume !== null && !Number.isFinite(volume)) continue
    byTime.set(time, { time, open, high, low, close, volume })
  }
  return [...byTime.values()].sort((left, right) => left.time - right.time)
}

export default function MarketCandleChart({
  candles,
  minHeight = 320,
}: {
  candles: MarketChartCandle[]
  minHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const disposedRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!ref.current || chartRef.current) return
    disposedRef.current = false
    const chart = createChart(ref.current, {
      height: Math.max(minHeight, ref.current.clientHeight || 0),
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
    const resize = () => {
      if (disposedRef.current || !chartRef.current) return
      chartRef.current.applyOptions({
        width: ref.current?.clientWidth ?? 600,
        height: Math.max(minHeight, ref.current?.clientHeight ?? 0),
      })
    }
    const resizeObserver = new ResizeObserver(() => {
      if (disposedRef.current) return
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        resize()
      })
    })
    resizeObserver.observe(ref.current)
    resize()
    window.addEventListener("resize", resize)
    return () => {
      disposedRef.current = true
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      resizeObserver.disconnect()
      window.removeEventListener("resize", resize)
      if (chartRef.current) {
        chartRef.current.remove()
      }
      chartRef.current = null
      seriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [minHeight])

  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    const volumeSeries = volumeSeriesRef.current
    if (disposedRef.current || !chart || !series || !candles.length) return
    const sanitized = sanitizeCandlesForLightweightChart(candles)
    if (!sanitized.length) return
    series.setData(sanitized.map((candle) => ({
      time: candle.time as any,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })))
    if (disposedRef.current) return
    volumeSeries?.setData(sanitized
      .filter((candle) => Number.isFinite(candle.volume ?? null))
      .map((candle) => ({
        time: candle.time as any,
        value: candle.volume ?? 0,
        color: candle.close >= candle.open ? "rgba(34, 197, 94, 0.32)" : "rgba(239, 68, 68, 0.32)",
      })))
    if (!disposedRef.current && chartRef.current) chart.timeScale().fitContent()
  }, [candles])

  return <div ref={ref} className="h-full w-full" />
}
