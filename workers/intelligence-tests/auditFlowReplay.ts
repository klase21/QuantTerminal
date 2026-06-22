import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  FLOW_REPLAY_SCHEMA_VERSION,
  FLOW_REPLAY_SOURCE_QUALITY_STATES,
  flowReplayId,
  type FlowReplayArtifactMetadata,
  type FlowReplayEvidence,
} from "@/core/flow-replay"
import {
  FileBackedIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"

const TARGET = {
  exchange: "binance_futures",
  symbol: "BTCUSDT",
  date: "2026-02-22",
  hour: 12,
}

function validFlowReplay(value: unknown): value is FlowReplayEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const candidate = value as Partial<FlowReplayEvidence>
  return (
    candidate.schemaVersion === FLOW_REPLAY_SCHEMA_VERSION
    && candidate.flowReplayId === flowReplayId(TARGET)
    && Boolean(candidate.context)
    && Array.isArray(candidate.sources)
    && candidate.sources.every((item) => (
      FLOW_REPLAY_SOURCE_QUALITY_STATES.includes(item.quality)
    ))
    && Array.isArray(candidate.supportingEvidence)
    && Array.isArray(candidate.degradedEvidence)
    && Array.isArray(candidate.unavailableEvidence)
    && Array.isArray(candidate.marketStructureChanges)
  )
}

export async function auditFlowReplay() {
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const artifactId = flowReplayId(TARGET)
  const artifact = await registry.get(artifactId)
  if (!artifact) {
    return {
      schemaVersion: 1,
      auditedAt: new Date().toISOString(),
      readOnly: true,
      target: TARGET,
      artifactAvailable: false,
      artifactId,
      status: "unavailable",
      reason: "Durable Flow Replay artifact is unavailable.",
    }
  }

  const metadata = artifact.metadata as Partial<FlowReplayArtifactMetadata>
  const flowReplay = metadata.flowReplay
  const contractValid = validFlowReplay(flowReplay)
  const orderbook = contractValid
    ? flowReplay.sources.find((item) => item.kind === "orderbook_flow")
    : undefined
  const price = contractValid
    ? flowReplay.sources.find((item) => item.kind === "price")
    : undefined
  const funding = contractValid
    ? flowReplay.sources.find((item) => item.kind === "funding")
    : undefined
  const openInterest = contractValid
    ? flowReplay.sources.find((item) => item.kind === "open_interest")
    : undefined
  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    target: TARGET,
    artifactAvailable: true,
    artifactId,
    artifactType: artifact.type,
    artifactGeneratedAt: artifact.generatedAt,
    artifactCoverage: artifact.validity.coverageStatus,
    flowReplayCoverage: contractValid ? flowReplay.coverageState ?? "PARTIAL" : null,
    contractValid,
    whatMoved: contractValid ? flowReplay.whatMoved : null,
    quality: {
      price: price?.quality ?? "unknown",
      orderbook: orderbook?.quality ?? "unknown",
      funding: funding?.quality ?? "unknown",
      openInterest: openInterest?.quality ?? "unknown",
    },
    fundingEvidence: contractValid ? flowReplay.fundingEvidence ?? null : null,
    openInterestEvidence: contractValid ? flowReplay.openInterestEvidence ?? null : null,
    sourceQuality: contractValid
      ? Object.fromEntries(flowReplay.sources.map((item) => [item.kind, item.quality]))
      : {},
    supportingEvidence: contractValid
      ? flowReplay.supportingEvidence.map((item) => item.kind)
      : [],
    degradedEvidence: contractValid
      ? flowReplay.degradedEvidence.map((item) => ({
          kind: item.kind,
          reason: item.reason,
        }))
      : [],
    unavailableEvidence: contractValid
      ? flowReplay.unavailableEvidence.map((item) => ({
          kind: item.kind,
          reason: item.reason,
        }))
      : [],
    marketStructureChanges: contractValid ? flowReplay.marketStructureChanges : [],
    orderbookClaimSafe: orderbook?.quality === "degraded",
    status: contractValid && orderbook?.quality !== "verified"
      ? "ready"
      : "invalid",
  }
}

async function main() {
  const result = await auditFlowReplay()
  process.stdout.write("FLOW REPLAY AUDIT\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  if (result.status !== "ready") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `FLOW REPLAY AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
