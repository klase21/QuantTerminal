import type { HistoricalNormalizedIngestionEvent } from "./historicalEventIngestionTypes"

export type ExternalEventSourceType =
  | "polymarket"
  | "kalshi"
  | "etf_flow"
  | "macro_calendar"
  | "token_unlock"
  | "exchange_listing"
  | "regulatory"

export interface ExternalEventFetchQuery {
  keyword?: string
  asset?: string
  limit?: number
}

export interface ExternalEventRawItem {
  id: string
  sourceType: ExternalEventSourceType
  title: string
  timestamp: string
  asset?: string
  confidence: number
  sourceUrl?: string
  payload: Record<string, unknown>
}

export interface ExternalEventNormalizationResult {
  rawItem: ExternalEventRawItem
  normalized: HistoricalNormalizedIngestionEvent
  warnings: string[]
}

export interface ExternalEventFetchResult {
  sourceType: ExternalEventSourceType
  sourceName: string
  rawItems: ExternalEventRawItem[]
  warnings: string[]
}

export interface ExternalEventAdapterHealth {
  sourceType: ExternalEventSourceType
  sourceName: string
  status: "mock_ready" | "disabled" | "error"
  lastCheckedAt: string
  message: string
  supportsLive?: boolean
  liveSourceUrl?: string
  rateLimitNote?: string
}

export interface ExternalEventAdapter {
  sourceType: ExternalEventSourceType
  sourceName: string
  supportsLive?: boolean
  liveSourceUrl?: string
  rateLimitNote?: string
  fetchMock(query?: ExternalEventFetchQuery): Promise<ExternalEventFetchResult>
  fetchLive?(query: ExternalEventFetchQuery): Promise<ExternalEventFetchResult>
  normalize(rawItem: ExternalEventRawItem): ExternalEventNormalizationResult
  getHealth(): ExternalEventAdapterHealth
}
