import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  REPLAY_INITIALIZATION_DISCOVERY_SCHEMA_VERSION,
  REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
  replayInitializationDiscoveryIdentity,
  replayOrderbookCacheIdentityV2,
  type ReplayInitializationDiscovery,
  type ReplayOrderbookCacheManifestMetadataV2,
  type ReplayOrderbookCachePayloadV2,
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

export async function auditProviderSemantics() {
  const [discovery, replayV2] = await Promise.all([
    readHistoricalCache<ReplayInitializationDiscovery>(
      replayInitializationDiscoveryIdentity(TARGET),
      {
        expectedSchemaVersion: REPLAY_INITIALIZATION_DISCOVERY_SCHEMA_VERSION,
        allowExpired: false,
      },
    ),
    readHistoricalCache<
      ReplayOrderbookCachePayloadV2,
      ReplayOrderbookCacheManifestMetadataV2
    >(
      replayOrderbookCacheIdentityV2(TARGET),
      {
        expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
        allowExpired: false,
        allowPartial: true,
      },
    ),
  ])

  const inspectedWindows = "reason" in discovery
    ? []
    : discovery.data.inspectedWindows
  const totals = inspectedWindows.reduce(
    (summary, item) => ({
      rows: summary.rows + item.totalRows,
      snapshots: summary.snapshots + item.snapshotRows,
      updates: summary.updates + item.updateRows,
      sourceWindows: summary.sourceWindows + (item.sourceAvailable ? 1 : 0),
      continuityGaps: summary.continuityGaps
        + (item.withinWindowContinuity === "gap" ? 1 : 0),
    }),
    {
      rows: 0,
      snapshots: 0,
      updates: 0,
      sourceWindows: 0,
      continuityGaps: 0,
    },
  )
  const boundaries = "reason" in discovery ? [] : discovery.data.boundaries
  const boundaryGaps = boundaries.filter((item) => item.status === "gap").length
  const v2 = "reason" in replayV2 ? null : replayV2.data
  const observedUpdatesOnly = (
    inspectedWindows.length > 0
    && totals.snapshots === 0
    && totals.updates > 0
  )

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    target: TARGET,
    localEvidence: {
      discoveryAvailable: !("reason" in discovery),
      v2DiagnosticAvailable: v2 !== null,
      inspectedWindowCount: inspectedWindows.length,
      sourceWindowsAvailable: totals.sourceWindows,
      totalRows: totals.rows,
      snapshotRows: totals.snapshots,
      updateRows: totals.updates,
      withinWindowContinuityGaps: totals.continuityGaps,
      boundaryCount: boundaries.length,
      boundaryGaps,
      initializationStatus: "reason" in discovery
        ? "unknown"
        : discovery.data.initializationStatus,
      v2QualityStatus: v2?.quality.status ?? "unknown",
      v2CanAdvanceReplay: v2?.quality.canAdvanceReplay ?? false,
      observedUpdatesOnly,
    },
    datasets: [
      {
        name: "CryptoHFTData hourly orderbook parquet",
        role: "raw provider source",
        schema: "CommonOrderbookEvent",
        rowTypes: ["snapshot", "update"],
        observedRowTypes: totals.snapshots > 0 ? ["snapshot", "update"] : ["update"],
        fields: [
          "received_time",
          "event_time",
          "transaction_time",
          "symbol",
          "event_type",
          "first_update_id",
          "final_update_id",
          "prev_final_update_id",
          "last_update_id",
          "side",
          "price",
          "quantity",
          "order_count",
        ],
      },
      {
        name: "Replay orderbook-snapshot V1",
        role: "static terminal summary",
        rowTypes: ["terminal_snapshot"],
        replayable: false,
      },
      {
        name: "Replay orderbook-replay V2 POC",
        role: "bounded progression diagnostic",
        rowTypes: ["initial_snapshot", "checkpoint", "normalized_update_batch"],
        replayable: v2?.quality.status === "valid",
      },
      {
        name: "Replay initialization discovery",
        role: "provider snapshot and continuity evidence",
        rowTypes: ["window_inspection", "snapshot_candidate", "boundary"],
        replayable: false,
      },
    ],
    capabilityMatrix: {
      orderbookReplay: "conditional",
      initialization: totals.snapshots > 0 ? "supported" : "unsupported_for_inspected_windows",
      seekableReplay: v2?.quality.canSeek ? "supported" : "unsupported",
      deterministicReconstruction: (
        v2?.quality.canAdvanceReplay && v2.quality.selfReplayPassed
      )
        ? "supported"
        : "unsupported_for_target",
      staticOrderbookEvidence: v2?.quality.spreadValid ? "supported_degraded" : "unknown",
      flowReplay: totals.updates > 0 ? "supported" : "unknown",
    },
    explicitAnswers: {
      cryptoHftDataSnapshotsExist: "UNKNOWN",
      updatesOnlyDesign: "UNKNOWN",
      deterministicOrderbookReplayPossible: "CONDITIONAL",
      recommendedFutureArchitecture: "Hybrid Snapshot + Updates Replay",
    },
    riskAssessment: {
      replayLearning: "high",
      replayEvidence: "medium",
      historicalReplay: "high",
    },
    reasons: [
      "Official CryptoHFTData contracts describe snapshot and update event types.",
      `${inspectedWindows.length} adjacent BTCUSDT Binance Futures files contained ${totals.snapshots} snapshot rows and ${totals.updates} update rows.`,
      `${boundaryGaps}/${boundaries.length} inspected cross-file boundaries contained update-id gaps.`,
      "The target V2 cache cannot initialize or self-replay without a verified snapshot.",
      "Binance requires a depth snapshot plus buffered diff events for deterministic local-book initialization.",
    ],
  }
}

async function main() {
  const report = await auditProviderSemantics()
  process.stdout.write("PROVIDER SEMANTICS AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `PROVIDER SEMANTICS AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
