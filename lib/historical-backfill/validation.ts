import {
  HISTORICAL_BACKFILL_END,
  HISTORICAL_BACKFILL_START,
  type HistoricalBackfillValidation,
  type HistoricalCandle,
} from "@/lib/historical-backfill/types"

const INTERVAL_MS = 5 * 60 * 1000

function validNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

export function validateHistoricalCandles(
  candles: readonly HistoricalCandle[],
): HistoricalBackfillValidation {
  return validateHistoricalCandleRange(
    candles,
    HISTORICAL_BACKFILL_START,
    HISTORICAL_BACKFILL_END,
  )
}

export function validateHistoricalCandleRange(
  candles: readonly HistoricalCandle[],
  rangeStart: string,
  rangeEnd: string,
): HistoricalBackfillValidation {
  const errors: string[] = []
  const seen = new Set<string>()
  let duplicateCount = 0

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index]
    const openTime = Date.parse(candle.openTime)
    const closeTime = Date.parse(candle.closeTime)
    if (!Number.isFinite(openTime) || !Number.isFinite(closeTime)
      || closeTime !== openTime + INTERVAL_MS - 1) {
      errors.push(`Invalid source timestamp at candle ${index}.`)
    }
    if (seen.has(candle.openTime)) duplicateCount += 1
    seen.add(candle.openTime)
    if (index > 0 && Date.parse(candles[index - 1].openTime) >= openTime) {
      errors.push(`Candles are not strictly chronological at index ${index}.`)
    }
    if (![candle.open, candle.high, candle.low, candle.close, candle.volume,
      candle.quoteVolume, candle.takerBuyVolume, candle.takerBuyQuoteVolume].every(validNumber)
      || !Number.isInteger(candle.tradeCount) || candle.tradeCount < 0
      || candle.high < Math.max(candle.open, candle.close, candle.low)
      || candle.low > Math.min(candle.open, candle.close, candle.high)) {
      errors.push(`Invalid OHLCV values at ${candle.openTime}.`)
    }
  }

  const expectedTimes = new Set<number>()
  const start = Date.parse(rangeStart)
  const end = Date.parse(rangeEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end
    || start % INTERVAL_MS !== 0 || end % INTERVAL_MS !== 0) {
    errors.push("Validation range must use aligned source-backed UTC boundaries.")
  }
  for (let time = start; time < end; time += INTERVAL_MS) {
    expectedTimes.add(time)
  }
  for (const candle of candles) expectedTimes.delete(Date.parse(candle.openTime))
  const missingIntervalCount = expectedTimes.size
  if (duplicateCount > 0) errors.push(`Source contains ${duplicateCount} duplicate candles.`)
  if (missingIntervalCount > 0) errors.push(`Source is missing ${missingIntervalCount} intervals.`)
  const expectedCount = Number.isFinite(start) && Number.isFinite(end)
    ? (end - start) / INTERVAL_MS
    : 0
  if (candles.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} candles, received ${candles.length}.`)
  }

  return Object.freeze({
    valid: errors.length === 0,
    duplicateCount,
    missingIntervalCount,
    errors: Object.freeze(errors),
  })
}
