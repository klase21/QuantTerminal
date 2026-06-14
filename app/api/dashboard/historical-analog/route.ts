import { NextResponse } from "next/server"

import {
  latestDashboardSnapshot,
  listDashboardSnapshots,
  listHistoricalSnapshotsByInterval,
  listMarketOutcomes,
  listVerdictRecords,
  upsertHistoricalAnalogRecord,
  upsertVerdictRecords,
} from "@/lib/historical-data/localHistoricalStore"
import { buildCurrentMarketState } from "@/lib/historical-analog/buildCurrentMarketState"
import { filterHistoricalAnalogCandidates, findSimilarDashboardMarketStates, findSimilarMarketStates } from "@/lib/historical-analog/findSimilarMarketStates"
import { buildHistoricalAnalogRecord, buildVerdictRecords, calculateVerdictAccuracy } from "@/lib/historical-analog/verdictTracking"
import { aggregateMarketMemory } from "@/lib/market-memory/aggregateMarketMemory"
import { enrichWeakDashboardSnapshot } from "@/lib/market-memory/currentStateEnrichment"
import type { DashboardHistoricalAnalogResponse, HistoricalInterval, HistoricalMarketSnapshot, VerdictAccuracyStats } from "@/types/historical"

export const dynamic = "force-dynamic"
export const revalidate = 0

function dateFromTimestamp(value: number) {
  return new Date(value).toISOString().slice(0, 10)
}

function dateFromSnapshot(value: number | string) {
  if (typeof value === "number") return dateFromTimestamp(value)
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : value.slice(0, 10)
}

function timestampFromSnapshot(value: number | string) {
  if (typeof value === "number") return value
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function daysAgoFromSnapshot(value: number | string) {
  const timestamp = timestampFromSnapshot(value)
  if (timestamp === null) return undefined
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000))
}

function symbolFromSnapshot(snapshot: { symbol?: string }) {
  return snapshot.symbol
}

function conditionOutput(conditions: string[]) {
  return conditions.slice(0, 3)
}

function distinctAlternatives(items: Array<{ symbol?: string; date: string; label: string; outcomeSummary: string }>) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.symbol ?? ""}:${item.date}:${item.label}:${item.outcomeSummary}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 3)
}

function timestampRange(timestamps: number[]) {
  if (!timestamps.length) return { oldest: null as string | null, newest: null as string | null }
  let min = timestamps[0]
  let max = timestamps[0]
  for (const timestamp of timestamps) {
    if (timestamp < min) min = timestamp
    if (timestamp > max) max = timestamp
  }
  return {
    oldest: dateFromTimestamp(min),
    newest: dateFromTimestamp(max),
  }
}

function isHistoricalSnapshot(snapshot: unknown): snapshot is HistoricalMarketSnapshot {
  return Boolean(
    snapshot &&
    typeof snapshot === "object" &&
    "id" in snapshot &&
    "timestamp" in snapshot &&
    "close" in snapshot &&
    "marketDirection" in snapshot,
  )
}

async function persistAnalogVerdict(input: {
  currentSnapshot: Awaited<ReturnType<typeof enrichWeakDashboardSnapshot>>
  interval: HistoricalInterval
  source: "binance-vision" | "local-market-ohlcv-db" | "market-memory-snapshots"
  queryPath: string
  match: HistoricalMarketSnapshot | null
  matchedConditions: string[]
  historicalSnapshots: HistoricalMarketSnapshot[]
}) {
  if (!input.match) {
    return calculateVerdictAccuracy(await listVerdictRecords())
  }

  const analogRecord = buildHistoricalAnalogRecord({
    current: input.currentSnapshot,
    interval: input.interval,
    match: input.match,
    matchedConditions: input.matchedConditions,
    source: input.source,
    queryPath: input.queryPath,
  })
  const verdicts = buildVerdictRecords({
    analogRecord,
    match: input.match,
    snapshots: input.historicalSnapshots,
  })

  await upsertHistoricalAnalogRecord(analogRecord)
  await upsertVerdictRecords(verdicts)
  return calculateVerdictAccuracy(await listVerdictRecords())
}

