import { normalizeMockHistoricalEvent } from "../historicalEventIngestionMapper"
import { mockPolymarketAdapter } from "./mockPolymarketAdapter"
import type {
  ExternalEventAdapter,
  ExternalEventFetchQuery,
  ExternalEventFetchResult,
  ExternalEventRawItem,
} from "../externalEventAdapterTypes"

const POLYMARKET_GAMMA_MARKETS_URL = "https://gamma-api.polymarket.com/markets"
const POLYMARKET_MARKET_URL = "https://polymarket.com/market"
const TIMEOUT_MS = 4500

type PolymarketMarket = {
  id?: string
  conditionId?: string
  question?: string
  slug?: string
  title?: string
  category?: string
  tags?: unknown
  active?: boolean
  closed?: boolean
  endDate?: string
  endDateIso?: string
  outcomes?: unknown
  outcomePrices?: unknown
  volume?: unknown
  volumeNum?: unknown
  liquidity?: unknown
  liquidityNum?: unknown
  lastTradePrice?: unknown
  bestBid?: unknown
  bestAsk?: unknown
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [value]
    } catch {
      return [value]
    }
  }
  return []
}

function inferAsset(market: PolymarketMarket, queryAsset?: string) {
  if (queryAsset) return queryAsset.toUpperCase()
  const text = `${market.question ?? ""} ${market.title ?? ""} ${market.category ?? ""}`.toLowerCase()
  if (text.includes("ethereum") || text.includes(" eth ")) return "ETHUSDT"
  if (text.includes("bitcoin") || text.includes(" btc ") || text.includes("crypto")) return "BTCUSDT"
  if (text.includes("solana") || text.includes(" sol ")) return "SOLUSDT"
  return "BTCUSDT"
}

function confidenceFrom(market: PolymarketMarket) {
  const volume = numberValue(market.volumeNum) ?? numberValue(market.volume) ?? 0
  const liquidity = numberValue(market.liquidityNum) ?? numberValue(market.liquidity) ?? 0
  const activeBoost = market.active && !market.closed ? 14 : 0
  const activityScore = Math.min(28, Math.round(Math.log10(Math.max(1, volume + liquidity)) * 5))
  return Math.min(88, Math.max(42, 46 + activeBoost + activityScore))
}

async function safeFetchJson(url: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Polymarket Gamma request failed with ${response.status}`)
    return (await response.json()) as unknown
  } finally {
    clearTimeout(timer)
  }
}

function marketToRawItem(market: PolymarketMarket, query?: ExternalEventFetchQuery): ExternalEventRawItem {
  const title = market.question ?? market.title ?? "Polymarket market"
  const slug = market.slug ?? market.id ?? market.conditionId ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const outcomes = arrayValue(market.outcomes)
  const outcomePrices = arrayValue(market.outcomePrices)

  return {
    id: `poly-live-${slug}`,
    sourceType: "polymarket",
    title,
    timestamp: market.endDateIso ?? market.endDate ?? "2026-06-08T00:00:00.000Z",
    asset: inferAsset(market, query?.asset),
    confidence: confidenceFrom(market),
    sourceUrl: `${POLYMARKET_MARKET_URL}/${slug}`,
    payload: {
      id: market.id,
      conditionId: market.conditionId,
      slug,
      category: market.category,
      tags: market.tags,
      active: market.active,
      closed: market.closed,
      endDate: market.endDateIso ?? market.endDate,
      outcomes,
      outcomePrices,
      volume: numberValue(market.volumeNum) ?? numberValue(market.volume),
      liquidity: numberValue(market.liquidityNum) ?? numberValue(market.liquidity),
      lastTradePrice: numberValue(market.lastTradePrice),
      bestBid: numberValue(market.bestBid),
      bestAsk: numberValue(market.bestAsk),
      sourceUrl: `${POLYMARKET_MARKET_URL}/${slug}`,
    },
  }
}

function keywordMatches(market: PolymarketMarket, keyword?: string) {
  if (!keyword?.trim()) return true
  const text = `${market.question ?? ""} ${market.title ?? ""} ${market.slug ?? ""} ${market.category ?? ""}`.toLowerCase()
  return text.includes(keyword.trim().toLowerCase())
}

export const polymarketLiveAdapter: ExternalEventAdapter = {
  sourceType: "polymarket",
  sourceName: "Polymarket Live-Capable Adapter",
  supportsLive: true,
  liveSourceUrl: POLYMARKET_GAMMA_MARKETS_URL,
  rateLimitNote: "Uses a small public Gamma /markets request with a local timeout; no API key or trading endpoint.",
  fetchMock(query) {
    return mockPolymarketAdapter.fetchMock(query)
  },
  async fetchLive(query) {
    const limit = Math.min(Math.max(query.limit ?? 5, 1), 10)
    const url = new URL(POLYMARKET_GAMMA_MARKETS_URL)
    url.searchParams.set("active", "true")
    url.searchParams.set("closed", "false")
    url.searchParams.set("limit", String(Math.max(limit * 2, 5)))

    try {
      const payload = await safeFetchJson(url.toString())
      const markets = Array.isArray(payload) ? (payload as PolymarketMarket[]) : []
      const rawItems = markets
        .filter((market) => keywordMatches(market, query.keyword))
        .map((market) => marketToRawItem(market, query))
        .slice(0, limit)

      return {
        sourceType: "polymarket",
        sourceName: this.sourceName,
        rawItems,
        warnings: [
          "Live Polymarket preview only; external market context and crowd expectation, not a trading signal.",
          rawItems.length ? "No persistence write occurred." : "No matching live markets were returned for this query.",
        ],
      }
    } catch (error) {
      return {
        sourceType: "polymarket",
        sourceName: this.sourceName,
        rawItems: [],
        warnings: [
          error instanceof Error ? error.message : "Polymarket live preview failed.",
          "Live fetch failure is contained to preview; no review item or persistence record was written.",
        ],
      }
    }
  },
  normalize(rawItem) {
    const prices = arrayValue(rawItem.payload.outcomePrices)
    const probability = numberValue(prices[0]) ?? numberValue(rawItem.payload.lastTradePrice) ?? rawItem.confidence
    const tags = [
      "polymarket",
      "prediction_market",
      "crowd_expectation",
      stringValue(rawItem.payload.category),
    ].filter((tag): tag is string => Boolean(tag))

    return {
      rawItem,
      normalized: normalizeMockHistoricalEvent({
        kind: "polymarket",
        timestamp: rawItem.timestamp,
        symbol: rawItem.asset,
        title: rawItem.title,
        summary: "Live Polymarket public market context. Treat as crowd expectation context, not a trading signal.",
        probability: probability > 1 ? probability : probability * 100,
        source: "polymarket-live",
        tags,
      }),
      warnings: [
        "Normalized from public Polymarket Gamma market data.",
        "Preview only - send to Review Queue before any persistence write.",
      ],
    }
  },
  getHealth() {
    return {
      sourceType: "polymarket",
      sourceName: this.sourceName,
      status: "mock_ready",
      lastCheckedAt: "2026-06-08T00:00:00.000Z",
      message: "Polymarket adapter supports mock preview and safe live public preview.",
      supportsLive: true,
      liveSourceUrl: POLYMARKET_GAMMA_MARKETS_URL,
      rateLimitNote: this.rateLimitNote,
    }
  },
}
