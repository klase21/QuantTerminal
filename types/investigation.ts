import type { InvestigationThesis } from "@/types/investigationThesis"

export const INVESTIGATION_CONTEXT_VERSION = 1

export type InvestigationTimeframe = "1m" | "3m" | "5m" | "15m" | "1h" | "4h" | "1d"

export type InvestigationExchange = "binance_futures" | "binance_spot" | string

export type InvestigationType =
  | "market_state"
  | "historical_analog"
  | "historical_case"
  | "event_impact"
  | "market_memory"
  | "replay"

export interface InvestigationReplayWindow {
  exchange: InvestigationExchange
  symbol: string
  date: string
  hour: string
}

export interface InvestigationHistoricalCase {
  id: string
  symbol: string
  timeframe: InvestigationTimeframe
  timestamp: string
  source?: string
  exchange?: InvestigationExchange
}

export interface InvestigationEvent {
  id: string
  timestamp: string
  category?: string
  source?: string
}

export interface InvestigationContext {
  contextVersion: typeof INVESTIGATION_CONTEXT_VERSION
  symbol: string
  exchange: InvestigationExchange
  timeframe: InvestigationTimeframe
  investigationTimestamp: string
  investigationType?: InvestigationType
  source?: string
  selectedHistoricalCase?: InvestigationHistoricalCase
  selectedReplayWindow?: InvestigationReplayWindow
  selectedEvent?: InvestigationEvent
  thesis?: InvestigationThesis
}
