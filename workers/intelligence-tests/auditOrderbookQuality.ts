import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
  replayOrderbookCacheIdentity,
  type ReplayOrderbookCacheMetadata,
  type ReplayOrderbookCachePayload,
} from "@/core/replay/replayOrderbookCache"
import {
  historicalCacheExists,
  readHistoricalCache,
} from "@/lib/historical-intelligence/cache/fileCacheStore"
import { auditReplayCoverage } from "./auditReplayCoverage"

export type OrderbookQualityStatus = "valid" | "degraded" | "invalid" | "unknown"

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function finiteCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

export async function auditOrderbookQuality() {
  const replayCoverage = await auditReplayCoverage()
  const compatibleCases = replayCoverage.coverageSummary.flatMap((target) => (
    target.cases
      .filter((item) => item.replaySource.state === "available")
      .map((item) => ({
        symbol: target.symbol,
        exchange: target.exchange,
        caseId: item.caseId,
        date: item.date,
        hour: item.hour,
        similarity: item.similarity,
      }))
  ))

  const cachedCoordinates = []
  for (const replayCase of compatibleCases) {
    const identity = replayOrderbookCacheIdentity(replayCase)
    if (await historicalCacheExists(identity)) cachedCoordinates.push(replayCase)
  }

  const cases = await Promise.all(cachedCoordinates.map(async (replayCase) => {
    const result = await readHistoricalCache<
      ReplayOrderbookCachePayload,
      ReplayOrderbookCacheMetadata
    >(
      replayOrderbookCacheIdentity(replayCase),
      {
        expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_SCHEMA_VERSION,
        allowExpired: false,
      },
    )

    if ("reason" in result) {
      return {
        ...replayCase,
        cacheReadable: false,
        rowCount: finiteCount(result.manifest?.metadata.totalRows),
        snapshotCount: finiteCount(result.manifest?.metadata.snapshotRows),
        updateCount: finiteCount(result.manifest?.metadata.updateRows),
        hasInitialSnapshot: result.manifest
          ? finiteCount(result.manifest.metadata.snapshotRows) !== null
            ? Number(result.manifest.metadata.snapshotRows) > 0
            : null
          : null,
        canInitializeBook: false,
        bestBid: null,
        bestAsk: null,
        spreadValid: false,
        canAdvanceReplay: false,
        firstTimestamp: null,
        lastTimestamp: null,
        qualityStatus: "invalid" as const,
        reasons: [result.reason],
      }
    }

    const metadata = result.manifest.metadata
    const rowCount = finiteCount(metadata.totalRows)
      ?? finiteCount(metadata.rowsProcessed)
    const snapshotCount = finiteCount(metadata.snapshotRows)
    const updateCount = finiteCount(metadata.updateRows)
    const hasInitialSnapshot = snapshotCount === null ? null : snapshotCount > 0
    const bidsUsable = (
      Array.isArray(result.data.bids)
      && result.data.bids.length > 0
      && result.data.bids.every(([price, quantity]) => (
        finitePositive(price) && finitePositive(quantity)
      ))
    )
    const asksUsable = (
      Array.isArray(result.data.asks)
      && result.data.asks.length > 0
      && result.data.asks.every(([price, quantity]) => (
        finitePositive(price) && finitePositive(quantity)
      ))
    )
    const bestBid = finitePositive(result.data.bestBid) ? result.data.bestBid : null
    const bestAsk = finitePositive(result.data.bestAsk) ? result.data.bestAsk : null
    const spreadValid = (
      bestBid !== null
      && bestAsk !== null
      && bestAsk > bestBid
      && Number.isFinite(result.data.spread)
      && result.data.spread > 0
    )
    const canInitializeBook = bidsUsable && asksUsable && spreadValid

    // Schema V1 stores one final snapshot, not timestamped states or updates.
    const canAdvanceReplay = false
    const firstTimestamp = null
    const lastTimestamp = validTimestamp(result.data.timestamp)
      ? result.data.timestamp
      : null
    const reasons: string[] = []
    let qualityStatus: OrderbookQualityStatus

    if (!canInitializeBook || rowCount === 0) {
      qualityStatus = "invalid"
      if (!canInitializeBook) reasons.push("Cached payload has no usable bid/ask initialization.")
      if (rowCount === 0) reasons.push("Source row count is zero.")
    } else if (
      rowCount === null
      || snapshotCount === null
      || updateCount === null
      || lastTimestamp === null
    ) {
      qualityStatus = "unknown"
      reasons.push("Cache metadata is insufficient for deterministic quality classification.")
    } else if (!hasInitialSnapshot && updateCount > 0) {
      qualityStatus = "degraded"
      reasons.push("Updates reconstructed a final book without a verified initial snapshot.")
      reasons.push("Schema V1 stores no timestamped sequence and cannot advance Replay.")
    } else if (
      hasInitialSnapshot
      && bestBid !== null
      && bestAsk !== null
      && spreadValid
      && canAdvanceReplay
    ) {
      qualityStatus = "valid"
    } else {
      qualityStatus = "degraded"
      reasons.push("Cached final state is readable, but Replay progression is unavailable.")
    }

    return {
      ...replayCase,
      cacheReadable: true,
      rowCount,
      snapshotCount,
      updateCount,
      hasInitialSnapshot,
      canInitializeBook,
      bestBid,
      bestAsk,
      spreadValid,
      canAdvanceReplay,
      firstTimestamp,
      lastTimestamp,
      qualityStatus,
      reasons,
    }
  }))

  const count = (status: OrderbookQualityStatus) => (
    cases.filter((item) => item.qualityStatus === status).length
  )

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    methodology: {
      scope: "Existing Replay-compatible orderbook cache entries only.",
      rowCount: "Manifest metadata totalRows, falling back to rowsProcessed.",
      hasInitialSnapshot: "Manifest snapshotRows must be greater than zero.",
      canAdvanceReplay: "False for schema V1 because only one final snapshot is stored.",
      timestamps: "Only timestamps explicitly persisted by the cache are reported.",
    },
    totalCachedOrderbookCases: cases.length,
    validCases: count("valid"),
    degradedCases: count("degraded"),
    invalidCases: count("invalid"),
    unknownCases: count("unknown"),
    cases,
  }
}

async function main() {
  const report = await auditOrderbookQuality()
  process.stdout.write("ORDERBOOK QUALITY AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `ORDERBOOK QUALITY AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
