import {
  createIntelligenceArtifact,
  type IntelligenceArtifact,
  type IntelligenceEvidenceKind,
} from "@/core/intelligence-artifacts"
import {
  MARKET_MEMORY_SCHEMA_VERSION,
  type MarketMemory,
} from "./marketMemoryTypes"

export interface MarketMemoryArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  memoryId: string
  memoryType: MarketMemory["memoryType"]
  supportingArtifactIds: string[]
}

function evidenceKind(type: string): IntelligenceEvidenceKind {
  if (type === "historical_analog") return "historical_case"
  if (type === "event_impact") return "event"
  return "market_data"
}

export function createMarketMemoryArtifact(
  memory: MarketMemory,
): IntelligenceArtifact<MarketMemoryArtifactMetadata> {
  return createIntelligenceArtifact({
    id: `market-memory:${memory.memoryId}`,
    type: "market_memory",
    title: memory.title,
    summary: memory.summary,
    confidence: 0,
    source: {
      system: "market-memory-v1",
      producerVersion: String(MARKET_MEMORY_SCHEMA_VERSION),
      dataset: "market-memory-catalog",
    },
    generatedAt: memory.generatedAt,
    expiresAt: null,
    supportingEvidence: memory.supportingArtifacts.map((artifact) => ({
      id: artifact.artifactId,
      kind: evidenceKind(artifact.artifactType),
      title: artifact.title,
      observedAt: artifact.generatedAt,
      source: artifact.source.system,
      metadata: {
        artifactId: artifact.artifactId,
        artifactType: artifact.artifactType,
      },
    })),
    metadata: {
      confidenceStatus: "not_calibrated",
      memoryId: memory.memoryId,
      memoryType: memory.memoryType,
      supportingArtifactIds: memory.supportingArtifacts.map((artifact) => artifact.artifactId),
    },
    tags: ["market-memory", memory.memoryType, ...(memory.tags ?? [])],
    subjects: {
      symbols: memory.symbols,
      exchanges: memory.exchanges,
    },
  })
}
