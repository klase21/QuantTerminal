import type { InformationReviewItem } from "./informationReviewQueueTypes"

export type InformationHistoricalBridgeNextAction =
  | "send_to_external_review"
  | "create_event_manually"
  | "watch_only"
  | "reject"

export interface BridgedHistoricalEventCandidate {
  title: string
  summary: string
  category: "news" | "narrative" | "prediction_market" | "macro"
  symbol?: string
  sourceId: string
  sourceName: string
  sourceUrl?: string
  timestamp: string
  confidence: number
  severity: "low" | "medium" | "high"
  tags: string[]
  data: Record<string, unknown>
}

export interface BridgedHistoricalMemoryCandidate {
  title: string
  summary: string
  memoryType: "expectation_context" | "similar_event_cluster" | "setup_pattern" | "tactical_takeaway"
  confidence: number
  tags: string[]
  sourceIds: string[]
  data: Record<string, unknown>
}

export interface BridgedHistoricalNarrativeCandidate {
  label: string
  summary: string
  stage: "emerging" | "growing" | "dominant" | "declining" | "dead"
  confidence: number
  tags: string[]
  sourceIds: string[]
}

export interface InformationHistoricalBridgePreview {
  reviewItemId: string
  reviewItemStatus: InformationReviewItem["status"]
  sourceTitle: string
  sourceName: string
  scoring: InformationReviewItem["scoringResult"]
  eventCandidate?: BridgedHistoricalEventCandidate
  memoryCandidate?: BridgedHistoricalMemoryCandidate
  narrativeCandidate?: BridgedHistoricalNarrativeCandidate
  suggestedHistoricalTags: string[]
  suggestedConfidence: number
  bridgeCaveat: string
  recommendedNextAction: InformationHistoricalBridgeNextAction
}

