import { createWriteStream } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { fileURLToPath } from "node:url"

import { decompress } from "fzstd"

import {
  REPLAY_ORDERBOOK_CACHE_V2_CHECKPOINT_INTERVAL_MS,
  REPLAY_ORDERBOOK_CACHE_V2_LEVEL_LIMIT,
  REPLAY_ORDERBOOK_CACHE_V2_MAX_BATCH_UPDATES,
  REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
  replayOrderbookCacheIdentityV2,
  replayOrderbookWindowV2,
  selfReplayOrderbookCacheV2,
  snapshotLevelsV2,
  spreadValidV2,
  summarizeOrderbookV2,
  type ReplayOrderbookCacheManifestMetadataV2,
  type ReplayOrderbookCachePayloadV2,
  type ReplayOrderbookCheckpointV2,
  type ReplayOrderbookCoordinatesV2,
  type ReplayOrderbookSnapshotV2,
  type ReplayOrderbookUpdateBatchV2,
  type ReplayOrderbookUpdateV2,
} from "@/core/replay-cache-v2"
import {
  writeHistoricalCache,
  writeHistoricalCacheFailure,
} from "@/lib/historical-intelligence/cache/fileCacheStore"

const POC_TARGET: ReplayOrderbookCoordinatesV2 = {
  symbol: "BTCUSDT",
  exchange: "binance_futures",
  date: "2026-02-22",
  hour: 12,
}
const DOWNLOAD_BASE_URL = "https://api.cryptohftdata.com/download"
const REQUIRED_COLUMNS = [
  "received_time",
  "event_time",
  "transaction_time",
  "event_type",
  "side",
  "price",
  "quantity",
  "first_update_id",
  "final_update_id",
  "prev_final_update_id",
]

interface CompactedUpdate extends ReplayOrderbookUpdateV2 {
  order: number
}

function normalizeCoordinates(input: ReplayOrderbookCoordinatesV2) {
  const coordinates = {
    symbol: input.symbol.trim().toUpperCase(),
    exchange: input.exchange.trim().toLowerCase(),
    date: input.date,
    hour: input.hour,
  }
  if (
    coordinates.symbol !== POC_TARGET.symbol
    || coordinates.exchange !== POC_TARGET.exchange
    || coordinates.date !== POC_TARGET.date
    || coordinates.hour !== POC_TARGET.hour
  ) {
    throw new Error(
      "Replay Cache V2 proof of concept is restricted to BTCUSDT binance_futures 2026-02-22 12 UTC.",
    )
  }
  return coordinates
}

function exactArrayBuffer(buffer: Uint8Array) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer
}

function numeric(value: unknown): number | null {
  if (typeof value === "bigint") {
    const converted = Number(value)
    return Number.isFinite(converted) ? converted : null
  }
  const converted = typeof value === "number" ? value : Number(value)
  return Number.isFinite(converted) ? converted : null
}

