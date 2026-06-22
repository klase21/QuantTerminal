import type { HistoricalCacheIdentity } from "@/core/historical-intelligence/cache/cacheTypes"

export const REPLAY_ORDERBOOK_CACHE_V2_SCHEMA_VERSION = "2"
export const REPLAY_ORDERBOOK_CACHE_V2_NAMESPACE = "replay"
export const REPLAY_ORDERBOOK_CACHE_V2_DATASET_ID = "orderbook-replay"
export const REPLAY_ORDERBOOK_CACHE_V2_LEVEL_LIMIT = 50
export const REPLAY_ORDERBOOK_CACHE_V2_CHECKPOINT_INTERVAL_MS = 60_000
export const REPLAY_ORDERBOOK_CACHE_V2_MAX_BATCH_UPDATES = 100_000

export type ReplayOrderbookQualityStatusV2 =
  | "valid"
  | "degraded"
  | "invalid"
  | "unknown"

export type ReplayOrderbookLevelV2 = [price: number, quantity: number]

export interface ReplayOrderbookCoordinatesV2 {
  exchange: string
  symbol: string
  date: string
  hour: number
}

export interface ReplayOrderbookSummaryV2 {
  bestBid: number
  bestAsk: number
  spread: number
  bidLiquidity: number
  askLiquidity: number
  imbalance: number
  bidLevelCount: number
  askLevelCount: number
}

export interface ReplayOrderbookSnapshotV2 {
  timestamp: string
  sequenceId: string | null
  provenance: "provider_snapshot" | "prior_verified_checkpoint"
  bids: ReplayOrderbookLevelV2[]
  asks: ReplayOrderbookLevelV2[]
  summary: ReplayOrderbookSummaryV2
}

export interface ReplayOrderbookUpdateV2 {
  timestamp: string
  sequenceId: string | null
  side: "bid" | "ask"
  price: number
  quantity: number
}

export interface ReplayOrderbookUpdateBatchV2 {
  batchId: string
  startTimestamp: string
  endTimestamp: string
  firstSequenceId: string | null
  lastSequenceId: string | null
  sourceUpdateCount: number
  compactedUpdateCount: number
  truncated: boolean
  updates: ReplayOrderbookUpdateV2[]
}

export interface ReplayOrderbookCheckpointV2 {
  checkpointId: string
  timestamp: string
  afterBatchIndex: number
  verified: boolean
  bids: ReplayOrderbookLevelV2[]
  asks: ReplayOrderbookLevelV2[]
  summary: ReplayOrderbookSummaryV2
}

export interface ReplayOrderbookQualityReportV2 {
  status: ReplayOrderbookQualityStatusV2
  evaluatedAt: string
  cacheReadable: boolean
  hasInitialSnapshot: boolean
  canInitializeBook: boolean
  canSeek: boolean
  canAdvanceReplay: boolean
  selfReplayPassed: boolean
  terminalSummaryMatched: boolean
  spreadValid: boolean
  timestampsOrdered: boolean
  sequenceContinuous: boolean | null
  checkpointCoveragePercent: number
  firstTimestamp: string | null
  lastTimestamp: string | null
  reasons: string[]
  warnings: string[]
}

export interface ReplayOrderbookMetadataV2 {
  exchange: string
  symbol: string
  window: {
    date: string
    hour: number
    start: string
    end: string
  }
  source: {
    provider: "cryptohftdata"
    dataset: "orderbook"
    sourceFile: string
    sourceSchema: "CommonOrderbookEvent"
  }
  generatedAt: string
  firstEventTimestamp: string | null
  lastEventTimestamp: string | null
  totalRows: number
  rowsProcessed: number
  snapshotRows: number
  updateRows: number
  discardedRows: number
  malformedRows: number
  outOfWindowRows: number
  checkpointIntervalMs: number
  checkpointCount: number
  updateBatchCount: number
  levelLimit: number
  initializationMethod:
    | "provider_snapshot"
    | "verified_prior_checkpoint"
    | "unverified_updates"
    | "unavailable"
  sourceContinuity: {
    checked: boolean
    continuous: boolean | null
    gapCount: number | null
    firstUpdateId: string | null
    lastUpdateId: string | null
  }
}

export interface ReplayOrderbookCachePayloadV2 {
  schemaVersion: 2
  metadata: ReplayOrderbookMetadataV2
  initialSnapshot: ReplayOrderbookSnapshotV2 | null
  checkpoints: ReplayOrderbookCheckpointV2[]
  updates: ReplayOrderbookUpdateBatchV2[]
  terminalSummary: ReplayOrderbookSummaryV2 | null
  quality: ReplayOrderbookQualityReportV2
}

export interface ReplayOrderbookCacheManifestMetadataV2 extends Record<string, unknown> {
  sourceFile: string
  totalRows: number
  rowsProcessed: number
  snapshotRows: number
  updateRows: number
  checkpointCount: number
  updateBatchCount: number
  qualityStatus: ReplayOrderbookQualityStatusV2
}

export function replayOrderbookCacheIdentityV2(
  coordinates: ReplayOrderbookCoordinatesV2,
): HistoricalCacheIdentity {
  return {
    namespace: REPLAY_ORDERBOOK_CACHE_V2_NAMESPACE,
    datasetId: REPLAY_ORDERBOOK_CACHE_V2_DATASET_ID,
    partition: {
      exchange: coordinates.exchange.trim().toLowerCase(),
      symbol: coordinates.symbol.trim().toUpperCase(),
      date: coordinates.date,
      hour: String(coordinates.hour).padStart(2, "0"),
    },
  }
}

export function replayOrderbookWindowV2(date: string, hour: number) {
  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`)
  return {
    date,
    hour,
    start: start.toISOString(),
    end: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
  }
}
