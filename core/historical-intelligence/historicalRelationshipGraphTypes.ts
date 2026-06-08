import type { AcceptedEventLinkType } from "./acceptedEventLinkerTypes"

export type HistoricalGraphNodeType = "event" | "replay_case" | "memory" | "decision" | "outcome" | "playbook"

export interface HistoricalGraphNode {
  id: string
  type: HistoricalGraphNodeType
  title: string
  subtitle?: string
  status?: string
  confidence?: number
  sourceId?: string
  createdAt?: string
}

export interface HistoricalGraphEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  relationship: string
  confidence: number
  rationale?: string
}

export interface HistoricalRelationshipGraphSummary {
  nodeCount: number
  edgeCount: number
  eventCount: number
  replayCaseCount: number
  memoryCount: number
  decisionCount: number
  outcomeCount: number
  playbookCount: number
  averageConfidence: number
  topRelationships: string[]
  caveat?: string
}

export interface HistoricalRelationshipGraph {
  nodes: HistoricalGraphNode[]
  edges: HistoricalGraphEdge[]
  summary: HistoricalRelationshipGraphSummary
}

export interface HistoricalRelationshipGraphQuery {
  sourceEventId?: string
  targetType?: AcceptedEventLinkType
  limit?: number
}
