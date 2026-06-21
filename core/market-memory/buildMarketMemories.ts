import type {
  EventImpactArtifactMetadata,
  HistoricalAnalogArtifactMetadata,
  ReplayEvidenceArtifactMetadata,
} from "@/core/intelligence-artifacts/preparedArtifactPublications"
import type { IntelligenceArtifact } from "@/core/intelligence-artifacts"
import type { ReplayLearningArtifactMetadata } from "@/core/replay-learning"
import {
  MARKET_MEMORY_SCHEMA_VERSION,
  type MarketMemory,
  type MarketMemoryArtifactReference,
} from "./marketMemoryTypes"
import { aggregateEvidenceValidity } from "@/core/evidence-validity"
import { marketMemoryContradiction } from "@/core/contradiction"

function pct(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
    : "unavailable"
}

function artifactReference(artifact: IntelligenceArtifact): MarketMemoryArtifactReference {
  return {
    artifactId: artifact.id,
    artifactType: artifact.type,
    title: artifact.title,
    source: artifact.source,
    generatedAt: artifact.generatedAt,
    validity: artifact.validity,
    thesis: artifact.thesis,
    contradiction: artifact.contradiction,
    decisionBrief: artifact.decisionBrief,
  }
}

function historicalAnalogMemory(artifact: IntelligenceArtifact): MarketMemory | null {
  const metadata = artifact.metadata as Partial<HistoricalAnalogArtifactMetadata>
  const statistics = metadata.statistics
  const stats24h = statistics?.byHorizon?.["24h"]
  if (
    typeof metadata.symbol !== "string"
    || typeof metadata.timeframe !== "string"
    || typeof metadata.totalCases !== "number"
    || metadata.totalCases < 2
    || !stats24h
    || stats24h.caseCount < 2
  ) {
    return null
  }
  const dominantOutcome = typeof metadata.dominantOutcome === "string"
    ? metadata.dominantOutcome
    : "unavailable"
  const memory: MarketMemory = {
    schemaVersion: MARKET_MEMORY_SCHEMA_VERSION,
    memoryId: `memory:regime:${metadata.symbol}:${metadata.timeframe}`,
    title: `${metadata.symbol} ${metadata.timeframe} Regime Memory`,
    memoryType: "regime",
    summary: `${metadata.totalCases} historical analog cases had a 24h average return of ${pct(stats24h.averageReturn)} and a win rate of ${pct(stats24h.winRate)}. Dominant outcome: ${dominantOutcome}.`,
    supportingArtifacts: [artifactReference(artifact)],
    generatedAt: artifact.generatedAt,
    validity: aggregateEvidenceValidity(
      [artifact.validity],
      artifact.generatedAt,
      "Regime memory inherits validity from its Historical Analog artifact.",
    ),
    thesis: artifact.thesis,
    decisionBrief: artifact.decisionBrief,
    tags: ["regime", "historical-analog", metadata.timeframe],
    symbols: [metadata.symbol],
    exchanges: artifact.subjects?.exchanges,
  }
  memory.contradiction = marketMemoryContradiction({
    memory,
    sourceArtifacts: [artifact],
  })
  return memory
}

