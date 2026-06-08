import { NextResponse } from "next/server"

import { queryHistoricalIntelligence } from "@/core/historical-intelligence/historicalQueryEngine"
import type { HistoricalIntelligenceQuery } from "@/core/historical-intelligence/historicalQueryTypes"
import type { ReplayCaseRecordEventType } from "@/core/historical-intelligence/historicalRecordTypes"

const EVENT_TYPES = new Set<ReplayCaseRecordEventType>(["macro", "crypto_policy", "liquidity", "narrative_shock", "mixed"])

function eventTypeFrom(value: string | null): ReplayCaseRecordEventType | undefined {
  if (!value) return undefined
  return EVENT_TYPES.has(value as ReplayCaseRecordEventType) ? (value as ReplayCaseRecordEventType) : undefined
}

function limitFrom(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedEventType = searchParams.get("eventType")
  const eventType = eventTypeFrom(requestedEventType)

  if (requestedEventType && !eventType) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported historical intelligence event type",
      },
      { status: 400 },
    )
  }

  const query: HistoricalIntelligenceQuery = {
    keyword: searchParams.get("keyword") ?? undefined,
    caseId: searchParams.get("caseId") ?? undefined,
    eventType,
    asset: searchParams.get("asset") ?? undefined,
    narrative: searchParams.get("narrative") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    limit: limitFrom(searchParams.get("limit")),
  }

  return NextResponse.json({
    ok: true,
    mode: "historical-intelligence-query",
    data: await queryHistoricalIntelligence(query),
  })
}
