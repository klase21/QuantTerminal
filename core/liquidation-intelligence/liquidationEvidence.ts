import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import {
  LIQUIDATION_EVIDENCE_DATASET_ID,
  LIQUIDATION_EVIDENCE_NAMESPACE,
  LIQUIDATION_EVIDENCE_SCHEMA_VERSION,
  liquidationEvidenceCacheIdentity,
  type LiquidationEvidence,
  type LiquidationEvidenceCacheMetadata,
  type LiquidationEvidenceCoordinates,
} from "./liquidationEvidenceTypes"
import { readHistoricalCache } from "@/lib/historical-intelligence/cache/fileCacheStore"
import { HISTORICAL_CACHE_ROOT } from "@/lib/historical-intelligence/cache/cachePaths"

export function readLiquidationEvidence(
  coordinates: LiquidationEvidenceCoordinates,
) {
  return readHistoricalCache<
    LiquidationEvidence,
    LiquidationEvidenceCacheMetadata
  >(
    liquidationEvidenceCacheIdentity(coordinates),
    {
      expectedSchemaVersion: LIQUIDATION_EVIDENCE_SCHEMA_VERSION,
      allowExpired: false,
      allowPartial: true,
    },
  )
}

async function manifestFiles(root: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }
  const files: string[] = []
  for (const entry of entries) {
    const file = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...await manifestFiles(file))
    } else if (entry.isFile() && entry.name === "manifest.json") {
      files.push(file)
    }
  }
  return files
}

export async function listLiquidationEvidence(input: {
  exchange: string
  symbol: string
}) {
  const exchange = input.exchange.trim().toLowerCase()
  const symbol = input.symbol.trim().toUpperCase()
  const root = path.join(
    HISTORICAL_CACHE_ROOT,
    LIQUIDATION_EVIDENCE_NAMESPACE,
    LIQUIDATION_EVIDENCE_DATASET_ID,
  )
  const evidence: LiquidationEvidence[] = []
  for (const file of await manifestFiles(root)) {
    try {
      const manifest = JSON.parse(await readFile(file, "utf8")) as {
        identity?: {
          namespace?: string
          datasetId?: string
          partition?: Record<string, string>
        }
      }
      const partition = manifest.identity?.partition
      if (
        manifest.identity?.namespace !== LIQUIDATION_EVIDENCE_NAMESPACE
        || manifest.identity?.datasetId !== LIQUIDATION_EVIDENCE_DATASET_ID
        || partition?.scope !== "symbol"
        || partition.exchange !== exchange
        || partition.symbol !== symbol
        || !partition.date
        || !partition.hour
      ) continue
      const result = await readLiquidationEvidence({
        exchange,
        symbol,
        date: partition.date,
        hour: Number(partition.hour),
        scope: "symbol",
      })
      if (result.ok) evidence.push(result.data)
    } catch {
      // Invalid entries are ignored; callers receive only validated cache data.
    }
  }
  return evidence.sort((left, right) => (
    Date.parse(right.window.end) - Date.parse(left.window.end)
  ))
}

export async function readLatestLiquidationEvidence(input: {
  exchange: string
  symbol: string
}) {
  return (await listLiquidationEvidence(input))[0] ?? null
}