function timestamp(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "bigint") return timestamp(Number(value))
  if (typeof value === "number" && Number.isFinite(value)) {
    const absolute = Math.abs(value)
    if (absolute > 1_000_000_000_000_000) return new Date(value / 1000).toISOString()
    if (absolute > 1_000_000_000_000) return new Date(value).toISOString()
    return new Date(value * 1000).toISOString()
  }
  if (typeof value !== "string" || !value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function sequenceId(value: unknown): string | null {
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

function minuteStart(timestampValue: string) {
  const value = Date.parse(timestampValue)
  return new Date(
    Math.floor(value / REPLAY_ORDERBOOK_CACHE_V2_CHECKPOINT_INTERVAL_MS)
      * REPLAY_ORDERBOOK_CACHE_V2_CHECKPOINT_INTERVAL_MS,
  ).toISOString()
}

function providerFile(input: ReplayOrderbookCoordinatesV2) {
  return [
    input.exchange,
    input.date,
    String(input.hour).padStart(2, "0"),
    `${input.symbol}_orderbook.parquet.zst`,
  ].join("/")
}

function loadLocalEnvironment() {
  if (process.env.CRYPTOHFTDATA_API_KEY) return
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env.local"))
  } catch {
    // Explicit process configuration remains supported.
  }
}

async function downloadSource(
  coordinates: ReplayOrderbookCoordinatesV2,
  destination: string,
) {
  loadLocalEnvironment()
  const apiKey = process.env.CRYPTOHFTDATA_API_KEY
  if (!apiKey) throw new Error("CRYPTOHFTDATA_API_KEY is not configured.")
  const file = providerFile(coordinates)
  const url = new URL(DOWNLOAD_BASE_URL)
  url.searchParams.set("file", file)
  url.searchParams.set("api_key", apiKey)
  const response = await fetch(url, {
    headers: { accept: "application/octet-stream" },
  })
  if (!response.ok || !response.body) {
    throw new Error(`CryptoHFTData orderbook download failed with HTTP ${response.status}.`)
  }
  await pipeline(
    Readable.fromWeb(response.body as never),
    createWriteStream(destination),
  )
  return file
}

function applyLevel(
  bids: Map<number, number>,
  asks: Map<number, number>,
  side: "bid" | "ask",
  price: number,
  quantity: number,
) {
  const target = side === "bid" ? bids : asks
  if (quantity === 0) target.delete(price)
  else target.set(price, quantity)
}

function snapshot(
  bids: Map<number, number>,
  asks: Map<number, number>,
  timestampValue: string,
  sequence: string | null,
): ReplayOrderbookSnapshotV2 | null {
  const summary = summarizeOrderbookV2(bids, asks)
  if (!summary) return null
  return {
    timestamp: timestampValue,
    sequenceId: sequence,
    provenance: "provider_snapshot",
    ...snapshotLevelsV2(bids, asks),
    summary,
  }
}

export async function buildReplayOrderbookCacheV2(
  input: ReplayOrderbookCoordinatesV2,
) {
  const coordinates = normalizeCoordinates(input)
  const identity = replayOrderbookCacheIdentityV2(coordinates)
  const sourceFile = providerFile(coordinates)
  const source = {
    id: "cryptohftdata",
    kind: "enrichment" as const,
    metadata: {
      dataset: "orderbook",
      sourceFile,
      proofOfConcept: true,
    },
  }
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "quantterminal-orderbook-v2-"))
  const temporaryFile = path.join(temporaryRoot, "orderbook.parquet.zst")

  await writeHistoricalCacheFailure({
    identity,
    source,
    schemaVersion: REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
    status: "generating",
    metadata: { sourceFile, proofOfConcept: true },
  })

  try {
    await downloadSource(coordinates, temporaryFile)
    const compressed = await readFile(temporaryFile)
    const file = exactArrayBuffer(decompress(compressed))
    const {
      parquetMetadataAsync,
      parquetReadObjects,
      parquetSchema,
    } = await import("hyparquet")
    const parquetMetadata = await parquetMetadataAsync(file)
    const columns = parquetSchema(parquetMetadata).children.map(
      (child) => child.element.name,
    )
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !columns.includes(column))
    if (missingColumns.length) {
      throw new Error(`Orderbook parquet is missing required columns: ${missingColumns.join(", ")}`)
    }

    const totalRows = Number(parquetMetadata.num_rows)
    const selectedWindow = replayOrderbookWindowV2(coordinates.date, coordinates.hour)
    const windowStartMs = Date.parse(selectedWindow.start)
    const windowEndMs = Date.parse(selectedWindow.end)
    const bids = new Map<number, number>()
    const asks = new Map<number, number>()
    const updates: ReplayOrderbookUpdateBatchV2[] = []
    const checkpoints: ReplayOrderbookCheckpointV2[] = []
    const minuteUpdates = new Map<string, CompactedUpdate>()
    let minuteSourceUpdateCount = 0
    let currentMinute: string | null = null
    let currentMinuteFirstTimestamp: string | null = null
    let currentMinuteLastTimestamp: string | null = null
    let currentMinuteFirstSequence: string | null = null
    let currentMinuteLastSequence: string | null = null
    let rowsProcessed = 0
    let snapshotRows = 0
    let updateRows = 0
    let discardedRows = 0
    let malformedRows = 0
    let outOfWindowRows = 0
    let wasPrevSnapshot = false
    let initialSnapshot: ReplayOrderbookSnapshotV2 | null = null
    let latestSnapshotTimestamp: string | null = null
    let latestSnapshotSequence: string | null = null
    let firstEventTimestamp: string | null = null
    let lastEventTimestamp: string | null = null
    let timestampsOrdered = true
    let previousTimestampMs: number | null = null
    let firstUpdateId: string | null = null
    let lastUpdateId: string | null = null
    let previousFinalUpdateId: string | null = null
    let gapCount = 0
    let continuityChecked = false
    let updateOrder = 0
    let rowStart = 0

    function resetProgressionAfterSnapshot() {
      updates.length = 0
      checkpoints.length = 0
      minuteUpdates.clear()
      minuteSourceUpdateCount = 0
      currentMinute = null
      currentMinuteFirstTimestamp = null
      currentMinuteLastTimestamp = null
      currentMinuteFirstSequence = null
      currentMinuteLastSequence = null
    }

    function finalizeMinute() {
      if (
        !currentMinute
        || !currentMinuteFirstTimestamp
        || !currentMinuteLastTimestamp
        || minuteUpdates.size === 0
      ) return
      const compacted = [...minuteUpdates.values()]
        .sort((left, right) => left.order - right.order)
      let lastBatchIndex = updates.length - 1
      for (
        let offset = 0;
        offset < compacted.length;
        offset += REPLAY_ORDERBOOK_CACHE_V2_MAX_BATCH_UPDATES
      ) {
        const chunk = compacted.slice(
          offset,
          offset + REPLAY_ORDERBOOK_CACHE_V2_MAX_BATCH_UPDATES,
        )
        updates.push({
          batchId: `${coordinates.symbol}:${currentMinute}:${updates.length}`,
          startTimestamp: currentMinuteFirstTimestamp,
          endTimestamp: currentMinuteLastTimestamp,
          firstSequenceId: currentMinuteFirstSequence,
          lastSequenceId: currentMinuteLastSequence,
          sourceUpdateCount: minuteSourceUpdateCount,
          compactedUpdateCount: chunk.length,
          truncated: false,
          updates: chunk.map(({ order: _order, ...update }) => update),
        })
        lastBatchIndex = updates.length - 1
      }
      const summary = summarizeOrderbookV2(bids, asks)
      if (summary) {
        checkpoints.push({
          checkpointId: `${coordinates.symbol}:${currentMinute}`,
          timestamp: currentMinuteLastTimestamp,
          afterBatchIndex: lastBatchIndex,
          verified: initialSnapshot !== null,
          ...snapshotLevelsV2(bids, asks),
          summary,
        })
      }
      minuteUpdates.clear()
      minuteSourceUpdateCount = 0
      currentMinute = null
      currentMinuteFirstTimestamp = null
      currentMinuteLastTimestamp = null
      currentMinuteFirstSequence = null
      currentMinuteLastSequence = null
    }

    for (const rowGroup of parquetMetadata.row_groups) {
      const rowEnd = rowStart + Number(rowGroup.num_rows)
      const rows = await parquetReadObjects({
        file,
        metadata: parquetMetadata,
        columns: REQUIRED_COLUMNS,
        rowStart,
        rowEnd,
      })

      for (const row of rows) {
        rowsProcessed += 1
        const rowTimestamp = timestamp(
          row.transaction_time ?? row.event_time ?? row.received_time,
        )
        const sideValue = String(row.side ?? "").toLowerCase()
        const price = numeric(row.price)
        const quantity = numeric(row.quantity)
        if (
          !rowTimestamp
          || (sideValue !== "bid" && sideValue !== "ask")
          || price === null
          || price <= 0
          || quantity === null
          || quantity < 0
        ) {
          discardedRows += 1
          malformedRows += 1
          continue
        }

        const timestampMs = Date.parse(rowTimestamp)
        if (timestampMs < windowStartMs || timestampMs >= windowEndMs) {
          discardedRows += 1
          outOfWindowRows += 1
          continue
        }
        if (!firstEventTimestamp) firstEventTimestamp = rowTimestamp
        lastEventTimestamp = rowTimestamp
        if (previousTimestampMs !== null && timestampMs < previousTimestampMs) {
          timestampsOrdered = false
        }
        previousTimestampMs = timestampMs

        const eventType = String(row.event_type ?? "").toLowerCase()
        const finalId = sequenceId(row.final_update_id)
        const previousId = sequenceId(row.prev_final_update_id)
        if (finalId && finalId !== lastUpdateId) {
          if (!firstUpdateId) firstUpdateId = sequenceId(row.first_update_id) ?? finalId
          if (previousFinalUpdateId && previousId) {
            continuityChecked = true
            if (previousId !== previousFinalUpdateId) gapCount += 1
          }
          previousFinalUpdateId = finalId
          lastUpdateId = finalId
        }

        if (eventType === "snapshot") {
          finalizeMinute()
          snapshotRows += 1
          if (!wasPrevSnapshot) {
            bids.clear()
            asks.clear()
            resetProgressionAfterSnapshot()
          }
          wasPrevSnapshot = true
          applyLevel(bids, asks, sideValue, price, quantity)
          latestSnapshotTimestamp = rowTimestamp
          latestSnapshotSequence = finalId
          continue
        }

        if (wasPrevSnapshot && !initialSnapshot && latestSnapshotTimestamp) {
          initialSnapshot = snapshot(
            bids,
            asks,
            latestSnapshotTimestamp,
            latestSnapshotSequence,
          )
          resetProgressionAfterSnapshot()
        }
        wasPrevSnapshot = false
        updateRows += 1

        const minute = minuteStart(rowTimestamp)
        if (currentMinute && minute !== currentMinute) finalizeMinute()
        if (!currentMinute) {
          currentMinute = minute
          currentMinuteFirstTimestamp = rowTimestamp
          currentMinuteFirstSequence = finalId
        }
        currentMinuteLastTimestamp = rowTimestamp
        currentMinuteLastSequence = finalId
        minuteSourceUpdateCount += 1
        updateOrder += 1

        const update: CompactedUpdate = {
          timestamp: rowTimestamp,
          sequenceId: finalId,
          side: sideValue,
          price,
          quantity,
          order: updateOrder,
        }
        minuteUpdates.set(`${sideValue}:${price}`, update)
        applyLevel(bids, asks, sideValue, price, quantity)
      }
      rowStart = rowEnd
    }
    finalizeMinute()

    if (!initialSnapshot && wasPrevSnapshot && latestSnapshotTimestamp) {
      initialSnapshot = snapshot(
        bids,
        asks,
        latestSnapshotTimestamp,
        latestSnapshotSequence,
      )
    }

    const generatedAt = new Date().toISOString()
    const terminalSummary = summarizeOrderbookV2(bids, asks)
    const spreadValid = spreadValidV2(terminalSummary)
    const expectedCheckpoints = 60
    const checkpointCoveragePercent = Math.min(
      100,
      Number(((checkpoints.length / expectedCheckpoints) * 100).toFixed(2)),
    )
    const baseReasons: string[] = []
    const warnings: string[] = []
    if (!initialSnapshot) {
      baseReasons.push("Provider file contains no verified initialization snapshot.")
    }
    if (!timestampsOrdered) baseReasons.push("Source event timestamps are not ordered.")
    if (!spreadValid) baseReasons.push("Terminal best bid/ask spread is invalid.")
    if (gapCount > 0) baseReasons.push(`${gapCount} update sequence gap(s) were detected.`)
    if (malformedRows > 0) warnings.push(`${malformedRows} malformed row(s) were discarded.`)
    if (outOfWindowRows > 0) {
      warnings.push(`${outOfWindowRows} row(s) outside the selected UTC window were discarded.`)
    }

    const preliminary: ReplayOrderbookCachePayloadV2 = {
      schemaVersion: 2,
      metadata: {
        exchange: coordinates.exchange,
        symbol: coordinates.symbol,
        window: selectedWindow,
        source: {
          provider: "cryptohftdata",
          dataset: "orderbook",
          sourceFile,
          sourceSchema: "CommonOrderbookEvent",
        },
        generatedAt,
        firstEventTimestamp,
        lastEventTimestamp,
        totalRows,
        rowsProcessed,
        snapshotRows,
        updateRows,
        discardedRows,
        malformedRows,
        outOfWindowRows,
        checkpointIntervalMs: REPLAY_ORDERBOOK_CACHE_V2_CHECKPOINT_INTERVAL_MS,
        checkpointCount: checkpoints.length,
        updateBatchCount: updates.length,
        levelLimit: REPLAY_ORDERBOOK_CACHE_V2_LEVEL_LIMIT,
        initializationMethod: initialSnapshot
          ? "provider_snapshot"
          : updateRows > 0
            ? "unverified_updates"
            : "unavailable",
        sourceContinuity: {
          checked: continuityChecked,
          continuous: continuityChecked ? gapCount === 0 : null,
          gapCount: continuityChecked ? gapCount : null,
          firstUpdateId,
          lastUpdateId,
        },
      },
      initialSnapshot,
      checkpoints,
      updates,
      terminalSummary,
      quality: {
        status: "unknown",
        evaluatedAt: generatedAt,
        cacheReadable: true,
        hasInitialSnapshot: initialSnapshot !== null,
        canInitializeBook: initialSnapshot !== null,
        canSeek: initialSnapshot !== null && checkpoints.length > 0,
        canAdvanceReplay: false,
        selfReplayPassed: false,
        terminalSummaryMatched: false,
        spreadValid,
        timestampsOrdered,
        sequenceContinuous: continuityChecked ? gapCount === 0 : null,
        checkpointCoveragePercent,
        firstTimestamp: firstEventTimestamp,
        lastTimestamp: lastEventTimestamp,
        reasons: baseReasons,
        warnings,
      },
    }

    const selfReplay = selfReplayOrderbookCacheV2(preliminary)
    const canAdvanceReplay = (
      initialSnapshot !== null
      && updates.length > 0
      && selfReplay.passed
      && timestampsOrdered
      && gapCount === 0
    )
    const status = (
      !terminalSummary || !spreadValid || rowsProcessed === 0
        ? "invalid"
        : initialSnapshot && canAdvanceReplay
          ? "valid"
          : "degraded"
    )
    preliminary.quality = {
      ...preliminary.quality,
      status,
      canAdvanceReplay,
      selfReplayPassed: selfReplay.passed,
      terminalSummaryMatched: selfReplay.terminalSummaryMatched,
      reasons: [
        ...baseReasons,
        ...(selfReplay.reason ? [selfReplay.reason] : []),
      ],
    }

    const manifestMetadata: ReplayOrderbookCacheManifestMetadataV2 = {
      sourceFile,
      totalRows,
      rowsProcessed,
      snapshotRows,
      updateRows,
      checkpointCount: checkpoints.length,
      updateBatchCount: updates.length,
      qualityStatus: status,
    }
    await writeHistoricalCache({
      identity,
      source,
      schemaVersion: REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
      data: preliminary,
      metadata: manifestMetadata,
      expiresAt: null,
      status: status === "valid" ? "complete" : "partial",
      recordCount: checkpoints.length,
    })

    return preliminary
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Replay orderbook V2 proof-of-concept generation failed."
    await writeHistoricalCacheFailure({
      identity,
      source,
      schemaVersion: REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
      status: "failed",
      metadata: { sourceFile, proofOfConcept: true },
      error: {
        code: "replay_orderbook_cache_v2_generation_failed",
        message,
      },
    })
    throw error
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const symbol = argument("symbol")
  const exchange = argument("exchange")
  const date = argument("date")
  const hour = Number(argument("hour"))
  if (!symbol || !exchange || !date || !Number.isInteger(hour)) {
    throw new Error(
      "Usage: --symbol BTCUSDT --exchange binance_futures --date 2026-02-22 --hour 12",
    )
  }
  const payload = await buildReplayOrderbookCacheV2({
    symbol,
    exchange,
    date,
    hour,
  })
  process.stdout.write(`${JSON.stringify({
    target: payload.metadata.window,
    qualityStatus: payload.quality.status,
    initializationMethod: payload.metadata.initializationMethod,
    checkpointCount: payload.checkpoints.length,
    updateBatchCount: payload.updates.length,
    selfReplayPassed: payload.quality.selfReplayPassed,
    terminalSummaryMatched: payload.quality.terminalSummaryMatched,
    reasons: payload.quality.reasons,
  }, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
