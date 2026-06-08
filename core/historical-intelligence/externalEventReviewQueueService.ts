import { previewExternalEventAdapter } from "./externalEventAdapterRegistry"
import type { ExternalEventFetchQuery, ExternalEventSourceType } from "./externalEventAdapterTypes"
import {
  createDecision,
  createEvent,
  createMemory,
  createPlaybook,
} from "./historicalPersistenceWriteService"
import type {
  ExternalEventReviewItem,
  ExternalEventReviewQueueQuery,
  ExternalEventReviewQueueResult,
  ExternalEventReviewStatus,
} from "./externalEventReviewQueueTypes"

const NOW = "2026-06-08T00:00:00.000Z"
const reviewItems: ExternalEventReviewItem[] = []

function itemId(sourceType: ExternalEventSourceType, rawId: string) {
  return `review-${sourceType}-${rawId}`.replace(/[^a-zA-Z0-9_-]/g, "-")
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function pendingCount() {
  return reviewItems.filter((item) => item.status === "pending").length
}

function queueResult(items: ExternalEventReviewItem[]): ExternalEventReviewQueueResult {
  return {
    items: items.map(clone),
    count: items.length,
    pendingCount: pendingCount(),
  }
}

function updateStatus(id: string, status: ExternalEventReviewStatus, note?: string) {
  const item = reviewItems.find((candidate) => candidate.id === id)
  if (!item) return null
  item.status = status
  item.reviewedAt = NOW
  item.reviewerNote = note
  return item
}

export async function enqueueFromAdapterPreview(
  sourceType: ExternalEventSourceType,
  query?: ExternalEventFetchQuery,
): Promise<ExternalEventReviewQueueResult> {
  const preview = await previewExternalEventAdapter(sourceType, query)
  if (!preview) return queueResult([])

  const inserted: ExternalEventReviewItem[] = []

  preview.normalizedCandidates.forEach((candidate) => {
    const id = itemId(sourceType, candidate.rawItem.id)
    const existing = reviewItems.find((item) => item.id === id)
    if (existing) {
      inserted.push(existing)
      return
    }

    const item: ExternalEventReviewItem = {
      id,
      externalRawId: candidate.rawItem.id,
      sourceType,
      sourceName: preview.health.sourceName,
      rawTitle: candidate.rawItem.title,
      normalizedEvent: candidate.normalized,
      candidates: {
        event: candidate.normalized.event,
        memory: candidate.normalized.memoryCandidate,
        decision: candidate.normalized.decisionCandidate,
        playbook: candidate.normalized.playbookCandidate,
      },
      confidence: candidate.normalized.event.confidence,
      status: "pending",
      createdAt: NOW,
      warnings: [...preview.warnings, ...candidate.warnings],
    }

    reviewItems.push(item)
    inserted.push(item)
  })

  return queueResult(inserted)
}

export function listReviewItems(query: ExternalEventReviewQueueQuery = {}): ExternalEventReviewQueueResult {
  const filtered = reviewItems
    .filter((item) => !query.status || item.status === query.status)
    .filter((item) => !query.sourceType || item.sourceType === query.sourceType)
    .slice(0, query.limit ?? reviewItems.length)

  return queueResult(filtered)
}

export function getReviewItem(id: string) {
  const item = reviewItems.find((candidate) => candidate.id === id)
  return item ? clone(item) : null
}

export async function acceptReviewItem(id: string, note?: string) {
  const item = reviewItems.find((candidate) => candidate.id === id)
  if (!item) return null
  if (item.status !== "pending") return clone(item)

  const event = await createEvent(item.candidates.event)
  const memory = item.candidates.memory
    ? await createMemory({
        ...item.candidates.memory,
        eventIds: [event.id],
      })
    : undefined
  const decision = item.candidates.decision ? await createDecision(item.candidates.decision) : undefined
  const playbook = item.candidates.playbook ? await createPlaybook(item.candidates.playbook) : undefined

  item.writtenRecords = { event, memory, decision, playbook }
  updateStatus(id, "accepted", note)
  return clone(item)
}

export function rejectReviewItem(id: string, note?: string) {
  const item = updateStatus(id, "rejected", note)
  return item ? clone(item) : null
}

export function ignoreReviewItem(id: string, note?: string) {
  const item = updateStatus(id, "ignored", note)
  return item ? clone(item) : null
}
