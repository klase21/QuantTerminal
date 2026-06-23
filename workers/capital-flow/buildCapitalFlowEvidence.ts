import path from "node:path"
import { fileURLToPath } from "node:url"

import { fetchCmcExchangeFlow } from "@/lib/exchange-flow/cmcExchangeFlowAdapter"
import { fetchCmcTreasury } from "@/lib/treasury/cmcTreasuryAdapter"
import { buildExchangeFlowSnapshots } from "@/workers/exchange-flow/buildExchangeFlowSnapshots"
import { buildTreasurySnapshots } from "@/workers/treasury/buildTreasurySnapshots"
import { buildDeployableSnapshots } from "@/workers/data-snapshots/buildDeployableSnapshots"

type IntegrationStatus = "published" | "unavailable"

interface IntegrationResult {
  status: IntegrationStatus
  source: string
  recordsDiscovered: number
  recordsAccepted: number
  recordsRejected: number
  rejectionReasons: Record<string, number>
  artifactsPublished: number
  reason?: string
}

function loadLocalEnvironment() {
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env.local"))
  } catch {
    // Environment may be supplied by CI or the operator shell.
  }
}

function apiKey() {
  return process.env.CMC_API_KEY ?? process.env.CMC_PRO_API_KEY
}

async function ingestExchangeFlow(): Promise<IntegrationResult> {
  const key = apiKey()
  const exchange = process.env.CMC_EXCHANGE_NAME
  const exchangeId = process.env.CMC_EXCHANGE_ID
  if (!key || !exchange || !exchangeId) {
    return {
      status: "unavailable",
      source: process.env.CMC_EXCHANGE_FLOW_URL ?? "coinmarketcap-exchange-assets",
      recordsDiscovered: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      rejectionReasons: { unavailable_source: 1 },
      artifactsPublished: 0,
      reason: "CMC credential, CMC_EXCHANGE_NAME, and CMC_EXCHANGE_ID are required.",
    }
  }
  try {
    const adapted = await fetchCmcExchangeFlow({
      apiKey: key,
      endpoint: process.env.CMC_EXCHANGE_FLOW_URL,
      exchange,
      exchangeId,
      asset: process.env.CMC_EXCHANGE_ASSET,
    })
    if (!adapted.report.recordsIngested) {
      return {
        status: "unavailable",
        source: adapted.report.endpoint,
        recordsDiscovered: adapted.report.recordsReceived,
        recordsAccepted: 0,
        recordsRejected: adapted.report.recordsRejected,
        rejectionReasons: adapted.report.rejectionCounts,
        artifactsPublished: 0,
        reason: "Provider returned no complete exchange-flow records.",
      }
    }
    const built = await buildExchangeFlowSnapshots({
      sourceFile: adapted.sourceFile,
      adapterReport: adapted.report,
    })
    return {
      status: "published",
      source: adapted.report.endpoint,
      recordsDiscovered: adapted.report.recordsReceived,
      recordsAccepted: adapted.report.recordsIngested,
      recordsRejected: adapted.report.recordsRejected,
      rejectionReasons: adapted.report.rejectionCounts,
      artifactsPublished: built.published.length,
    }
  } catch (error) {
    return {
      status: "unavailable",
      source: process.env.CMC_EXCHANGE_FLOW_URL ?? "coinmarketcap-exchange-assets",
      recordsDiscovered: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      rejectionReasons: { unavailable_source: 1 },
      artifactsPublished: 0,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}

async function ingestTreasury(): Promise<IntegrationResult> {
  const key = apiKey()
  const endpoint = process.env.CMC_TREASURY_URL
  if (!key || !endpoint) {
    return {
      status: "unavailable",
      source: endpoint ?? "unconfigured-cmc-compatible-treasury",
      recordsDiscovered: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      rejectionReasons: { unavailable_source: 1 },
      artifactsPublished: 0,
      reason: "CMC credential and CMC_TREASURY_URL are required.",
    }
  }
  try {
    const adapted = await fetchCmcTreasury({
      apiKey: key,
      endpoint,
      asset: process.env.CMC_TREASURY_ASSET,
    })
    if (!adapted.report.recordsIngested) {
      return {
        status: "unavailable",
        source: adapted.report.endpoint,
        recordsDiscovered: adapted.report.recordsReceived,
        recordsAccepted: 0,
        recordsRejected: adapted.report.recordsRejected,
        rejectionReasons: adapted.report.rejectionCounts,
        artifactsPublished: 0,
        reason: "Provider returned no complete Treasury records.",
      }
    }
    const built = await buildTreasurySnapshots({
      sourceFile: adapted.sourceFile,
      adapterReport: adapted.report,
    })
    return {
      status: "published",
      source: adapted.report.endpoint,
      recordsDiscovered: adapted.report.recordsReceived,
      recordsAccepted: adapted.report.recordsIngested,
      recordsRejected: adapted.report.recordsRejected,
      rejectionReasons: adapted.report.rejectionCounts,
      artifactsPublished: built.published.length,
    }
  } catch (error) {
    return {
      status: "unavailable",
      source: endpoint,
      recordsDiscovered: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      rejectionReasons: { unavailable_source: 1 },
      artifactsPublished: 0,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function buildCapitalFlowEvidence() {
  loadLocalEnvironment()
  const [exchangeFlow, treasury] = await Promise.all([
    ingestExchangeFlow(),
    ingestTreasury(),
  ])
  const publishedArtifacts = (
    exchangeFlow.artifactsPublished + treasury.artifactsPublished
  )
  let deployableSnapshots: Awaited<ReturnType<typeof buildDeployableSnapshots>> | null = null
  let deployableSnapshotReason: string | null = null
  if (publishedArtifacts > 0) {
    try {
      deployableSnapshots = await buildDeployableSnapshots()
    } catch (error) {
      deployableSnapshotReason = error instanceof Error ? error.message : String(error)
    }
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    realDataOnly: true,
    exchangeFlow,
    treasury,
    publishedArtifacts,
    deployableSnapshots,
    deployableSnapshotReason,
  }
}

async function main() {
  const report = await buildCapitalFlowEvidence()
  process.stdout.write("CAPITAL FLOW EVIDENCE INTEGRATION\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (
    report.exchangeFlow.status !== "published"
    || report.treasury.status !== "published"
  ) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `CAPITAL FLOW EVIDENCE INTEGRATION FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
