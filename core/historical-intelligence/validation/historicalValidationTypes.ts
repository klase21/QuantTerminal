export type HistoricalValidationMetricName =
  | "acceptance_rate"
  | "link_coverage"
  | "graph_coverage"
  | "scoring_coverage"
  | "historical_match_rate"
  | "average_confidence"
  | "average_relationship_density"

export type HistoricalPipelineHealth = "Excellent" | "Good" | "Needs Review" | "Poor"

export interface HistoricalValidationMetric {
  name: HistoricalValidationMetricName
  label: string
  value: number
  unit: "percent" | "count" | "ratio"
  interpretation: string
}

export interface HistoricalValidationCoverage {
  acceptedReviewItems: number
  acceptedEventsWithWrittenEvent: number
  linkedEvents: number
  generatedRelationships: number
  graphNodes: number
  graphEdges: number
  scoredAcceptedEvents: number
  scoredLinkedTargets: number
  historicalContextMatches: number
}

export interface HistoricalValidationGap {
  eventId: string
  reviewItemId: string
  title: string
  gaps: Array<"no_links" | "no_memories" | "no_playbooks" | "low_confidence" | "poor_graph_connectivity">
  confidence: number
}

export interface HistoricalValidationSummary {
  pipelineHealth: HistoricalPipelineHealth
  acceptedEvents: number
  linkedEvents: number
  graphCoverage: number
  historicalMatchRate: number
  averageConfidence: number
  averageRelationshipDensity: number
  warnings: string[]
  generatedAt: string
}

export interface HistoricalValidationRun {
  id: string
  mode: "mock-in-memory"
  startedAt: string
  completedAt: string
  source: "external-review-pipeline"
}

export interface HistoricalValidationResult {
  ok: true
  run: HistoricalValidationRun
  summary: HistoricalValidationSummary
  metrics: HistoricalValidationMetric[]
  coverage: HistoricalValidationCoverage
  gaps: HistoricalValidationGap[]
  improvementPriorities: string[]
}

