import { normalizeMockHistoricalEvent } from "../historicalEventIngestionMapper"
import type {
  ExternalEventAdapter,
  ExternalEventFetchQuery,
  ExternalEventRawItem,
} from "../externalEventAdapterTypes"

const RAW_ITEMS: ExternalEventRawItem[] = [
  {
    id: "etf-btc-spot-daily-inflow",
    sourceType: "etf_flow",
    title: "BTC spot ETF daily net inflow",
    timestamp: "2026-06-08T00:00:00.000Z",
    asset: "BTCUSDT",
    confidence: 78,
    payload: {
      product: "BTC spot ETF basket",
      netFlowUsd: 420_000_000,
      flowDirection: "inflow",
      issuerBreadth: "broad",
    },
  },
  {
    id: "etf-eth-spot-daily-outflow",
    sourceType: "etf_flow",
    title: "ETH spot ETF daily net outflow",
    timestamp: "2026-06-08T00:00:00.000Z",
    asset: "ETHUSDT",
    confidence: 72,
    payload: {
      product: "ETH spot ETF basket",
      netFlowUsd: -95_000_000,
      flowDirection: "outflow",
      issuerBreadth: "narrow",
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

export const mockEtfFlowAdapter: ExternalEventAdapter = {
  sourceType: "etf_flow",
  sourceName: "ETF Flow Mock Adapter",
  async fetchMock(query) {
    return {
      sourceType: "etf_flow",
      sourceName: this.sourceName,
      rawItems: filterItems(query),
      warnings: ["Mock adapter only; no ETF flow provider request was made."],
    }
  },
  normalize(rawItem) {
    return {
      rawItem,
      normalized: normalizeMockHistoricalEvent({
        kind: "etf_flow",
        timestamp: rawItem.timestamp,
        symbol: rawItem.asset,
        title: rawItem.title,
        summary: `Mock ETF flow: ${String(rawItem.payload.flowDirection ?? "unknown")} ${String(rawItem.payload.netFlowUsd ?? "")}.`,
        value: Number(rawItem.payload.netFlowUsd ?? rawItem.confidence),
        source: "etf_flow",
        tags: ["etf_flow", "flow", String(rawItem.payload.flowDirection ?? "unknown")],
      }),
      warnings: ["Normalized from mock ETF-flow-shaped payload."],
    }
  },
  getHealth() {
    return {
      sourceType: "etf_flow",
      sourceName: this.sourceName,
      status: "mock_ready",
      lastCheckedAt: "2026-06-08T00:00:00.000Z",
      message: "Mock ETF flow adapter is available without live provider access.",
    }
  },
}
