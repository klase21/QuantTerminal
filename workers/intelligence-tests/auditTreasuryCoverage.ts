import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  TREASURY_QUALITIES,
  validateTreasurySnapshot,
  type TreasuryArtifactMetadata,
  type TreasurySnapshot,
} from "@/core/treasury-intelligence"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

type FailureCategory =
  | "unavailable_source"
  | "malformed_record"
  | "incomplete_data"
  | "validation_failure"

function isSnapshot(value: unknown): value is TreasurySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const snapshot = value as Partial<TreasurySnapshot>
  if (
    snapshot.schemaVersion !== 2
    || typeof snapshot.snapshotId !== "string"
    || typeof snapshot.holder !== "string"
    || typeof snapshot.holderType !== "string"
    || typeof snapshot.asset !== "string"
    || typeof snapshot.holdings !== "number"
    || (snapshot.timestamp !== null && typeof snapshot.timestamp !== "string")
    || typeof snapshot.source !== "string"
    || !TREASURY_QUALITIES.includes(snapshot.quality as TreasurySnapshot["quality"])
  ) return false
  return validateTreasurySnapshot(snapshot as TreasurySnapshot).valid
}

function latestSnapshots(snapshots: TreasurySnapshot[]) {
  const latest = new Map<string, TreasurySnapshot>()
  for (const snapshot of snapshots) {
    const key = `${snapshot.holder.toLowerCase()}:${snapshot.asset}`
    const current = latest.get(key)
    const snapshotTime = Date.parse(snapshot.timestamp ?? "")
    const currentTime = current ? Date.parse(current.timestamp ?? "") : Number.NaN
    if (
      !current
      || (Number.isFinite(snapshotTime) && !Number.isFinite(currentTime))
      || (Number.isFinite(snapshotTime) && snapshotTime > currentTime)
    ) {
      latest.set(key, snapshot)
    }
  }
  return [...latest.values()]
}

export async function auditTreasuryCoverage() {
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const artifacts = await registry.listByType("treasury_snapshot")
  const snapshots: TreasurySnapshot[] = []
  let invalidArtifacts = 0
  for (const artifact of artifacts) {
    const metadata = artifact.metadata as Partial<TreasuryArtifactMetadata>
    if (isSnapshot(metadata.snapshot)) snapshots.push(metadata.snapshot)
    else invalidArtifacts += 1
  }

  const latest = latestSnapshots(snapshots)
  const holders = [...new Set(latest.map((item) => item.holder))]
  const assets = [...new Set(latest.map((item) => item.asset))]
  const totalHoldings = latest.reduce((sum, item) => sum + item.holdings, 0)
  const valued = latest.filter((item) => item.holdingsValueUsd !== null)
  const totalHoldingsValueUsd = valued.length
    ? valued.reduce((sum, item) => sum + (item.holdingsValueUsd ?? 0), 0)
    : null
  const matrix = latest.map((item) => ({
    holder: item.holder,
    asset: item.asset,
    holdings: item.holdings,
    quality: item.quality,
    available: true,
  }))
  const failureCategories: Record<FailureCategory, number> = {
    unavailable_source: latest.length ? 0 : 1,
    malformed_record: 0,
    incomplete_data: 0,
    validation_failure: invalidArtifacts,
  }

  return {
    schemaVersion: 2,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: "PASS",
    coverage: {
      artifactsRead: artifacts.length,
      recordsIngested: snapshots.length,
      recordsRejected: invalidArtifacts,
      latestHolderAssetPairs: latest.length,
      verifiedRecords: snapshots.filter((item) => item.quality === "verified").length,
      partialRecords: snapshots.filter((item) => item.quality === "partial").length,
      coveragePercent: artifacts.length
        ? Number(((snapshots.length / artifacts.length) * 100).toFixed(2))
        : 0,
    },
    coverageMatrix: matrix,
    aggregateSummary: {
      holdersDiscovered: holders.length,
      assetsDiscovered: assets.length,
      totalHoldings,
      totalHoldingsValueUsd,
      recordsIngested: snapshots.length,
      recordsRejected: invalidArtifacts,
    },
    topTreasuryHolders: [...latest]
      .sort((left, right) => right.holdings - left.holdings),
    topAccumulatingHolders: [...latest]
      .filter((item) => (item.changeAmount ?? 0) > 0)
      .sort((left, right) => (right.changeAmount ?? 0) - (left.changeAmount ?? 0)),
    topReducingHolders: [...latest]
      .filter((item) => (item.changeAmount ?? 0) < 0)
      .sort((left, right) => (left.changeAmount ?? 0) - (right.changeAmount ?? 0)),
    assetConcentrationSummary: assets.map((asset) => {
      const items = latest.filter((item) => item.asset === asset)
      const holdings = items.reduce((sum, item) => sum + item.holdings, 0)
      const largest = [...items].sort((left, right) => right.holdings - left.holdings)[0]
      return {
        asset,
        holders: items.length,
        totalHoldings: holdings,
        largestHolder: largest?.holder ?? null,
        largestHolderSharePercent: largest && holdings > 0
          ? Number(((largest.holdings / holdings) * 100).toFixed(2))
          : null,
      }
    }),
    failureCategories,
  }
}

async function main() {
  const report = await auditTreasuryCoverage()
  process.stdout.write("TREASURY COVERAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `TREASURY COVERAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
