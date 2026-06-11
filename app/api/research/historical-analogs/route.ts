import { NextResponse } from "next/server"

import { latestDashboardSnapshot, listHistoricalSnapshotsByInterval, listMarketOutcomes } from "@/lib/historical-data/localHistoricalStore"
import { buildCurrentMarketState } from "@/lib/historical-analog/buildCurrentMarketState"
import { filterHistoricalAnalogCandidates } from "@/lib/historical-analog/findSimilarMarketStates"
import { historicalSnapshotScore, matchedContexts } from "@/lib/market-memory/aggregateMarketMemory"
import { enrichWeakDashboardSnapshot } from "@/lib/market-memory/currentStateEnrichment"
import { summarizeOutcomes } from "@/lib/research/marketOutcomeAnalytics"
import type { HistoricalInterval } from "@/types/historical"

export const dynamic = "force-dynamic"
export const revalidate = 0

function dateFromTimestamp(value: number) {
  return new Date(value).toISOString().slice(0, 10)
}

function daysAgo(value: number) {
  return Math.max(0, Math.floor((Date.now() - value) / 86400000))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol") || "BTCUSDT"
  const interval = (searchParams.get("interval") || "1h") as HistoricalInterval
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") ?? 25) || 25))
  const dashboardSnapshot = await latestDashboardSnapshot(symbol)

  if (!dashboardSnapshot) {
    return NextResponse.json({
      status: "unavailable",
      reason: "missing_current_dashboard_snapshot",
      totalCandidates: 0,
      analogs: [],
    })
  }

  const current = buildCurrentMarketState(await enrichWeakDashboardSnapshot(dashboardSnapshot, new URL(req.url).origin))
  const snapshots = filterHistoricalAnalogCandidates(await listHistoricalSnapshotsByInterval(interval))
  const outcomes = await listMarketOutcomes(interval)
  const outcomesBySnapshotId = new Map(outcomes.map((outcome) => [outcome.snapshotId, outcome]))
  const ranked = snapshots
    .map((snapshot) => ({
      snapshot,
      score: historicalSnapshotScore(current, snapshot),
      contexts: matchedContexts(current, snapshot),
    }))
    .filter((item) => item.score >= 50)
    .sort((left, right) => right.score - left.score)
  const analogs = ranked.slice(0, limit).map((item) => {
    const outcome = outcomesBySnapshotId.get(item.snapshot.id)
    const summary = outcome ? summarizeOutcomes([outcome]) : summarizeOutcomes([])
    return {
      symbol: item.snapshot.symbol,
      matchedSymbol: item.snapshot.symbol,
      date: dateFromTimestamp(item.snapshot.timestamp),
      daysAgo: daysAgo(item.snapshot.timestamp),
      matchedContexts: item.contexts,
      avgReturn7d: summary.avgReturn7d,
      avgReturn30d: summary.avgReturn30d,
      successRate: current.direction === "neutral" ? null : summary.successRate,
      dominantOutcome: summary.dominantOutcome,
    }
  })

  return NextResponse.json({
    status: analogs.length ? "available" : "unavailable",
    totalCandidates: ranked.length,
    analogs,
  })
}
