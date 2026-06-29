import { NextResponse } from "next/server"

import {
  getAllReplayCases,
  getReplayCaseById,
  getReplayCasesByEventType,
  type HistoricalReplayEventType,
} from "@/core/historical-intelligence/mockHistoricalIntelligenceRepository"
import { enforceNonProductionRouteIsolation } from "@/lib/runtime/nonProductionRouteIsolation"

const REPLAY_EVENT_TYPES = new Set<HistoricalReplayEventType>([
  "macro",
  "crypto_policy",
  "liquidity",
  "narrative_shock",
  "mixed",
])

function isReplayEventType(value: string): value is HistoricalReplayEventType {
  return REPLAY_EVENT_TYPES.has(value as HistoricalReplayEventType)
}

export async function GET(request: Request) {
  const isolationResponse = enforceNonProductionRouteIsolation(request)
  if (isolationResponse) return isolationResponse

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const eventType = searchParams.get("eventType")

  if (id) {
    const replayCase = getReplayCaseById(id)

    if (!replayCase) {
      return NextResponse.json(
        {
          ok: false,
          error: "Replay case not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      mode: "case",
      data: replayCase,
    })
  }

  if (eventType) {
    if (!isReplayEventType(eventType)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported replay event type",
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      ok: true,
      mode: "eventType",
      data: getReplayCasesByEventType(eventType),
    })
  }

  return NextResponse.json({
    ok: true,
    mode: "all",
    data: getAllReplayCases(),
  })
}
