import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
  replayOrderbookCacheIdentityV2,
  selfReplayOrderbookCacheV2,
  spreadValidV2,
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

export async function auditReplayCacheV2() {
  const result = await readHistoricalCache<
    ReplayOrderbookCachePayloadV2,
    ReplayOrderbookCacheManifestMetadataV2
  >(
    replayOrderbookCacheIdentityV2(TARGET),
    {
      expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
      allowExpired: false,
      allowPartial: true,
    },
  )
  if ("reason" in result) {
    return {
      schemaVersion: 1,
      auditedAt: new Date().toISOString(),
      readOnly: true,
      target: TARGET,
      cacheReadable: false,
      cacheState: result.state,
      qualityStatus: "invalid",
      reason: result.reason,
    }
  }

  const selfReplay = selfReplayOrderbookCacheV2(result.data)
  const spreadValid = spreadValidV2(result.data.terminalSummary)
  const storedQualityConsistent = (
    result.data.quality.selfReplayPassed === selfReplay.passed
    && result.data.quality.terminalSummaryMatched === selfReplay.terminalSummaryMatched
    && result.data.quality.spreadValid === spreadValid
  )
  const independentlyValid = (
    result.data.initialSnapshot !== null
    && selfReplay.passed
    && spreadValid
    && result.data.checkpoints.length > 0
    && result.data.updates.length > 0
  )
  const sourceUpdateCount = result.data.updates.reduce(
    (sum, batch) => sum + batch.sourceUpdateCount,
    0,
  )
  const compactedUpdateCount = result.data.updates.reduce(
    (sum, batch) => sum + batch.compactedUpdateCount,
    0,
  )

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    target: TARGET,
    cacheReadable: true,
    cacheState: result.state,
    manifestStatus: result.manifest.status,
    generatedAt: result.manifest.generatedAt,
    initializationMethod: result.data.metadata.initializationMethod,
    hasInitialSnapshot: result.data.initialSnapshot !== null,
    checkpointCount: result.data.checkpoints.length,
    updateBatchCount: result.data.updates.length,
    sourceUpdateCount,
    compactedUpdateCount,
    rowCount: result.data.metadata.totalRows,
    snapshotCount: result.data.metadata.snapshotRows,
    updateCount: result.data.metadata.updateRows,
    firstTimestamp: result.data.metadata.firstEventTimestamp,
    lastTimestamp: result.data.metadata.lastEventTimestamp,
    terminalSummary: result.data.terminalSummary,
    spreadValid,
    selfReplay,
    storedQuality: result.data.quality,
    storedQualityConsistent,
    independentlyValid,
    safeForReplayLearning: independentlyValid,
    replayLearningReason: independentlyValid
      ? "V2 cache is independently replayable."
      : "V2 cache is not valid progression evidence and is unsafe for Replay Learning claims.",
  }
}

async function main() {
  const report = await auditReplayCacheV2()
  process.stdout.write("REPLAY CACHE V2 AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `REPLAY CACHE V2 AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
