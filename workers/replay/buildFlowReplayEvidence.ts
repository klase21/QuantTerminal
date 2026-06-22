import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  createFlowReplayArtifact,
} from "@/core/flow-replay"
import type {
  CanonicalExchange,
  CanonicalMarketInterval,
} from "@/core/historical-intelligence/market-data/canonicalMarketDataTypes"
import { buildFlowReplayEvidence } from "@/lib/flow-replay/buildFlowReplayEvidence"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function required(name: string, fallback?: string) {
  const value = argument(name) ?? fallback
  if (!value?.trim()) throw new Error(`Missing required --${name} argument.`)
  return value.trim()
}

export async function buildAndPublishFlowReplay() {
  const hour = Number(required("hour", "12"))
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Flow Replay hour must be an integer from 0 through 23.")
  }
  const flowReplay = await buildFlowReplayEvidence({
    exchange: required("exchange", "binance_futures") as CanonicalExchange,
    symbol: required("symbol", "BTCUSDT"),
    date: required("date", "2026-02-22"),
    hour,
    timeframe: required("timeframe", "1h") as CanonicalMarketInterval,
  })
  const artifact = createFlowReplayArtifact(flowReplay)
  const publication = await new FileBackedIntelligenceArtifactRegistry().publish(artifact)

  return {
    artifactId: publication.artifact.id,
    replaced: publication.replaced,
    generatedAt: publication.artifact.generatedAt,
    whatMoved: flowReplay.whatMoved,
    sourceQuality: Object.fromEntries(
      flowReplay.sources.map((item) => [item.kind, item.quality]),
    ),
    marketStructureChanges: flowReplay.marketStructureChanges,
  }
}

async function main() {
  const result = await buildAndPublishFlowReplay()
  process.stdout.write("FLOW REPLAY BUILD\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `FLOW REPLAY BUILD FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
