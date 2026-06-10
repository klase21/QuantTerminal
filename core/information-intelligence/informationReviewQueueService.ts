import {
  getInformationIntelligenceDigest,
  scoreInformationItem,
  type InformationIntelligenceDigestItem,
} from "./informationScoringEngine"
import { getMockInformationItem, listMockInformationItems, type InformationRepositoryQuery } from "./mockInformationRepository"
import type { InformationItem } from "./informationTypes"
import type {
  InformationReviewCandidates,
  InformationReviewQueueQuery,
  InformationReviewQueueResult,
  InformationReviewStatus,
  InformationReviewSuggestedAction,
  InformationReviewItem,
} from "./informationReviewQueueTypes"

const NOW = "2026-06-08T00:00:00.000Z"
const reviewItems: InformationReviewItem[] = []

function clone<T>(value: T): T {
  return structuredClone(value)
}

function reviewId(itemId: string) {
  return `info-review-${itemId}`.replace(/[^a-zA-Z0-9_-]/g, "-")
}

function pendingCount() {
  return reviewItems.filter((item) => item.status === "pending").length
}

function queueResult(items: InformationReviewItem[]): InformationReviewQueueResult {
  return {
    items: items.map(clone),
    count: items.length,
    pendingCount: pendingCount(),
  }
}

function suggestedAction(score: InformationIntelligenceDigestItem): InformationReviewSuggestedAction {
  if (score.reliabilityScore < 40 && score.attentionScore >= 70) return "watch_only"
  if (score.compositeScore >= 72 && score.impactScore >= 65 && score.reliabilityScore >= 60) return "promote_to_event"
  if (score.narrativeScore >= 62 || score.noveltyScore >= 70) return "promote_to_memory"
  if (score.compositeScore < 35) return "reject"
  return "watch_only"
}

function narrativeStage(score: InformationIntelligenceDigestItem) {
  return score.score.narrative.narrativeStage
}

function candidatesFrom(item: InformationItem, score: InformationIntelligenceDigestItem): InformationReviewCandidates {
  const tags = [...new Set([...item.assetTags, ...item.narrativeTags, ...item.topicTags])]
  const action = suggestedAction(score)

  return {
    event: action === "promote_to_event"
      ? {
          title: item.title,
          summary: item.summary,
          symbol: item.symbol,
          source: item.source.displayName,
          confidence: score.reliabilityScore,
          tags,
          occurredAt: item.publishedAt,
        }
      : undefined,
    memory: action === "promote_to_memory" || action === "promote_to_event"
      ? {
          title: `Memory candidate: ${item.title}`,
          summary: score.tacticalRead,
          memoryType: score.attentionScore >= 70 ? "attention_spike" : score.impactScore >= 65 ? "impact_candidate" : "narrative",
          confidence: score.compositeScore,
          tags,
        }
      : undefined,
    narrative: item.narrativeTags.length
      ? {
          label: item.narrativeTags[0]!.replace(/_/g, " "),
          stage: narrativeStage(score),
          summary: item.summary,
          confidence: score.narrativeScore,
          narrativeTags: item.narrativeTags,
        }
      : undefined,
  }
}

function makeReviewItem(item: InformationItem): InformationReviewItem {
  const score = scoreInformationItem(item)
  const scoringResult: InformationIntelligenceDigestItem = {
    itemId: item.id,
    title: item.title,
    source: item.source.displayName,
    reliabilityScore: score.reliability.value,
    attentionScore: score.attention.value,
    narrativeScore: score.narrative.value,
    impactScore: score.impact.value,
    noveltyScore: score.novelty.value,
    compositeScore: score.value,
    tacticalRead: score.attention.value >= 75 && score.reliability.value < 45
      ? "Viral but weakly verified. Watch spread, but require corroboration before treating it as market intelligence."
      : score.impact.value >= 70 && score.reliability.value >= 65
        ? "High-impact candidate with enough reliability to monitor closely in event intelligence."
        : "Context signal. Keep in the information layer until reliability, attention, or impact improves.",
    caveat: item.source.category === "social"
      ? "Social information is noisy and can spread before verification."
      : "Mock scoring only. No live source connection or external API used.",
    score,
  }
  const action = suggestedAction(scoringResult)

  return {
    id: reviewId(item.id),
    informationItem: item,
    scoringResult,
    suggestedAction: action,
    status: "pending",
    candidates: candidatesFrom(item, scoringResult),
    createdAt: NOW,
  }
}

function updateStatus(id: string, status: InformationReviewStatus, note?: string) {
  const item = reviewItems.find((candidate) => candidate.id === id)
  if (!item) return null
  item.status = status
  item.reviewedAt = NOW
  item.reviewerNote = note
  return clone(item)
}

export function enqueueTopScoredItems(query: InformationRepositoryQuery = {}): InformationReviewQueueResult {
  const digest = getInformationIntelligenceDigest(query)
  const sourceItems = listMockInformationItems({ ...query, limit: undefined })
  const sourceById = new Map(sourceItems.map((item) => [item.id, item]))
  const inserted: InformationReviewItem[] = []

  digest.items.slice(0, query.limit ?? 5).forEach((score) => {
    const item = getMockInformationItem(score.itemId) ?? sourceById.get(score.itemId)
    if (!item) return
    const id = reviewId(item.id)
    const existing = reviewItems.find((candidate) => candidate.id === id)
    if (existing) {
      inserted.push(existing)
      return
    }
    const reviewItem = makeReviewItem(item)
    reviewItems.push(reviewItem)
    inserted.push(reviewItem)
  })

  return queueResult(inserted)
}

export function listInformationReviewItems(query: InformationReviewQueueQuery = {}): InformationReviewQueueResult {
  const filtered = reviewItems
    .filter((item) => !query.status || item.status === query.status)
    .slice(0, query.limit ?? reviewItems.length)

  return queueResult(filtered)
}

export function acceptInformationReviewItem(id: string, _action?: InformationReviewSuggestedAction, note?: string) {
  return updateStatus(id, "accepted", note)
}

export function rejectInformationReviewItem(id: string, note?: string) {
  return updateStatus(id, "rejected", note)
}

export function ignoreInformationReviewItem(id: string, note?: string) {
  return updateStatus(id, "ignored", note)
}

