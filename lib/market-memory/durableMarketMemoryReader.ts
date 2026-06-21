import {
  MARKET_MEMORY_SCHEMA_VERSION,
  MARKET_MEMORY_TYPES,
  type MarketMemory,
  type MarketMemoryArtifactReference,
  type MarketMemoryType,
} from "@/core/market-memory"
import type {
  IntelligenceArtifact,
  IntelligenceArtifactType,
} from "@/core/intelligence-artifacts"
import {
  DEFAULT_DURABLE_ARTIFACT_ROOT,
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

const MEMORY_TYPE_SET = new Set<MarketMemoryType>(MARKET_MEMORY_TYPES)
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export interface DurableMarketMemoryQuery {
  memoryId?: string
  symbol?: string
  exchange?: string
  memoryType?: MarketMemoryType
  limit?: number
}

export type DurableMarketMemoryReadResult =
  | {
      ok: true
      state: "ready"
      memories: MarketMemory[]
      generatedAt: string
      source: "durable-artifact-store"
    }
  | {
      ok: false
      state: "not_found" | "unavailable"
      memories: []
      generatedAt: null
      reason: string
      source: "durable-artifact-store"
    }

function normalized(value: string) {
  return value.replace("/", "").trim().toLowerCase()
}

function artifactType(value: unknown): IntelligenceArtifactType {
  return typeof value === "string" && value.trim()
    ? value as IntelligenceArtifactType
    : "custom:unknown-reference"
}

function supportingReference(
  artifact: IntelligenceArtifact,
  artifactId: string,
): MarketMemoryArtifactReference {
  const evidence = artifact.supportingEvidence.find((item) => (
    item.id === artifactId
    || item.metadata?.artifactId === artifactId
  ))
  return {
    artifactId,
    artifactType: artifactType(evidence?.metadata?.artifactType),
    title: evidence?.title ?? artifactId,
    source: {
      system: evidence?.source ?? artifact.source.system,
      producerVersion: "unknown",
    },
    generatedAt: artifact.generatedAt,
    validity: artifact.validity,
    thesis: artifact.thesis,
    contradiction: artifact.contradiction,
    decisionBrief: artifact.decisionBrief,
  }
}

function toMarketMemory(artifact: IntelligenceArtifact): MarketMemory | null {
  if (artifact.type !== "market_memory") return null
  const memoryId = typeof artifact.metadata.memoryId === "string"
    ? artifact.metadata.memoryId.trim()
    : ""
  const memoryType = artifact.metadata.memoryType
  if (!memoryId || !MEMORY_TYPE_SET.has(memoryType as MarketMemoryType)) return null
  const supportingArtifactIds = Array.isArray(artifact.metadata.supportingArtifactIds)
    ? artifact.metadata.supportingArtifactIds
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    : artifact.supportingEvidence.map((evidence) => evidence.id)
  if (!supportingArtifactIds.length) return null

  return {
    schemaVersion: MARKET_MEMORY_SCHEMA_VERSION,
    memoryId,
    title: artifact.title,
    memoryType: memoryType as MarketMemoryType,
    summary: artifact.summary,
    supportingArtifacts: [...new Set(supportingArtifactIds)]
      .sort()
      .map((artifactId) => supportingReference(artifact, artifactId)),
    generatedAt: artifact.generatedAt,
    validity: artifact.validity,
    thesis: artifact.thesis,
    contradiction: artifact.contradiction,
    decisionBrief: artifact.decisionBrief,
    tags: artifact.tags,
    symbols: artifact.subjects?.symbols,
    exchanges: artifact.subjects?.exchanges,
  }
}

function matchesExchange(memory: MarketMemory, exchange?: string) {
  if (!exchange?.trim()) return true
  const expected = normalized(exchange)
  return (memory.exchanges ?? []).some((candidate) => normalized(candidate) === expected)
}

export class DurableMarketMemoryReader {
  private readonly registry: FileBackedIntelligenceArtifactRegistry

  constructor(root: string = DEFAULT_DURABLE_ARTIFACT_ROOT) {
    this.registry = new FileBackedIntelligenceArtifactRegistry(root)
  }

  async read(query: DurableMarketMemoryQuery = {}): Promise<DurableMarketMemoryReadResult> {
    const limit = Math.max(1, Math.min(MAX_LIMIT, query.limit ?? DEFAULT_LIMIT))
    const artifactId = query.memoryId?.trim()
      ? query.memoryId.startsWith("market-memory:")
        ? query.memoryId
        : `market-memory:${query.memoryId}`
      : undefined

    try {
      const result = await this.registry.search({
        ids: artifactId ? [artifactId] : undefined,
        types: ["market_memory"],
        symbols: query.symbol?.trim() ? [query.symbol] : undefined,
        limit: MAX_LIMIT,
      })
      const memories: MarketMemory[] = []
      for (const summary of result.artifacts) {
        const artifact = await this.registry.get(summary.id)
        if (!artifact) continue
        const memory = toMarketMemory(artifact)
        if (!memory) continue
        if (query.memoryType && memory.memoryType !== query.memoryType) continue
        if (!matchesExchange(memory, query.exchange)) continue
        memories.push(memory)
      }
      memories.sort((left, right) => (
        Date.parse(right.generatedAt) - Date.parse(left.generatedAt)
        || left.memoryId.localeCompare(right.memoryId)
      ))
      const selected = memories.slice(0, limit)
      if (!selected.length) {
        return {
          ok: false,
          state: "not_found",
          memories: [],
          generatedAt: null,
          reason: query.symbol?.trim()
            ? "Market Memory artifacts are unavailable for the selected symbol."
            : "No durable Market Memory exists for this investigation.",
          source: "durable-artifact-store",
        }
      }
      return {
        ok: true,
        state: "ready",
        memories: selected,
        generatedAt: selected[0].generatedAt,
        source: "durable-artifact-store",
      }
    } catch {
      return {
        ok: false,
        state: "unavailable",
        memories: [],
        generatedAt: null,
        reason: "Market Memory store is unavailable.",
        source: "durable-artifact-store",
      }
    }
  }
}

export const durableMarketMemoryReader = new DurableMarketMemoryReader()
