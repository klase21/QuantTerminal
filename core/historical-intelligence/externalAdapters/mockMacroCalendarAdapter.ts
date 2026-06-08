import { normalizeMockHistoricalEvent } from "../historicalEventIngestionMapper"
import type {
  ExternalEventAdapter,
  ExternalEventFetchQuery,
  ExternalEventRawItem,
} from "../externalEventAdapterTypes"

const RAW_ITEMS: ExternalEventRawItem[] = [
  {
    id: "macro-cpi-upside-surprise",
    sourceType: "macro_calendar",
    title: "CPI upside surprise",
    timestamp: "2026-06-08T12:30:00.000Z",
    asset: "BTCUSDT",
    confidence: 82,
    payload: {
      eventCode: "CPI",
      actual: 3.4,
      consensus: 3.2,
      surprise: "hotter",
    },
  },
  {
    id: "macro-fomc-expected-hold",
    sourceType: "macro_calendar",
    title: "FOMC expected hold",
    timestamp: "2026-06-08T18:00:00.000Z",
    asset: "BTCUSDT",
    confidence: 76,
    payload: {
      eventCode: "FOMC",
      expectedDecision: "hold",
      shockLevel: "low",
    },
  },
  {
    id: "macro-nfp-labor-shock",
    sourceType: "macro_calendar",
    title: "NFP labor shock",
    timestamp: "2026-06-08T12:30:00.000Z",
    asset: "BTCUSDT",
    confidence: 71,
    payload: {
      eventCode: "NFP",
      payrollsActual: 285_000,
      payrollsConsensus: 185_000,
      surprise: "stronger labor",
    },
  },
]

function kindFor(rawItem: ExternalEventRawItem) {
  const code = String(rawItem.payload.eventCode ?? "").toLowerCase()
  if (code === "fomc") return "fomc"
  if (code === "nfp") return "nfp"
  return "cpi"
}

function filterItems(query?: ExternalEventFetchQuery) {
  const keyword = query?.keyword?.toLowerCase()
  const asset = query?.asset?.toLowerCase()
  return RAW_ITEMS.filter((item) => {
    if (keyword && !item.title.toLowerCase().includes(keyword)) return false
    if (asset && item.asset?.toLowerCase() !== asset) return false
    return true
  }).slice(0, query?.limit ?? RAW_ITEMS.length)
}

export const mockMacroCalendarAdapter: ExternalEventAdapter = {
  sourceType: "macro_calendar",
  sourceName: "Macro Calendar Mock Adapter",
  async fetchMock(query) {
    return {
      sourceType: "macro_calendar",
      sourceName: this.sourceName,
      rawItems: filterItems(query),
      warnings: ["Mock adapter only; no macro calendar request was made."],
    }
  },
  normalize(rawItem) {
    return {
      rawItem,
      normalized: normalizeMockHistoricalEvent({
        kind: kindFor(rawItem),
        timestamp: rawItem.timestamp,
        symbol: rawItem.asset,
        title: rawItem.title,
        summary: `Mock macro calendar item: ${String(rawItem.payload.surprise ?? rawItem.payload.expectedDecision ?? "scheduled event")}.`,
        value: rawItem.confidence,
        source: "macro_calendar",
        tags: ["macro_calendar", "macro", String(rawItem.payload.eventCode ?? "macro").toLowerCase()],
      }),
      warnings: ["Normalized from mock macro-calendar-shaped payload."],
    }
  },
  getHealth() {
    return {
      sourceType: "macro_calendar",
      sourceName: this.sourceName,
      status: "mock_ready",
      lastCheckedAt: "2026-06-08T00:00:00.000Z",
      message: "Mock macro calendar adapter is available without live calendar access.",
    }
  },
}
