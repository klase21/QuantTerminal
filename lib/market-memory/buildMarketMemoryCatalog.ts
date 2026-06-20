import {
  MARKET_MEMORY_CATALOG_VERSION,
  MARKET_MEMORY_SCHEMA_VERSION,
  buildMarketMemories,
  type MarketMemoryCatalogData,
} from "@/core/market-memory"
import type { IntelligenceArtifact } from "@/core/intelligence-artifacts"
import { productionMarketMemoryCatalog } from "./productionMarketMemoryCatalog"

export function buildMarketMemoryCatalog(artifacts: IntelligenceArtifact[]): MarketMemoryCatalogData {
  const memories = buildMarketMemories(artifacts)
  if (!memories.length) {
    throw new Error("No eligible evidence-backed Market Memories could be generated.")
  }
  const generatedAt = memories.map((memory) => memory.generatedAt).sort().at(-1) as string
  const data: MarketMemoryCatalogData = {
    catalogVersion: MARKET_MEMORY_CATALOG_VERSION,
    schemaVersion: MARKET_MEMORY_SCHEMA_VERSION,
    generatedAt,
    memories,
  }
  productionMarketMemoryCatalog.replace(data)
  return data
}
