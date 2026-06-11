import { NextResponse } from "next/server"

import { listMarketOutcomes } from "@/lib/historical-data/localHistoricalStore"
import { parseTags, summarizeOutcomes } from "@/lib/research/marketOutcomeAnalytics"
import type { HistoricalInterval, MarketOutcome } from "@/types/historical"

export const dynamic = "force-dynamic"
export const revalidate = 0

function dateFromTimestamp(value: number) {
  return new Date(value).toISOString().slice(0, 10)
}

function matches(value: string | null, candidate?: string) {
  return !value || candidate === value
}

function setupContext(outcome: MarketOutcome) {
  return [
    outcome.direction,
    outcome.momentumState,
    outcome.breakoutState,
    outcome.volatilityState,
    ...parseTags(outcome.narrativeTagsJson),
    outcome.liquidityState !== "unknown" ? outcome.liquidityState : null,
    outcome.sectorRotationState !== "unknown" ? outcome.sectorRotationState : null,
  ].filter((item): item is string => Boolean(item)).slice(0, 4)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const interval = (searchParams.get("interval") || "1h") as HistoricalInterval
  const symbol = searchParams.get("symbol")
  const direction = searchParams.get("direction")
  const narrative = searchParams.get("narrative")
  const breakoutState = searchParams.get("breakoutState")
  const momentumState = searchParams.get("momentumState")
  const liquidityState = searchParams.get("liquidityState")
  const outcomes = (await listMarketOutcomes(interval)).filter((outcome) => {
    if (!matches(symbol, outcome.symbol)) return false
    if (!matches(direction, outcome.direction)) return false
    if (!matches(breakoutState, outcome.breakoutState)) return false
    if (!matches(momentumState, outcome.momentumState)) return false
    if (!matches(liquidityState, outcome.liquidityState)) return false
    if (narrative && !parseTags(outcome.narrativeTagsJson).includes(narrative)) return false
    return true
  })
  const summary = summarizeOutcomes(outcomes)
  const grouped = new Map<string, MarketOutcome[]>()
  outcomes.forEach((outcome) => {
    const key = `${outcome.symbol}:${dateFromTimestamp(outcome.timestamp)}:${outcome.setupKey}`
    grouped.set(key, [...(grouped.get(key) ?? []), outcome])
  })

  return NextResponse.json({
    ...summary,
    setups: [...grouped.values()].slice(0, 100).map((items) => {
      const [first] = items
      const itemSummary = summarizeOutcomes(items)
      return {
        symbol: first.symbol,
        date: dateFromTimestamp(first.timestamp),
        direction: first.direction,
        matchedContexts: setupContext(first),
        avgReturn7d: itemSummary.avgReturn7d,
        avgReturn30d: itemSummary.avgReturn30d,
        dominantOutcome: itemSummary.dominantOutcome,
      }
    }),
  })
}
