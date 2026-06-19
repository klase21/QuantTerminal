import { NextResponse } from "next/server"

import {
  REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
  replayOrderbookCacheIdentity,
  replayOrderbookWindow,
  type ReplayOrderbookCacheMetadata,
  type ReplayOrderbookCachePayload,
} from "@/core/replay/replayOrderbookCache"
import { consumeHistoricalCache } from "@/lib/historical-intelligence/cache/cacheFirst"

export const runtime = "nodejs"

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
}

function unavailableReason(state: string, reason: string) {
  if (state === "missing") return "Replay cache not generated."
  if (state === "corrupted") return "Replay orderbook cache is corrupted."
  if (state === "expired") return "Replay orderbook cache has expired."
  if (state === "version_mismatch") return "Replay orderbook cache schema is incompatible."
  if (state === "partial") return "Replay orderbook cache generation is incomplete."
  if (state === "generation_failed") return `Replay orderbook cache generation failed: ${reason}`
  return reason
}

function validLevel(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length >= 2
    && Number.isFinite(value[0])
    && Number.isFinite(value[1])
}

function validPayload(value: unknown): value is ReplayOrderbookCachePayload {
  if (!value || typeof value !== "object") return false
  const payload = value as Partial<ReplayOrderbookCachePayload>
  return (
    typeof payload.timestamp === "string"
    && Number.isFinite(payload.bestBid)
    && Number.isFinite(payload.bestAsk)
    && Number.isFinite(payload.spread)
    && Number.isFinite(payload.imbalance)
    && Number.isFinite(payload.bidLiquidity)
    && Number.isFinite(payload.askLiquidity)
    && Array.isArray(payload.bids)
    && Array.isArray(payload.asks)
    && payload.bids.every(validLevel)
    && payload.asks.every(validLevel)
    && payload.bids.length > 0
    && payload.asks.length > 0
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const exchange = (searchParams.get("exchange") ?? "").trim().toLowerCase()
  const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase()
  const date = searchParams.get("date") ?? ""
  const hour = Number(searchParams.get("hour"))

  if (!exchange || !symbol || !validDate(date) || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    return NextResponse.json({
      ok: false,
      reason: "Exchange, symbol, date, and hour are required.",
    }, { status: 400 })
  }

  const window = replayOrderbookWindow(date, hour)
  const result = await consumeHistoricalCache<ReplayOrderbookCachePayload, ReplayOrderbookCacheMetadata>({
    identity: replayOrderbookCacheIdentity({ exchange, symbol, date, hour }),
    expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
  })

  if (!result.ok) {
    const failureReason = "reason" in result ? result.reason : "Replay orderbook cache is unavailable."
    return NextResponse.json({
      ok: false,
      source: "replay-cache",
      exchange,
      symbol,
      window,
      trades: [],
      book: [],
      liquidations: [],
      funding: [],
      candles: [],
      diagnostics: {
        cache: {
          status: result.state,
          generatedAt: result.manifest?.generatedAt ?? null,
          source: result.manifest?.source.id ?? null,
          schemaVersion: result.manifest?.schemaVersion ?? REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
        },
        downloaded: [],
        unavailable: [{
          dataset: "orderbook",
          reason: unavailableReason(result.state, failureReason),
        }],
        errors: [],
      },
    })
  }

  if (!validPayload(result.data)) {
    return NextResponse.json({
      ok: false,
      source: "replay-cache",
      exchange,
      symbol,
      window,
      trades: [],
      book: [],
      liquidations: [],
      funding: [],
      candles: [],
      diagnostics: {
        cache: {
          status: "corrupted",
          generatedAt: result.manifest.generatedAt,
          source: result.manifest.source.id,
          schemaVersion: result.manifest.schemaVersion,
        },
        downloaded: [],
        unavailable: [{
          dataset: "orderbook",
          reason: "Replay orderbook cache is corrupted.",
        }],
        errors: [],
      },
    })
  }

  return NextResponse.json({
    ok: true,
    source: "replay-cache",
    exchange,
    symbol,
    window,
    trades: [],
    book: [{
      timestamp: result.data.timestamp,
      bids: result.data.bids,
      asks: result.data.asks,
    }],
    liquidations: [],
    funding: [],
    candles: [],
    diagnostics: {
      cache: {
        status: "ready",
        generatedAt: result.manifest.generatedAt,
        source: result.manifest.source.id,
        schemaVersion: result.manifest.schemaVersion,
      },
      downloaded: [],
      unavailable: [],
      errors: [],
    },
  })
}
