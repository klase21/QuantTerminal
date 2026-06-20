import {
  MARKET_MEMORY_CATALOG_VERSION,
  MARKET_MEMORY_SCHEMA_VERSION,
  type MarketMemory,
  type MarketMemoryCatalogData,
  type MarketMemoryCatalogReader,
  type MarketMemoryType,
} from "./marketMemoryTypes"

function normalizeSymbol(value: string) {
  return value.replace("/", "").trim().toUpperCase()
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function validMemory(memory: MarketMemory) {
  return (
    memory.schemaVersion === MARKET_MEMORY_SCHEMA_VERSION
    && Boolean(memory.memoryId.trim())
    && Boolean(memory.title.trim())
    && Boolean(memory.summary.trim())
    && Number.isFinite(Date.parse(memory.generatedAt))
    && memory.supportingArtifacts.length > 0
  )
}

export class InMemoryMarketMemoryCatalog implements MarketMemoryCatalogReader {
  private memories: MarketMemory[] = []
  private byId = new Map<string, MarketMemory>()
  private generatedAt: string | null = null

  replace(data: MarketMemoryCatalogData) {
    if (data.catalogVersion !== MARKET_MEMORY_CATALOG_VERSION) {
      throw new Error(`Unsupported Market Memory catalog version: ${data.catalogVersion}`)
    }
    if (data.schemaVersion !== MARKET_MEMORY_SCHEMA_VERSION) {
      throw new Error(`Unsupported Market Memory schema version: ${data.schemaVersion}`)
    }
    if (!Number.isFinite(Date.parse(data.generatedAt))) {
      throw new Error("Market Memory catalog generatedAt is invalid.")
    }
    const byId = new Map<string, MarketMemory>()
    const memories = data.memories.map(clone).sort((left, right) => (
      Date.parse(right.generatedAt) - Date.parse(left.generatedAt)
      || left.memoryId.localeCompare(right.memoryId)
    ))
    for (const memory of memories) {
      if (!validMemory(memory)) throw new Error(`Invalid Market Memory: ${memory.memoryId}`)
      if (byId.has(memory.memoryId)) throw new Error(`Duplicate Market Memory id: ${memory.memoryId}`)
      byId.set(memory.memoryId, memory)
    }
    this.memories = memories
    this.byId = byId
    this.generatedAt = data.generatedAt
  }

  status() {
    return {
      generatedAt: this.generatedAt,
      memoryCount: this.memories.length,
    }
  }

  getById(memoryId: string) {
    const memory = this.byId.get(memoryId.trim())
    return memory ? clone(memory) : null
  }

  findByCategory(memoryType: MarketMemoryType) {
    return this.memories.filter((memory) => memory.memoryType === memoryType).map(clone)
  }

  findBySymbol(symbol: string) {
    const normalized = normalizeSymbol(symbol)
    if (!normalized) return []
    return this.memories
      .filter((memory) => memory.symbols?.some((candidate) => normalizeSymbol(candidate) === normalized))
      .map(clone)
  }
}
