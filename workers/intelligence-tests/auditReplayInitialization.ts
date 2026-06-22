import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  REPLAY_INITIALIZATION_DISCOVERY_SCHEMA_VERSION,
  replayInitializationDiscoveryIdentity,
  type ReplayInitializationDiscovery,
} from "@/core/replay-cache-v2"
import {
  readHistoricalCache,
} from "@/lib/historical-intelligence/cache/fileCacheStore"

const TARGET = {
  symbol: "BTCUSDT",
  exchange: "binance_futures",
  date: "2026-02-22",
  hour: 12,
}

export async function auditReplayInitialization() {
  const result = await readHistoricalCache<ReplayInitializationDiscovery>(
    replayInitializationDiscoveryIdentity(TARGET),
    {
      expectedSchemaVersion: REPLAY_INITIALIZATION_DISCOVERY_SCHEMA_VERSION,
      allowExpired: false,
    },
  )
  if ("reason" in result) {
    return {
      schemaVersion: 1,
      auditedAt: new Date().toISOString(),
      readOnly: true,
      target: TARGET,
      discoveryAvailable: false,
      initializationStatus: "unknown",
      reason: result.reason,
    }
  }

  const discovery = result.data
  const selectedCandidateConsistent = discovery.selectedCandidate
    ? discovery.candidateSnapshots.some((candidate) => (
        candidate.candidateId === discovery.selectedCandidate?.candidateId
        && candidate.usable
      ))
    : true
  const initializableConsistent = discovery.initializationStatus !== "initializable"
    || (
      discovery.selectedCandidate !== null
      && discovery.selectedCandidate.usable
      && discovery.continuityStatus === "continuous"
    )
  const sourceWindowsAvailable = discovery.inspectedWindows.filter(
    (item) => item.sourceAvailable,
  ).length

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    target: TARGET,
    discoveryAvailable: true,
    generatedAt: result.manifest.generatedAt,
    inspectedWindowCount: discovery.inspectedWindows.length,
    sourceWindowsAvailable,
    inspectedWindows: discovery.inspectedWindows,
    candidateSnapshots: discovery.candidateSnapshots,
    selectedCandidate: discovery.selectedCandidate,
    boundaries: discovery.boundaries,
    continuityStatus: discovery.continuityStatus,
    initializationStatus: discovery.initializationStatus,
    reasons: discovery.reasons,
    selectedCandidateConsistent,
    initializableConsistent,
    auditPassed: selectedCandidateConsistent && initializableConsistent,
  }
}

async function main() {
  const report = await auditReplayInitialization()
  process.stdout.write("REPLAY INITIALIZATION AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `REPLAY INITIALIZATION AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
