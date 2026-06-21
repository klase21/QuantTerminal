import type { EventImpactResult } from "@/core/event-impact"
import type { HistoricalAnalogCachePayloadV2 } from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
import type { IntelligenceArtifact } from "@/core/intelligence-artifacts"
import type { MarketMemory } from "@/core/market-memory/marketMemoryTypes"
import {
  CONTRADICTION_SCHEMA_VERSION,
  type ContradictionAnalysis,
  type ContradictionEvidence,
} from "./contradictionTypes"

function pct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort()
}

export function historicalAnalogContradiction(input: {
  payload: HistoricalAnalogCachePayloadV2
  generatedAt: string
  sourceArtifactId?: string
}): ContradictionAnalysis {
  const { payload } = input
  const sourceArtifactId = input.sourceArtifactId
    ?? `historical-analog:${payload.symbol}:${payload.interval}`
  const stats = payload.statistics.byHorizon["24h"]
  const positiveCases = payload.cases.filter((item) => (item.outcome.returns["24h"] ?? 0) > 0)
  const negativeCases = payload.cases.filter((item) => (item.outcome.returns["24h"] ?? 0) < 0)
  const supportingEvidence: ContradictionEvidence[] = []
  const contradictingEvidence: ContradictionEvidence[] = []

  if (stats.averageReturn !== null && stats.averageReturn > 0) {
    supportingEvidence.push({
      evidenceId: `${sourceArtifactId}:24h-average-positive`,
      kind: "outcome",
      title: "Positive 24h average outcome",
      summary: `${stats.caseCount} usable cases had an average 24h return of ${pct(stats.averageReturn)}.`,
      source: payload.source,
      sourceArtifactId,
      metadata: { horizon: "24h", averageReturn: stats.averageReturn, caseCount: stats.caseCount },
    })
  } else if (stats.averageReturn !== null && stats.averageReturn < 0) {
    contradictingEvidence.push({
      evidenceId: `${sourceArtifactId}:24h-average-negative`,
      kind: "outcome",
      title: "Negative 24h average outcome",
      summary: `${stats.caseCount} usable cases had an average 24h return of ${pct(stats.averageReturn)}.`,
      source: payload.source,
      sourceArtifactId,
      metadata: { horizon: "24h", averageReturn: stats.averageReturn, caseCount: stats.caseCount },
    })
  }

  if (stats.winRate !== null) {
    if (stats.winRate > 50) {
      supportingEvidence.push({
        evidenceId: `${sourceArtifactId}:24h-positive-majority`,
        kind: "calculation",
        title: "Positive outcomes were the majority",
        summary: `${pct(stats.winRate)} of usable 24h outcomes were positive.`,
        source: payload.source,
        sourceArtifactId,
        metadata: { horizon: "24h", winRate: stats.winRate, caseCount: stats.caseCount },
      })
    }
    if (stats.winRate < 100) {
      contradictingEvidence.push({
        evidenceId: `${sourceArtifactId}:24h-failure-rate`,
        kind: "calculation",
        title: "Historical cases included adverse outcomes",
        summary: `${pct(100 - stats.winRate)} of usable 24h outcomes were not positive.`,
        source: payload.source,
        sourceArtifactId,
        metadata: { horizon: "24h", failureRate: 100 - stats.winRate, caseCount: stats.caseCount },
      })
    }
  }

  supportingEvidence.push(...positiveCases.slice(0, 5).map((item) => ({
    evidenceId: `${sourceArtifactId}:case:${item.state.id}:positive`,
    kind: "historical_case" as const,
    title: "Positive historical analog outcome",
    summary: `${item.similarity.toFixed(1)}% similar case returned ${pct(item.outcome.returns["24h"] as number)} over 24h.`,
    source: item.state.source,
    observedAt: new Date(item.state.timestamp).toISOString(),
    sourceArtifactId,
    metadata: { caseId: item.state.id, similarity: item.similarity, horizon: "24h", return: item.outcome.returns["24h"] },
  })))
  contradictingEvidence.push(...negativeCases.slice(0, 5).map((item) => ({
    evidenceId: `${sourceArtifactId}:case:${item.state.id}:negative`,
    kind: "historical_case" as const,
    title: "Negative historical analog outcome",
    summary: `${item.similarity.toFixed(1)}% similar case returned ${pct(item.outcome.returns["24h"] as number)} over 24h.`,
    source: item.state.source,
    observedAt: new Date(item.state.timestamp).toISOString(),
    sourceArtifactId,
    metadata: { caseId: item.state.id, similarity: item.similarity, horizon: "24h", return: item.outcome.returns["24h"] },
  })))

  return {
    schemaVersion: CONTRADICTION_SCHEMA_VERSION,
    contradictionId: `contradiction:${sourceArtifactId}`,
    category: "historical_analog",
    supportingEvidence,
    contradictingEvidence,
    generatedAt: new Date(input.generatedAt).toISOString(),
    sourceArtifactIds: [sourceArtifactId],
  }
}

