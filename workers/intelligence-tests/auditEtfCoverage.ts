import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  ETF_QUALITIES,
  validateEtfSnapshot,
  type EtfArtifactMetadata,
  type EtfSnapshot,
} from "@/core/etf-intelligence"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

type FailureCategory =
  | "unavailable_source"
  | "malformed_record"
  | "incomplete_data"
  | "validation_failure"
  | "unknown"

function isSnapshot(value: unknown): value is EtfSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const snapshot = value as Partial<EtfSnapshot>
  if (
    snapshot.schemaVersion !== 1
    || typeof snapshot.snapshotId !== "string"
    || typeof snapshot.asset !== "string"
    || typeof snapshot.timestamp !== "string"
    || typeof snapshot.source !== "string"
    || !ETF_QUALITIES.includes(snapshot.quality as EtfSnapshot["quality"])
  ) return false
  return validateEtfSnapshot(snapshot as EtfSnapshot).valid
}

function latestSnapshots(snapshots: EtfSnapshot[]) {
  const latest = new Map<string, EtfSnapshot>()
  for (const snapshot of snapshots) {
    const current = latest.get(snapshot.asset)
    if (!current || Date.parse(snapshot.timestamp) > Date.parse(current.timestamp)) {
      latest.set(snapshot.asset, snapshot)
    }
  }
  return [...latest.values()]
}

export async function auditEtfCoverage() {
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const artifacts = await registry.listByType("etf_snapshot")
  const snapshots: EtfSnapshot[] = []
  let invalidArtifacts = 0
  for (const artifact of artifacts) {
    const metadata = artifact.metadata as Partial<EtfArtifactMetadata>
    if (isSnapshot(metadata.snapshot)) snapshots.push(metadata.snapshot)
    else invalidArtifacts += 1
  }

  const latest = latestSnapshots(snapshots)
  const netFlowRows = latest.filter((item) => item.netInflowUsd !== null)
  const valuedRows = latest.filter((item) => item.holdingsValueUsd !== null)
  const totalNetInflowUsd = netFlowRows.length
    ? netFlowRows.reduce((sum, item) => sum + (item.netInflowUsd ?? 0), 0)
    : null
  const totalHoldingsValueUsd = valuedRows.length
    ? valuedRows.reduce((sum, item) => sum + (item.holdingsValueUsd ?? 0), 0)
    : null
  const failureCategories: Record<FailureCategory, number> = {
    unavailable_source: latest.length ? 0 : 1,
    malformed_record: 0,
    incomplete_data: 0,
    validation_failure: invalidArtifacts,
    unknown: 0,
  }

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: "PASS",
    coverage: {
      artifactsRead: artifacts.length,
      assetsDiscovered: latest.length,
      recordsIngested: snapshots.length,
      recordsRejected: invalidArtifacts,
      coveragePercent: artifacts.length
        ? Number(((snapshots.length / artifacts.length) * 100).toFixed(2))
        : 0,
    },
    coverageMatrix: latest.map((item) => ({
      asset: item.asset,
      available: true,
      quality: item.quality,
    })),
    aggregateSummary: {
      assetsDiscovered: latest.length,
      recordsIngested: snapshots.length,
      recordsRejected: invalidArtifacts,
      totalNetInflowUsd,
      totalHoldingsValueUsd,
    },
    topEtfInflows: [...latest]
      .filter((item) => (item.netInflowUsd ?? 0) > 0)
      .sort((left, right) => (right.netInflowUsd ?? 0) - (left.netInflowUsd ?? 0)),
    topEtfOutflows: [...latest]
      .filter((item) => (item.netInflowUsd ?? 0) < 0)
      .sort((left, right) => (left.netInflowUsd ?? 0) - (right.netInflowUsd ?? 0)),
    largestEtfHoldings: [...latest]
      .filter((item) => item.holdingsValueUsd !== null || item.holdings !== null)
      .sort((left, right) => (
        (right.holdingsValueUsd ?? right.holdings ?? 0)
        - (left.holdingsValueUsd ?? left.holdings ?? 0)
      )),
    assetFlowSummary: latest.map((item) => ({
      asset: item.asset,
      netInflowUsd: item.netInflowUsd,
      inflowUsd: item.inflowUsd,
      outflowUsd: item.outflowUsd,
      quality: item.quality,
      timestamp: item.timestamp,
    })),
    failureCategories,
  }
}

async function main() {
  const report = await auditEtfCoverage()
  process.stdout.write("ETF COVERAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `ETF COVERAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
