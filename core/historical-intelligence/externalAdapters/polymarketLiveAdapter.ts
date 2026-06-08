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

type ParsedMarketStatus = "active" | "closed" | "inactive" | "unknown"

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function asMarket(value: unknown): PolymarketMarket | null {
  if (!isObject(value)) return null
  return value as PolymarketMarket
}

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return fallback
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true
    if (value.toLowerCase() === "false") return false
  }
  return undefined
}

function dateValue(value: unknown) {
  const raw = stringValue(value)
  if (!raw) return undefined
  const time = Date.parse(raw)
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined
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

function parseOutcomes(value: unknown) {
  return arrayValue(value).map((label) => label.trim()).filter(Boolean)
}

function parseProbabilities(value: unknown) {
  return arrayValue(value)
    .map((item) => numberValue(item))
    .filter((item): item is number => item !== undefined)
    .map((item) => (item > 1 ? item / 100 : item))
    .filter((item) => item >= 0 && item <= 1)
}

function parseActivity(market: PolymarketMarket) {
  return {
    volume: numberValue(market.volumeNum) ?? numberValue(market.volume),
    liquidity: numberValue(market.liquidityNum) ?? numberValue(market.liquidity),
  }
}

function marketStatus(market: PolymarketMarket): ParsedMarketStatus {
  const active = booleanValue(market.active)
  const closed = booleanValue(market.closed)
  if (closed === true) return "closed"
  if (active === true) return "active"
  if (active === false) return "inactive"
  return "unknown"
}

function inferAsset(market: PolymarketMarket, queryAsset?: string) {
  if (queryAsset?.trim()) return queryAsset.trim().toUpperCase()
  const text = `${market.question ?? ""} ${market.title ?? ""} ${market.category ?? ""}`.toLowerCase()
  if (text.includes("ethereum") || text.includes(" eth ")) return "ETHUSDT"
  if (text.includes("bitcoin") || text.includes(" btc ") || text.includes("crypto")) return "BTCUSDT"
  if (text.includes("solana") || text.includes(" sol ")) return "SOLUSDT"
  return "BTCUSDT"
}

function confidenceFrom(market: PolymarketMarket) {
  const { volume = 0, liquidity = 0 } = parseActivity(market)
  const status = marketStatus(market)
  const activeBoost = status === "active" ? 14 : status === "closed" ? -10 : 0
  const probabilityBoost = parseProbabilities(market.outcomePrices).length ? 8 : -4
  const activityScore = Math.min(28, Math.round(Math.log10(Math.max(1, volume + liquidity)) * 5))
  return Math.min(88, Math.max(32, 44 + activeBoost + probabilityBoost + activityScore))
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96)
}

function deterministicDedupeKey(market: PolymarketMarket, title: string) {
  return (
    stringValue(market.conditionId) ||
    stringValue(market.id) ||
    stringValue(market.slug) ||
    `${slugify(title)}-${dateValue(market.endDateIso ?? market.endDate) ?? "no-date"}`
  )
}

function sourceUrl(slugOrId: string) {
  return slugOrId ? `${POLYMARKET_MARKET_URL}/${slugOrId}` : POLYMARKET_MARKET_URL
}

function fieldWarnings(market: PolymarketMarket, outcomes: string[], probabilities: number[]) {
  const warnings: string[] = []
  if (!stringValue(market.question) && !stringValue(market.title)) warnings.push("Missing market question/title.")
  if (!stringValue(market.slug) && !stringValue(market.id) && !stringValue(market.conditionId)) {
    warnings.push("Missing slug/id/conditionId; generated deterministic fallback key.")
  }
  if (!outcomes.length) warnings.push("Missing or unparseable outcomes.")
  if (!probabilities.length) warnings.push("Missing or unparseable outcome probabilities.")
  if (marketStatus(market) === "unknown") warnings.push("Missing active/closed market status.")
  return warnings
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
  const title = stringValue(market.question) || stringValue(market.title) || "Untitled Polymarket market"
  const slug = stringValue(market.slug) || slugify(title)
  const dedupeKey = deterministicDedupeKey(market, title)
  const outcomes = parseOutcomes(market.outcomes)
  const outcomePrices = parseProbabilities(market.outcomePrices)
  const status = marketStatus(market)
  const { volume, liquidity } = parseActivity(market)
  const warnings = fieldWarnings(market, outcomes, outcomePrices)

  return {
    id: `poly-live-${dedupeKey}`,
    sourceType: "polymarket",
    title,
    timestamp: dateValue(market.endDateIso ?? market.endDate) ?? "2026-06-08T00:00:00.000Z",
    asset: inferAsset(market, query?.asset),
    confidence: confidenceFrom(market),
    sourceUrl: sourceUrl(slug),
    payload: {
      provider: "polymarket-gamma",
      id: stringValue(market.id) || undefined,
      conditionId: stringValue(market.conditionId) || undefined,
      slug,
      dedupeKey,
      category: stringValue(market.category) || undefined,
      tags: arrayValue(market.tags),
      status,
      active: status === "active",
      closed: status === "closed",
      endDate: dateValue(market.endDateIso ?? market.endDate),
      outcomes,
      outcomePrices,
      volume,
      liquidity,
      lastTradePrice: numberValue(market.lastTradePrice),
      bestBid: numberValue(market.bestBid),
      bestAsk: numberValue(market.bestAsk),
      warningCount: warnings.length,
      warnings,
      sourceUrl: sourceUrl(slug),
      normalizedMetadata: {
        marketStatus: status,
        hasProbabilities: outcomePrices.length > 0,
        hasActivity: Boolean(volume || liquidity),
        caveat: "Crowd expectation context only; not a trading signal.",
      },
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
      const markets = Array.isArray(payload)
        ? payload.map(asMarket).filter((market): market is PolymarketMarket => Boolean(market))
        : []
      const rawItems = markets
        .filter((market) => keywordMatches(market, query.keyword))
        .map((market) => marketToRawItem(market, query))
        .slice(0, limit)
      const schemaWarnings = rawItems.flatMap((item) => arrayValue(item.payload.warnings)).slice(0, 5)

      return {
        sourceType: "polymarket",
        sourceName: this.sourceName,
        rawItems,
        warnings: [
          "Live Polymarket preview only; external market context and crowd expectation, not a trading signal.",
          ...schemaWarnings,
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
    const prices = parseProbabilities(rawItem.payload.outcomePrices)
    const probability = prices[0] ?? numberValue(rawItem.payload.lastTradePrice) ?? rawItem.confidence / 100
    const tags = [
      "polymarket",
      "prediction_market",
      "crowd_expectation",
      stringValue(rawItem.payload.category) || undefined,
      ...arrayValue(rawItem.payload.tags).slice(0, 4),
    ].filter((tag): tag is string => Boolean(tag))
    const schemaWarnings = arrayValue(rawItem.payload.warnings)

    return {
      rawItem,
      normalized: normalizeMockHistoricalEvent({
        kind: "polymarket",
        timestamp: rawItem.timestamp,
        symbol: rawItem.asset,
        title: rawItem.title,
        summary: `Live Polymarket public market context. Status: ${stringValue(rawItem.payload.status, "unknown")}. Treat as crowd expectation context, not a trading signal.`,
        probability: probability > 1 ? probability : probability * 100,
        source: "polymarket-live",
        tags,
      }),
      warnings: [
        "Normalized from public Polymarket Gamma market data.",
        ...schemaWarnings,
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
