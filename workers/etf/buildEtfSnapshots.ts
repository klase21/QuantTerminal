import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  ETF_SNAPSHOT_SCHEMA_VERSION,
  createEtfSnapshotArtifact,
  etfSnapshotId,
  isEtfSourceFile,
  validateEtfSnapshot,
  type EtfSnapshot,
  type EtfSourceFile,
} from "@/core/etf-intelligence"
import { getEtfFlows } from "@/lib/data-sources/etfFlowClient"
import {
  fetchCmcEtf,
  type CmcEtfAdapterReport,
} from "@/lib/etf/cmcEtfAdapter"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function farsideSourceFile(): Promise<EtfSourceFile> {
  const result = await getEtfFlows()
  if (!result.ok || !result.flows.length) {
    throw new Error(result.unavailableReason ?? "Farside ETF flow source is unavailable.")
  }
  return {
    schemaVersion: ETF_SNAPSHOT_SCHEMA_VERSION,
    source: result.source,
    snapshots: result.flows.map((flow) => {
      const timestamp = Date.parse(flow.sourceDate)
      if (!Number.isFinite(timestamp)) {
        throw new Error(`Farside source date is invalid: ${flow.sourceDate}.`)
      }
      return {
        asset: flow.asset,
        timestamp: new Date(timestamp).toISOString(),
        netInflowUsd: flow.netFlow * 1_000_000,
        inflowUsd: null,
        outflowUsd: null,
        holdings: null,
        holdingsValueUsd: null,
        quality: flow.isStale ? "degraded" : "verified",
        metadata: {
          adapter: "farside-etf-flow-v1",
          sourceUrl: flow.sourceUrl,
          sourceUnit: flow.unit,
          sourceValue: flow.netFlow,
          trend1d: flow.trend1d ?? null,
        },
      }
    }),
  }
}

export async function buildEtfSnapshots(input: {
  file?: string
  sourceFile?: unknown
  adapterReport?: CmcEtfAdapterReport
  artifactRoot?: string
}) {
  const parsed: unknown = input.sourceFile ?? (
    input.file
      ? JSON.parse(await readFile(path.resolve(input.file), "utf8"))
      : null
  )
  if (!isEtfSourceFile(parsed)) {
    throw new Error("ETF source file does not match schema version 1.")
  }
  if (!parsed.snapshots.length) {
    throw new Error("ETF source contains no complete snapshots.")
  }

  const generatedAt = new Date().toISOString()
  const snapshots: EtfSnapshot[] = parsed.snapshots.map((item) => {
    const snapshot: EtfSnapshot = {
      schemaVersion: ETF_SNAPSHOT_SCHEMA_VERSION,
      snapshotId: etfSnapshotId(item),
      asset: item.asset.trim().toUpperCase(),
      timestamp: new Date(item.timestamp).toISOString(),
      netInflowUsd: item.netInflowUsd ?? null,
      inflowUsd: item.inflowUsd ?? null,
      outflowUsd: item.outflowUsd ?? null,
      holdings: item.holdings ?? null,
      holdingsValueUsd: item.holdingsValueUsd ?? null,
      source: parsed.source,
      quality: item.quality,
      generatedAt,
      metadata: item.metadata,
    }
    const validation = validateEtfSnapshot(snapshot)
    if (!validation.valid) {
      throw new Error(`Invalid ${snapshot.asset} ETF snapshot: ${validation.errors.join(" ")}`)
    }
    return snapshot
  })

  const registry = new FileBackedIntelligenceArtifactRegistry(
    input.artifactRoot ? path.resolve(input.artifactRoot) : undefined,
  )
  const published = []
  for (const snapshot of snapshots) {
    const result = await registry.publish(createEtfSnapshotArtifact(snapshot))
    published.push({
      artifactId: result.artifact.id,
      replaced: result.replaced,
      asset: snapshot.asset,
      timestamp: snapshot.timestamp,
    })
  }
  return {
    source: parsed.source,
    generatedAt,
    adapterReport: input.adapterReport,
    published,
  }
}

async function main() {
  const file = argument("file")
  const useCmc = process.argv.includes("--cmc")
  const useFarside = process.argv.includes("--farside")
  if (!file && !useCmc && !useFarside) {
    throw new Error(
      "Usage: --file <etf-source.json>, --farside, or --cmc --endpoint <url> [--asset <symbol>] [--artifact-root <path>]",
    )
  }

  let sourceFile: unknown
  let adapterReport: CmcEtfAdapterReport | undefined
  if (useCmc) {
    const apiKey = process.env.CMC_API_KEY ?? process.env.CMC_PRO_API_KEY
    if (!apiKey) throw new Error("CMC_API_KEY or CMC_PRO_API_KEY is not configured.")
    const adapted = await fetchCmcEtf({
      apiKey,
      endpoint: argument("endpoint"),
      asset: argument("asset"),
    })
    sourceFile = adapted.sourceFile
    adapterReport = adapted.report
  } else if (useFarside) {
    sourceFile = await farsideSourceFile()
  }

  const result = await buildEtfSnapshots({
    file,
    sourceFile,
    adapterReport,
    artifactRoot: argument("artifact-root"),
  })
  process.stdout.write("ETF SNAPSHOT BUILD\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `ETF SNAPSHOT BUILD FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