function withAccuracy<T extends DashboardHistoricalAnalogResponse>(
  response: T,
  accuracyStats: VerdictAccuracyStats,
  currentDirection: DashboardHistoricalAnalogResponse["currentDirection"],
): T {
  return {
    ...response,
    currentDirection,
    similarCases: response.stats?.totalCases ?? response.match?.outcomeStats?.found,
    accuracyStats,
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get("symbol") || "BTCUSDT"
    const interval = (searchParams.get("interval") || "1h") as HistoricalInterval
    const dashboardSnapshot = await latestDashboardSnapshot(symbol)

    if (!dashboardSnapshot) {
      return NextResponse.json({
        status: "unavailable",
        message: "NO VERIFIED ANALOG",
        reason: "missing_current_dashboard_snapshot",
        source: "local-market-ohlcv-db",
        recordCountSearched: 0,
      })
    }

    const enrichedSnapshot = await enrichWeakDashboardSnapshot(dashboardSnapshot, new URL(req.url).origin)
    const current = buildCurrentMarketState(enrichedSnapshot)
    const historicalSnapshots = await listHistoricalSnapshotsByInterval(interval)
    const filteredHistoricalSnapshots = filterHistoricalAnalogCandidates(historicalSnapshots)
    const range = timestampRange(filteredHistoricalSnapshots.map((snapshot) => snapshot.timestamp))
    const oldestCandidateSearched = range.oldest
    const newestCandidateSearched = range.newest
    const marketOutcomes = await listMarketOutcomes(interval)
    const aggregation = aggregateMarketMemory(current, filteredHistoricalSnapshots, marketOutcomes)
    const stats = aggregation.stats ? {
      totalCases: aggregation.stats.totalCases,
      avgReturn7d: aggregation.stats.avgReturn7d,
      avgReturn30d: aggregation.stats.avgReturn30d,
      successRate: aggregation.stats.successRate7d,
      dominantOutcome: aggregation.stats.dominantOutcome,
    } : undefined
    const historicalResult = findSimilarMarketStates(current, historicalSnapshots)
    const memorySnapshots = await listDashboardSnapshots(symbol)
    const memoryResult = findSimilarDashboardMarketStates(current, memorySnapshots, enrichedSnapshot.id)
    const [memoryMatch, ...memoryAlternatives] = memoryResult.matches
    const historicalVerdictMatch = historicalResult.matches.find((item) => isHistoricalSnapshot(item.snapshot))
    const historicalVerdictSnapshot = historicalVerdictMatch && isHistoricalSnapshot(historicalVerdictMatch.snapshot)
      ? historicalVerdictMatch.snapshot
      : null
    const accuracyStats = await persistAnalogVerdict({
      currentSnapshot: enrichedSnapshot,
      interval,
      source: historicalVerdictSnapshot ? "binance-vision" : "local-market-ohlcv-db",
      queryPath: "market_ohlcv -> historical_market_snapshots -> verdict_tracking",
      match: historicalVerdictSnapshot,
      matchedConditions: historicalVerdictMatch?.matchedConditions ?? [],
      historicalSnapshots,
    })

    if (aggregation.status !== "available") {
      return NextResponse.json(withAccuracy({
        status: "unavailable",
        message: "NO VERIFIED MEMORY",
        reason: aggregation.reason,
        source: "local-market-ohlcv-db",
        recordCountSearched: historicalResult.recordCountSearched,
        exclusionWindowDays: 30,
        oldestCandidateSearched,
        newestCandidateSearched,
        stats,
      }, accuracyStats, current.direction))
    }

    if (memoryMatch) {
      return NextResponse.json(withAccuracy({
        status: "available",
        source: "market-memory-snapshots",
        queryPath: "market_state_snapshots -> narrative_context_similarity",
        recordCountSearched: memoryResult.recordCountSearched,
        exclusionWindowDays: 30,
        oldestCandidateSearched,
        newestCandidateSearched,
        stats,
        match: {
          symbol: symbolFromSnapshot(memoryMatch.snapshot),
          date: dateFromSnapshot(memoryMatch.snapshot.timestamp),
          daysAgo: daysAgoFromSnapshot(memoryMatch.snapshot.timestamp),
          label: memoryMatch.label,
          matchedConditions: conditionOutput(memoryMatch.matchedConditions),
          outcomeSummary: memoryMatch.outcomeSummary,
          outcomeStats: stats ? {
            found: stats.totalCases,
            avg7d: stats.avgReturn7d,
            avg30d: stats.avgReturn30d,
            successRate: stats.successRate,
          } : historicalResult.outcomeStats,
        },
        alternatives: distinctAlternatives(memoryAlternatives.map((item) => ({
          symbol: symbolFromSnapshot(item.snapshot),
          date: dateFromSnapshot(item.snapshot.timestamp),
          daysAgo: daysAgoFromSnapshot(item.snapshot.timestamp),
          label: item.label,
          outcomeSummary: item.outcomeSummary,
        }))),
      }, accuracyStats, current.direction))
    }

    const [match, ...alternatives] = historicalResult.matches

    if (!match) {
      return NextResponse.json(withAccuracy({
        status: "unavailable",
        message: "NO VERIFIED MEMORY",
        reason: aggregation.reason ?? memoryResult.reason ?? historicalResult.reason,
        source: "local-market-ohlcv-db",
        recordCountSearched: historicalResult.recordCountSearched,
        exclusionWindowDays: 30,
        oldestCandidateSearched,
        newestCandidateSearched,
      }, accuracyStats, current.direction))
    }

    return NextResponse.json(withAccuracy({
      status: "available",
      source: "binance-vision",
      queryPath: "market_ohlcv -> historical_market_snapshots -> rule_based_similarity",
      recordCountSearched: historicalResult.recordCountSearched,
      exclusionWindowDays: 30,
      oldestCandidateSearched,
      newestCandidateSearched,
      stats,
      match: {
        symbol: symbolFromSnapshot(match.snapshot),
        date: dateFromSnapshot(match.snapshot.timestamp),
        daysAgo: daysAgoFromSnapshot(match.snapshot.timestamp),
        label: match.label,
        matchedConditions: conditionOutput(match.matchedConditions),
        outcomeSummary: match.outcomeSummary,
        outcomeStats: stats ? {
          found: stats.totalCases,
          avg7d: stats.avgReturn7d,
          avg30d: stats.avgReturn30d,
          successRate: stats.successRate,
        } : match.outcomeStats,
      },
      alternatives: distinctAlternatives(alternatives.map((item) => ({
        symbol: symbolFromSnapshot(item.snapshot),
        date: dateFromSnapshot(item.snapshot.timestamp),
        daysAgo: daysAgoFromSnapshot(item.snapshot.timestamp),
        label: item.label,
        outcomeSummary: item.outcomeSummary,
      }))),
    }, accuracyStats, current.direction))
  } catch (error) {
    return NextResponse.json({
      status: "error",
      reason: "historical_analog_failed",
      message: error instanceof Error ? error.message : "Unknown historical analog failure",
    }, { status: 500 })
  }
}
