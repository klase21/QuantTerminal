import path from "node:path"
import { fileURLToPath } from "node:url"

import type { VerifiedEventCategory } from "@/core/event-catalog"
import type { CanonicalExchange } from "@/core/historical-intelligence/market-data"
import {
  DEFAULT_DURABLE_ARTIFACT_ROOT,
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"
import {
  buildIntelligenceSuite,
  type IntelligenceSuiteBuildInput,
} from "@/lib/intelligence-production"

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function inputFromArguments(): IntelligenceSuiteBuildInput {
  const interval = argument("interval")
  if (interval && interval !== "1h" && interval !== "4h" && interval !== "1d") {
    throw new Error("interval must be 1h, 4h, or 1d.")
  }
  const limit = Number(argument("limit"))
  return {
    historicalAnalog: {
      file: argument("historical-file")
        ?? path.join(process.cwd(), ".data", "historical", "market_ohlcv.json"),
      symbol: argument("symbol") ?? "BTCUSDT",
      interval: (interval ?? "1h") as "1h" | "4h" | "1d",
      asOf: argument("as-of"),
      enrichmentFile: argument("enrichment-file"),
      limit: Number.isInteger(limit) && limit > 0 ? limit : 25,
    },
    eventImpact: {
      category: (argument("event-category") ?? "macro") as VerifiedEventCategory,
      symbol: argument("event-symbol") ?? argument("symbol") ?? "BTCUSDT",
      exchange: (argument("event-exchange") ?? "binance_futures") as CanonicalExchange,
    },
  }
}

async function main() {
  const durable = process.argv.includes("--durable")
  const artifactRoot = argument("artifact-root") ?? DEFAULT_DURABLE_ARTIFACT_ROOT
  const report = await buildIntelligenceSuite(
    inputFromArguments(),
    durable
      ? {
          artifactRegistry: new FileBackedIntelligenceArtifactRegistry(artifactRoot),
          publicationTarget: `file:${path.resolve(artifactRoot)}`,
        }
      : undefined,
  )
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status === "failed") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
