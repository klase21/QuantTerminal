import { normalizeMockHistoricalEvent } from "../historicalEventIngestionMapper"
import type {
  ExternalEventAdapter,
  ExternalEventFetchQuery,
  ExternalEventRawItem,
} from "../externalEventAdapterTypes"

const RAW_ITEMS: ExternalEventRawItem[] = [
  {
    id: "poly-btc-etf-inflow-continuation",
    sourceType: "polymarket",
    title: "BTC ETF inflow continuation odds",
    timestamp: "2026-06-08T00:00:00.000Z",
    asset: "BTCUSDT",
    confidence: 74,
    payload: {
      marketSlug: "btc-etf-inflow-continuation",
      impliedProbability: 64,
      probabilityChange24h: 7,
      crowdExpectation: "continued inflow",
    },
  },
  {
    id: "poly-fed-rate-cut-timing",
    sourceType: "polymarket",
    title: "Fed rate cut timing repricing",
    timestamp: "2026-06-08T00:00:00.000Z",
    asset: "BTCUSDT",
    confidence: 69,
    payload: {
      marketSlug: "fed-rate-cut-timing",
      impliedProbability: 52,
      probabilityChange24h: -5,
      crowdExpectation: "later cut",
    },
  },
  {
    id: "poly-crypto-regulation-outcome",
    sourceType: "polymarket",
    title: "US crypto regulation outcome",
    timestamp: "2026-06-08T00:00:00.000Z",
    asset: "BTCUSDT",
    confidence: 61,
    payload: {
      marketSlug: "crypto-regulation-outcome",
      impliedProbability: 43,
      probabilityChange24h: 4,
      crowdExpectation: "policy uncertainty",
    },
  },
]

function filterItems(query?: ExternalEventFetchQuery) {
  const keyword = query?.keyword?.toLowerCase()
  const asset = query?.asset?.toLowerCase()
  return RAW_ITEMS.filter((item) => {
    if (keyword && !item.title.toLowerCase().includes(keyword)) return false
    if (asset && item.asset?.toLowerCase() !== asset) return false
    return true
  }).slice(0, query?.limit ?? RAW_ITEMS.length)
}

export const mockPolymarketAdapter: ExternalEventAdapter = {
  sourceType: "polymarket",
  sourceName: "Polymarket Mock Adapter",
  async fetchMock(query) {
    return {
      sourceType: "polymarket",
      sourceName: this.sourceName,
      rawItems: filterItems(query),
      warnings: ["Mock adapter only; no Polymarket network request was made."],
    }
  },
  normalize(rawItem) {
    return {
      rawItem,
      normalized: normalizeMockHistoricalEvent({
        kind: "polymarket",
        timestamp: rawItem.timestamp,
        symbol: rawItem.asset,
        title: rawItem.title,
        summary: `Mock Polymarket expectation context: ${String(rawItem.payload.crowdExpectation ?? "unknown")}.`,
        probability: Number(rawItem.payload.impliedProbability ?? rawItem.confidence),
        source: "polymarket",
        tags: ["polymarket", "prediction_market", "expectation"],
      }),
      warnings: ["Normalized from mock Polymarket-shaped payload."],
    }
  },
  getHealth() {
    return {
      sourceType: "polymarket",
      sourceName: this.sourceName,
      status: "mock_ready",
      lastCheckedAt: "2026-06-08T00:00:00.000Z",
      message: "Mock Polymarket adapter is available without live API access.",
    }
  },
}
