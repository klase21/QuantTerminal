import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  CMC_DATA_API_EXCHANGE_FLOW_URL,
  fetchCmcDataApiExchangeFlow,
} from "@/lib/exchange-flow/cmcExchangeFlowAdapter"
import {
  CMC_DATA_API_TREASURY_URL,
  fetchCmcDataApiTreasury,
} from "@/lib/treasury/cmcTreasuryAdapter"
import { buildDeployableSnapshots } from "@/workers/data-snapshots/buildDeployableSnapshots"
import { buildExchangeFlowSnapshots } from "@/workers/exchange-flow/buildExchangeFlowSnapshots"
import { buildTreasurySnapshots } from "@/workers/treasury/buildTreasurySnapshots"

function rejectionSummary(rejections: Array<{ reason: string }>) {
  const counts = new Map<string, number>()
  for (const rejection of rejections) {
    counts.set(rejection.reason, (counts.get(rejection.reason) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count)
}

export async function testCmcDataApiDirect() {
  const [exchange, treasury] = await Promise.all([
    fetchCmcDataApiExchangeFlow(),
    fetchCmcDataApiTreasury(),
  ])

  let exchangeArtifactsPublished = 0
  if (exchange.normalized.report.recordsIngested > 0) {
    const built = await buildExchangeFlowSnapshots({
      sourceFile: exchange.normalized.sourceFile,
      adapterReport: exchange.normalized.report,
    })
    exchangeArtifactsPublished = built.published.length
  }

  let treasuryArtifactsPublished = 0
  if (treasury.normalized.report.recordsIngested > 0) {
    const built = await buildTreasurySnapshots({
      sourceFile: treasury.normalized.sourceFile,
      adapterReport: treasury.normalized.report,
    })
    treasuryArtifactsPublished = built.published.length
  }

  const publishedArtifacts = exchangeArtifactsPublished + treasuryArtifactsPublished
  const deployableSnapshots = publishedArtifacts > 0
    ? await buildDeployableSnapshots()
    : null

  return {
    schemaVersion: 2,
    testedAt: new Date().toISOString(),
    unauthenticated: true,
    exchangeFlow: {
      url: CMC_DATA_API_EXCHANGE_FLOW_URL,
      httpStatus: exchange.httpStatus,
      topLevelKeys: exchange.topLevelKeys,
      recordsDiscovered: exchange.normalized.report.recordsReceived,
      recordsAccepted: exchange.normalized.report.recordsIngested,
      recordsRejected: exchange.normalized.report.recordsRejected,
      assetLevelRecords: exchange.normalized.report.assetLevelRecords,
      exchangeLevelRecords: exchange.normalized.report.exchangeLevelRecords,
      sampleNormalizedFields: exchange.normalized.sourceFile.snapshots.slice(0, 3),
      rejectionReasons: rejectionSummary(exchange.normalized.report.rejections),
      artifactsPublished: exchangeArtifactsPublished,
      schemaMapping: {
        exchange: "name or slug",
        totalAssetsUsd: "totalAsset",
        netFlow24hUsd: "netFlow24hUsd",
        asset: "unavailable",
        inflow: "unavailable",
        outflow: "unavailable",
        timestamp: "status.timestamp",
      },
    },
    treasury: {
      url: CMC_DATA_API_TREASURY_URL,
      httpStatus: treasury.httpStatus,
      topLevelKeys: treasury.topLevelKeys,
      recordsDiscovered: treasury.normalized.report.recordsReceived,
      recordsAccepted: treasury.normalized.report.recordsIngested,
      recordsRejected: treasury.normalized.report.recordsRejected,
      verifiedRecords: treasury.normalized.report.verifiedRecords,
      partialRecords: treasury.normalized.report.partialRecords,
      sampleNormalizedFields: treasury.normalized.sourceFile.snapshots.slice(0, 3),
      rejectionReasons: rejectionSummary(treasury.normalized.report.rejections),
      artifactsPublished: treasuryArtifactsPublished,
      schemaMapping: {
        holder: "companyName",
        holderType: "companyType",
        asset: "coin",
        holdings: "holdings",
        timestamp: "dataAsOf",
        holdingsValueUsd: "unavailable",
        changeAmount: "unavailable",
        changePercent: "unavailable",
      },
    },
    publishedArtifacts,
    deployableSnapshots,
  }
}

async function main() {
  const report = await testCmcDataApiDirect()
  process.stdout.write("CMC DATA-API DIRECT TEST\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `CMC DATA-API DIRECT TEST FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
