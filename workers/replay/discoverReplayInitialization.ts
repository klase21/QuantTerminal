import { createWriteStream } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { fileURLToPath } from "node:url"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { decompress } from "fzstd"

import {
  REPLAY_INITIALIZATION_DISCOVERY_SCHEMA_VERSION,
  REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
  replayInitializationDiscoveryIdentity,
  replayOrderbookCacheIdentityV2,
  replayOrderbookWindowV2,
  type ReplayContinuityStatus,
  type ReplayInitializationBoundary,
  type ReplayInitializationCandidate,
  type ReplayInitializationDiscovery,
  type ReplayInitializationWindowInspection,
  type ReplayOrderbookCoordinatesV2,
  type ReplayOrderbookCacheManifestMetadataV2,
  type ReplayOrderbookCachePayloadV2,
} from "@/core/replay-cache-v2"
import {
  readHistoricalCache,
  writeHistoricalCache,
} from "@/lib/historical-intelligence/cache/fileCacheStore"

const TARGET: ReplayOrderbookCoordinatesV2 = {
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
const execFileAsync = promisify(execFile)

interface WindowResult {
  inspection: ReplayInitializationWindowInspection
  candidates: ReplayInitializationCandidate[]
}

function normalizeTarget(input: ReplayOrderbookCoordinatesV2) {
  const normalized = {
    symbol: input.symbol.trim().toUpperCase(),
    exchange: input.exchange.trim().toLowerCase(),
    date: input.date,
    hour: input.hour,
  }
  if (
    normalized.symbol !== TARGET.symbol
    || normalized.exchange !== TARGET.exchange
    || normalized.date !== TARGET.date
    || normalized.hour !== TARGET.hour
  ) {
    throw new Error(
      "Initialization discovery V1 is restricted to BTCUSDT binance_futures 2026-02-22 12 UTC.",
    )
  }
  return normalized
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

function shiftHour(target: ReplayOrderbookCoordinatesV2, offset: number) {
  const date = new Date(`${target.date}T${String(target.hour).padStart(2, "0")}:00:00.000Z`)
  date.setUTCHours(date.getUTCHours() + offset)
  return {
    ...target,
    date: date.toISOString().slice(0, 10),
    hour: date.getUTCHours(),
  }
}

function sourceFile(window: ReplayOrderbookCoordinatesV2) {
  return [
    window.exchange,
    window.date,
    String(window.hour).padStart(2, "0"),
    `${window.symbol}_orderbook.parquet.zst`,
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

async function downloadWindow(
  window: ReplayOrderbookCoordinatesV2,
  destination: string,
) {
  loadLocalEnvironment()
  const apiKey = process.env.CRYPTOHFTDATA_API_KEY
  if (!apiKey) throw new Error("CRYPTOHFTDATA_API_KEY is not configured.")
  const file = sourceFile(window)
  const url = new URL(DOWNLOAD_BASE_URL)
  url.searchParams.set("file", file)
  url.searchParams.set("api_key", apiKey)
  const response = await fetch(url, {
    headers: { accept: "application/octet-stream" },
  })
  if (!response.ok || !response.body) {
    return { ok: false as const, status: response.status, file }
  }
  await pipeline(
    Readable.fromWeb(response.body as never),
    createWriteStream(destination),
  )
  return { ok: true as const, status: response.status, file }
}

function continuityStatus(checked: boolean, gaps: number): ReplayContinuityStatus {
  if (!checked) return "unknown"
  return gaps === 0 ? "continuous" : "gap"
}

async function inspectWindow(
  window: ReplayOrderbookCoordinatesV2,
  temporaryFile: string,
): Promise<WindowResult> {
  const filePath = sourceFile(window)
  const download = await downloadWindow(window, temporaryFile)
  if (!download.ok) {
    return {
      inspection: {
        window,
        sourceFile: filePath,
        sourceAvailable: false,
        httpStatus: download.status,
        totalRows: 0,
        rowsInspected: 0,
        snapshotRows: 0,
        updateRows: 0,
        malformedRows: 0,
        outOfWindowRows: 0,
        firstTimestamp: null,
        lastTimestamp: null,
        firstUpdateId: null,
        firstPrevFinalUpdateId: null,
        lastUpdateId: null,
        withinWindowContinuity: "unknown",
        gapCount: null,
        error: `Provider returned HTTP ${download.status}.`,
      },
      candidates: [],
    }
  }

  const compressed = await readFile(temporaryFile)
  const file = exactArrayBuffer(decompress(compressed))
  const {
    parquetMetadataAsync,
    parquetReadObjects,
    parquetSchema,
  } = await import("hyparquet")
  const metadata = await parquetMetadataAsync(file)
  const columns = parquetSchema(metadata).children.map((child) => child.element.name)
  const missing = REQUIRED_COLUMNS.filter((column) => !columns.includes(column))
  if (missing.length) {
    throw new Error(`${filePath} is missing required columns: ${missing.join(", ")}`)
  }

  const selectedWindow = replayOrderbookWindowV2(window.date, window.hour)
  const startMs = Date.parse(selectedWindow.start)
  const endMs = Date.parse(selectedWindow.end)
  const candidates: ReplayInitializationCandidate[] = []
  let rowsInspected = 0
  let snapshotRows = 0
  let updateRows = 0
  let malformedRows = 0
  let outOfWindowRows = 0
  let firstTimestamp: string | null = null
  let lastTimestamp: string | null = null
  let firstUpdateId: string | null = null
  let firstPrevFinalUpdateId: string | null = null
  let lastUpdateId: string | null = null
  let previousDistinctFinalId: string | null = null
  let continuityChecked = false
  let gapCount = 0
  let rowStart = 0
  let snapshotGroup: {
    startTimestamp: string
    endTimestamp: string
    sequenceId: string | null
    bids: Set<number>
    asks: Set<number>
  } | null = null
  let activeCandidate: ReplayInitializationCandidate | null = null
  let candidatePreviousFinalId: string | null = null
  let candidateContinuityChecked = false
  let candidateGapCount = 0

  function finalizeSnapshot() {
    if (!snapshotGroup) return
    const candidate: ReplayInitializationCandidate = {
      candidateId: `${window.symbol}:${window.date}:${String(window.hour).padStart(2, "0")}:${snapshotGroup.startTimestamp}`,
      window,
      snapshotStartTimestamp: snapshotGroup.startTimestamp,
      snapshotEndTimestamp: snapshotGroup.endTimestamp,
      sequenceId: snapshotGroup.sequenceId,
      bidLevelCount: snapshotGroup.bids.size,
      askLevelCount: snapshotGroup.asks.size,
      usable: snapshotGroup.bids.size > 0 && snapshotGroup.asks.size > 0,
      postSnapshotFirstUpdateId: null,
      postSnapshotLastUpdateId: null,
      postSnapshotContinuity: "unknown",
      postSnapshotGapCount: null,
    }
    candidates.push(candidate)
    activeCandidate = candidate
    candidatePreviousFinalId = candidate.sequenceId
    candidateContinuityChecked = false
    candidateGapCount = 0
    snapshotGroup = null
  }

  for (const rowGroup of metadata.row_groups) {
    const rowEnd = rowStart + Number(rowGroup.num_rows)
    const rows = await parquetReadObjects({
      file,
      metadata,
      columns: REQUIRED_COLUMNS,
      rowStart,
      rowEnd,
    })
    for (const row of rows) {
      rowsInspected += 1
      const rowTimestamp = timestamp(
        row.transaction_time ?? row.event_time ?? row.received_time,
      )
      const side = String(row.side ?? "").toLowerCase()
      const price = numeric(row.price)
      const quantity = numeric(row.quantity)
      if (
        !rowTimestamp
        || (side !== "bid" && side !== "ask")
        || price === null
        || price <= 0
        || quantity === null
        || quantity < 0
      ) {
        malformedRows += 1
        continue
      }
      const timestampMs = Date.parse(rowTimestamp)
      if (timestampMs < startMs || timestampMs >= endMs) {
        outOfWindowRows += 1
        continue
      }
      if (!firstTimestamp) firstTimestamp = rowTimestamp
      lastTimestamp = rowTimestamp

      const eventType = String(row.event_type ?? "").toLowerCase()
      const finalId = sequenceId(row.final_update_id)
      const previousId = sequenceId(row.prev_final_update_id)
      if (eventType === "snapshot") {
        snapshotRows += 1
        if (!snapshotGroup) {
          snapshotGroup = {
            startTimestamp: rowTimestamp,
            endTimestamp: rowTimestamp,
            sequenceId: finalId,
            bids: new Set(),
            asks: new Set(),
          }
        }
        snapshotGroup.endTimestamp = rowTimestamp
        snapshotGroup.sequenceId = finalId ?? snapshotGroup.sequenceId
        if (quantity > 0) {
          if (side === "bid") snapshotGroup.bids.add(price)
          else snapshotGroup.asks.add(price)
        }
        continue
      }

      finalizeSnapshot()
      updateRows += 1
      if (finalId && finalId !== lastUpdateId) {
        if (!firstUpdateId) {
          firstUpdateId = sequenceId(row.first_update_id) ?? finalId
          firstPrevFinalUpdateId = previousId
        }
        if (previousDistinctFinalId && previousId) {
          continuityChecked = true
          if (previousId !== previousDistinctFinalId) gapCount += 1
        }
        previousDistinctFinalId = finalId
        lastUpdateId = finalId

        if (activeCandidate) {
          if (!activeCandidate.postSnapshotFirstUpdateId) {
            activeCandidate.postSnapshotFirstUpdateId = (
              sequenceId(row.first_update_id) ?? finalId
            )
          }
          if (candidatePreviousFinalId && previousId) {
            candidateContinuityChecked = true
            if (previousId !== candidatePreviousFinalId) candidateGapCount += 1
          }
          candidatePreviousFinalId = finalId
          activeCandidate.postSnapshotLastUpdateId = finalId
          activeCandidate.postSnapshotContinuity = continuityStatus(
            candidateContinuityChecked,
            candidateGapCount,
          )
          activeCandidate.postSnapshotGapCount = candidateContinuityChecked
            ? candidateGapCount
            : null
        }
      }
    }
    rowStart = rowEnd
  }
  finalizeSnapshot()

  return {
    inspection: {
      window,
      sourceFile: filePath,
      sourceAvailable: true,
      httpStatus: download.status,
      totalRows: Number(metadata.num_rows),
      rowsInspected,
      snapshotRows,
      updateRows,
      malformedRows,
      outOfWindowRows,
      firstTimestamp,
      lastTimestamp,
      firstUpdateId,
      firstPrevFinalUpdateId,
      lastUpdateId,
      withinWindowContinuity: continuityStatus(continuityChecked, gapCount),
      gapCount: continuityChecked ? gapCount : null,
      error: null,
    },
    candidates,
  }
}

function boundary(
  from: ReplayInitializationWindowInspection,
  to: ReplayInitializationWindowInspection,
): ReplayInitializationBoundary {
  if (!from.sourceAvailable || !to.sourceAvailable) {
    return {
      fromWindow: from.window,
      toWindow: to.window,
      fromLastUpdateId: from.lastUpdateId,
      toFirstPrevFinalUpdateId: to.firstPrevFinalUpdateId,
      status: "unknown",
      reason: "One or both source windows are unavailable.",
    }
  }
  if (!from.lastUpdateId) {
    return {
      fromWindow: from.window,
      toWindow: to.window,
      fromLastUpdateId: from.lastUpdateId,
      toFirstPrevFinalUpdateId: to.firstPrevFinalUpdateId,
      status: "unknown",
      reason: "Preceding window final update identifier is unavailable.",
    }
  }
  let continuous: boolean | null = null
  let comparison = "prev_final_update_id"
  if (to.firstPrevFinalUpdateId) {
    continuous = from.lastUpdateId === to.firstPrevFinalUpdateId
  } else if (to.firstUpdateId) {
    try {
      continuous = BigInt(to.firstUpdateId) === BigInt(from.lastUpdateId) + BigInt(1)
      comparison = "first_update_id adjacency"
    } catch {
      continuous = null
    }
  }
  if (continuous === null) {
    return {
      fromWindow: from.window,
      toWindow: to.window,
      fromLastUpdateId: from.lastUpdateId,
      toFirstPrevFinalUpdateId: to.firstPrevFinalUpdateId,
      status: "unknown",
      reason: "Boundary update identifiers cannot be compared deterministically.",
    }
  }
  return {
    fromWindow: from.window,
    toWindow: to.window,
    fromLastUpdateId: from.lastUpdateId,
    toFirstPrevFinalUpdateId: to.firstPrevFinalUpdateId,
    status: continuous ? "continuous" : "gap",
    reason: continuous
      ? `Window boundary is continuous by ${comparison}.`
      : `Window boundary has a gap by ${comparison}.`,
  }
}

async function inspectTargetFromCache(
  target: ReplayOrderbookCoordinatesV2,
): Promise<WindowResult> {
  const result = await readHistoricalCache<
    ReplayOrderbookCachePayloadV2,
    ReplayOrderbookCacheManifestMetadataV2
  >(
    replayOrderbookCacheIdentityV2(target),
    {
      expectedSchemaVersion: REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION,
      allowPartial: true,
      allowExpired: false,
    },
  )
  if ("reason" in result) {
    throw new Error(
      `Target V2 source diagnostics are unavailable: ${result.reason}`,
    )
  }
  const payload = result.data
  const candidate = payload.initialSnapshot
    ? {
        candidateId: `${target.symbol}:${target.date}:${String(target.hour).padStart(2, "0")}:${payload.initialSnapshot.timestamp}`,
        window: target,
        snapshotStartTimestamp: payload.initialSnapshot.timestamp,
        snapshotEndTimestamp: payload.initialSnapshot.timestamp,
        sequenceId: payload.initialSnapshot.sequenceId,
        bidLevelCount: payload.initialSnapshot.bids.length,
        askLevelCount: payload.initialSnapshot.asks.length,
        usable: (
          payload.initialSnapshot.bids.length > 0
          && payload.initialSnapshot.asks.length > 0
        ),
        postSnapshotFirstUpdateId: payload.metadata.sourceContinuity.firstUpdateId,
        postSnapshotLastUpdateId: payload.metadata.sourceContinuity.lastUpdateId,
        postSnapshotContinuity: payload.metadata.sourceContinuity.continuous === true
          ? "continuous" as const
          : payload.metadata.sourceContinuity.continuous === false
            ? "gap" as const
            : "unknown" as const,
        postSnapshotGapCount: payload.metadata.sourceContinuity.gapCount,
      }
    : null
  return {
    inspection: {
      window: target,
      sourceFile: payload.metadata.source.sourceFile,
      sourceAvailable: true,
      httpStatus: 200,
      totalRows: payload.metadata.totalRows,
      rowsInspected: payload.metadata.rowsProcessed,
      snapshotRows: payload.metadata.snapshotRows,
      updateRows: payload.metadata.updateRows,
      malformedRows: payload.metadata.malformedRows,
      outOfWindowRows: payload.metadata.outOfWindowRows,
      firstTimestamp: payload.metadata.firstEventTimestamp,
      lastTimestamp: payload.metadata.lastEventTimestamp,
      firstUpdateId: payload.metadata.sourceContinuity.firstUpdateId,
      firstPrevFinalUpdateId: null,
      lastUpdateId: payload.metadata.sourceContinuity.lastUpdateId,
      withinWindowContinuity: payload.metadata.sourceContinuity.continuous === true
        ? "continuous"
        : payload.metadata.sourceContinuity.continuous === false
          ? "gap"
          : "unknown",
      gapCount: payload.metadata.sourceContinuity.gapCount,
      error: null,
    },
    candidates: candidate ? [candidate] : [],
  }
}

async function inspectWindowIsolated(
  window: ReplayOrderbookCoordinatesV2,
): Promise<WindowResult> {
  const script = fileURLToPath(import.meta.url)
  const tsxCli = path.join(
    process.cwd(),
    "node_modules",
    "tsx",
    "dist",
    "cli.mjs",
  )
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      tsxCli,
      script,
      "--inspect-only",
      "--symbol",
      window.symbol,
      "--exchange",
      window.exchange,
      "--date",
      window.date,
      "--hour",
      String(window.hour),
    ],
    {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    },
  )
  return JSON.parse(stdout) as WindowResult
}

export async function discoverReplayInitialization(input: {
  target: ReplayOrderbookCoordinatesV2
  lookbackHours: number
}) {
  const target = normalizeTarget(input.target)
  const lookbackHours = Math.max(1, Math.min(3, Math.trunc(input.lookbackHours)))
  const inspections: ReplayInitializationWindowInspection[] = []
  const candidates: ReplayInitializationCandidate[] = []

  for (let offset = 0; offset >= -lookbackHours; offset -= 1) {
    const window = shiftHour(target, offset)
    const result = offset === 0
      ? await inspectTargetFromCache(window)
      : await inspectWindowIsolated(window)
    inspections.push(result.inspection)
    candidates.push(...result.candidates)
    if (
      offset < 0
      && result.candidates.some((candidate) => candidate.usable)
    ) break
  }

  const chronological = [...inspections].sort((left, right) => (
    Date.parse(replayOrderbookWindowV2(left.window.date, left.window.hour).start)
    - Date.parse(replayOrderbookWindowV2(right.window.date, right.window.hour).start)
  ))
  const boundaries = chronological.slice(1).map((item, index) => (
    boundary(chronological[index], item)
  ))
  const usableCandidates = candidates
    .filter((candidate) => candidate.usable)
    .sort((left, right) => (
      Date.parse(right.snapshotEndTimestamp) - Date.parse(left.snapshotEndTimestamp)
    ))
  let selectedCandidate: ReplayInitializationCandidate | null = null
  let continuityStatus: ReplayContinuityStatus = "not_applicable"
  const reasons: string[] = []

  for (const candidate of usableCandidates) {
    const candidateIndex = chronological.findIndex((item) => (
      item.window.date === candidate.window.date
      && item.window.hour === candidate.window.hour
    ))
    const requiredWindows = chronological.slice(candidateIndex)
    const requiredBoundaries = boundaries.slice(candidateIndex)
    const withinStatuses = requiredWindows.map((item) => item.withinWindowContinuity)
    const statuses = [
      candidate.postSnapshotContinuity,
      ...withinStatuses.slice(1),
      ...requiredBoundaries.map((item) => item.status),
    ]
    if (statuses.some((status) => status === "gap")) {
      continuityStatus = "gap"
      continue
    }
    if (statuses.some((status) => status === "unknown")) {
      continuityStatus = "unknown"
      selectedCandidate = candidate
      break
    }
    continuityStatus = "continuous"
    selectedCandidate = candidate
    break
  }

  let initializationStatus: ReplayInitializationDiscovery["initializationStatus"]
  if (selectedCandidate && continuityStatus === "continuous") {
    initializationStatus = "initializable"
    reasons.push("A usable provider snapshot and continuous update bridge were verified.")
  } else if (selectedCandidate) {
    initializationStatus = "unknown"
    reasons.push("A usable snapshot exists, but continuity into the target hour is not proven.")
  } else if (inspections.every((item) => !item.sourceAvailable)) {
    initializationStatus = "source_missing"
    reasons.push("No inspected provider source window was available.")
  } else {
    initializationStatus = "not_initializable"
    reasons.push("No usable provider snapshot was found in the inspected lookback windows.")
    continuityStatus = boundaries.some((item) => item.status === "gap")
      ? "gap"
      : boundaries.some((item) => item.status === "unknown")
        ? "unknown"
        : boundaries.length
          ? "continuous"
          : "not_applicable"
    if (continuityStatus === "gap") {
      reasons.push("Cross-window update identifiers contain continuity gaps.")
    }
  }

  const discovery: ReplayInitializationDiscovery = {
    schemaVersion: 1,
    targetWindow: target,
    lookbackHours,
    generatedAt: new Date().toISOString(),
    inspectedWindows: inspections,
    candidateSnapshots: candidates,
    selectedCandidate,
    boundaries,
    continuityStatus,
    initializationStatus,
    reasons,
  }
  await writeHistoricalCache({
    identity: replayInitializationDiscoveryIdentity(target),
    source: {
      id: "cryptohftdata",
      kind: "enrichment",
      metadata: {
        dataset: "orderbook",
        purpose: "initialization-discovery",
      },
    },
    schemaVersion: REPLAY_INITIALIZATION_DISCOVERY_SCHEMA_VERSION,
    data: discovery,
    metadata: {
      target,
      lookbackHours,
      inspectedWindowCount: inspections.length,
      candidateCount: candidates.length,
      initializationStatus,
    },
    expiresAt: null,
    status: "complete",
    recordCount: inspections.length,
  })
  return discovery
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
  const lookbackHours = Number(argument("lookback-hours") ?? 3)
  if (!symbol || !exchange || !date || !Number.isInteger(hour)) {
    throw new Error(
      "Usage: --symbol BTCUSDT --exchange binance_futures --date 2026-02-22 --hour 12 --lookback-hours 3",
    )
  }
  if (process.argv.includes("--inspect-only")) {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "quantterminal-init-window-"),
    )
    try {
      const result = await inspectWindow(
        { symbol, exchange, date, hour },
        path.join(temporaryRoot, "orderbook.parquet.zst"),
      )
      process.stdout.write(JSON.stringify(result))
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true })
    }
    return
  }
  const result = await discoverReplayInitialization({
    target: { symbol, exchange, date, hour },
    lookbackHours,
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
