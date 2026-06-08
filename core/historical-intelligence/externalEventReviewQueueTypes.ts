import type { DecisionRecord } from "./decisionRecordTypes"
import type { ExternalEventSourceType } from "./externalEventAdapterTypes"
import type { EventRecord } from "./eventRecordTypes"
import type { HistoricalNormalizedIngestionEvent } from "./historicalEventIngestionTypes"
import type { MemoryRecord } from "./historicalRecordTypes"
import type { PlaybookRecord } from "./playbookRecordTypes"

export type ExternalEventReviewStatus = "pending" | "accepted" | "rejected" | "ignored"

export interface ExternalEventReviewItem {
  id: string
  externalRawId: string
  sourceType: ExternalEventSourceType
  sourceName: string
  rawTitle: string
  normalizedEvent: HistoricalNormalizedIngestionEvent
  candidates: {
    event: HistoricalNormalizedIngestionEvent["event"]
    memory?: HistoricalNormalizedIngestionEvent["memoryCandidate"]
    decision?: HistoricalNormalizedIngestionEvent["decisionCandidate"]
    playbook?: HistoricalNormalizedIngestionEvent["playbookCandidate"]
  }
  confidence: number
  status: ExternalEventReviewStatus
  createdAt: string
  reviewedAt?: string
  reviewerNote?: string
  warnings?: string[]
  writtenRecords?: {
    event?: EventRecord
    memory?: MemoryRecord
    decision?: DecisionRecord
    playbook?: PlaybookRecord
  }
}

export interface ExternalEventReviewDecision {
  id: string
  action: "accept" | "reject" | "ignore"
  note?: string
}

export interface ExternalEventReviewQueueQuery {
  status?: ExternalEventReviewStatus
  sourceType?: ExternalEventSourceType
  limit?: number
}

export interface ExternalEventReviewQueueResult {
  items: ExternalEventReviewItem[]
  count: number
  pendingCount: number
}
