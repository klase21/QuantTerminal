import type { DecisionRecord } from "./decisionRecordTypes"
import type { EventRecord } from "./eventRecordTypes"
import type { MemoryRecord } from "./historicalRecordTypes"
import type { PlaybookRecord } from "./playbookRecordTypes"

export type HistoricalMockIngestionKind =
  | "etf_flow"
  | "cpi"
  | "fomc"
  | "nfp"
  | "polymarket"
  | "kalshi"
  | "token_unlock"
  | "exchange_listing"
  | "regulatory_event"

export interface HistoricalRawMockEvent {
  kind: HistoricalMockIngestionKind
  timestamp?: string
  symbol?: string
  title?: string
  summary?: string
  value?: number
  probability?: number
  source?: string
  tags?: string[]
}

export interface HistoricalNormalizedIngestionEvent {
  sourceKind: HistoricalMockIngestionKind
  event: Omit<EventRecord, "id">
  memoryCandidate?: Omit<MemoryRecord, "id">
  decisionCandidate?: Omit<DecisionRecord, "id">
  playbookCandidate?: Omit<PlaybookRecord, "id">
}

export interface HistoricalIngestionResult {
  ok: true
  sourceKind: HistoricalMockIngestionKind
  event: EventRecord
  memory?: MemoryRecord
  decision?: DecisionRecord
  playbook?: PlaybookRecord
}
