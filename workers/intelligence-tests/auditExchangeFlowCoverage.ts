import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  validateExchangeFlowSnapshot,
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
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && validateExchangeFlowSnapshot(value as ExchangeFlowSnapshot).valid,
  )
}

function latestSnapshots(snapshots: ExchangeFlowSnapshot[]) {
  const latest = new Map<string, ExchangeFlowSnapshot>()
  for (const snapshot of snapshots) {
    const key = snapshot.scope === "asset_level"
      ? `${snapshot.scope}:${snapshot.exchange}:${snapshot.asset}`
      : `${snapshot.scope}:${snapshot.exchange}`
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
  const assetLevel = latest.filter((item) => item.scope === "asset_level")
  const exchangeLevel = latest.filter((item) => item.scope === "exchange_level")
  const exchanges = [...new Set(latest.map((item) => item.exchange))]
  const assets = [...new Set(assetLevel.map((item) => item.asset))]
  const assetTotals = assetLevel.reduce(
    (result, item) => ({
      inflow: result.inflow + item.inflow,
      outflow: result.outflow + item.outflow,
      netFlow: result.netFlow + item.netFlow,
      holdings: result.holdings + item.holdings,
    }),
    { inflow: 0, outflow: 0, netFlow: 0, holdings: 0 },
  )
  const exchangeTotals = exchangeLevel.reduce(
    (result, item) => ({
      totalAssetsUsd: result.totalAssetsUsd + item.totalAssetsUsd,
      netFlow24hUsd: result.netFlow24hUsd + item.netFlow24hUsd,
    }),
    { totalAssetsUsd: 0, netFlow24hUsd: 0 },
  )
  const perExchange = exchanges.map((exchange) => {
    const assetItems = assetLevel.filter((item) => item.exchange === exchange)
    const exchangeItem = exchangeLevel.find((item) => item.exchange === exchange)
    const allItems = latest.filter((item) => item.exchange === exchange)
    return {
      exchange,
      scopes: [...new Set(allItems.map((item) => item.scope))],
      assets: assetItems.length,
      holdings: assetItems.length
        ? assetItems.reduce((sum, item) => sum + item.holdings, 0)
        : null,
      inflow: assetItems.length
        ? assetItems.reduce((sum, item) => sum + item.inflow, 0)
        : null,
      outflow: assetItems.length
        ? assetItems.reduce((sum, item) => sum + item.outflow, 0)
        : null,
      netFlow: assetItems.length
        ? assetItems.reduce((sum, item) => sum + item.netFlow, 0)
        : null,
      totalAssetsUsd: exchangeItem?.totalAssetsUsd ?? null,
      netFlow24hUsd: exchangeItem?.netFlow24hUsd ?? null,
      quality: allItems.every((item) => item.sourceQuality === "verified")
        ? "verified"
        : allItems.some((item) => item.sourceQuality === "degraded")
          ? "degraded"
          : "unknown",
    }
  })
  const matrix = latest.map((item) => ({
    exchange: item.exchange,
    scope: item.scope,
    asset: item.scope === "asset_level" ? item.asset : null,
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
    schemaVersion: 2,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: "PASS",
    coverage: {
      artifactsRead: artifacts.length,
      validSnapshots: snapshots.length,
      latestRecords: latest.length,
      assetLevelRecords: assetLevel.length,
      exchangeLevelRecords: exchangeLevel.length,
      coveragePercent: artifacts.length
        ? Number(((snapshots.length / artifacts.length) * 100).toFixed(2))
        : 0,
    },
    coverageMatrix: matrix,
    perExchange,
    aggregate: {
      exchangesCovered: exchanges.length,
      assetsCovered: assets.length,
      totalHoldings: assetLevel.length ? assetTotals.holdings : null,
      totalInflow: assetLevel.length ? assetTotals.inflow : null,
      totalOutflow: assetLevel.length ? assetTotals.outflow : null,
      totalNetFlow: assetLevel.length ? assetTotals.netFlow : null,
      totalAssetsUsd: exchangeLevel.length ? exchangeTotals.totalAssetsUsd : null,
      totalNetFlow24hUsd: exchangeLevel.length ? exchangeTotals.netFlow24hUsd : null,
    },
    exchangeFlowSummary: latest.length
      ? `${exchangeLevel.length} exchange-level and ${assetLevel.length} asset-level flow record(s).`
      : "Exchange Flow unavailable: no durable source snapshots have been published.",
    topNetInflowExchanges: [...perExchange]
      .filter((item) => (item.netFlow24hUsd ?? item.netFlow ?? 0) > 0)
      .sort((left, right) => (
        (right.netFlow24hUsd ?? right.netFlow ?? 0)
        - (left.netFlow24hUsd ?? left.netFlow ?? 0)
      )),
    topNetOutflowExchanges: [...perExchange]
      .filter((item) => (item.netFlow24hUsd ?? item.netFlow ?? 0) < 0)
      .sort((left, right) => (
        (left.netFlow24hUsd ?? left.netFlow ?? 0)
        - (right.netFlow24hUsd ?? right.netFlow ?? 0)
      )),
    topAssetConcentrationExchanges: [...perExchange]
      .sort((left, right) => (
        (right.totalAssetsUsd ?? right.holdings ?? 0)
        - (left.totalAssetsUsd ?? left.holdings ?? 0)
      )),
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
