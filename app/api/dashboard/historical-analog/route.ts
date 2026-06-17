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
import type { DashboardHistoricalAnalogResponse, HistoricalAnalogSource, HistoricalInterval, HistoricalMarketSnapshot, VerdictAccuracyStats } from "@/types/historical"

export const dynamic = "force-dynamic"
export const revalidate = 0
const CRYPTOHFTDATA_COVERAGE_START = "2025-07-01"

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

function isCryptoHftDataReplayWindow(value: number | string) {
  return dateFromSnapshot(value) >= CRYPTOHFTDATA_COVERAGE_START
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

const ETH_STYLE_SYMBOLS = new Set([
  "AAVEUSDT",
  "FILUSDT",
  "ARBUSDT",
  "OPUSDT",
  "NEARUSDT",
  "TONUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "UNIUSDT",
  "APTUSDT",
  "SUIUSDT",
  "ADAUSDT",
  "XRPUSDT",
  "DOGEUSDT",
])

function createMinimalDashboardSnapshot(symbol: string) {
  const now = new Date().toISOString()
  return {
    id: `dashboard:synthetic:${symbol}:${Date.now()}`,
    timestamp: now,
    symbol,
    direction: "neutral" as const,
    confidence: null,
    bullFactors: 0,
    bearFactors: 0,
    driversJson: "[]",
    liquidityState: "unknown" as const,
    narrativesJson: "[]",
    narrativeHeat: "unknown" as const,
    dominantNarrative: null,
    sectorRotationState: "unknown" as const,
    predictionState: "unknown" as const,
    etfFlowState: "unknown" as const,
    createdAt: now,
  }
}

async function resolveCurrentDashboardSnapshot(symbol: string) {
  const exact = await latestDashboardSnapshot(symbol)
  if (exact) return { snapshot: exact, reason: undefined as string | undefined }

  const benchmark = await latestDashboardSnapshot("BTCUSDT")
  if (benchmark) {
    return {
      snapshot: { ...benchmark, id: `dashboard:benchmark-current:${symbol}:${benchmark.id}`, symbol },
      reason: `Using BTCUSDT current market state because ${symbol} has no dashboard snapshot.`,
    }
  }

  return {
    snapshot: createMinimalDashboardSnapshot(symbol),
    reason: "Missing current dashboard snapshot; live enrichment attempted from existing dashboard sources.",
  }
}

function snapshotCountBySymbol(snapshots: HistoricalMarketSnapshot[]) {
  const counts = new Map<string, number>()
  snapshots.forEach((snapshot) => counts.set(snapshot.symbol, (counts.get(snapshot.symbol) ?? 0) + 1))
  return counts
}

function resolveSourceSymbol(requestedSymbol: string, counts: Map<string, number>) {
  const minimumCoverage = 100
  const hasCoverage = (symbol: string) => (counts.get(symbol) ?? 0) >= minimumCoverage
  if (hasCoverage(requestedSymbol)) {
    return { sourceSymbol: requestedSymbol, benchmarkReason: undefined as string | undefined }
  }

  const preferred = ETH_STYLE_SYMBOLS.has(requestedSymbol) ? "ETHUSDT" : "BTCUSDT"
  if (hasCoverage(preferred)) {
    return {
      sourceSymbol: preferred,
      benchmarkReason: `Using ${preferred} benchmark because ${requestedSymbol} has insufficient historical coverage.`,
    }
  }

  if (hasCoverage("BTCUSDT")) {
    return {
      sourceSymbol: "BTCUSDT",
      benchmarkReason: `Using BTCUSDT benchmark because ${requestedSymbol} has insufficient historical coverage.`,
    }
  }

  const firstCovered = [...counts.entries()].find(([, count]) => count >= minimumCoverage)?.[0]
  return {
    sourceSymbol: firstCovered ?? requestedSymbol,
    benchmarkReason: firstCovered
      ? `Using ${firstCovered} benchmark because ${requestedSymbol} has insufficient historical coverage.`
      : `No historical benchmark has enough coverage for ${requestedSymbol}.`,
  }
}

async function persistAnalogVerdict(input: {
  currentSnapshot: Awaited<ReturnType<typeof enrichWeakDashboardSnapshot>>
  interval: HistoricalInterval
  source: HistoricalAnalogSource
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
    const requestedSymbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase()
    const interval = (searchParams.get("interval") || "1h") as HistoricalInterval
    if (interval !== "1h" && interval !== "4h" && interval !== "1d") {
      return NextResponse.json({
        status: "unavailable",
        message: "NO VERIFIED ANALOG",
        reason: "unsupported_interval",
        requestedSymbol,
        source: "local-market-ohlcv-db",
        recordCountSearched: 0,
      } satisfies DashboardHistoricalAnalogResponse)
    }

    const allHistoricalSnapshots = await listHistoricalSnapshotsByInterval(interval)
    const counts = snapshotCountBySymbol(allHistoricalSnapshots)
    const { sourceSymbol, benchmarkReason } = resolveSourceSymbol(requestedSymbol, counts)
    const { snapshot: dashboardSnapshot, reason: currentSnapshotReason } = await resolveCurrentDashboardSnapshot(sourceSymbol)

    const enrichedSnapshot = await enrichWeakDashboardSnapshot(dashboardSnapshot, new URL(req.url).origin)
    const current = {
      ...buildCurrentMarketState(enrichedSnapshot),
      symbol: sourceSymbol,
    }
    const historicalSnapshots = allHistoricalSnapshots.filter((snapshot) => isCryptoHftDataReplayWindow(snapshot.timestamp))
    const filteredHistoricalSnapshots = filterHistoricalAnalogCandidates(historicalSnapshots)
    const range = timestampRange(filteredHistoricalSnapshots.map((snapshot) => snapshot.timestamp))
    const oldestCandidateSearched = range.oldest
    const newestCandidateSearched = range.newest
    if (!filteredHistoricalSnapshots.length) {
      return NextResponse.json({
        status: "unavailable",
        message: "NO VERIFIED REPLAY CASE",
        reason: "No CryptoHFTData-compatible historical analog found.",
        source: "cryptohftdata-compatible-replay-window",
        requestedSymbol,
        sourceSymbol,
        benchmarkUsed: sourceSymbol !== requestedSymbol ? sourceSymbol : undefined,
        benchmarkReason,
        recordCountSearched: 0,
        exclusionWindowDays: 30,
        oldestCandidateSearched,
        newestCandidateSearched,
        currentDirection: current.direction,
      } satisfies DashboardHistoricalAnalogResponse)
    }
    const marketOutcomes = await listMarketOutcomes(interval)
    const aggregation = aggregateMarketMemory(current, filteredHistoricalSnapshots, marketOutcomes)
    const stats = aggregation.stats ? {
      totalCases: aggregation.stats.totalCases,
      avgReturn7d: aggregation.stats.avgReturn7d,
      avgReturn30d: aggregation.stats.avgReturn30d,
      successRate: aggregation.stats.successRate7d,
      dominantOutcome: aggregation.stats.dominantOutcome,
    } : undefined
    const historicalResult = findSimilarMarketStates(current, filteredHistoricalSnapshots)
    const memorySnapshots = await listDashboardSnapshots(sourceSymbol)
    const memoryResult = findSimilarDashboardMarketStates(current, memorySnapshots, enrichedSnapshot.id)
    const [memoryMatch, ...memoryAlternatives] = memoryResult.matches
    const historicalVerdictMatch = historicalResult.matches.find((item) => isHistoricalSnapshot(item.snapshot))
    const historicalVerdictSnapshot = historicalVerdictMatch && isHistoricalSnapshot(historicalVerdictMatch.snapshot)
      ? historicalVerdictMatch.snapshot
      : null
    const accuracyStats = await persistAnalogVerdict({
      currentSnapshot: enrichedSnapshot,
      interval,
      source: "cryptohftdata-compatible-replay-window",
      queryPath: "historical_market_snapshots filtered to CryptoHFTData coverage -> verdict_tracking",
      match: historicalVerdictSnapshot,
      matchedConditions: historicalVerdictMatch?.matchedConditions ?? [],
      historicalSnapshots: filteredHistoricalSnapshots,
    })

    if (aggregation.status !== "available") {
      const availableCaseCount = aggregation.similarOutcomes.length
      const minimumReason = aggregation.reason === "insufficient_cases"
        ? `Only ${availableCaseCount} historical matches found. Minimum required is 10.`
        : aggregation.reason
      return NextResponse.json(withAccuracy({
        status: "unavailable",
        message: "NO VERIFIED REPLAY CASE",
        reason: minimumReason ?? currentSnapshotReason ?? benchmarkReason,
        source: "cryptohftdata-compatible-replay-window",
        requestedSymbol,
        sourceSymbol,
        benchmarkUsed: sourceSymbol !== requestedSymbol ? sourceSymbol : undefined,
        benchmarkReason,
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
        requestedSymbol,
        sourceSymbol,
        benchmarkUsed: sourceSymbol !== requestedSymbol ? sourceSymbol : undefined,
        benchmarkReason,
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
        message: "NO VERIFIED REPLAY CASE",
        reason: aggregation.reason ?? memoryResult.reason ?? historicalResult.reason ?? currentSnapshotReason ?? benchmarkReason,
        source: "cryptohftdata-compatible-replay-window",
        requestedSymbol,
        sourceSymbol,
        benchmarkUsed: sourceSymbol !== requestedSymbol ? sourceSymbol : undefined,
        benchmarkReason,
        recordCountSearched: historicalResult.recordCountSearched,
        exclusionWindowDays: 30,
        oldestCandidateSearched,
        newestCandidateSearched,
      }, accuracyStats, current.direction))
    }

    return NextResponse.json(withAccuracy({
      status: "available",
      source: "cryptohftdata-compatible-replay-window",
      queryPath: "historical_market_snapshots filtered to CryptoHFTData coverage -> rule_based_similarity",
      requestedSymbol,
      sourceSymbol,
      benchmarkUsed: sourceSymbol !== requestedSymbol ? sourceSymbol : undefined,
      benchmarkReason,
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