function eventImpactMemory(artifact: IntelligenceArtifact): MarketMemory | null {
  const metadata = artifact.metadata as Partial<EventImpactArtifactMetadata>
  const stats24h = metadata.statistics?.byHorizon?.["24h"]
  if (
    typeof metadata.category !== "string"
    || typeof metadata.symbol !== "string"
    || typeof metadata.exchange !== "string"
    || typeof metadata.sampleCount !== "number"
    || metadata.sampleCount < 2
    || !stats24h
    || stats24h.sampleCount < 2
  ) {
    return null
  }
  const memory: MarketMemory = {
    schemaVersion: MARKET_MEMORY_SCHEMA_VERSION,
    memoryId: `memory:event:${metadata.category}:${metadata.exchange}:${metadata.symbol}`,
    title: `${metadata.symbol} ${metadata.category} Event Memory`,
    memoryType: "event",
    summary: `${metadata.sampleCount} verified event observations had a 24h average return of ${pct(stats24h.averageReturn)}, median return of ${pct(stats24h.medianReturn)}, and win rate of ${pct(stats24h.winRate)}.`,
    supportingArtifacts: [artifactReference(artifact)],
    generatedAt: artifact.generatedAt,
    validity: aggregateEvidenceValidity(
      [artifact.validity],
      artifact.generatedAt,
      "Event memory inherits validity from its Event Impact artifact.",
    ),
    thesis: artifact.thesis,
    decisionBrief: artifact.decisionBrief,
    tags: ["event", "event-impact", metadata.category],
    symbols: [metadata.symbol],
    exchanges: [metadata.exchange],
  }
  memory.contradiction = marketMemoryContradiction({
    memory,
    sourceArtifacts: [artifact],
  })
  return memory
}

function replayStructuralMemories(artifacts: IntelligenceArtifact[]): MarketMemory[] {
  const groups = new Map<string, IntelligenceArtifact<ReplayEvidenceArtifactMetadata>[]>()
  for (const artifact of artifacts) {
    const metadata = artifact.metadata as Partial<ReplayEvidenceArtifactMetadata>
    if (
      typeof metadata.symbol !== "string"
      || typeof metadata.exchange !== "string"
      || typeof metadata.imbalance !== "number"
      || typeof metadata.spread !== "number"
    ) {
      continue
    }
    const key = `${metadata.exchange}:${metadata.symbol}`
    groups.set(key, [
      ...(groups.get(key) ?? []),
      artifact as IntelligenceArtifact<ReplayEvidenceArtifactMetadata>,
    ])
  }

  return [...groups.values()].flatMap((group) => {
    if (group.length < 2) return []
    const [{ metadata }] = group
    const averageImbalance = group.reduce((sum, artifact) => sum + artifact.metadata.imbalance, 0) / group.length
    const averageSpread = group.reduce((sum, artifact) => sum + artifact.metadata.spread, 0) / group.length
    const generatedAt = group.map((artifact) => artifact.generatedAt).sort().at(-1) as string
    const thesisIds = [...new Set(group.map((artifact) => artifact.thesis?.thesisId).filter(Boolean))]
    const briefIds = [...new Set(group.map((artifact) => artifact.decisionBrief?.decisionBriefId).filter(Boolean))]
    const memory: MarketMemory = {
      schemaVersion: MARKET_MEMORY_SCHEMA_VERSION,
      memoryId: `memory:structural:orderbook:${metadata.exchange}:${metadata.symbol}`,
      title: `${metadata.symbol} Orderbook Structural Memory`,
      memoryType: "structural" as const,
      summary: `${group.length} prepared replay snapshots had an average orderbook imbalance of ${pct(averageImbalance)} and an average spread of ${averageSpread.toFixed(4)}.`,
      supportingArtifacts: group.map(artifactReference),
      generatedAt,
      validity: aggregateEvidenceValidity(
        group.map((artifact) => artifact.validity),
        generatedAt,
        "Structural memory uses the most conservative validity state of its Replay evidence.",
      ),
      thesis: thesisIds.length === 1
        ? group.find((artifact) => artifact.thesis?.thesisId === thesisIds[0])?.thesis
        : undefined,
      decisionBrief: briefIds.length === 1
        ? group.find((artifact) => artifact.decisionBrief?.decisionBriefId === briefIds[0])?.decisionBrief
        : undefined,
      tags: ["structural", "replay", "orderbook"],
      symbols: [metadata.symbol],
      exchanges: [metadata.exchange],
    }
    memory.contradiction = marketMemoryContradiction({
      memory,
      sourceArtifacts: group,
    })
    return [memory]
  })
}

