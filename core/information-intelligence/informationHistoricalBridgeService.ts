import { listInformationReviewItems } from "./informationReviewQueueService"
import type { InformationItem } from "./informationTypes"
import type {
  BridgedHistoricalEventCandidate,
  BridgedHistoricalMemoryCandidate,
  BridgedHistoricalNarrativeCandidate,
  InformationHistoricalBridgeNextAction,
  InformationHistoricalBridgePreview,
} from "./informationHistoricalBridgeTypes"
import type { InformationReviewItem } from "./informationReviewQueueTypes"

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function tagsFrom(item: InformationItem) {
  return unique([...item.assetTags, ...item.narrativeTags, ...item.topicTags, item.symbol ?? ""])
}

function severityFrom(reviewItem: InformationReviewItem): BridgedHistoricalEventCandidate["severity"] {
  if (reviewItem.scoringResult.impactScore >= 75 || reviewItem.scoringResult.compositeScore >= 82) return "high"
  if (reviewItem.scoringResult.impactScore >= 55 || reviewItem.scoringResult.compositeScore >= 60) return "medium"
  return "low"
}

function categoryFrom(item: InformationItem): BridgedHistoricalEventCandidate["category"] {
  if (item.source.category === "prediction_market") return "prediction_market"
  if (item.source.category === "macro") return "macro"
  if (item.narrativeTags.length) return "narrative"
  return "news"
}

function recommendedAction(reviewItem: InformationReviewItem): InformationHistoricalBridgeNextAction {
  if (reviewItem.status !== "accepted") return "watch_only"
  if (reviewItem.suggestedAction === "reject") return "reject"
  if (reviewItem.suggestedAction === "watch_only") return "watch_only"
  if (reviewItem.scoringResult.compositeScore >= 78 && reviewItem.scoringResult.reliabilityScore >= 62) {
    return "create_event_manually"
  }
  return "send_to_external_review"
}

export function convertToEventCandidate(reviewItem: InformationReviewItem): BridgedHistoricalEventCandidate | undefined {
  if (reviewItem.suggestedAction !== "promote_to_event") return undefined
  const item = reviewItem.informationItem

  return {
    title: item.title,
    summary: item.summary,
    category: categoryFrom(item),
    symbol: item.symbol,
    sourceId: item.source.id,
    sourceName: item.source.displayName,
    sourceUrl: item.sourceUrl ?? item.source.sourceUrl,
    timestamp: item.publishedAt,
    confidence: Math.round((reviewItem.scoringResult.reliabilityScore + reviewItem.scoringResult.impactScore) / 2),
    severity: severityFrom(reviewItem),
    tags: tagsFrom(item),
    data: {
      informationItemId: item.id,
      reviewItemId: reviewItem.id,
      compositeScore: reviewItem.scoringResult.compositeScore,
      attentionScore: reviewItem.scoringResult.attentionScore,
      noveltyScore: reviewItem.scoringResult.noveltyScore,
      bridgeMode: "preview_only",
    },
  }
}

export function convertToMemoryCandidate(reviewItem: InformationReviewItem): BridgedHistoricalMemoryCandidate | undefined {
  if (reviewItem.suggestedAction === "reject" || reviewItem.scoringResult.compositeScore < 45) return undefined
  const item = reviewItem.informationItem
  const memoryType: BridgedHistoricalMemoryCandidate["memoryType"] =
    reviewItem.scoringResult.narrativeScore >= 65
      ? "tactical_takeaway"
      : reviewItem.scoringResult.attentionScore >= 70
        ? "similar_event_cluster"
        : "expectation_context"

  return {
    title: `Information memory: ${item.title}`,
    summary: reviewItem.scoringResult.tacticalRead,
    memoryType,
    confidence: reviewItem.scoringResult.compositeScore,
    tags: tagsFrom(item),
    sourceIds: [item.source.id],
    data: {
      informationItemId: item.id,
      reviewItemId: reviewItem.id,
      sourceCategory: item.source.category,
      caveat: reviewItem.scoringResult.caveat,
      bridgeMode: "preview_only",
    },
  }
}

export function convertToNarrativeCandidate(reviewItem: InformationReviewItem): BridgedHistoricalNarrativeCandidate | undefined {
  const item = reviewItem.informationItem
  if (!item.narrativeTags.length) return undefined

  return {
    label: item.narrativeTags[0]!.replace(/_/g, " "),
    summary: item.summary,
    stage: reviewItem.scoringResult.score.narrative.narrativeStage,
    confidence: reviewItem.scoringResult.narrativeScore,
    tags: item.narrativeTags,
    sourceIds: [item.source.id],
  }
}

export function previewHistoricalCandidates(reviewItemId: string): InformationHistoricalBridgePreview | null {
  const reviewItem = listInformationReviewItems({ limit: 100 }).items.find((item) => item.id === reviewItemId)
  if (!reviewItem) return null

  const eventCandidate = convertToEventCandidate(reviewItem)
  const memoryCandidate = convertToMemoryCandidate(reviewItem)
  const narrativeCandidate = convertToNarrativeCandidate(reviewItem)
  const suggestedHistoricalTags = tagsFrom(reviewItem.informationItem)
  const suggestedConfidence = Math.round(
    (reviewItem.scoringResult.compositeScore + reviewItem.scoringResult.reliabilityScore + reviewItem.scoringResult.impactScore) / 3,
  )

  return {
    reviewItemId,
    reviewItemStatus: reviewItem.status,
    sourceTitle: reviewItem.informationItem.title,
    sourceName: reviewItem.informationItem.source.displayName,
    scoring: reviewItem.scoringResult,
    eventCandidate,
    memoryCandidate,
    narrativeCandidate,
    suggestedHistoricalTags,
    suggestedConfidence,
    bridgeCaveat:
      reviewItem.status === "accepted"
        ? "Preview only. This bridge does not write to Historical Intelligence persistence."
        : "Review item is not accepted yet. Treat converted candidates as watch-only context.",
    recommendedNextAction: recommendedAction(reviewItem),
  }
}

