import { listAcceptedEventLinks } from "./acceptedEventLinkerService"
import { mockHistoricalPersistenceRepository } from "./mockHistoricalPersistenceRepository"
import type { AcceptedEventLink, AcceptedEventLinkType } from "./acceptedEventLinkerTypes"
import type {
  HistoricalGraphNode,
  HistoricalGraphNodeType,
  HistoricalRelationshipGraph,
  HistoricalRelationshipGraphQuery,
  HistoricalRelationshipGraphSummary,
} from "./historicalRelationshipGraphTypes"

type HydratedTarget = {
  title: string
  subtitle?: string
  status?: string
  confidence?: number
  createdAt?: string
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function topRelationships(links: AcceptedEventLink[]) {
  const counts = new Map<string, number>()
  links.forEach((link) => counts.set(link.relationship, (counts.get(link.relationship) ?? 0) + 1))
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([relationship]) => relationship)
}

async function hydrateTarget(link: AcceptedEventLink): Promise<HydratedTarget> {
  if (link.targetType === "replay_case") {
    const record = await mockHistoricalPersistenceRepository.replayCases.getById(link.targetId)
    if (record) {
      return {
        title: record.title,
        subtitle: record.symbol,
        status: record.status,
        createdAt: record.audit.createdAt,
      }
    }
  }

  if (link.targetType === "memory") {
    const record = await mockHistoricalPersistenceRepository.memories.getById(link.targetId)
    if (record) {
      return {
        title: record.title,
        subtitle: record.memoryType,
        status: record.status,
        confidence: record.confidence,
        createdAt: record.audit.createdAt,
      }
    }
  }

  if (link.targetType === "decision") {
    const record = await mockHistoricalPersistenceRepository.decisions.getById(link.targetId)
    if (record) {
      return {
        title: `${record.decision.toUpperCase()} decision`,
        subtitle: record.symbol,
        status: record.status,
        confidence: record.confidence,
        createdAt: record.audit.createdAt,
      }
    }
  }

  if (link.targetType === "outcome") {
    const record = await mockHistoricalPersistenceRepository.outcomes.getById(link.targetId)
    if (record) {
      return {
        title: record.actualOutcome,
        subtitle: record.symbol,
        status: record.status,
        confidence: record.confidence,
        createdAt: record.audit.createdAt,
      }
    }
  }

  if (link.targetType === "playbook") {
    const record = await mockHistoricalPersistenceRepository.playbooks.getById(link.targetId)
    if (record) {
      return {
        title: record.title,
        subtitle: record.category,
        status: record.status,
        confidence: record.confidence,
        createdAt: record.audit.createdAt,
      }
    }
  }

  return {
    title: link.targetTitle,
    confidence: link.confidence,
  }
}

function summary(nodes: HistoricalGraphNode[], edges: { confidence: number; relationship: string }[]): HistoricalRelationshipGraphSummary {
  const count = (type: HistoricalGraphNodeType) => nodes.filter((node) => node.type === type).length
  const relationshipCounts = new Map<string, number>()
  edges.forEach((edge) => relationshipCounts.set(edge.relationship, (relationshipCounts.get(edge.relationship) ?? 0) + 1))

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    eventCount: count("event"),
    replayCaseCount: count("replay_case"),
    memoryCount: count("memory"),
    decisionCount: count("decision"),
    outcomeCount: count("outcome"),
    playbookCount: count("playbook"),
    averageConfidence: average(edges.map((edge) => edge.confidence)),
    topRelationships: [...relationshipCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([relationship]) => relationship),
    caveat: edges.length ? undefined : "Accept event links first to build the graph.",
  }
}

export async function getHistoricalRelationshipGraph(
  query: HistoricalRelationshipGraphQuery = {},
): Promise<HistoricalRelationshipGraph> {
  const linkResult = listAcceptedEventLinks({
    sourceEventId: query.sourceEventId,
    targetType: query.targetType,
    limit: query.limit,
  })
  const links = linkResult.links

  if (!links.length) {
    return {
      nodes: [],
      edges: [],
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        eventCount: 0,
        replayCaseCount: 0,
        memoryCount: 0,
        decisionCount: 0,
        outcomeCount: 0,
        playbookCount: 0,
        averageConfidence: 0,
        topRelationships: [],
        caveat: "Accept event links first to build the graph.",
      },
    }
  }

  const sourceEventIds = uniqueById(links.map((link) => ({ id: link.sourceEventId }))).map((item) => item.id)
  const sourceNodes: HistoricalGraphNode[] = await Promise.all(
    sourceEventIds.map(async (sourceEventId) => {
      const event = await mockHistoricalPersistenceRepository.events.getById(sourceEventId)
      return {
        id: `event:${sourceEventId}`,
        type: "event" as const,
        title: event?.title ?? sourceEventId,
        subtitle: event?.symbol ?? event?.category,
        status: event?.status,
        confidence: event?.confidence,
        sourceId: sourceEventId,
        createdAt: event?.audit.createdAt,
      }
    }),
  )

  const targetNodes: HistoricalGraphNode[] = await Promise.all(
    links.map(async (link) => {
      const target = await hydrateTarget(link)
      return {
        id: `${link.targetType}:${link.targetId}`,
        type: link.targetType,
        title: target.title,
        subtitle: target.subtitle,
        status: target.status,
        confidence: target.confidence ?? link.confidence,
        sourceId: link.targetId,
        createdAt: target.createdAt,
      }
    }),
  )

  const edges = links.map((link) => ({
    id: link.id,
    sourceNodeId: `event:${link.sourceEventId}`,
    targetNodeId: `${link.targetType}:${link.targetId}`,
    relationship: link.relationship,
    confidence: link.confidence,
    rationale: link.rationale,
  }))

  const nodes = uniqueById([...sourceNodes, ...targetNodes])

  return {
    nodes,
    edges,
    summary: {
      ...summary(nodes, edges),
      topRelationships: topRelationships(links),
    },
  }
}