function replayLearningMemories(artifacts: IntelligenceArtifact[]): MarketMemory[] {
  const groups = new Map<string, IntelligenceArtifact<ReplayLearningArtifactMetadata>[]>()
  for (const artifact of artifacts) {
    const metadata = artifact.metadata as Partial<ReplayLearningArtifactMetadata>
    if (
      typeof metadata.symbol !== "string"
      || typeof metadata.exchange !== "string"
      || typeof metadata.observationCount !== "number"
      || typeof metadata.outcomeCount !== "number"
    ) {
      continue
    }
    const key = `${metadata.exchange}:${metadata.symbol}`
    groups.set(key, [
      ...(groups.get(key) ?? []),
      artifact as IntelligenceArtifact<ReplayLearningArtifactMetadata>,
    ])
  }

  return [...groups.values()].flatMap((group) => {
    if (group.length < 2) return []
    const [{ metadata }] = group
    const observationCount = group.reduce(
      (total, artifact) => total + artifact.metadata.observationCount,
      0,
    )
    const outcomeCount = group.reduce(
      (total, artifact) => total + artifact.metadata.outcomeCount,
      0,
    )
    const generatedAt = group.map((artifact) => artifact.generatedAt).sort().at(-1) as string
    const thesisIds = [...new Set(group.map((artifact) => artifact.thesis?.thesisId).filter(Boolean))]
    const briefIds = [...new Set(group.map((artifact) => artifact.decisionBrief?.decisionBriefId).filter(Boolean))]
    const memory: MarketMemory = {
      schemaVersion: MARKET_MEMORY_SCHEMA_VERSION,
      memoryId: `memory:setup:replay-learning:${metadata.exchange}:${metadata.symbol}`,
      title: `${metadata.symbol} Replay Learning Memory`,
      memoryType: "setup",
      summary: `${group.length} Replay Learning artifacts recorded ${observationCount} factual observations and ${outcomeCount} factual outcomes.`,
      supportingArtifacts: group.map(artifactReference),
      generatedAt,
      validity: aggregateEvidenceValidity(
        group.map((artifact) => artifact.validity),
        generatedAt,
        "Replay Learning memory uses the most conservative validity state of its source artifacts.",
      ),
      thesis: thesisIds.length === 1
        ? group.find((artifact) => artifact.thesis?.thesisId === thesisIds[0])?.thesis
        : undefined,
      decisionBrief: briefIds.length === 1
        ? group.find((artifact) => artifact.decisionBrief?.decisionBriefId === briefIds[0])?.decisionBrief
        : undefined,
      tags: ["setup", "replay-learning"],
      symbols: [metadata.symbol],
      exchanges: [metadata.exchange],
    }
    memory.contradiction = marketMemoryContradiction({
      memory,
      sourceArtifacts: group,
    })
    return [memory]
  })
}

export function buildMarketMemories(artifacts: IntelligenceArtifact[]): MarketMemory[] {
  const eligible = artifacts
    .filter((artifact) => (
      artifact.type === "historical_analog"
      || artifact.type === "event_impact"
      || artifact.type === "replay_intelligence"
      || artifact.type === "replay_learning"
    ))
    .sort((left, right) => left.id.localeCompare(right.id))

  const memories = eligible.flatMap((artifact) => {
    if (artifact.type === "historical_analog") {
      const memory = historicalAnalogMemory(artifact)
      return memory ? [memory] : []
    }
    if (artifact.type === "event_impact") {
      const memory = eventImpactMemory(artifact)
      return memory ? [memory] : []
    }
    return []
  })
  memories.push(...replayStructuralMemories(
    eligible.filter((artifact) => artifact.type === "replay_intelligence"),
  ))
  memories.push(...replayLearningMemories(
    eligible.filter((artifact) => artifact.type === "replay_learning"),
  ))

  return memories.sort((left, right) => (
    Date.parse(right.generatedAt) - Date.parse(left.generatedAt)
    || left.memoryId.localeCompare(right.memoryId)
  ))
}
