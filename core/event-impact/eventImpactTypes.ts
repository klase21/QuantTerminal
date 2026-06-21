import type { VerifiedEventCategory, VerifiedEventSource } from "@/core/event-catalog"
import type { EvidenceValidity } from "@/core/evidence-validity"

export const EVENT_IMPACT_SCHEMA_VERSION = 1

export const EVENT_IMPACT_HORIZONS = ["1h", "4h", "24h", "7d"] as const
export type EventImpactHorizon = typeof EVENT_IMPACT_HORIZONS[number]

export interface EventImpactHorizonOutcome {
  return: number | null
  available: boolean
}

export interface EventImpactEventOutcome {
  eventId: string
  category: VerifiedEventCategory
  eventTimestamp: string
  symbol: string
  exchange: string
  source: VerifiedEventSource
  outcomes: Record<EventImpactHorizon, EventImpactHorizonOutcome>
}

export interface EventImpactCaseReference {
  eventId: string
  eventTimestamp: string
  symbol: string
  exchange: string
  return: number
}

export interface EventImpactHorizonStatistics {
  sampleCount: number
  averageReturn: number | null
  medianReturn: number | null
  winRate: number | null
  bestCase: EventImpactCaseReference | null
  worstCase: EventImpactCaseReference | null
}

export interface EventImpactStatistics {
  byHorizon: Record<EventImpactHorizon, EventImpactHorizonStatistics>
}

export interface EventImpactSourceMetadata {
  eventCatalog: string
  marketData: string[]
  generatedAt: string
}

export interface EventImpactResult {
  schemaVersion: typeof EVENT_IMPACT_SCHEMA_VERSION
  ok: boolean
  status: "available" | "unavailable"
  reason?: string
  query: {
    eventId?: string
    category?: VerifiedEventCategory
    symbol?: string
    exchange?: string
  }
  events: Array<{
    eventId: string
    title: string
    category: VerifiedEventCategory
    timestamp: string
    source: VerifiedEventSource
  }>
  outcomes: EventImpactEventOutcome[]
  statistics: EventImpactStatistics
  sampleCount: number
  source: EventImpactSourceMetadata
  validity?: EvidenceValidity
}

export interface EventImpactReaderOptions {
  symbol?: string
  exchange?: string
}

export interface EventImpactReader {
  getByEventId(eventId: string, options?: EventImpactReaderOptions): Promise<EventImpactResult>
  getByCategory(category: VerifiedEventCategory, options?: EventImpactReaderOptions): Promise<EventImpactResult>
}
