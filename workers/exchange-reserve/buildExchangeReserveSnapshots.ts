import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  EXCHANGE_RESERVE_SCHEMA_VERSION,
  createExchangeReserveArtifact,
  exchangeReserveSnapshotId,
  validateExchangeReserveSnapshot,
  type ExchangeReserveSnapshot,
} from "@/core/exchange-reserve"
import { buildDeployableSnapshots } from "@/workers/data-snapshots/buildDeployableSnapshots"
import {
  fetchCmcBinanceExchangeReserves,
} from "@/lib/exchange-reserve/cmcExchangeReserveAdapter"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"
import {
  retainLatestDeployableSnapshot,
} from "@/core/historical-snapshots"

export async function buildExchangeReserveSnapshots(input: {
  artifactRoot?: string
} = {}) {
  const adapted = await fetchCmcBinanceExchangeReserves()
  if (!adapted.sourceFile.snapshots.length) {
    throw new Error("CMC Binance reserve source contains no valid snapshots.")
  }
  const generatedAt = new Date().toISOString()
  const snapshots: ExchangeReserveSnapshot[] = adapted.sourceFile.snapshots.map((item) => {
    const snapshot: ExchangeReserveSnapshot = {
      schemaVersion: EXCHANGE_RESERVE_SCHEMA_VERSION,
      snapshotId: exchangeReserveSnapshotId(item),
      exchange: "binance",
      walletAddress: item.walletAddress,
      network: item.network,
      asset: item.asset,
      balance: item.balance,
      balanceUsd: item.balanceUsd,
      updateTime: item.updateTime,
      source: adapted.sourceFile.source,
      quality: item.quality,
      generatedAt,
      metadata: item.metadata,
    }
    const validation = validateExchangeReserveSnapshot(snapshot)
    if (!validation.valid) {
      throw new Error(`Invalid Binance reserve snapshot: ${validation.errors.join(" ")}`)
    }
    return snapshot
  })
  const registry = new FileBackedIntelligenceArtifactRegistry(
    input.artifactRoot ? path.resolve(input.artifactRoot) : undefined,
  )
  let artifactsPublished = 0
  for (const snapshot of snapshots) {
    await registry.publish(createExchangeReserveArtifact(snapshot))
    artifactsPublished += 1
  }
  const deployableSnapshots = input.artifactRoot
    ? null
    : await buildDeployableSnapshots()
  const historicalRetention = input.artifactRoot
    ? null
    : await retainLatestDeployableSnapshot({
        dataset: "exchange-reserve",
        artifactFile: "exchange-reserve-latest.json",
      })
  return {
    source: adapted.sourceFile.source,
    generatedAt,
    report: adapted.report,
    artifactsPublished,
    topAssetsByUsdValue: Object.entries(
      snapshots.reduce<Record<string, number>>((totals, snapshot) => {
        totals[snapshot.asset] = (totals[snapshot.asset] ?? 0) + snapshot.balanceUsd
        return totals
      }, {}),
    )
      .map(([asset, balanceUsd]) => ({ asset, balanceUsd }))
      .sort((left, right) => right.balanceUsd - left.balanceUsd)
      .slice(0, 20),
    deployableSnapshots,
    historicalRetention,
  }
}

async function main() {
  const result = await buildExchangeReserveSnapshots()
  process.stdout.write("EXCHANGE RESERVE BUILD\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `EXCHANGE RESERVE BUILD FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
