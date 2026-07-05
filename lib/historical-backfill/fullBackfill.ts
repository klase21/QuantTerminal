import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import { parseBinanceVisionHistoricalCsv } from "@/lib/historical-backfill/backfill"
import { persistHistoricalCandles } from "@/lib/historical-backfill/repository"
import {
  HISTORICAL_BACKFILL_INTERVAL,
  HISTORICAL_BACKFILL_SYMBOL,
  type FullHistoricalBackfillOptions,
  type FullHistoricalBackfillResult,
  type HistoricalArchivePlan,
  type HistoricalBackfillProgress,
  type HistoricalCandle,
} from "@/lib/historical-backfill/types"
import { validateHistoricalCandleRange } from "@/lib/historical-backfill/validation"

export const FULL_BACKFILL_EARLIEST = "2019-12-31T00:00:00.000Z" as const

const BASE_URL = "https://data.binance.vision/data/futures/um"
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_LATEST_DAY_LOOKBACK = 14

function isoDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

function dailyUrl(day: string): string {
  return `${BASE_URL}/daily/klines/${HISTORICAL_BACKFILL_SYMBOL}/${HISTORICAL_BACKFILL_INTERVAL}/${HISTORICAL_BACKFILL_SYMBOL}-${HISTORICAL_BACKFILL_INTERVAL}-${day}.zip`
}

function monthlyUrl(month: string): string {
  return `${BASE_URL}/monthly/klines/${HISTORICAL_BACKFILL_SYMBOL}/${HISTORICAL_BACKFILL_INTERVAL}/${HISTORICAL_BACKFILL_SYMBOL}-${HISTORICAL_BACKFILL_INTERVAL}-${month}.zip`
}

async function sourceExists(fetchImpl: typeof fetch, url: string): Promise<boolean> {
  const response = await fetchImpl(url, { method: "HEAD", cache: "no-store" })
  if (response.status === 404) return false
  if (!response.ok) throw new Error(`Binance Vision availability check returned HTTP ${response.status}.`)
  return true
}

export async function findLatestCompleteBinanceVisionDay(
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<string> {
  const latestPossible = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY_MS
  for (let offset = 0; offset < MAX_LATEST_DAY_LOOKBACK; offset += 1) {
    const day = isoDay(latestPossible - offset * DAY_MS)
    if (await sourceExists(fetchImpl, dailyUrl(day))) return day
  }
  throw new Error("No complete Binance Vision daily archive was published in the lookback window.")
}

function nextMonthStart(time: number): number {
  const value = new Date(time)
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1)
}

