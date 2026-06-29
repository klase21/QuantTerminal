import { NextResponse } from "next/server"

import { getMarketMemory } from "@/core/historical-intelligence/marketMemoryEngine"
import type { MarketMemoryQuery } from "@/core/historical-intelligence/marketMemoryTypes"
import type { HistoricalReplayEventType } from "@/core/historical-intelligence/mockHistoricalIntelligenceRepository"
import { enforceNonProductionRouteIsolation } from "@/lib/runtime/nonProductionRouteIsolation"

const EVENT_TYPES = new Set<HistoricalReplayEventType>([
  "macro",
  "crypto_policy",
  "liquidity",
  "narrative_shock",
  "mixed",
])

function eventType(value: string | null): HistoricalReplayEventType | undefined {
  if (!value) return undefined
  return EVENT_TYPES.has(value as HistoricalReplayEventType) ? (value as HistoricalReplayEventType) : undefined
}

export async function GET(request: Request) {
  const isolationResponse = enforceNonProductionRouteIsolation(request)
  if (isolationResponse) return isolationResponse

  const { searchParams } = new URL(request.url)
  const requestedEventType = searchParams.get("eventType")

  if (requestedEventType && !eventType(requestedEventType)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported market memory event type",
      },
      { status: 400 },
    )
  }

  const query: MarketMemoryQuery = {
    caseId: searchParams.get("caseId") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
    eventType: eventType(requestedEventType),
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  }

  return NextResponse.json({
    ok: true,
    mode: "market-memory",
    data: getMarketMemory(query),
  })
}
