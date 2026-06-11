import { NextResponse } from "next/server"

import {
  buildBinanceVisionUrl,
  downloadBinanceVisionZip,
  extractFirstCsvFromZip,
  parseBinanceVisionKlinesCsv,
} from "@/lib/historical-data/binanceVisionClient"
import {
  getIngestionJob,
  jobId,
  listOhlcvRows,
  upsertIngestionJob,
  upsertOhlcvRows,
  replaceHistoricalSnapshots,
  replaceMarketOutcomes,
} from "@/lib/historical-data/localHistoricalStore"
import { buildMarketOutcomes } from "@/lib/historical-analog/buildMarketOutcomes"
import { buildHistoricalSnapshots } from "@/lib/historical-analog/buildHistoricalSnapshots"
import type { HistoricalInterval, IngestionJob } from "@/types/historical"

export const dynamic = "force-dynamic"
export const revalidate = 0

const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "LINKUSDT", "AVAXUSDT"]
const DEFAULT_INTERVALS: HistoricalInterval[] = ["1h", "4h", "1d"]

function monthRange(startMonth: string, endMonth: string) {
  const output: string[] = []
  const cursor = new Date(`${startMonth}-01T00:00:00Z`)
  const end = new Date(`${endMonth}-01T00:00:00Z`)
  while (cursor <= end) {
    output.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return output
}

function newJob(symbol: string, interval: HistoricalInterval, period: string, fileUrl: string): IngestionJob {
  const now = new Date().toISOString()
  return {
    id: jobId("binance-vision", "futures-um-monthly-klines", symbol, interval, period),
    source: "binance-vision",
    dataset: "futures-um-monthly-klines",
    symbol,
    interval,
    period,
    status: "pending",
    fileUrl,
    rowsInserted: 0,
    createdAt: now,
    updatedAt: now,
  }
}

async function mark(job: IngestionJob, status: IngestionJob["status"], patch: Partial<IngestionJob> = {}) {
  return upsertIngestionJob({
    ...job,
    ...patch,
    status,
    updatedAt: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const symbols = Array.isArray(body.symbols) && body.symbols.length ? body.symbols.map(String) : DEFAULT_SYMBOLS
  const intervals = Array.isArray(body.intervals) && body.intervals.length ? body.intervals as HistoricalInterval[] : DEFAULT_INTERVALS
  const startMonth = typeof body.startMonth === "string" ? body.startMonth : "2021-01"
  const endMonth = typeof body.endMonth === "string" ? body.endMonth : new Date().toISOString().slice(0, 7)
  const periods = monthRange(startMonth, endMonth)

  let completed = 0
  let failed = 0
  let skipped = 0
  let rowsInserted = 0
  const jobs: IngestionJob[] = []

  for (const symbol of symbols) {
    for (const interval of intervals) {
      for (const period of periods) {
        const fileUrl = buildBinanceVisionUrl(symbol, interval, period)
        let job = newJob(symbol, interval, period, fileUrl)
        const existing = await getIngestionJob(job.id)
        if (existing?.status === "completed") {
          skipped += 1
          jobs.push({ ...existing, status: "skipped" })
          continue
        }

        try {
          job = await mark(job, "downloading")
          const zip = await downloadBinanceVisionZip(fileUrl)
          if (!zip) {
            failed += 1
            jobs.push(await mark(job, "failed", { errorMessage: "Binance Vision file not found." }))
            continue
          }

          job = await mark(job, "parsing")
          const csv = extractFirstCsvFromZip(zip)
          const rows = parseBinanceVisionKlinesCsv(csv, symbol, interval)
          const inserted = await upsertOhlcvRows(rows)
          rowsInserted += inserted
          completed += 1
          jobs.push(await mark(job, "completed", { rowsInserted: inserted }))
        } catch (error) {
          failed += 1
          jobs.push(await mark(job, "failed", { errorMessage: error instanceof Error ? error.message : String(error) }))
        }
      }

      const rows = await listOhlcvRows(symbol, interval)
      if (rows.length) {
        const snapshots = buildHistoricalSnapshots(rows)
        await replaceHistoricalSnapshots(symbol, interval, snapshots)
        await replaceMarketOutcomes(symbol, interval, buildMarketOutcomes(snapshots))
      }
    }
  }

  return NextResponse.json({
    status: failed ? "partial" : "completed",
    jobs: jobs.length,
    completed,
    failed,
    skipped,
    rowsInserted,
  })
}