export async function createFullHistoricalArchivePlan(
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<readonly HistoricalArchivePlan[]> {
  const latestDay = await findLatestCompleteBinanceVisionDay(fetchImpl, now)
  const latestEnd = Date.parse(`${latestDay}T00:00:00.000Z`) + DAY_MS
  const plans: HistoricalArchivePlan[] = []

  const earliestDay = FULL_BACKFILL_EARLIEST.slice(0, 10)
  if (!await sourceExists(fetchImpl, dailyUrl(earliestDay))) {
    throw new Error(`Official earliest archive ${earliestDay} is unavailable.`)
  }
  plans.push(Object.freeze({
    kind: "DAILY",
    period: earliestDay,
    rangeStart: FULL_BACKFILL_EARLIEST,
    rangeEnd: "2020-01-01T00:00:00.000Z",
    url: dailyUrl(earliestDay),
  }))

  let cursor = Date.parse("2020-01-01T00:00:00.000Z")
  while (cursor < latestEnd) {
    const monthEnd = nextMonthStart(cursor)
    const month = new Date(cursor).toISOString().slice(0, 7)
    const url = monthlyUrl(month)
    if (monthEnd <= latestEnd && await sourceExists(fetchImpl, url)) {
      plans.push(Object.freeze({
        kind: "MONTHLY",
        period: month,
        rangeStart: new Date(cursor).toISOString(),
        rangeEnd: new Date(monthEnd).toISOString(),
        url,
      }))
      cursor = monthEnd
      continue
    }

    const day = isoDay(cursor)
    const dayUrl = dailyUrl(day)
    if (!await sourceExists(fetchImpl, dayUrl)) {
      throw new Error(`Required Binance Vision daily archive ${day} is unavailable.`)
    }
    plans.push(Object.freeze({
      kind: "DAILY",
      period: day,
      rangeStart: new Date(cursor).toISOString(),
      rangeEnd: new Date(cursor + DAY_MS).toISOString(),
      url: dayUrl,
    }))
    cursor += DAY_MS
  }
  return Object.freeze(plans)
}

async function downloadArchive(
  plan: HistoricalArchivePlan,
  fetchImpl: typeof fetch,
): Promise<readonly HistoricalCandle[]> {
  const response = await fetchImpl(plan.url, { cache: "no-store" })
  if (!response.ok) throw new Error(`${plan.period} returned HTTP ${response.status}.`)
  const csv = extractFirstCsvFromZip(Buffer.from(await response.arrayBuffer()))
  return parseBinanceVisionHistoricalCsv(csv)
}

function progress(
  archiveIndex: number,
  archiveCount: number,
  archive: HistoricalArchivePlan,
  totals: Omit<HistoricalBackfillProgress, "archiveIndex" | "archiveCount" | "archive">,
): HistoricalBackfillProgress {
  return Object.freeze({ archiveIndex, archiveCount, archive, ...totals })
}

export async function runFullBinanceVisionHistoricalBackfill(
  options: FullHistoricalBackfillOptions,
): Promise<FullHistoricalBackfillResult> {
  if (!Number.isFinite(Date.parse(options.recordedAt))) {
    return Object.freeze({ status: "VALIDATION_ERROR", rangeStart: FULL_BACKFILL_EARLIEST, rangeEnd: FULL_BACKFILL_EARLIEST, firstTimestamp: null, lastTimestamp: null, archiveCount: 0, completedArchiveCount: 0, totalCandles: 0, persistedCount: 0, duplicateWriteCount: 0, sourceDuplicateCount: 0, missingIntervalCount: 0, errors: Object.freeze(["recordedAt must be an explicit valid timestamp."]) })
  }

  const fetchImpl = options.fetchImpl ?? fetch
  let plans: readonly HistoricalArchivePlan[]
  try {
    plans = await createFullHistoricalArchivePlan(fetchImpl)
  } catch (error) {
    return Object.freeze({ status: "UNAVAILABLE", rangeStart: FULL_BACKFILL_EARLIEST, rangeEnd: FULL_BACKFILL_EARLIEST, firstTimestamp: null, lastTimestamp: null, archiveCount: 0, completedArchiveCount: 0, totalCandles: 0, persistedCount: 0, duplicateWriteCount: 0, sourceDuplicateCount: 0, missingIntervalCount: 0, errors: Object.freeze([error instanceof Error ? error.message : String(error)]) })
  }

  let totalCandles = 0
  let persistedCount = 0
  let duplicateWriteCount = 0
  let sourceDuplicateCount = 0
  let missingIntervalCount = 0
  let completedArchiveCount = 0
  let firstTimestamp: string | null = null
  let lastTimestamp: string | null = null
  const errors: string[] = []

  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index]
    let candles: readonly HistoricalCandle[]
    try {
      candles = await downloadArchive(plan, fetchImpl)
    } catch (error) {
      errors.push(`${plan.period}: ${error instanceof Error ? error.message : String(error)}`)
      break
    }
    const validation = validateHistoricalCandleRange(candles, plan.rangeStart, plan.rangeEnd)
    sourceDuplicateCount += validation.duplicateCount
    missingIntervalCount += validation.missingIntervalCount
    if (!validation.valid) {
      errors.push(...validation.errors.map((message) => `${plan.period}: ${message}`))
      break
    }

    const persisted = await persistHistoricalCandles(options.repository, candles, options.recordedAt)
    if (persisted.errors.length > 0) {
      errors.push(...persisted.errors.map((message) => `${plan.period}: ${message}`))
      break
    }
    totalCandles += candles.length
    persistedCount += persisted.persistedCount
    duplicateWriteCount += persisted.duplicateCount
    completedArchiveCount += 1
    firstTimestamp ??= candles[0]?.openTime ?? null
    lastTimestamp = candles.at(-1)?.openTime ?? lastTimestamp
    options.onProgress?.(progress(index + 1, plans.length, plan, {
      totalCandles,
      persistedCount,
      duplicateWriteCount,
      missingIntervalCount,
    }))
  }

  const allDuplicate = totalCandles > 0 && persistedCount === 0
    && duplicateWriteCount === totalCandles && errors.length === 0
  const status = errors.length > 0
    ? completedArchiveCount > 0 ? "PERSISTENCE_ERROR" : "VALIDATION_ERROR"
    : allDuplicate ? "DUPLICATE" : "SUCCESS"
  return Object.freeze({
    status,
    rangeStart: FULL_BACKFILL_EARLIEST,
    rangeEnd: plans.at(-1)?.rangeEnd ?? FULL_BACKFILL_EARLIEST,
    firstTimestamp,
    lastTimestamp,
    archiveCount: plans.length,
    completedArchiveCount,
    totalCandles,
    persistedCount,
    duplicateWriteCount,
    sourceDuplicateCount,
    missingIntervalCount,
    errors: Object.freeze(errors),
  })
}
