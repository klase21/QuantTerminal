import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  TREASURY_SNAPSHOT_SCHEMA_VERSION,
  createTreasurySnapshotArtifact,
  isTreasurySourceFile,
  treasurySnapshotId,
  validateTreasurySnapshot,
  type TreasurySnapshot,
} from "@/core/treasury-intelligence"
import {
  fetchCmcTreasury,
  type CmcTreasuryAdapterReport,
} from "@/lib/treasury/cmcTreasuryAdapter"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function loadLocalEnvironment() {
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env.local"))
  } catch {
    // Explicit process environment remains supported when no local file exists.
  }
}

export async function buildTreasurySnapshots(input: {
  file?: string
  sourceFile?: unknown
  adapterReport?: CmcTreasuryAdapterReport
  artifactRoot?: string
}) {
  const parsed: unknown = input.sourceFile ?? (
    input.file
      ? JSON.parse(await readFile(path.resolve(input.file), "utf8"))
      : null
  )
  if (!isTreasurySourceFile(parsed)) {
    throw new Error("Treasury source file does not match schema version 2.")
  }
  if (!parsed.snapshots.length) {
    throw new Error("Treasury source contains no complete snapshots.")
  }

  const generatedAt = new Date().toISOString()
  const snapshots: TreasurySnapshot[] = parsed.snapshots.map((item) => {
    const snapshot: TreasurySnapshot = {
      schemaVersion: TREASURY_SNAPSHOT_SCHEMA_VERSION,
      snapshotId: treasurySnapshotId(item),
      holder: item.holder.trim(),
      holderType: item.holderType?.trim() || "unknown",
      asset: item.asset.trim().toUpperCase(),
      holdings: item.holdings,
      holdingsValueUsd: item.holdingsValueUsd ?? null,
      changeAmount: item.changeAmount ?? null,
      changePercent: item.changePercent ?? null,
      timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : null,
      source: parsed.source,
      quality: item.holderType?.trim() ? item.quality : (
        item.quality === "verified" ? "degraded" : item.quality
      ),
      generatedAt,
      metadata: item.metadata,
    }
    const validation = validateTreasurySnapshot(snapshot)
    if (!validation.valid) {
      throw new Error(
        `Invalid ${snapshot.holder}/${snapshot.asset} snapshot: ${validation.errors.join(" ")}`,
      )
    }
    return snapshot
  })

  const registry = new FileBackedIntelligenceArtifactRegistry(
    input.artifactRoot ? path.resolve(input.artifactRoot) : undefined,
  )
  const published = []
  for (const snapshot of snapshots) {
    const result = await registry.publish(createTreasurySnapshotArtifact(snapshot))
    published.push({
      artifactId: result.artifact.id,
      replaced: result.replaced,
      holder: snapshot.holder,
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
  loadLocalEnvironment()
  const file = argument("file")
  const useCmc = process.argv.includes("--cmc")
  if (!file && !useCmc) {
    throw new Error(
      "Usage: --file <treasury-source.json> or --cmc --endpoint <url> [--asset <symbol>] [--artifact-root <path>]",
    )
  }
  let result
  if (useCmc) {
    const apiKey = process.env.CMC_API_KEY ?? process.env.CMC_PRO_API_KEY
    if (!apiKey) throw new Error("CMC_API_KEY or CMC_PRO_API_KEY is not configured.")
    const adapted = await fetchCmcTreasury({
      apiKey,
      endpoint: argument("endpoint"),
      asset: argument("asset"),
    })
    result = await buildTreasurySnapshots({
      sourceFile: adapted.sourceFile,
      adapterReport: adapted.report,
      artifactRoot: argument("artifact-root"),
    })
  } else {
    result = await buildTreasurySnapshots({
      file,
      artifactRoot: argument("artifact-root"),
    })
  }
  process.stdout.write("TREASURY SNAPSHOT BUILD\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `TREASURY SNAPSHOT BUILD FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
