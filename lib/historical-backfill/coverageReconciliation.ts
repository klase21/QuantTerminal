import { createHash } from "node:crypto"

import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import { parseBinanceVisionHistoricalCsv } from "@/lib/historical-backfill/backfill"
import { persistHistoricalCandles } from "@/lib/historical-backfill/repository"
import { validateHistoricalCandleRange } from "@/lib/historical-backfill/validation"
import { reconcileHistoricalDatasetMetadata } from "@/lib/historical-backfill/datasetMetadata"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { StorageJsonValue } from "@/lib/persistence/types"

const DAY_MS = 24 * 60 * 60 * 1000
const BTCUSDT = "BTCUSDT" as const
const SOURCE_ID = "binance-vision" as const

export interface CoverageReconciliationOptions {
  readonly repository: PersistenceRepository
  readonly day: string
  readonly recordedAt: string
  readonly fetchImpl?: typeof fetch
}

export interface CoverageReconciliationResult {
  readonly status: "SUCCESS" | "DUPLICATE" | "UNAVAILABLE" | "VALIDATION_ERROR" | "PERSISTENCE_ERROR"
  readonly day: string
  readonly ohlcvRecords: number
  readonly ohlcvWritten: number
  readonly ohlcvDuplicates: number
  readonly metadataRecords: number
  readonly metadataWritten: number
  readonly metadataDuplicates: number
  readonly datasetMetadataRecords: number
  readonly datasetMetadataWritten: number
  readonly datasetMetadataDuplicates: number
  readonly errors: readonly string[]
}

function dayRange(day: string): { readonly start: string; readonly end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const start = Date.parse(`${day}T00:00:00.000Z`)
  if (!Number.isFinite(start)) return null
  return Object.freeze({
    start: new Date(start).toISOString(),
    end: new Date(start + DAY_MS).toISOString(),
  })
}

function ohlcvUrl(day: string): string {
  return `https://data.binance.vision/data/futures/um/daily/klines/${BTCUSDT}/5m/${BTCUSDT}-5m-${day}.zip`
}

async function reconcileOhlcv(
  options: CoverageReconciliationOptions,
  range: { readonly start: string; readonly end: string },
) {
  const response = await (options.fetchImpl ?? fetch)(ohlcvUrl(options.day), { cache: "no-store" })
  if (!response.ok) throw new Error(`Binance Vision OHLCV archive returned HTTP ${response.status}.`)
  const csv = extractFirstCsvFromZip(Buffer.from(await response.arrayBuffer()))
  const candles = parseBinanceVisionHistoricalCsv(csv)
  const validation = validateHistoricalCandleRange(candles, range.start, range.end)
  if (!validation.valid) throw new Error(validation.errors.join("; "))
  const persistence = await persistHistoricalCandles(options.repository, candles, options.recordedAt)
  if (persistence.errors.length > 0) throw new Error(persistence.errors.join("; "))
  return Object.freeze({
    records: candles.length,
    written: persistence.persistedCount,
    duplicates: persistence.duplicateCount,
  })
}

async function reconcileOpenInterestMetadata(options: CoverageReconciliationOptions) {
  let cursor: string | undefined
  let records = 0
  let written = 0
  let duplicates = 0
  do {
    const page = await options.repository.listStorageRecords({
      recordKinds: ["HISTORICAL_OPEN_INTEREST"],
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    })
    if (page.status !== "SUCCESS") throw new Error(`Open Interest listing returned ${page.status}.`)
    for (const record of page.value.records) {
      const payload = record.payload as Record<string, unknown>
      if (payload.symbol !== BTCUSDT || payload.sourceId !== SOURCE_ID
        || typeof payload.observedAt !== "string") continue
      const metadata = Object.freeze({
        targetRecordId: record.recordId,
        targetRecordKind: "HISTORICAL_OPEN_INTEREST" as const,
        sourceId: SOURCE_ID,
        symbol: BTCUSDT,
        observedAt: payload.observedAt,
        providerTier: "CANONICAL" as const,
        canonical: true as const,
        verified: true as const,
        confidence: 1 as const,
      })
      const checksum = createHash("sha256").update(JSON.stringify(metadata)).digest("hex")
      const result = await options.repository.saveHistoricalProviderMetadata({
        ...metadata,
        schemaVersion: 1,
        recordedAt: options.recordedAt,
        payload: metadata as unknown as StorageJsonValue,
        checksum,
      })
      records += 1
      if (result.status === "SUCCESS") written += 1
      else if (result.status === "DUPLICATE") duplicates += 1
      else throw new Error(`${record.recordId}: metadata persistence returned ${result.status}.`)
    }
    cursor = page.value.nextCursor ?? undefined
  } while (cursor)
  return Object.freeze({ records, written, duplicates })
}

export async function reconcileHistoricalRepositoryCoverage(
  options: CoverageReconciliationOptions,
): Promise<CoverageReconciliationResult> {
  const range = dayRange(options.day)
  const empty = (status: CoverageReconciliationResult["status"], error: string) => Object.freeze({
    status,
    day: options.day,
    ohlcvRecords: 0,
    ohlcvWritten: 0,
    ohlcvDuplicates: 0,
    metadataRecords: 0,
    metadataWritten: 0,
    metadataDuplicates: 0,
    datasetMetadataRecords: 0,
    datasetMetadataWritten: 0,
    datasetMetadataDuplicates: 0,
    errors: Object.freeze([error]),
  })
  if (!range || !Number.isFinite(Date.parse(options.recordedAt))) {
    return empty("VALIDATION_ERROR", "day and recordedAt must be explicit valid UTC timestamps.")
  }
  try {
    const ohlcv = await reconcileOhlcv(options, range)
    const metadata = await reconcileOpenInterestMetadata(options)
    const datasetMetadata = await reconcileHistoricalDatasetMetadata(
      options.repository,
      options.recordedAt,
    )
    if (datasetMetadata.status === "VALIDATION_ERROR" || datasetMetadata.status === "PERSISTENCE_ERROR") {
      throw new Error(datasetMetadata.errors.join("; "))
    }
    const duplicate = ohlcv.written === 0 && metadata.written === 0
      && datasetMetadata.persistedCount === 0
      && ohlcv.duplicates === ohlcv.records && metadata.duplicates === metadata.records
      && datasetMetadata.duplicateCount === datasetMetadata.totalRecords
    return Object.freeze({
      status: duplicate ? "DUPLICATE" : "SUCCESS",
      day: options.day,
      ohlcvRecords: ohlcv.records,
      ohlcvWritten: ohlcv.written,
      ohlcvDuplicates: ohlcv.duplicates,
      metadataRecords: metadata.records,
      metadataWritten: metadata.written,
      metadataDuplicates: metadata.duplicates,
      datasetMetadataRecords: datasetMetadata.totalRecords,
      datasetMetadataWritten: datasetMetadata.persistedCount,
      datasetMetadataDuplicates: datasetMetadata.duplicateCount,
      errors: Object.freeze([]),
    })
  } catch (error) {
    return empty("PERSISTENCE_ERROR", error instanceof Error ? error.message : String(error))
  }
}
