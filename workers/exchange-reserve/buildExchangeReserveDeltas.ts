import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  EXCHANGE_RESERVE_DELTA_SCHEMA_VERSION,
  createExchangeReserveDeltaArtifact,
  exchangeReserveDeltaId,
  validateExchangeReserveDelta,
  type ExchangeReserveDelta,
} from "@/core/exchange-reserve-delta"
import {
  validateExchangeReserveSnapshot,
  type ExchangeReserveArtifactMetadata,
  type ExchangeReserveSnapshot,
} from "@/core/exchange-reserve"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"
import { buildDeployableSnapshots } from "@/workers/data-snapshots/buildDeployableSnapshots"

interface AssetAggregate {
  asset: string
  observedAt: string
  balance: number
  balanceUsd: number
}

function reserveSnapshots(
  artifacts: Awaited<ReturnType<FileBackedIntelligenceArtifactRegistry["listByType"]>>,
) {
  return artifacts.flatMap((artifact) => {
    const snapshot = (
      artifact.metadata as Partial<ExchangeReserveArtifactMetadata>
    ).snapshot
    return snapshot && validateExchangeReserveSnapshot(snapshot).valid
      ? [snapshot]
      : []
  })
}

function aggregateByAssetAndTime(snapshots: ExchangeReserveSnapshot[]) {
  const aggregates = new Map<string, AssetAggregate>()
  for (const snapshot of snapshots) {
    const key = `${snapshot.asset}:${snapshot.updateTime}`
    const current = aggregates.get(key)
    aggregates.set(key, {
      asset: snapshot.asset,
      observedAt: snapshot.updateTime,
      balance: (current?.balance ?? 0) + snapshot.balance,
      balanceUsd: (current?.balanceUsd ?? 0) + snapshot.balanceUsd,
    })
  }
  return [...aggregates.values()]
}

function buildDelta(
  current: AssetAggregate,
  previous: AssetAggregate | undefined,
  generatedAt: string,
): ExchangeReserveDelta {
  const available = previous !== undefined
  const balanceDelta = available ? current.balance - previous.balance : null
  const balanceUsdDelta = available ? current.balanceUsd - previous.balanceUsd : null
  const balanceDeltaPct = available && previous.balance !== 0
    ? (balanceDelta! / previous.balance) * 100
    : available && current.balance === 0
      ? 0
      : null
  const status = available && balanceDeltaPct !== null
    ? "available" as const
    : "unavailable" as const
  const delta: ExchangeReserveDelta = {
    schemaVersion: EXCHANGE_RESERVE_DELTA_SCHEMA_VERSION,
    deltaId: exchangeReserveDeltaId({
      exchange: "binance",
      asset: current.asset,
      currentObservedAt: current.observedAt,
    }),
    exchange: "binance",
    asset: current.asset,
    currentBalance: current.balance,
    currentBalanceUsd: current.balanceUsd,
    currentObservedAt: current.observedAt,
    previousBalance: status === "available" ? previous!.balance : null,
    previousBalanceUsd: status === "available" ? previous!.balanceUsd : null,
    previousObservedAt: status === "available" ? previous!.observedAt : null,
    balanceDelta: status === "available" ? balanceDelta : null,
    balanceDeltaPct: status === "available" ? balanceDeltaPct : null,
    balanceUsdDelta: status === "available" ? balanceUsdDelta : null,
    status,
    reason: status === "available"
      ? null
      : available
        ? "Previous aggregate balance is zero, so percentage change is undefined."
        : "Previous reserve snapshot unavailable.",
    source: "exchange_reserve_snapshot",
    generatedAt,
  }
  const validation = validateExchangeReserveDelta(delta)
  if (!validation.valid) {
    throw new Error(`Invalid ${delta.asset} reserve delta: ${validation.errors.join(" ")}`)
  }
  return delta
}

export async function buildExchangeReserveDeltas(input: {
  artifactRoot?: string
} = {}) {
  const registry = new FileBackedIntelligenceArtifactRegistry(
    input.artifactRoot ? path.resolve(input.artifactRoot) : undefined,
  )
  const snapshots = reserveSnapshots(
    await registry.listByType("exchange_reserve_snapshot"),
  )
  if (!snapshots.length) {
    throw new Error("No durable Binance reserve snapshots are available.")
  }
  const generatedAt = new Date().toISOString()
  const aggregates = aggregateByAssetAndTime(snapshots)
  const assets = [...new Set(aggregates.map((item) => item.asset))].sort()
  const deltas = assets.map((asset) => {
    const history = aggregates
      .filter((item) => item.asset === asset)
      .sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt))
    return buildDelta(history[0], history[1], generatedAt)
  })
  let artifactsPublished = 0
  for (const delta of deltas) {
    await registry.publish(createExchangeReserveDeltaArtifact(delta))
    artifactsPublished += 1
  }
  const available = deltas.filter((item) => item.status === "available")
  const deployableSnapshots = input.artifactRoot
    ? null
    : await buildDeployableSnapshots()
  return {
    generatedAt,
    snapshotsRead: snapshots.length,
    distinctObservationTimes: [...new Set(snapshots.map((item) => item.updateTime))].length,
    assetsEvaluated: deltas.length,
    availableDeltas: available.length,
    unavailableDeltas: deltas.length - available.length,
    artifactsPublished,
    topIncreasesByUsd: [...available]
      .sort((left, right) => right.balanceUsdDelta! - left.balanceUsdDelta!)
      .slice(0, 20),
    topDecreasesByUsd: [...available]
      .sort((left, right) => left.balanceUsdDelta! - right.balanceUsdDelta!)
      .slice(0, 20),
    topIncreasesByQuantity: [...available]
      .sort((left, right) => right.balanceDelta! - left.balanceDelta!)
      .slice(0, 20),
    topDecreasesByQuantity: [...available]
      .sort((left, right) => left.balanceDelta! - right.balanceDelta!)
      .slice(0, 20),
    deployableSnapshots,
  }
}

async function main() {
  const result = await buildExchangeReserveDeltas()
  process.stdout.write("EXCHANGE RESERVE DELTA BUILD\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `EXCHANGE RESERVE DELTA BUILD FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
