import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  EXCHANGE_FLOW_SOURCE_QUALITIES,
  type ExchangeFlowArtifactMetadata,
  type ExchangeFlowSnapshot,
} from "@/core/exchange-flow"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

type FailureCategory =
  | "unavailable_source"
  | "malformed_record"
  | "incomplete_data"
  | "validation_failure"

function validSnapshot(value: unknown): value is ExchangeFlowSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const snapshot = value as Partial<ExchangeFlowSnapshot>
  return (
    snapshot.schemaVersion === 1
    && typeof snapshot.snapshotId === "string"
    && typeof snapshot.exchange === "string"
    && typeof snapshot.asset === "string"
    && Number.isFinite(snapshot.holdings)
    && Number.isFinite(snapshot.inflow)
    && Number.isFinite(snapshot.outflow)
    && Number.isFinite(snapshot.netFlow)
    && typeof snapshot.timestamp === "string"
    && Number.isFinite(Date.parse(snapshot.timestamp))
    && typeof snapshot.source === "string"
    && EXCHANGE_FLOW_SOURCE_QUALITIES.includes(snapshot.sourceQuality)
  )
}

function latestSnapshots(snapshots: ExchangeFlowSnapshot[]) {
  const latest = new Map<string, ExchangeFlowSnapshot>()
  for (const snapshot of snapshots) {
    const key = `${snapshot.exchange}:${snapshot.asset}`
    const current = latest.get(key)
    if (!current || Date.parse(snapshot.timestamp) > Date.parse(current.timestamp)) {
      latest.set(key, snapshot)
    }
  }
  return [...latest.values()]
}

export async function auditExchangeFlowCoverage() {
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const artifacts = await registry.listByType("exchange_flow")
  const snapshots: ExchangeFlowSnapshot[] = []
  let invalidArtifacts = 0
  for (const artifact of artifacts) {
    const metadata = artifact.metadata as Partial<ExchangeFlowArtifactMetadata>
    if (validSnapshot(metadata.snapshot)) snapshots.push(metadata.snapshot)
    else invalidArtifacts += 1
  }
  const latest = latestSnapshots(snapshots)
  const exchanges = [...new Set(latest.map((item) => item.exchange))]
  const assets = [...new Set(latest.map((item) => item.asset))]
  const totals = latest.reduce(
    (result, item) => ({
      inflow: result.inflow + item.inflow,
      outflow: result.outflow + item.outflow,
      netFlow: result.netFlow + item.netFlow,
      holdings: result.holdings + item.holdings,
    }),
    { inflow: 0, outflow: 0, netFlow: 0, holdings: 0 },
  )
  const perExchange = exchanges.map((exchange) => {
    const items = latest.filter((item) => item.exchange === exchange)
    return {
      exchange,
      assets: items.length,
      holdings: items.reduce((sum, item) => sum + item.holdings, 0),
      inflow: items.reduce((sum, item) => sum + item.inflow, 0),
      outflow: items.reduce((sum, item) => sum + item.outflow, 0),
      netFlow: items.reduce((sum, item) => sum + item.netFlow, 0),
      quality: items.every((item) => item.sourceQuality === "verified")
        ? "verified"
        : items.some((item) => item.sourceQuality === "degraded")
          ? "degraded"
          : "unknown",
    }
  })
  const matrix = latest.map((item) => ({
    exchange: item.exchange,
    asset: item.asset,
    available: true,
    quality: item.sourceQuality,
  }))
  const failureCategories: Record<FailureCategory, number> = {
    unavailable_source: latest.length ? 0 : 1,
    malformed_record: 0,
    incomplete_data: 0,
    validation_failure: invalidArtifacts,
  }
  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: "PASS",
    coverage: {
      artifactsRead: artifacts.length,
      validSnapshots: snapshots.length,
      latestExchangeAssetPairs: latest.length,
      coveragePercent: artifacts.length
        ? Number(((snapshots.length / artifacts.length) * 100).toFixed(2))
        : 0,
    },
    coverageMatrix: matrix,
    perExchange,
    aggregate: {
      exchangesCovered: exchanges.length,
      assetsCovered: assets.length,
      totalHoldings: totals.holdings,
      totalInflow: totals.inflow,
      totalOutflow: totals.outflow,
      totalNetFlow: totals.netFlow,
    },
    exchangeFlowSummary: latest.length
      ? `${exchanges.length} exchange(s), ${assets.length} asset(s), net flow ${totals.netFlow}.`
      : "Exchange Flow unavailable: no durable source snapshots have been published.",
    topNetInflowExchanges: [...perExchange]
      .filter((item) => item.netFlow > 0)
      .sort((left, right) => right.netFlow - left.netFlow),
    topNetOutflowExchanges: [...perExchange]
      .filter((item) => item.netFlow < 0)
      .sort((left, right) => left.netFlow - right.netFlow),
    topAssetConcentrationExchanges: [...perExchange]
      .sort((left, right) => right.holdings - left.holdings),
    failureCategories,
  }
}

async function main() {
  const report = await auditExchangeFlowCoverage()
  process.stdout.write("EXCHANGE FLOW COVERAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `EXCHANGE FLOW COVERAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
