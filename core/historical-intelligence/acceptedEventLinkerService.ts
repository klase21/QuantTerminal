import { getReviewItem } from "./externalEventReviewQueueService"
import { mockHistoricalPersistenceRepository } from "./mockHistoricalPersistenceRepository"
import type {
  AcceptedEventLink,
  AcceptedEventLinkCandidate,
  AcceptedEventLinkCandidateQuery,
  AcceptedEventLinkListQuery,
  AcceptedEventLinkType,
  AcceptedEventRelationship,
} from "./acceptedEventLinkerTypes"

type TargetRecord = {
  id: string
  targetType: AcceptedEventLinkType
  title: string
  symbol?: string
  tags?: string[]
  text: string
}

const NOW = "2026-06-08T00:00:00.000Z"
const linkCandidates: AcceptedEventLinkCandidate[] = []
const acceptedLinks: AcceptedEventLink[] = []

function clone<T>(value: T): T {
  return structuredClone(value)
}

function normalized(value?: string) {
  return value?.toLowerCase() ?? ""
}

function overlap(left: string[] = [], right: string[] = []) {
  const rightSet = new Set(right.map(normalized))
  return left.filter((item) => rightSet.has(normalized(item)))
}

function candidateId(reviewItemId: string, targetType: AcceptedEventLinkType, targetId: string) {
  return `candidate-${reviewItemId}-${targetType}-${targetId}`.replace(/[^a-zA-Z0-9_-]/g, "-")
}

function relationshipFor(targetType: AcceptedEventLinkType, scoreParts: string[]): AcceptedEventRelationship {
  if (targetType === "playbook") return "playbook_candidate"
  if (scoreParts.includes("event_type")) return "same_event_type"
  if (scoreParts.includes("tags")) return "same_narrative"
  if (scoreParts.includes("asset")) return "same_asset"
  if (targetType === "replay_case") return "historical_analog"
  return "causal_candidate"
}

function titleFrom(record: { title?: string; setup?: string; actualOutcome?: string; decision?: string; outcome?: string }) {
  return record.title ?? record.setup ?? record.actualOutcome ?? record.outcome ?? record.decision ?? "Untitled target"
}

async function targetRecords(): Promise<TargetRecord[]> {
  const [cases, memories, decisions, outcomes, playbooks] = await Promise.all([
    mockHistoricalPersistenceRepository.replayCases.list(),
    mockHistoricalPersistenceRepository.memories.list(),
    mockHistoricalPersistenceRepository.decisions.list(),
    mockHistoricalPersistenceRepository.outcomes.list(),
    mockHistoricalPersistenceRepository.playbooks.list(),
  ])

  return [
    ...cases.records.map((record) => ({
      id: record.id,
      targetType: "replay_case" as const,
      title: record.title,
      symbol: record.symbol,
      tags: record.tags,
      text: `${record.title} ${record.setup} ${record.outcome} ${record.narrativeClaim} ${record.tags.join(" ")}`,
    })),
    ...memories.records.map((record) => ({
      id: record.id,
      targetType: "memory" as const,
      title: record.title,
      tags: record.tags,
      text: `${record.title} ${record.summary} ${record.tags.join(" ")}`,
    })),
    ...decisions.records.map((record) => ({
      id: record.id,
      targetType: "decision" as const,
      title: titleFrom(record),
      symbol: record.symbol,
      tags: [record.mistakeTag],
      text: `${record.decisionReason} ${record.lesson} ${record.futureRule} ${record.mistakeTag}`,
    })),
    ...outcomes.records.map((record) => ({
      id: record.id,
      targetType: "outcome" as const,
      title: titleFrom(record),
      symbol: record.symbol,
      tags: record.tags,
      text: `${record.actualOutcome} ${record.lesson} ${record.futureRule} ${record.tags.join(" ")}`,
    })),
    ...playbooks.records.map((record) => ({
      id: record.id,
      targetType: "playbook" as const,
      title: record.title,
      tags: record.tags,
      text: `${record.title} ${record.historicalLesson} ${record.keyMistake} ${record.keyConfirmationSignal} ${record.tags.join(" ")}`,
    })),
  ]
}

