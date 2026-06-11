import { NextResponse } from "next/server"

import {
  listAllHistoricalSnapshots,
  listAllOhlcvRows,
  listIngestionJobs,
  listMarketOutcomes,
} from "@/lib/historical-data/localHistoricalStore"

export const dynamic = "force-dynamic"
export const revalidate = 0

function monthFromTimestamp(value: number) {
  return new Date(value).toISOString().slice(0, 7)
}

function increment(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1
}

const EXPECTED_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "LINKUSDT", "AVAXUSDT"]

export async function GET() {
  const [snapshots, outcomes, ingestionJobs] = await Promise.all([
    listAllHistoricalSnapshots(),
    listMarketOutcomes(),
    listIngestionJobs(),
  ])
  const ohlcvRows = await listAllOhlcvRows()
  const symbols = Array.from(new Set([
    ...EXPECTED_SYMBOLS,
    ...ohlcvRows.map((row) => row.symbol),
    ...snapshots.map((snapshot) => snapshot.symbol),
    ...outcomes.map((outcome) => outcome.symbol),
    ...ingestionJobs.map((job) => job.symbol),
  ])).sort()
  const snapshotCounts: Record<string, number> = {}
  const outcomeCounts: Record<string, number> = {}
  const rowCounts: Record<string, number> = {}
  const latestMonthBySymbol: Record<string, string> = {}

  ohlcvRows.forEach((row) => increment(rowCounts, row.symbol))

  snapshots.forEach((snapshot) => {
    increment(snapshotCounts, snapshot.symbol)
    const month = monthFromTimestamp(snapshot.timestamp)
    if (!latestMonthBySymbol[snapshot.symbol] || month > latestMonthBySymbol[snapshot.symbol]) {
      latestMonthBySymbol[snapshot.symbol] = month
    }
  })

  outcomes.forEach((outcome) => increment(outcomeCounts, outcome.symbol))
  const totalSnapshots = snapshots.length
  const totalOutcomes = outcomes.length
  const failedSymbols = new Set(ingestionJobs.filter((job) => job.status === "failed").map((job) => job.symbol))
  const emptySymbols = symbols.filter((symbol) => (rowCounts[symbol] ?? 0) === 0 || (snapshotCounts[symbol] ?? 0) === 0)
  const zeroOutcomeSymbols = symbols.filter((symbol) => (outcomeCounts[symbol] ?? 0) === 0)
  const outcomeCoverageBySymbol = Object.fromEntries(symbols.map((symbol) => [
    symbol,
    (snapshotCounts[symbol] ?? 0) > 0 ? Number((((outcomeCounts[symbol] ?? 0) / (snapshotCounts[symbol] ?? 0)) * 100).toFixed(2)) : 0,
  ]))

  return NextResponse.json({
    symbols,
    rowCounts,
    snapshotCounts,
    outcomeCounts,
    totalSnapshots,
    totalOutcomes,
    dataQuality: {
      emptySymbols,
      zeroOutcomeSymbols,
      failedBackfillSymbols: Array.from(failedSymbols).sort(),
      outcomeCoverageBySymbol,
    },
    ingestionJobs: {
      total: ingestionJobs.length,
      completed: ingestionJobs.filter((job) => job.status === "completed").length,
      failed: ingestionJobs.filter((job) => job.status === "failed").length,
      skipped: ingestionJobs.filter((job) => job.status === "skipped").length,
      pending: ingestionJobs.filter((job) => job.status === "pending").length,
    },
    failedJobs: ingestionJobs
      .filter((job) => job.status === "failed")
      .map((job) => ({
        symbol: job.symbol,
        interval: job.interval,
        period: job.period,
        fileUrl: job.fileUrl,
        errorMessage: job.errorMessage,
      })),
    latestMonthBySymbol,
  })
}
