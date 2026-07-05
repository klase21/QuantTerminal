import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import { createHistoricalCandleId } from "@/lib/historical-backfill/identity"
import { persistHistoricalCandles } from "@/lib/historical-backfill/repository"
import {
  HISTORICAL_BACKFILL_DATASET,
  HISTORICAL_BACKFILL_END,
  HISTORICAL_BACKFILL_INTERVAL,
  HISTORICAL_BACKFILL_SOURCE,
  HISTORICAL_BACKFILL_START,
  HISTORICAL_BACKFILL_SYMBOL,
  type HistoricalBackfillOptions,
  type HistoricalBackfillResult,
  type HistoricalCandle,
} from "@/lib/historical-backfill/types"
import { getHistoricalDatasetResolutionMetadata } from "@/lib/historical-backfill/datasetMetadata"
import { validateHistoricalCandles } from "@/lib/historical-backfill/validation"

const MARKET_RESOLUTION = getHistoricalDatasetResolutionMetadata("HISTORICAL_MARKET")

const BASE_URL = "https://data.binance.vision/data/futures/um/daily/klines"
const DAY_MS = 24 * 60 * 60 * 1000

function sourceDates(): readonly string[] {
  const dates: string[] = []
  for (let time = Date.parse(HISTORICAL_BACKFILL_START);
    time < Date.parse(HISTORICAL_BACKFILL_END); time += DAY_MS) {
    dates.push(new Date(time).toISOString().slice(0, 10))
  }
  return Object.freeze(dates)
}

function sourceUrl(date: string): string {
  return `${BASE_URL}/${HISTORICAL_BACKFILL_SYMBOL}/${HISTORICAL_BACKFILL_INTERVAL}/${HISTORICAL_BACKFILL_SYMBOL}-${HISTORICAL_BACKFILL_INTERVAL}-${date}.zip`
}

function finiteNumber(value: string, field: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`Binance Vision candle has invalid ${field}.`)
  return parsed
}

function sourceTimestamp(value: string, field: string): { readonly raw: string; readonly milliseconds: number } {
  if (!/^\d+$/.test(value)) throw new Error(`Binance Vision candle has invalid ${field}.`)
  const raw = value
  const numeric = Number(raw)
  if (!Number.isSafeInteger(numeric)) throw new Error(`Binance Vision candle has unsafe ${field}.`)
  const milliseconds = raw.length > 13 ? Math.trunc(numeric / 1000) : numeric
  if (!Number.isFinite(Date.parse(new Date(milliseconds).toISOString()))) {
    throw new Error(`Binance Vision candle has invalid ${field}.`)
  }
  return Object.freeze({ raw, milliseconds })
}

export function parseBinanceVisionHistoricalCsv(csv: string): readonly HistoricalCandle[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  if (lines[0]?.toLowerCase().startsWith("open_time,")) lines.shift()
  const candles = lines.map((line) => {
    const columns = line.split(",")
    if (columns.length < 11) throw new Error("Binance Vision candle has fewer than 11 columns.")
    const sourceOpenTime = sourceTimestamp(columns[0], "open time")
    const sourceCloseTime = sourceTimestamp(columns[6], "close time")
    const openTime = new Date(sourceOpenTime.milliseconds).toISOString()
    return Object.freeze({
      ...MARKET_RESOLUTION,
      providerTier: "CANONICAL" as const,
      canonical: true as const,
      verified: true as const,
      confidence: 1 as const,
      recordId: createHistoricalCandleId(openTime),
      sourceId: HISTORICAL_BACKFILL_SOURCE,
      dataset: HISTORICAL_BACKFILL_DATASET,
      symbol: HISTORICAL_BACKFILL_SYMBOL,
      interval: HISTORICAL_BACKFILL_INTERVAL,
      sourceOpenTime: sourceOpenTime.raw,
      sourceCloseTime: sourceCloseTime.raw,
      openTime,
      closeTime: new Date(sourceCloseTime.milliseconds).toISOString(),
      open: finiteNumber(columns[1], "open"),
      high: finiteNumber(columns[2], "high"),
      low: finiteNumber(columns[3], "low"),
      close: finiteNumber(columns[4], "close"),
      volume: finiteNumber(columns[5], "volume"),
      quoteVolume: finiteNumber(columns[7], "quote volume"),
      tradeCount: finiteNumber(columns[8], "trade count"),
      takerBuyVolume: finiteNumber(columns[9], "taker buy volume"),
      takerBuyQuoteVolume: finiteNumber(columns[10], "taker buy quote volume"),
    } satisfies HistoricalCandle)
  })
  return Object.freeze(candles)
}

async function downloadWeek(fetchImpl: typeof fetch): Promise<readonly HistoricalCandle[]> {
  const candles: HistoricalCandle[] = []
  for (const date of sourceDates()) {
    const response = await fetchImpl(sourceUrl(date), { cache: "no-store" })
    if (!response.ok) throw new Error(`Binance Vision ${date} returned HTTP ${response.status}.`)
    const csv = extractFirstCsvFromZip(Buffer.from(await response.arrayBuffer()))
    candles.push(...parseBinanceVisionHistoricalCsv(csv))
  }
  return Object.freeze(candles)
}

export async function runBinanceVisionHistoricalBackfill(
  options: HistoricalBackfillOptions,
): Promise<HistoricalBackfillResult> {
  const emptyValidation = Object.freeze({ valid: false, duplicateCount: 0, missingIntervalCount: 2016, errors: Object.freeze([] as string[]) })
  if (!Number.isFinite(Date.parse(options.recordedAt))) {
    return Object.freeze({ status: "VALIDATION_ERROR", rangeStart: HISTORICAL_BACKFILL_START, rangeEnd: HISTORICAL_BACKFILL_END, totalCandles: 0, persistedCount: 0, duplicateWriteCount: 0, validation: emptyValidation, errors: Object.freeze(["recordedAt must be a valid explicit timestamp."]) })
  }
  let candles: readonly HistoricalCandle[]
  try {
    candles = await downloadWeek(options.fetchImpl ?? fetch)
  } catch (error) {
    return Object.freeze({ status: "UNAVAILABLE", rangeStart: HISTORICAL_BACKFILL_START, rangeEnd: HISTORICAL_BACKFILL_END, totalCandles: 0, persistedCount: 0, duplicateWriteCount: 0, validation: emptyValidation, errors: Object.freeze([error instanceof Error ? error.message : String(error)]) })
  }
  const validation = validateHistoricalCandles(candles)
  if (!validation.valid) {
    return Object.freeze({ status: "VALIDATION_ERROR", rangeStart: HISTORICAL_BACKFILL_START, rangeEnd: HISTORICAL_BACKFILL_END, totalCandles: candles.length, persistedCount: 0, duplicateWriteCount: 0, validation, errors: validation.errors })
  }
  const persistence = await persistHistoricalCandles(options.repository, candles, options.recordedAt)
  const status = persistence.errors.length > 0
    ? "PERSISTENCE_ERROR"
    : persistence.persistedCount === 0 && persistence.duplicateCount === candles.length
      ? "DUPLICATE"
      : "SUCCESS"
  return Object.freeze({ status, rangeStart: HISTORICAL_BACKFILL_START, rangeEnd: HISTORICAL_BACKFILL_END, totalCandles: candles.length, persistedCount: persistence.persistedCount, duplicateWriteCount: persistence.duplicateCount, validation, errors: persistence.errors })
}
