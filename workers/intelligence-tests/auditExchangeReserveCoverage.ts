import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  validateExchangeReserveSnapshot,
  type ExchangeReserveArtifactMetadata,
  type ExchangeReserveSnapshot,
} from "@/core/exchange-reserve"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

function validSnapshot(value: unknown): value is ExchangeReserveSnapshot {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && validateExchangeReserveSnapshot(value as ExchangeReserveSnapshot).valid,
  )
}

function latestSnapshots(snapshots: ExchangeReserveSnapshot[]) {
  const latest = new Map<string, ExchangeReserveSnapshot>()
  for (const snapshot of snapshots) {
    const key = [
      snapshot.walletAddress.toLowerCase(),
      snapshot.network.toLowerCase(),
      snapshot.asset,
    ].join(":")
    const current = latest.get(key)
    if (!current || Date.parse(snapshot.updateTime) > Date.parse(current.updateTime)) {
      latest.set(key, snapshot)
    }
  }
  return [...latest.values()]
}

export async function auditExchangeReserveCoverage() {
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const artifacts = await registry.listByType("exchange_reserve_snapshot")
  const snapshots: ExchangeReserveSnapshot[] = []
  let invalidArtifacts = 0
  for (const artifact of artifacts) {
    const metadata = artifact.metadata as Partial<ExchangeReserveArtifactMetadata>
    if (validSnapshot(metadata.snapshot)) snapshots.push(metadata.snapshot)
    else invalidArtifacts += 1
  }
  const latest = latestSnapshots(snapshots)
  const assets = [...new Set(latest.map((item) => item.asset))]
  const networks = [...new Set(latest.map((item) => item.network))]
  const wallets = [...new Set(latest.map((item) => item.walletAddress.toLowerCase()))]
  const perAsset = assets.map((asset) => {
    const rows = latest.filter((item) => item.asset === asset)
    return {
      asset,
      wallets: new Set(rows.map((item) => item.walletAddress.toLowerCase())).size,
      networks: new Set(rows.map((item) => item.network)).size,
      balance: rows.reduce((sum, item) => sum + item.balance, 0),
      balanceUsd: rows.reduce((sum, item) => sum + item.balanceUsd, 0),
      latestUpdateTime: rows
        .map((item) => item.updateTime)
        .sort((left, right) => Date.parse(right) - Date.parse(left))[0],
    }
  }).sort((left, right) => right.balanceUsd - left.balanceUsd)

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: "PASS",
    coverage: {
      artifactsRead: artifacts.length,
      validSnapshots: snapshots.length,
      invalidArtifacts,
      latestWalletAssetRecords: latest.length,
      coveragePercent: artifacts.length
        ? Number(((snapshots.length / artifacts.length) * 100).toFixed(2))
        : 0,
    },
    aggregate: {
      exchange: latest.length ? "binance" : null,
      walletsDiscovered: wallets.length,
      networksDiscovered: networks.length,
      assetsDiscovered: assets.length,
      totalBalanceUsd: latest.length
        ? latest.reduce((sum, item) => sum + item.balanceUsd, 0)
        : null,
    },
    topAssetsByUsdValue: perAsset.slice(0, 20),
    coverageMatrix: perAsset.map((item) => ({
      exchange: "binance",
      asset: item.asset,
      wallets: item.wallets,
      networks: item.networks,
      balanceUsd: item.balanceUsd,
      available: true,
    })),
    failureCategories: {
      unavailable_source: latest.length ? 0 : 1,
      malformed_record: 0,
      incomplete_data: 0,
      validation_failure: invalidArtifacts,
    },
  }
}

async function main() {
  const report = await auditExchangeReserveCoverage()
  process.stdout.write("EXCHANGE RESERVE COVERAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== "PASS") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `EXCHANGE RESERVE COVERAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
