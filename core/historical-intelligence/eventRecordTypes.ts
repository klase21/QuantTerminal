import type {
  HistoricalEventCategory,
  HistoricalEventImpact,
  HistoricalEventNarrative,
  HistoricalEventSeverity,
  HistoricalEventVenue,
} from "./historicalIntelligenceTypes"
import type { HistoricalRecordAudit, HistoricalRecordStatus } from "./historicalRecordTypes"

export type EventRecordReliability = "unverified" | "single_source" | "confirmed" | "derived"
export type EventRecordImpactDirection = "bullish" | "bearish" | "mixed" | "neutral"

export interface EventRecord {
  id: string
  timestamp: string
  category: HistoricalEventCategory
  symbol?: string
  venue?: HistoricalEventVenue
  sourceId: string
  title: string
  summary: string
  severity: HistoricalEventSeverity
  confidence: number
  reliability: EventRecordReliability
  data: Record<string, unknown>
  tags: string[]
  relatedCaseIds: string[]
  relatedMemoryIds?: string[]
  sourceUrl?: string
  impact?: HistoricalEventImpact
  narrative?: HistoricalEventNarrative
  status: HistoricalRecordStatus
  audit: HistoricalRecordAudit
}

export interface EventRelationshipRecord {
  id: string
  sourceEventId: string
  targetEventId: string
  relationship:
    | "caused"
    | "supported"
    | "contradicted"
    | "followed"
    | "same_cluster"
    | "expectation_signal"
    | "outcome_signal"
  strength: number
  explanation: string
  audit: HistoricalRecordAudit
}

export interface EventImpactRecord {
  id: string
  eventId: string
  symbol: string
  direction: EventRecordImpactDirection
  expectedMovePct?: number
  realizedMovePct?: number
  expectedWindow: "minutes" | "hours" | "days" | "weeks"
  realizedWindow?: string
  tacticalRead: string
  confidence: number
  audit: HistoricalRecordAudit
}
