import { NextResponse } from "next/server"

import { getPredictionMarkets } from "@/lib/data-sources/polymarketClient"
import {
  createSourceDegraded,
  createSourceSuccess,
  createSourceUnavailable,
  normalizeSourceMetadata,
} from "@/lib/data-governance/envelope"
import { evaluateFreshness } from "@/lib/data-governance/freshnessPolicy"

export const dynamic = "force-dynamic"
export const revalidate = 0

function category(title: string) {
  const text = title.toLowerCase()
  if (text.includes("btc") || text.includes("bitcoin")) return "Bitcoin"
  if (text.includes("eth") || text.includes("ethereum")) return "Ethereum"
  if (text.includes("fed") || text.includes("rate")) return "Rates"
  if (text.includes("recession")) return "Macro"
  if (text.includes("inflation")) return "Macro"
  if (text.includes("etf")) return "ETF"
  return "Crypto/Macro"
}

export async function GET() {
  const payload = await getPredictionMarkets()
  const sourceTimestamps = payload.marketEvents
    .map((market) => market.lastUpdated)
    .filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)))
  const lastUpdatedAt = sourceTimestamps.length === payload.marketEvents.length && sourceTimestamps.length
    ? sourceTimestamps.reduce((oldest, value) => Date.parse(value) < Date.parse(oldest) ? value : oldest)
    : null
  const freshness = evaluateFreshness({
    sourceId: "prediction-markets",
    lastUpdatedAt,
    retrievedAt: payload.updatedAt,
  })
  const responsePayload = {
    status: payload.marketEvents.length ? "available" : "unavailable",
    source: payload.source,
    updatedAt: payload.updatedAt,
    markets: payload.marketEvents.map((market, index) => ({
      title: market.title,
      probability: market.probability,
      volume: market.volume,
      liquidity: market.liquidity,
      lastUpdated: market.lastUpdated,
      category: category(market.title),
      attentionRank: index + 1,
    })),
    diagnostics: payload.diagnostics,
  }
  const sourceResult = payload.marketEvents.length
    ? freshness.status === "UNAVAILABLE"
      ? createSourceDegraded("prediction-markets", responsePayload, "PARTIAL_DATA", undefined, {
          freshnessStatus: freshness.status,
          qualityLevel: "LOW",
          lastUpdatedAt,
          retrievedAt: payload.updatedAt,
          cacheStatus: "BYPASS",
        })
      : freshness.status === "STALE" || freshness.status === "EXPIRED"
        ? createSourceDegraded("prediction-markets", responsePayload, "STALE_DATA", undefined, {
            freshnessStatus: freshness.status,
            qualityLevel: "LOW",
            lastUpdatedAt,
            retrievedAt: payload.updatedAt,
            cacheStatus: "BYPASS",
          })
        : createSourceSuccess("prediction-markets", responsePayload, {
            freshnessStatus: freshness.status,
            qualityLevel: "MEDIUM",
            lastUpdatedAt,
            retrievedAt: payload.updatedAt,
            cacheStatus: "BYPASS",
          })
    : createSourceUnavailable(
        "prediction-markets",
        payload.unavailableReason === "NO MEANINGFUL MARKET INTEREST"
          ? "EMPTY_RESPONSE"
          : "SOURCE_UNAVAILABLE",
      )
  const sourceMetadata = sourceResult.status === "UNAVAILABLE"
    ? normalizeSourceMetadata("prediction-markets", {
        freshnessStatus: sourceResult.metadata.freshnessStatus,
        qualityLevel: sourceResult.metadata.qualityLevel,
        sourceStatus: sourceResult.metadata.sourceStatus,
        lastUpdatedAt,
        retrievedAt: payload.updatedAt,
        unavailableReason: sourceResult.metadata.unavailableReason,
        cacheStatus: sourceResult.metadata.cacheStatus,
      })
    : sourceResult.metadata

  return NextResponse.json({
    ...responsePayload,
    _source: sourceMetadata,
  })
}
