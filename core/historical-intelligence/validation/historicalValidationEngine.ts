import { listAcceptedEventLinks } from "../acceptedEventLinkerService"
import { listReviewItems } from "../externalEventReviewQueueService"
import { getHistoricalRelationshipGraph } from "../historicalRelationshipGraphEngine"
import { getHistoricalScoringResult } from "../historicalScoringEngine"
import type {
  HistoricalPipelineHealth,
  HistoricalValidationCoverage,
  HistoricalValidationGap,
  HistoricalValidationMetric,
  HistoricalValidationResult,
} from "./historicalValidationTypes"

const NOW = "2026-06-08T00:00:00.000Z"

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function healthFromScore(score: number): HistoricalPipelineHealth {
  if (score >= 85) return "Excellent"
  if (score >= 70) return "Good"
  if (score >= 45) return "Needs Review"
  return "Poor"
}

function metric(
  name: HistoricalValidationMetric["name"],
  label: string,
  value: number,
  unit: HistoricalValidationMetric["unit"],
  interpretation: string,
): HistoricalValidationMetric {
  return { name, label, value, unit, interpretation }
}

function buildWarnings(coverage: HistoricalValidationCoverage) {
  const warnings: string[] = []
  if (!coverage.acceptedReviewItems) warnings.push("No accepted review items found. Accept real or mock events before validating pipeline quality.")
  if (coverage.acceptedReviewItems && coverage.linkedEvents < coverage.acceptedReviewItems) warnings.push("Some accepted events have no accepted relationship links.")
  if (coverage.generatedRelationships === 0) warnings.push("Relationship graph has no accepted edges yet.")
  if (coverage.scoredAcceptedEvents < coverage.acceptedEventsWithWrittenEvent) warnings.push("Some accepted events are not covered by historical scoring.")
  if (coverage.historicalContextMatches < coverage.acceptedReviewItems) warnings.push("Some accepted events are missing memory/playbook/replay-case context.")
  return warnings
}

function buildPriorities(gaps: HistoricalValidationGap[], coverage: HistoricalValidationCoverage) {
  const priorities: string[] = []
  if (gaps.some((gap) => gap.gaps.includes("no_links"))) priorities.push("Generate and accept relationship candidates for unlinked accepted events.")
  if (gaps.some((gap) => gap.gaps.includes("no_memories"))) priorities.push("Create or link memory records for accepted events without memory coverage.")
  if (gaps.some((gap) => gap.gaps.includes("no_playbooks"))) priorities.push("Link accepted events to playbooks so replay lessons become actionable.")
  if (gaps.some((gap) => gap.gaps.includes("low_confidence"))) priorities.push("Review low-confidence accepted events before using them as historical analogs.")
  if (!coverage.graphEdges) priorities.push("Accept at least one event relationship to activate graph observability.")
  if (!priorities.length) priorities.push("Pipeline coverage is healthy; continue validating with larger accepted-event samples.")
  return priorities
}