export function eventImpactContradiction(input: {
  result: EventImpactResult
  generatedAt?: string
  sourceArtifactId?: string
}): ContradictionAnalysis {
  const { result } = input
  const category = result.query.category ?? result.events[0]?.category ?? "unknown"
  const symbol = result.query.symbol ?? result.outcomes[0]?.symbol ?? "unknown"
  const exchange = result.query.exchange ?? result.outcomes[0]?.exchange ?? "unknown"
  const sourceArtifactId = input.sourceArtifactId
    ?? `event-impact:${category}:${exchange}:${symbol}`
  const supportingEvidence: ContradictionEvidence[] = []
  const contradictingEvidence: ContradictionEvidence[] = []
  const stats = result.statistics.byHorizon["24h"]

  if (stats.averageReturn !== null && stats.averageReturn > 0) {
    supportingEvidence.push({
      evidenceId: `${sourceArtifactId}:24h-average-positive`,
      kind: "outcome",
      title: "Positive average event outcome",
      summary: `${stats.sampleCount} event observations had an average 24h return of ${pct(stats.averageReturn)}.`,
      source: result.source.marketData.join(", ") || result.source.eventCatalog,
      sourceArtifactId,
      metadata: { horizon: "24h", averageReturn: stats.averageReturn, sampleCount: stats.sampleCount },
    })
  } else if (stats.averageReturn !== null && stats.averageReturn < 0) {
    contradictingEvidence.push({
      evidenceId: `${sourceArtifactId}:24h-average-negative`,
      kind: "outcome",
      title: "Negative average event outcome",
      summary: `${stats.sampleCount} event observations had an average 24h return of ${pct(stats.averageReturn)}.`,
      source: result.source.marketData.join(", ") || result.source.eventCatalog,
      sourceArtifactId,
      metadata: { horizon: "24h", averageReturn: stats.averageReturn, sampleCount: stats.sampleCount },
    })
  }

  const usable = result.outcomes.filter((outcome) => outcome.outcomes["24h"].available)
  const positive = usable.filter((outcome) => (outcome.outcomes["24h"].return ?? 0) > 0)
  const negative = usable.filter((outcome) => (outcome.outcomes["24h"].return ?? 0) < 0)
  supportingEvidence.push(...positive.slice(0, 5).map((outcome) => ({
    evidenceId: `${sourceArtifactId}:event:${outcome.eventId}:positive`,
    kind: "event" as const,
    title: "Positive verified event outcome",
    summary: `Verified event ${outcome.eventId} was followed by a ${pct(outcome.outcomes["24h"].return as number)} 24h return.`,
    source: outcome.source.name,
    observedAt: outcome.eventTimestamp,
    sourceArtifactId,
    metadata: { eventId: outcome.eventId, horizon: "24h", return: outcome.outcomes["24h"].return },
  })))
  contradictingEvidence.push(...negative.slice(0, 5).map((outcome) => ({
    evidenceId: `${sourceArtifactId}:event:${outcome.eventId}:negative`,
    kind: "event" as const,
    title: "Negative verified event outcome",
    summary: `Verified event ${outcome.eventId} was followed by a ${pct(outcome.outcomes["24h"].return as number)} 24h return.`,
    source: outcome.source.name,
    observedAt: outcome.eventTimestamp,
    sourceArtifactId,
    metadata: { eventId: outcome.eventId, horizon: "24h", return: outcome.outcomes["24h"].return },
  })))
  if (positive.length && negative.length) {
    contradictingEvidence.push({
      evidenceId: `${sourceArtifactId}:mixed-24h-outcomes`,
      kind: "calculation",
      title: "Verified event outcomes were mixed",
      summary: `${positive.length} positive and ${negative.length} negative 24h outcomes were observed.`,
      source: result.source.eventCatalog,
      sourceArtifactId,
      metadata: { horizon: "24h", positiveCount: positive.length, negativeCount: negative.length },
    })
  }

  return {
    schemaVersion: CONTRADICTION_SCHEMA_VERSION,
    contradictionId: `contradiction:${sourceArtifactId}`,
    category: "event_impact",
    supportingEvidence,
    contradictingEvidence,
    generatedAt: new Date(input.generatedAt ?? result.source.generatedAt).toISOString(),
    sourceArtifactIds: [sourceArtifactId],
  }
}

export function marketMemoryContradiction(input: {
  memory: MarketMemory
  sourceArtifacts?: IntelligenceArtifact[]
}): ContradictionAnalysis {
  const sourceArtifactIds = unique(input.memory.supportingArtifacts.map((artifact) => artifact.artifactId))
  const sourceArtifacts = input.sourceArtifacts ?? []
  const supportingEvidence = sourceArtifacts.flatMap((artifact) => artifact.contradiction?.supportingEvidence ?? [])
  const contradictingEvidence = sourceArtifacts.flatMap((artifact) => artifact.contradiction?.contradictingEvidence ?? [])

  if (input.memory.memoryType === "failure") {
    contradictingEvidence.push({
      evidenceId: `${input.memory.memoryId}:failure-memory`,
      kind: "expectation",
      title: input.memory.title,
      summary: input.memory.summary,
      source: "market-memory-v1",
      sourceArtifactId: sourceArtifactIds[0],
      metadata: { memoryId: input.memory.memoryId, memoryType: input.memory.memoryType },
    })
  }

  return {
    schemaVersion: CONTRADICTION_SCHEMA_VERSION,
    contradictionId: `contradiction:market-memory:${input.memory.memoryId}`,
    category: "market_memory",
    supportingEvidence,
    contradictingEvidence,
    generatedAt: new Date(input.memory.generatedAt).toISOString(),
    sourceArtifactIds,
  }
}
