import { NextResponse } from "next/server"

import { HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION } from "@/core/historical-intelligence/analog-v2/historicalAnalogCache"
import {
  createEvidenceValidity,
  historicalAnalogEvidenceValidity,
} from "@/core/evidence-validity"
import { readHistoricalAnalogCacheV2 } from "@/lib/historical-intelligence/analog-v2/readHistoricalAnalogCache"
import type { HistoricalInterval } from "@/types/historical"

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get("symbol") ?? "BTCUSDT").trim().toUpperCase()
  const intervalValue = searchParams.get("interval") ?? "1h"
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") ?? 25) || 25))
  if (!validInterval(intervalValue)) {
    return NextResponse.json({
      status: "unavailable",
      reason: "Unsupported interval.",
      totalCandidates: 0,
      analogs: [],
    })
  }

  const result = await readHistoricalAnalogCacheV2({ symbol, interval: intervalValue })
  if (!result.ok) {
    const reason = "reason" in result ? result.reason : "Historical Analog V2 cache unavailable."
    const validity = createEvidenceValidity({
      observedAt: null,
      generatedAt: result.manifest?.generatedAt ?? new Date(0).toISOString(),
      expiresAt: result.manifest?.expiresAt,
      coverageStatus: "UNAVAILABLE",
      reason,
    })
    return NextResponse.json({
      status: "unavailable",
      reason: unavailableReason(result.state, reason),
      validity,
      totalCandidates: 0,
      analogs: [],
      diagnostics: {
        cacheStatus: result.state,
        generatedAt: result.manifest?.generatedAt ?? null,
        schemaVersion: result.manifest?.schemaVersion ?? HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
        analogCount: 0,
        validity,
      },
    })
  }

  const validity = historicalAnalogEvidenceValidity({
    payload: result.data,
    generatedAt: result.manifest.generatedAt,
    expiresAt: result.manifest.expiresAt,
  })
  const sevenDay = result.data.statistics.byHorizon["7d"]
  const analogs = result.data.cases.slice(0, limit).map((item) => ({
    symbol: item.state.symbol,
    matchedSymbol: item.state.symbol,
    date: new Date(item.state.timestamp).toISOString().slice(0, 10),
    matchedContexts: [
      `${item.state.trendRegime} regime`,
      `${item.similarity.toFixed(1)}% similarity`,
    ],
    avgReturn7d: item.outcome.returns["7d"],
    avgReturn30d: null,
    successRate: sevenDay.winRate,
    dominantOutcome: result.data.statistics.dominantOutcome,
  }))

  return NextResponse.json({
    status: analogs.length ? "available" : "unavailable",
    reason: analogs.length ? undefined : "No cached historical analog cases matched the current market state.",
    totalCandidates: result.data.search.candidateCount,
    analogs,
    validity,
    diagnostics: {
      cacheStatus: "ready",
      generatedAt: result.manifest.generatedAt,
      schemaVersion: result.manifest.schemaVersion,
      analogCount: result.data.cases.length,
      validity,
    },
  })
}
