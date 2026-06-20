import path from "node:path"
import { fileURLToPath } from "node:url"

import type { IntelligenceArtifact } from "@/core/intelligence-artifacts"
import {
  publishEventImpactArtifact,
  publishHistoricalAnalogArtifact,
  publishReplayEvidenceArtifact,
} from "@/lib/intelligence-artifacts/publishPreparedIntelligence"
import {
  productionIntelligenceArtifactReader,
} from "@/lib/intelligence-artifacts/productionRegistry"
import { buildMarketMemoryCatalog } from "@/lib/market-memory/buildMarketMemoryCatalog"
import { productionMarketMemoryCatalog } from "@/lib/market-memory/productionMarketMemoryCatalog"

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

export async function buildPreparedMarketMemoryCatalog() {
  const artifactIds: string[] = []
  const historicalSymbol = argument("historical-symbol")
  const historicalInterval = argument("historical-interval")
  if (historicalSymbol && (historicalInterval === "1h" || historicalInterval === "4h" || historicalInterval === "1d")) {
    const published = await publishHistoricalAnalogArtifact({
      symbol: historicalSymbol,
      interval: historicalInterval,
    })
    artifactIds.push(published.artifact.id)
  }

  const eventCategory = argument("event-category")
  const eventSymbol = argument("event-symbol")
  const eventExchange = argument("event-exchange")
  if (eventCategory && eventSymbol && eventExchange) {
    const published = await publishEventImpactArtifact({
      category: eventCategory,
      symbol: eventSymbol,
      exchange: eventExchange,
    })
    artifactIds.push(published.artifact.id)
  }

  const replayExchange = argument("replay-exchange")
  const replaySymbol = argument("replay-symbol")
  const replayDate = argument("replay-date")
  const replayHour = Number(argument("replay-hour"))
  if (
    replayExchange
    && replaySymbol
    && replayDate
    && Number.isInteger(replayHour)
    && replayHour >= 0
    && replayHour <= 23
  ) {
    const published = await publishReplayEvidenceArtifact({
      exchange: replayExchange,
      symbol: replaySymbol,
      date: replayDate,
      hour: replayHour,
    })
    artifactIds.push(published.artifact.id)
  }

  if (!artifactIds.length) {
    throw new Error("Provide prepared artifact coordinates for Market Memory generation.")
  }

  const artifacts: IntelligenceArtifact[] = []
  for (const artifactId of artifactIds) {
    const result = await productionIntelligenceArtifactReader.read(artifactId)
    if (result.ok) artifacts.push(result.artifact)
  }
  const catalog = buildMarketMemoryCatalog(artifacts)
  const lookups = catalog.memories.map((memory) => ({
    memoryId: memory.memoryId,
    found: Boolean(productionMarketMemoryCatalog.getById(memory.memoryId)),
    categoryCount: productionMarketMemoryCatalog.findByCategory(memory.memoryType).length,
    symbolCount: memory.symbols?.[0]
      ? productionMarketMemoryCatalog.findBySymbol(memory.symbols[0]).length
      : 0,
  }))

  return {
    artifactIds,
    generatedAt: catalog.generatedAt,
    memoryCount: catalog.memories.length,
    memories: catalog.memories,
    lookups,
  }
}

async function main() {
  const result = await buildPreparedMarketMemoryCatalog()
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
