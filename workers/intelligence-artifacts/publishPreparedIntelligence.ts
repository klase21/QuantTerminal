import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  publishEventImpactArtifact,
  publishHistoricalAnalogArtifact,
  publishReplayEvidenceArtifact,
} from "@/lib/intelligence-artifacts/publishPreparedIntelligence"
import {
  productionIntelligenceArtifactReader,
} from "@/lib/intelligence-artifacts/productionRegistry"

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

export async function publishPreparedIntelligence() {
  const published: string[] = []

  const historicalSymbol = argument("historical-symbol")
  const historicalInterval = argument("historical-interval")
  if (historicalSymbol && (historicalInterval === "1h" || historicalInterval === "4h" || historicalInterval === "1d")) {
    const result = await publishHistoricalAnalogArtifact({
      symbol: historicalSymbol,
      interval: historicalInterval,
    })
    published.push(result.artifact.id)
  }

  const eventCategory = argument("event-category")
  const eventSymbol = argument("event-symbol")
  const eventExchange = argument("event-exchange")
  if (eventCategory && eventSymbol && eventExchange) {
    const result = await publishEventImpactArtifact({
      category: eventCategory,
      symbol: eventSymbol,
      exchange: eventExchange,
    })
    published.push(result.artifact.id)
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
    const result = await publishReplayEvidenceArtifact({
      exchange: replayExchange,
      symbol: replaySymbol,
      date: replayDate,
      hour: replayHour,
    })
    published.push(result.artifact.id)
  }

  if (!published.length) {
    throw new Error(
      "Provide Historical Analog, Event Impact, or Replay cache coordinates for publication.",
    )
  }

  const retrieved = []
  for (const id of published) {
    const result = await productionIntelligenceArtifactReader.read(id)
    retrieved.push({
      id,
      state: result.state,
      type: result.ok ? result.artifact.type : null,
    })
  }
  const discovery = await productionIntelligenceArtifactReader.search({
    ids: published,
    limit: published.length,
  })

  return {
    published,
    retrieved,
    discovered: discovery.artifacts.map((artifact) => artifact.id),
  }
}

async function main() {
  const result = await publishPreparedIntelligence()
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