export async function generateLinkCandidatesForAcceptedItem(reviewItemId: string) {
  const reviewItem = getReviewItem(reviewItemId)
  const sourceEvent = reviewItem?.writtenRecords?.event

  if (!reviewItem || reviewItem.status !== "accepted") {
    return {
      candidates: [],
      summary: {
        acceptedReviewItemId: reviewItemId,
        candidateCount: 0,
        acceptedLinkCount: acceptedLinks.length,
        warning: "Review item is missing or not accepted.",
      },
    }
  }

  if (!sourceEvent) {
    return {
      candidates: [],
      summary: {
        acceptedReviewItemId: reviewItemId,
        candidateCount: 0,
        acceptedLinkCount: acceptedLinks.length,
        warning: "Accepted review item has no written source event id.",
      },
    }
  }

  const targets = await targetRecords()
  const sourceTags = sourceEvent.tags ?? []
  const sourceText = `${sourceEvent.title} ${sourceEvent.summary} ${sourceTags.join(" ")}`.toLowerCase()

  targets.forEach((target) => {
    if (target.id === sourceEvent.id) return
    const id = candidateId(reviewItemId, target.targetType, target.id)
    if (linkCandidates.some((candidate) => candidate.candidateId === id)) return

    const scoreParts: string[] = []
    let confidence = 32
    if (sourceEvent.symbol && target.symbol === sourceEvent.symbol) {
      confidence += 24
      scoreParts.push("asset")
    }
    const tagOverlap = overlap(sourceTags, target.tags)
    if (tagOverlap.length) {
      confidence += Math.min(24, tagOverlap.length * 8)
      scoreParts.push("tags")
    }
    if (target.text.toLowerCase().includes(normalized(sourceEvent.category))) {
      confidence += 12
      scoreParts.push("event_type")
    }
    if (sourceText.split(" ").some((token) => token.length > 6 && target.text.toLowerCase().includes(token))) {
      confidence += 10
      scoreParts.push("narrative")
    }

    if (confidence < 45) return

    const relationship = relationshipFor(target.targetType, scoreParts)
    linkCandidates.push({
      id: `link-${id}`,
      candidateId: id,
      acceptedReviewItemId: reviewItemId,
      sourceEventId: sourceEvent.id,
      targetType: target.targetType,
      targetId: target.id,
      targetTitle: target.title,
      relationship,
      confidence: Math.min(94, confidence),
      rationale: `Matched by ${scoreParts.length ? scoreParts.join(", ") : "mock heuristic"} against accepted external event.`,
      createdAt: NOW,
      status: "pending",
    })
  })

  const candidates = linkCandidates.filter((candidate) => candidate.acceptedReviewItemId === reviewItemId)
  return {
    candidates: candidates.map(clone),
    summary: {
      acceptedReviewItemId: reviewItemId,
      sourceEventId: sourceEvent.id,
      candidateCount: candidates.length,
      acceptedLinkCount: acceptedLinks.length,
    },
  }
}

export function listLinkCandidates(query: AcceptedEventLinkCandidateQuery = {}) {
  return linkCandidates
    .filter((candidate) => !query.reviewItemId || candidate.acceptedReviewItemId === query.reviewItemId)
    .filter((candidate) => !query.status || candidate.status === query.status)
    .slice(0, query.limit ?? linkCandidates.length)
    .map(clone)
}

export function acceptLinkCandidate(id: string) {
  const candidate = linkCandidates.find((item) => item.candidateId === id)
  if (!candidate) return null
  candidate.status = "accepted"
  candidate.reviewedAt = NOW

  if (!acceptedLinks.some((link) => link.id === candidate.id)) {
    const { candidateId: _candidateId, status: _status, reviewedAt: _reviewedAt, ...link } = candidate
    acceptedLinks.push(link)
  }

  return clone(candidate)
}

export function rejectLinkCandidate(id: string) {
  const candidate = linkCandidates.find((item) => item.candidateId === id)
  if (!candidate) return null
  candidate.status = "rejected"
  candidate.reviewedAt = NOW
  return clone(candidate)
}

export function listAcceptedEventLinks(query: AcceptedEventLinkListQuery = {}) {
  const links = acceptedLinks
    .filter((link) => !query.sourceEventId || link.sourceEventId === query.sourceEventId)
    .filter((link) => !query.targetType || link.targetType === query.targetType)
    .slice(0, query.limit ?? acceptedLinks.length)
    .map(clone)

  return {
    links,
    count: links.length,
  }
}