export async function validateAcceptedEvents(): Promise<HistoricalValidationResult> {
  const allReviewItems = listReviewItems({ limit: 500 }).items
  const acceptedItems = allReviewItems.filter((item) => item.status === "accepted")
  const acceptedWithEvents = acceptedItems.filter((item) => item.writtenRecords?.event)
  const acceptedLinks = listAcceptedEventLinks({ limit: 1000 }).links
  const graph = await getHistoricalRelationshipGraph({ limit: 1000 })
  const scoring = await getHistoricalScoringResult()
  const scoredRecordIds = new Set(
    [
      ...scoring.events,
      ...scoring.memories,
      ...scoring.decisions,
      ...scoring.outcomes,
      ...scoring.playbooks,
    ].map((score) => score.recordId),
  )

  const acceptedEventIds = acceptedWithEvents
    .map((item) => item.writtenRecords?.event?.id)
    .filter((id): id is string => Boolean(id))
  const linkedEventIds = new Set(acceptedLinks.map((link) => link.sourceEventId))
  const linksByEvent = new Map<string, typeof acceptedLinks>()
  acceptedLinks.forEach((link) => {
    linksByEvent.set(link.sourceEventId, [...(linksByEvent.get(link.sourceEventId) ?? []), link])
  })

  const scoredAcceptedEvents = acceptedEventIds.filter((eventId) => scoredRecordIds.has(eventId)).length
  const scoredLinkedTargets = acceptedLinks.filter((link) => scoredRecordIds.has(link.targetId)).length
  const historicalContextMatches = acceptedWithEvents.filter((item) => {
    const eventId = item.writtenRecords?.event?.id
    if (!eventId) return false
    const links = linksByEvent.get(eventId) ?? []
    return links.some((link) => ["replay_case", "memory", "playbook"].includes(link.targetType))
  }).length

  const coverage: HistoricalValidationCoverage = {
    acceptedReviewItems: acceptedItems.length,
    acceptedEventsWithWrittenEvent: acceptedWithEvents.length,
    linkedEvents: acceptedEventIds.filter((eventId) => linkedEventIds.has(eventId)).length,
    generatedRelationships: acceptedLinks.length,
    graphNodes: graph.summary.nodeCount,
    graphEdges: graph.summary.edgeCount,
    scoredAcceptedEvents,
    scoredLinkedTargets,
    historicalContextMatches,
  }

  const linkCoverage = percent(coverage.linkedEvents, coverage.acceptedEventsWithWrittenEvent)
  const graphCoverage = percent(coverage.graphEdges ? coverage.linkedEvents : 0, coverage.acceptedEventsWithWrittenEvent)
  const scoringCoverage = percent(coverage.scoredAcceptedEvents, coverage.acceptedEventsWithWrittenEvent)
  const historicalMatchRate = percent(coverage.historicalContextMatches, coverage.acceptedEventsWithWrittenEvent)
  const acceptanceRate = percent(acceptedItems.length, allReviewItems.length)
  const averageConfidence = average(acceptedWithEvents.map((item) => item.confidence))
  const averageRelationshipDensity = coverage.acceptedEventsWithWrittenEvent
    ? Number((coverage.generatedRelationships / coverage.acceptedEventsWithWrittenEvent).toFixed(2))
    : 0
  const healthScore = average([linkCoverage, graphCoverage, scoringCoverage, historicalMatchRate, averageConfidence])

  const gaps: HistoricalValidationGap[] = acceptedWithEvents.map((item) => {
    const event = item.writtenRecords!.event!
    const links = linksByEvent.get(event.id) ?? []
    return {
      eventId: event.id,
      reviewItemId: item.id,
      title: event.title,
      confidence: item.confidence,
      gaps: [
        ...(links.length ? [] : (["no_links"] as const)),
        ...(links.some((link) => link.targetType === "memory") ? [] : (["no_memories"] as const)),
        ...(links.some((link) => link.targetType === "playbook") ? [] : (["no_playbooks"] as const)),
        ...(item.confidence < 60 ? (["low_confidence"] as const) : []),
        ...(links.length < 2 ? (["poor_graph_connectivity"] as const) : []),
      ],
    }
  }).filter((gap) => gap.gaps.length)

  const metrics: HistoricalValidationMetric[] = [
    metric("acceptance_rate", "Acceptance Rate", acceptanceRate, "percent", "Accepted review items divided by all queued review items."),
    metric("link_coverage", "Link Coverage", linkCoverage, "percent", "Accepted events with at least one accepted relationship link."),
    metric("graph_coverage", "Graph Coverage", graphCoverage, "percent", "Accepted events represented in a relationship graph with edges."),
    metric("scoring_coverage", "Scoring Coverage", scoringCoverage, "percent", "Accepted events covered by historical scoring."),
    metric("historical_match_rate", "Historical Match Rate", historicalMatchRate, "percent", "Accepted events linked to replay cases, memories, or playbooks."),
    metric("average_confidence", "Average Confidence", averageConfidence, "percent", "Average review confidence across accepted events."),
    metric("average_relationship_density", "Average Relationship Density", averageRelationshipDensity, "ratio", "Accepted relationships per accepted event."),
  ]

  return {
    ok: true,
    run: {
      id: "historical-validation-run-v1",
      mode: "mock-in-memory",
      startedAt: NOW,
      completedAt: NOW,
      source: "external-review-pipeline",
    },
    summary: {
      pipelineHealth: healthFromScore(healthScore),
      acceptedEvents: coverage.acceptedEventsWithWrittenEvent,
      linkedEvents: coverage.linkedEvents,
      graphCoverage,
      historicalMatchRate,
      averageConfidence,
      averageRelationshipDensity,
      warnings: buildWarnings(coverage),
      generatedAt: NOW,
    },
    metrics,
    coverage,
    gaps,
    improvementPriorities: buildPriorities(gaps, coverage),
  }
}

