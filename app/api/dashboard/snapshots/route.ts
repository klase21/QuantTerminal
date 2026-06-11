import { NextResponse } from "next/server"

import { recordDashboardSnapshot } from "@/lib/historical-data/localHistoricalStore"
import type { DashboardMarketStateSnapshot } from "@/types/historical"

export const dynamic = "force-dynamic"
export const revalidate = 0

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function asNarrativeHeat(value: unknown): DashboardMarketStateSnapshot["narrativeHeat"] {
  return value === "very_hot" || value === "hot" || value === "neutral" || value === "quiet" ? value : "unknown"
}

function asSectorRotationState(value: unknown): DashboardMarketStateSnapshot["sectorRotationState"] {
  return value === "improving" || value === "weakening" || value === "mixed" ? value : "unknown"
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid dashboard snapshot." }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const symbol = typeof record.symbol === "string" ? record.symbol : "BTCUSDT"
  const direction = record.direction === "bullish" || record.direction === "bearish" || record.direction === "neutral" ? record.direction : "neutral"
  const now = new Date().toISOString()
  const snapshot: DashboardMarketStateSnapshot = {
    id: `dashboard:${symbol}:${Date.now()}`,
    timestamp: typeof record.timestamp === "string" ? record.timestamp : now,
    symbol,
    direction,
    confidence: typeof record.confidence === "number" && Number.isFinite(record.confidence) ? record.confidence : null,
    bullFactors: typeof record.bullFactors === "number" ? record.bullFactors : 0,
    bearFactors: typeof record.bearFactors === "number" ? record.bearFactors : 0,
    driversJson: JSON.stringify(asStringArray(record.drivers)),
    liquidityState: record.liquidityState === "improving" || record.liquidityState === "weakening" || record.liquidityState === "stable" ? record.liquidityState : "unknown",
    narrativesJson: JSON.stringify(asStringArray(record.narratives)),
    narrativeHeat: asNarrativeHeat(record.narrativeHeat),
    dominantNarrative: typeof record.dominantNarrative === "string" ? record.dominantNarrative : null,
    sectorRotationState: asSectorRotationState(record.sectorRotationState),
    predictionState: record.predictionState === "bullish" || record.predictionState === "bearish" || record.predictionState === "neutral" ? record.predictionState : "unknown",
    etfFlowState: record.etfFlowState === "positive" || record.etfFlowState === "negative" || record.etfFlowState === "neutral" ? record.etfFlowState : "unknown",
    createdAt: now,
  }

  await recordDashboardSnapshot(snapshot)
  return NextResponse.json({ ok: true, snapshot })
}
