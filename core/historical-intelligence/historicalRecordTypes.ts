import type {
  HistoricalEventCategory,
  HistoricalEventImpact,
  HistoricalEventNarrative,
  HistoricalEventSeverity,
  HistoricalEventVenue,
} from "./historicalIntelligenceTypes"
import type {
  ReplayAgentSummary,
  ReplayExpectationSnapshot,
  ReplayMarketSnapshot,
  ReplayNarrativeSnapshot,
  ReplayRiskSnapshot,
  ReplayVerdict,
} from "@/core/replay/replayTypes"

export type HistoricalRecordStatus = "draft" | "active" | "archived"
export type HistoricalRecordSourceKind = "mock" | "manual" | "provider" | "derived" | "system"
export type ReplayCaseRecordEventType = "macro" | "crypto_policy" | "liquidity" | "narrative_shock" | "mixed"
export type ReplayCaseRecordShockLevel = "low" | "medium" | "high"

export interface HistoricalRecordAudit {
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  schemaVersion: number
}

export interface HistoricalRecordSource {
  id: string
  kind: HistoricalRecordSourceKind
  name: string
  provider?: string
  providerEventId?: string
  url?: string
  capturedAt?: string
  confidence?: number
}

export interface ReplayCaseRecord {
  id: string
  title: string
  symbol: string
  assetClass: "crypto" | "macro" | "equity" | "rates" | "fx" | "commodity" | "mixed"
  timeframe: string
  eventWindow: {
    start: string
    peak?: string
    end: string
  }
  eventType: ReplayCaseRecordEventType
  shockLevel: ReplayCaseRecordShockLevel
  setup: string
  outcome: string
  verdict: ReplayVerdict
  verdictSummary: string
  realityCheck: string
  narrativeClaim: string
  tags: string[]
  sourceIds: string[]
  relatedEventIds: string[]
  relatedDecisionIds?: string[]
  relatedOutcomeIds?: string[]
  status: HistoricalRecordStatus
  audit: HistoricalRecordAudit
}

export interface ReplayFrameRecord {
  id: string
  caseId: string
  index: number
  timestamp: string
  label: string
  eventIds: string[]
  market: ReplayMarketSnapshot
  expectation: ReplayExpectationSnapshot
  narrative: ReplayNarrativeSnapshot
  risk: ReplayRiskSnapshot
  agents: ReplayAgentSummary[]
  sourceIds: string[]
  audit: HistoricalRecordAudit
}

export interface MemoryRecord {
  id: string
  caseId?: string
  eventIds: string[]
  memoryType:
    | "market_regime"
    | "similar_event_cluster"
    | "setup_pattern"
    | "agent_reliability"
    | "expectation_context"
    | "tactical_takeaway"
  title: string
  summary: string
  confidence: number
  tags: string[]
  data: Record<string, unknown>
  sourceIds: string[]
  status: HistoricalRecordStatus
  audit: HistoricalRecordAudit
}

export interface HistoricalSourceRecord extends HistoricalRecordSource {
  audit: HistoricalRecordAudit
}

export interface HistoricalEventRecordShape {
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
  data: Record<string, unknown>
  tags: string[]
  relatedCaseIds: string[]
  impact?: HistoricalEventImpact
  narrative?: HistoricalEventNarrative
  status: HistoricalRecordStatus
  audit: HistoricalRecordAudit
}
