import { NextResponse } from "next/server"

import { latestDashboardSnapshot, listHistoricalSnapshotsByInterval, listMarketOutcomes } from "@/lib/historical-data/localHistoricalStore"
import { buildCurrentMarketState } from "@/lib/historical-analog/buildCurrentMarketState"
import { filterHistoricalAnalogCandidates, findSimilarMarketStates } from "@/lib/historical-analog/findSimilarMarketStates"
import { aggregateMarketMemory } from "@/lib/market-memory/aggregateMarketMemory"
import { enrichWeakDashboardSnapshot } from "@/lib/market-memory/currentStateEnrichment"
import { scoreOpportunity, type ScannerSignalInput } from "@/lib/scanner/opportunityScoring"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function fetchJson<T>(origin: string, path: string): Promise<T | null> {
  try {
    const response = await fetch(`${origin}${path}`, { cache: "no-store" })
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  }
}

function direction(signal: ScannerSignalInput) {
  if (signal.direction === "LONG") return "Bullish"
  if (signal.direction === "SHORT") return "Bearish"
  return "Neutral"
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  const [movers, narratives, rotation, futures] = await Promise.all([
    fetchJson<any>(origin, "/api/market/movers"),
    fetchJson<any>(origin, "/api/narratives?range=24h"),
    fetchJson<any>(origin, "/api/market/sector-rotation"),
    fetchJson<any>(origin, "/api/market/futures-intelligence"),
  ])
  const candidates: ScannerSignalInput[] = [
    ...(movers?.focusCandidate ? [movers.focusCandidate] : []),
    ...(Array.isArray(movers?.candidates) ? movers.candidates : []),
  ].filter((item): item is ScannerSignalInput => Boolean(item?.symbol))
  const firstSymbol = candidates[0]?.symbol ?? "BTCUSDT"
  const dashboardSnapshot = await latestDashboardSnapshot(firstSymbol)
  const current = dashboardSnapshot
    ? buildCurrentMarketState(await enrichWeakDashboardSnapshot(dashboardSnapshot, origin))
    : null
  const historicalSnapshots = filterHistoricalAnalogCandidates(await listHistoricalSnapshotsByInterval("1h"))
  const marketOutcomes = await listMarketOutcomes("1h")
  const aggregation = current ? aggregateMarketMemory(current, historicalSnapshots, marketOutcomes) : null
  const historicalResult = current ? findSimilarMarketStates(current, historicalSnapshots) : null
  const context = {
    narrativeHot: Array.isArray(narratives?.heatmap) && Number(narratives.heatmap[0]?.total ?? 0) >= 120,
    sectorRotationImproving: Array.isArray(rotation?.sectors) && rotation.sectors.some((sector: any) => sector.direction === "INFLOW"),
    leverageRiskElevated: Array.isArray(futures?.sectors) && futures.sectors.some((sector: any) => Number(sector.leveragePressure ?? 0) >= 70),
    historicalAvailable: Boolean(historicalResult?.matches?.length),
    marketMemoryStats: aggregation?.stats,
  }
  const seen = new Set<string>()
  const opportunities = candidates
    .filter((candidate) => {
      const key = `${candidate.symbol}:${candidate.setup ?? ""}:${candidate.score ?? ""}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((candidate) => {
      const scored = scoreOpportunity(candidate, context)
      return {
        symbol: candidate.symbol,
        score: scored.score,
        setup: candidate.setup ?? candidate.trigger ?? "Live Market Signal",
        direction: direction(candidate),
        confidence: candidate.confidence ?? String(candidate.score ?? ""),
        historicalSupport: scored.historicalSupport,
        priority: scored.priority,
      }
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 25)

  return NextResponse.json(opportunities)
}
