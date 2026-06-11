import { NextResponse } from "next/server"

import { listAllHistoricalSnapshots, replaceAllMarketOutcomes } from "@/lib/historical-data/localHistoricalStore"
import { buildMarketOutcomes } from "@/lib/historical-analog/buildMarketOutcomes"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST() {
  const snapshots = await listAllHistoricalSnapshots()
  const outcomes = buildMarketOutcomes(snapshots)
  const rowsWritten = await replaceAllMarketOutcomes(outcomes)

  return NextResponse.json({
    status: "completed",
    source: "historical_market_snapshots",
    snapshotsRead: snapshots.length,
    rowsWritten,
  })
}
