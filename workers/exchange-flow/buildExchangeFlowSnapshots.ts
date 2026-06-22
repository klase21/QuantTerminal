import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  EXCHANGE_FLOW_SCHEMA_VERSION,
  createExchangeFlowArtifact,
  exchangeFlowSnapshotId,
  isExchangeFlowSourceFile,
  validateExchangeFlowSnapshot,
  type ExchangeFlowSnapshot,
} from "@/core/exchange-flow"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

export async function buildExchangeFlowSnapshots(input: {
  file: string
  artifactRoot?: string
}) {
  const raw = await readFile(path.resolve(input.file), "utf8")
  const parsed: unknown = JSON.parse(raw)
  if (!isExchangeFlowSourceFile(parsed)) {
    throw new Error("Exchange Flow source file does not match schema version 1.")
  }
  if (!parsed.snapshots.length) {
    throw new Error("Exchange Flow source file contains no snapshots.")
  }
  const generatedAt = new Date().toISOString()
  const snapshots: ExchangeFlowSnapshot[] = parsed.snapshots.map((item) => {
    const snapshot: ExchangeFlowSnapshot = {
      schemaVersion: EXCHANGE_FLOW_SCHEMA_VERSION,
      snapshotId: exchangeFlowSnapshotId(item),
      exchange: item.exchange.trim().toLowerCase(),
      asset: item.asset.trim().toUpperCase(),
      holdings: item.holdings,
      inflow: item.inflow,
      outflow: item.outflow,
      netFlow: item.netFlow ?? item.inflow - item.outflow,
      timestamp: new Date(item.timestamp).toISOString(),
      source: parsed.source,
      sourceQuality: item.sourceQuality,
      generatedAt,
      metadata: item.metadata,
    }
    const validation = validateExchangeFlowSnapshot(snapshot)
    if (!validation.valid) {
      throw new Error(
        `Invalid ${snapshot.exchange}/${snapshot.asset} snapshot: ${validation.errors.join(" ")}`,
      )
    }
    return snapshot
  })
  const registry = new FileBackedIntelligenceArtifactRegistry(
    input.artifactRoot
      ? path.resolve(input.artifactRoot)
      : undefined,
  )
  const published = []
  for (const snapshot of snapshots) {
    const result = await registry.publish(createExchangeFlowArtifact(snapshot))
    published.push({
      artifactId: result.artifact.id,
      replaced: result.replaced,
      exchange: snapshot.exchange,
      asset: snapshot.asset,
      timestamp: snapshot.timestamp,
    })
  }
  return { source: parsed.source, generatedAt, published }
}

async function main() {
  const file = argument("file")
  if (!file) {
    throw new Error(
      "Usage: --file <versioned-exchange-flow-source.json> [--artifact-root <path>]",
    )
  }
  const result = await buildExchangeFlowSnapshots({
    file,
    artifactRoot: argument("artifact-root"),
  })
  process.stdout.write("EXCHANGE FLOW BUILD\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `EXCHANGE FLOW BUILD FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
