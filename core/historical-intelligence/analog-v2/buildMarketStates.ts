import type {
  HistoricalAnalogFeatureVector,
  HistoricalMarketStateV2,
  HistoricalStateEnrichmentPoint,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
import type { HistoricalInterval, MarketOhlcvRow } from "@/types/historical"

const INTERVAL_HOURS: Record<HistoricalInterval, number> = {
  "1h": 1,
  "4h": 4,
  "1d": 24,
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return null
  const mean = average(values)
  if (mean === null) return null
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length
  return Math.sqrt(variance)
}

function percentChange(from: number | undefined, to: number | undefined) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null
  return ((to! - from!) / from!) * 100
}

function barsForHours(interval: HistoricalInterval, hours: number) {
  const intervalHours = INTERVAL_HOURS[interval]
  if (hours < intervalHours || hours % intervalHours !== 0) return null
  return hours / intervalHours
}

function returnAt(rows: MarketOhlcvRow[], index: number, hours: number) {
  const bars = barsForHours(rows[index].interval, hours)
  if (bars === null || index - bars < 0) return null
  return percentChange(rows[index - bars].close, rows[index].close)
}

function movingAverage(rows: MarketOhlcvRow[], index: number, length: number) {
  if (index + 1 < length) return null
  return average(rows.slice(index - length + 1, index + 1).map((row) => row.close))
}

function distanceFromAverage(close: number, movingAverageValue: number | null) {
  if (movingAverageValue === null || movingAverageValue === 0) return null
  return ((close - movingAverageValue) / movingAverageValue) * 100
}

function volumeZScore(rows: MarketOhlcvRow[], index: number, length = 20) {
  if (index < length) return null
  const history = rows.slice(index - length, index).map((row) => row.volume)
  const mean = average(history)
  const deviation = standardDeviation(history)
  if (mean === null || deviation === null || deviation === 0) return null
  return (rows[index].volume - mean) / deviation
}

function realizedVolatility(rows: MarketOhlcvRow[], index: number) {
  const bars = barsForHours(rows[index].interval, 24)
  if (bars === null || index < bars) return null
  const returns: number[] = []
  for (let cursor = index - bars + 1; cursor <= index; cursor += 1) {
    const value = percentChange(rows[cursor - 1]?.close, rows[cursor]?.close)
    if (value !== null) returns.push(value)
  }
  return standardDeviation(returns)
}

function trendRegime(close: number, sma20: number | null, sma50: number | null) {
  if (sma20 === null || sma50 === null) return "unknown" as const
  if (close > sma20 && sma20 > sma50) return "uptrend" as const
  if (close < sma20 && sma20 < sma50) return "downtrend" as const
  return "sideways" as const
}

function enrichmentAt(
  points: HistoricalStateEnrichmentPoint[],
  timestamp: number,
  toleranceMs: number,
) {
  let candidate: HistoricalStateEnrichmentPoint | null = null
  for (const point of points) {
    if (point.timestamp > timestamp) break
    if (timestamp - point.timestamp <= toleranceMs) candidate = point
  }
  return candidate
}

function openInterestChange(
  points: HistoricalStateEnrichmentPoint[],
  timestamp: number,
  toleranceMs: number,
) {
  const current = enrichmentAt(points, timestamp, toleranceMs)?.openInterest
  const previous = enrichmentAt(points, timestamp - 24 * 60 * 60 * 1000, toleranceMs)?.openInterest
  return percentChange(previous ?? undefined, current ?? undefined)
}

export function buildHistoricalMarketStatesV2(input: {
  rows: MarketOhlcvRow[]
  source?: string
  enrichment?: HistoricalStateEnrichmentPoint[]
}): HistoricalMarketStateV2[] {
  const rows = [...input.rows]
    .filter((row) => Number.isFinite(row.openTime) && Number.isFinite(row.close) && row.close > 0)
    .sort((left, right) => left.openTime - right.openTime)
  if (!rows.length) return []

  const symbol = rows[0].symbol
  const interval = rows[0].interval
  const source = input.source ?? rows[0].source
  const enrichment = [...(input.enrichment ?? [])].sort((left, right) => left.timestamp - right.timestamp)
  const toleranceMs = INTERVAL_HOURS[interval] * 60 * 60 * 1000

  return rows.map((row, index) => {
    const sma20 = movingAverage(rows, index, 20)
    const sma50 = movingAverage(rows, index, 50)
    const enrichmentPoint = enrichmentAt(enrichment, row.openTime, toleranceMs)
    const features: HistoricalAnalogFeatureVector = {
      return1h: returnAt(rows, index, 1),
      return4h: returnAt(rows, index, 4),
      return24h: returnAt(rows, index, 24),
      volumeZScore: volumeZScore(rows, index),
      realizedVolatility24h: realizedVolatility(rows, index),
      distanceSma20: distanceFromAverage(row.close, sma20),
      distanceSma50: distanceFromAverage(row.close, sma50),
      fundingRate: enrichmentPoint?.fundingRate ?? null,
      openInterestChange24h: openInterestChange(enrichment, row.openTime, toleranceMs),
    }

    return {
      id: `${source}:${row.symbol}:${row.interval}:${row.openTime}`,
      source,
      symbol,
      interval,
      timestamp: row.openTime,
      close: row.close,
      trendRegime: trendRegime(row.close, sma20, sma50),
      features,
    }
  })
}
