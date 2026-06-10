import type { InformationItem, InformationNarrative } from "./informationTypes"
import type { InformationIntelligenceDigestItem } from "./informationScoringEngine"

export type InformationReviewSuggestedAction = "promote_to_event" | "promote_to_memory" | "watch_only" | "reject"
export type InformationReviewStatus = "pending" | "accepted" | "rejected" | "ignored"

export interface InformationEventCandidate {
  title: string
  summary: string
  symbol?: string
  source: string
  confidence: number
  tags: string[]
  occurredAt: string
}

export interface InformationMemoryCandidate {
  title: string
  summary: string
  memoryType: "narrative" | "source_reliability" | "attention_spike" | "impact_candidate"
  confidence: number
  tags: string[]
}

export interface InformationNarrativeCandidate {
  label: string
  stage: InformationNarrative["stage"]
  summary: string
  confidence: number
  narrativeTags: string[]
}

export interface InformationReviewCandidates {
  event?: InformationEventCandidate
  memory?: InformationMemoryCandidate
  narrative?: InformationNarrativeCandidate
}

export interface InformationReviewItem {
  id: string
  informationItem: InformationItem
  scoringResult: InformationIntelligenceDigestItem
  suggestedAction: InformationReviewSuggestedAction
  status: InformationReviewStatus
  reviewerNote?: string
  candidates: InformationReviewCandidates
  createdAt: string
  reviewedAt?: string
}

export interface InformationReviewQueueQuery {
  status?: InformationReviewStatus
  limit?: number
}

export interface InformationReviewQueueResult {
  items: InformationReviewItem[]
  count: number
  pendingCount: number
}

export interface InformationReviewDecision {
  id: string
  action: "accept" | "reject" | "ignore"
  suggestedAction?: InformationReviewSuggestedAction
  note?: string
}

