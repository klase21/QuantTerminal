import { NextResponse } from "next/server"

import { latestDashboardSnapshot, listDashboardSnapshots, listHistoricalSnapshotsByInterval, listMarketMemoryEvents, listMarketOutcomes } from "@/lib/historical-data/localHistoricalStore"
import { buildCurrentMarketState } from "@/lib/historical-analog/buildCurrentMarketState"
import { findSimilarDashboardMarketStates, findSimilarMarketStates } from "@/lib/historical-analog/findSimilarMarketStates"
import { aggregateMarketMemory } from "@/lib/market-memory/aggregateMarketMemory"
import { enrichWeakDashboardSnapshot } from "@/lib/market-memory/currentStateEnrichment"
import type { HistoricalInterval } from "@/types/historical"

export const dynamic = "force-dynamic"
export const revalidate = 0

function dateOnly(value: string | number) {
  const timestamp = typeof value === "number" ? value : new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return String(value).slice(0, 10)
  return new Date(timestamp).toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get("symbol") || "BTCUSDT"
    const interval = (searchParams.get("interval") || "1h") as HistoricalInterval
    const currentSnapshot = await latestDashboardSnapshot(symbol)

    if (!currentSnapshot) {
      return NextResponse.json({
        status: "unavailable",
        reason: "missing_current_dashboard_snapshot",
        source: "market_state_snapshots",
        recordCountSearched: 0,
        setups: [],
      })
    }

    const enrichedSnapshot = await enrichWeakDashboardSnapshot(currentSnapshot, new URL(req.url).origin)
    const current = buildCurrentMarketState(enrichedSnapshot)
    const snapshots = await listDashboardSnapshots(symbol)
    const result = findSimilarDashboardMarketStates(current, snapshots, enrichedSnapshot.id)
    const historicalSnapshots = await listHistoricalSnapshotsByInterval(interval)
    const historicalResult = findSimilarMarketStates(current, historicalSnapshots)
    const marketOutcomes = await listMarketOutcomes(interval)
    const aggregation = aggregateMarketMemory(current, historicalSnapshots, marketOutcomes)
    const events = await listMarketMemoryEvents()
    const eventByDate = new Map(events.map((event) => [dateOnly(event.eventDate), event]))
    const symbolsCovered = new Set([
      ...historicalSnapshots.map((snapshot) => snapshot.symbol),
      ...marketOutcomes.map((outcome) => outcome.symbol),
    ]).size

    return NextResponse.json({
      status: aggregation.status,
      reason: aggregation.status === "available" ? undefined : aggregation.reason ?? result.reason,
      source: "market_state_snapshots",
      queryPath: "market_state_snapshots -> market_memory_events -> narrative_context_similarity",
      recordCountSearched: result.recordCountSearched,
      currentState: current,
      similarCaseCount: aggregation.stats?.totalCases ?? aggregation.similarOutcomes.length,
      avgReturn7d: aggregation.stats?.avgReturn7d ?? null,
      avgReturn30d: aggregation.stats?.avgReturn30d ?? null,
      successRate: aggregation.stats?.successRate7d ?? null,
      dominantOutcome: aggregation.stats?.dominantOutcome ?? null,
      topMatchedContexts: aggregation.topMatchedContexts,
      topSymbolsInMatches: aggregation.topSymbolsInMatches,
      dataCoverage: {
        symbolsCovered,
        historicalSnapshots: historicalSnapshots.length,
        marketOutcomes: marketOutcomes.length,
        dashboardSnapshots: snapshots.length,
        memoryEvents: events.length,
      },
      outcomeStats: historicalResult.outcomeStats,
      setups: result.matches.map((match) => {
        const date = dateOnly(match.snapshot.timestamp)
        const event = eventByDate.get(date)
        return {
          date,
          title: event?.title ?? match.label,
          category: event?.category ?? "MARKET",
          matchedContext: match.matchedConditions,
          outcome: match.outcomeSummary,
        }
      }),
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      reason: "market_memory_failed",
      message: error instanceof Error ? error.message : "Unknown market memory failure",
    }, { status: 500 })
  }
}
