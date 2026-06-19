import { NextResponse } from "next/server"

import { HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION } from "@/core/historical-intelligence/analog-v2/historicalAnalogCache"
import { readHistoricalAnalogCacheV2 } from "@/lib/historical-intelligence/analog-v2/readHistoricalAnalogCache"
import type {
  DashboardHistoricalAnalogResponse,
  HistoricalAnalogSource,
  HistoricalInterval,
} from "@/types/historical"

export const dynamic = "force-dynamic"
export const revalidate = 0

function validInterval(value: string): value is HistoricalInterval {
  return value === "1h" || value === "4h" || value === "1d"
}

function unavailableReason(state: string, reason: string) {
  if (state === "missing") return "Historical Analog V2 cache not generated."
  if (state === "corrupted") return "Historical Analog V2 cache is corrupted."
  if (state === "expired") return "Historical Analog V2 cache has expired."
  if (state === "version_mismatch") return "Historical Analog V2 cache schema is incompatible."
  if (state === "partial") return "Historical Analog V2 cache generation is incomplete."
  if (state === "generation_failed") return `Historical Analog V2 cache generation failed: ${reason}`
  return reason
}

function source(value: string): HistoricalAnalogSource {
  return value === "binance-vision" ? "binance-vision" : "local-market-ohlcv-db"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedSymbol = (searchParams.get("symbol") ?? "BTCUSDT").trim().toUpperCase()
  const intervalValue = searchParams.get("interval") ?? "1h"
  if (!validInterval(intervalValue)) {
    return NextResponse.json({
      status: "unavailable",
      message: "NO VERIFIED ANALOG",
      reason: "Unsupported interval.",
      requestedSymbol,
      recordCountSearched: 0,
      diagnostics: {
        cacheStatus: "invalid_request",
        generatedAt: null,
        source: null,
        schemaVersion: HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
        analogCount: 0,
      },
    } satisfies DashboardHistoricalAnalogResponse)
  }

  const result = await readHistoricalAnalogCacheV2({
    symbol: requestedSymbol,
    interval: intervalValue,
  })
  if (!result.ok) {
    const reason = "reason" in result ? result.reason : "Historical Analog V2 cache unavailable."
    return NextResponse.json({
      status: "unavailable",
      message: "NO VERIFIED ANALOG",
      reason: unavailableReason(result.state, reason),
      requestedSymbol,
      recordCountSearched: 0,
      source: result.manifest ? source(result.manifest.source.id) : undefined,
      queryPath: "historical-analog-v2-cache",
      diagnostics: {
        cacheStatus: result.state,
        generatedAt: result.manifest?.generatedAt ?? null,
        source: result.manifest?.source.id ?? null,
        schemaVersion: result.manifest?.schemaVersion ?? HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
        analogCount: 0,
      },
    } satisfies DashboardHistoricalAnalogResponse)
  }

  const payload = result.data
  const [match, ...alternatives] = payload.cases
  if (!match) {
    return NextResponse.json({
      status: "unavailable",
      message: "NO VERIFIED ANALOG",
      reason: "No cached historical analog cases matched the current market state.",
      requestedSymbol,
      sourceSymbol: payload.symbol,
      source: source(payload.source),
      queryPath: "historical-analog-v2-cache",
      recordCountSearched: payload.search.candidateCount,
      stats: {
        totalCases: 0,
        avgReturn7d: null,
        avgReturn30d: null,
        successRate: null,
        dominantOutcome: payload.statistics.dominantOutcome,
      },
      diagnostics: {
        cacheStatus: "ready",
        generatedAt: result.manifest.generatedAt,
        source: result.manifest.source.id,
        schemaVersion: result.manifest.schemaVersion,
        analogCount: 0,
      },
    } satisfies DashboardHistoricalAnalogResponse)
  }

  const sevenDay = payload.statistics.byHorizon["7d"]
  return NextResponse.json({
    status: "available",
    requestedSymbol,
    sourceSymbol: payload.symbol,
    source: source(payload.source),
    queryPath: "historical-analog-v2-cache",
    currentDirection: payload.currentState.trendRegime === "uptrend"
      ? "bullish"
      : payload.currentState.trendRegime === "downtrend"
        ? "bearish"
        : "neutral",
    recordCountSearched: payload.search.candidateCount,
    similarCases: payload.cases.length,
    stats: {
      totalCases: payload.statistics.totalCases,
      avgReturn7d: sevenDay.averageReturn,
      avgReturn30d: null,
      successRate: sevenDay.winRate,
      dominantOutcome: payload.statistics.dominantOutcome,
    },
    match: {
      symbol: match.state.symbol,
      date: new Date(match.state.timestamp).toISOString().slice(0, 10),
      label: "Similar Market Setup",
      matchedConditions: [
        `${match.state.trendRegime} regime`,
        `${match.similarity.toFixed(1)}% similarity`,
      ],
      outcomeSummary: payload.statistics.dominantOutcome,
      outcomeStats: {
        found: payload.statistics.totalCases,
        avg7d: sevenDay.averageReturn,
        avg30d: null,
        successRate: sevenDay.winRate,
      },
    },
    alternatives: alternatives.slice(0, 3).map((item) => ({
      symbol: item.state.symbol,
      date: new Date(item.state.timestamp).toISOString().slice(0, 10),
      label: "Similar Market Setup",
      outcomeSummary: payload.statistics.dominantOutcome,
    })),
    diagnostics: {
      cacheStatus: "ready",
      generatedAt: result.manifest.generatedAt,
      source: result.manifest.source.id,
      schemaVersion: result.manifest.schemaVersion,
      analogCount: payload.cases.length,
    },
  } satisfies DashboardHistoricalAnalogResponse)
}
