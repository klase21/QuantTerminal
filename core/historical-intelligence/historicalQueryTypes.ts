import type { DecisionRecord } from "./decisionRecordTypes"
import type { EventRecord } from "./eventRecordTypes"
import type { MemoryRecord, ReplayCaseRecord, ReplayCaseRecordEventType } from "./historicalRecordTypes"
import type { PlaybookRecord } from "./playbookRecordTypes"

export interface HistoricalIntelligenceQuery {
  keyword?: string
  caseId?: string
  eventType?: ReplayCaseRecordEventType
  asset?: string
  narrative?: string
  tag?: string
  limit?: number
}

export interface HistoricalQuerySummary {
  confidence: number
  readability: "narrow" | "focused" | "broad" | "empty"
  matchedSignals: string[]
  summary: string
}

export interface HistoricalQueryResult {
  query: HistoricalIntelligenceQuery
  replayCases: ReplayCaseRecord[]
  relatedEvents: EventRecord[]
  relatedMemories: MemoryRecord[]
  relatedDecisions: DecisionRecord[]
  relatedPlaybooks: PlaybookRecord[]
  summary: HistoricalQuerySummary
}
