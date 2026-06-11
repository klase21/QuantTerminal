import type { HistoricalMarketSnapshot, MarketOhlcvRow } from "@/types/historical"

function percentChange(from?: number, to?: number) {
  if (!from || !to || !Number.isFinite(from) || !Number.isFinite(to)) return null
  return Number((((to - from) / from) * 100).toFixed(2))
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

function candleRange(row: MarketOhlcvRow) {
  if (!row.close) return 0
  return ((row.high - row.low) / row.close) * 100
}

function stateFromMomentum(change1d: number | null) {
  if (change1d !== null && change1d > 2) return "bullish_momentum" as const
  if (change1d !== null && change1d < -2) return "bearish_momentum" as const
  return "neutral_momentum" as const
}

function volatilityState(currentRange: number, recentAverage: number) {
  if (!recentAverage) return "normal_volatility" as const
  if (currentRange >= recentAverage * 1.35) return "high_volatility" as const
  if (currentRange <= recentAverage * 0.65) return "low_volatility" as const
  return "normal_volatility" as const
}

function rangeState(row: MarketOhlcvRow, window: MarketOhlcvRow[]) {
  if (window.length < 5) return "range_middle" as const
  const high = Math.max(...window.map((item) => item.high))
  const low = Math.min(...window.map((item) => item.low))
  const width = high - low
  if (width <= 0) return "range_middle" as const
  const position = (row.close - low) / width
  if (position >= 0.85) return "upper_range" as const
  if (position <= 0.15) return "lower_range" as const
  return "range_middle" as const
}

function breakoutState(range: ReturnType<typeof rangeState>) {
  if (range === "upper_range") return "testing_upper_range" as const
  if (range === "lower_range") return "testing_lower_range" as const
  return "range_middle" as const
}

function marketDirection(momentum: ReturnType<typeof stateFromMomentum>, breakout: ReturnType<typeof breakoutState>) {
  if (momentum === "bullish_momentum" && breakout === "testing_upper_range") return "bullish" as const
  if (momentum === "bearish_momentum" && breakout === "testing_lower_range") return "bearish" as const
  return "neutral" as const
}

export function buildHistoricalSnapshots(rows: MarketOhlcvRow[]): HistoricalMarketSnapshot[] {
  const sorted = [...rows].sort((a, b) => a.openTime - b.openTime)
  const now = new Date().toISOString()
  const interval = sorted[0]?.interval ?? "1h"
  const barsPerDay = interval === "1d" ? 1 : interval === "4h" ? 6 : 24

  return sorted.map((row, index) => {
    const recent = sorted.slice(Math.max(0, index - 20), index)
    const range = rangeState(row, recent.length ? recent : sorted.slice(Math.max(0, index - 5), index + 1))
    const breakout = breakoutState(range)
    const momentum = stateFromMomentum(percentChange(sorted[index - barsPerDay]?.close, row.close))
    const recentRangeAverage = average(recent.map(candleRange))

    return {
      id: `${row.symbol}:${row.interval}:${row.openTime}`,
      symbol: row.symbol,
      interval: row.interval,
      timestamp: row.openTime,
      close: row.close,
      priceChange1h: percentChange(sorted[index - 1]?.close, row.close),
      priceChange4h: percentChange(sorted[index - Math.max(1, Math.round(barsPerDay / 6))]?.close, row.close),
      priceChange1d: percentChange(sorted[index - barsPerDay]?.close, row.close),
      priceChange7d: percentChange(sorted[index - barsPerDay * 7]?.close, row.close),
      volatilityState: volatilityState(candleRange(row), recentRangeAverage),
      momentumState: momentum,
      rangeState: range,
      breakoutState: breakout,
      marketDirection: marketDirection(momentum, breakout),
      forwardReturn1d: percentChange(row.close, sorted[index + barsPerDay]?.close),
      forwardReturn7d: percentChange(row.close, sorted[index + barsPerDay * 7]?.close),
      forwardReturn30d: percentChange(row.close, sorted[index + barsPerDay * 30]?.close),
      createdAt: now,
    }
  })
}
