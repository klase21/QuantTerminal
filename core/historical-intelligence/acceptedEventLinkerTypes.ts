export type AcceptedEventLinkType = "replay_case" | "memory" | "decision" | "playbook" | "outcome"

export type AcceptedEventRelationship =
  | "same_asset"
  | "same_narrative"
  | "same_event_type"
  | "causal_candidate"
  | "historical_analog"
  | "playbook_candidate"

export type AcceptedEventLinkCandidateStatus = "pending" | "accepted" | "rejected"

export interface AcceptedEventLink {
  id: string
  acceptedReviewItemId: string
  sourceEventId: string
  targetType: AcceptedEventLinkType
  targetId: string
  targetTitle: string
  relationship: AcceptedEventRelationship
  confidence: number
  rationale: string
  createdAt: string
}

export interface AcceptedEventLinkCandidate extends AcceptedEventLink {
  candidateId: string
  status: AcceptedEventLinkCandidateStatus
  reviewedAt?: string
}

export interface AcceptedEventLinkResult {
  links: AcceptedEventLink[]
  count: number
}

export interface AcceptedEventLinkSummary {
  acceptedReviewItemId: string
  sourceEventId?: string
  candidateCount: number
  acceptedLinkCount: number
  warning?: string
}

export interface AcceptedEventLinkCandidateQuery {
  reviewItemId?: string
  status?: AcceptedEventLinkCandidateStatus
  limit?: number
}

export interface AcceptedEventLinkListQuery {
  sourceEventId?: string
  targetType?: AcceptedEventLinkType
  limit?: number
}
