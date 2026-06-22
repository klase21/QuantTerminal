import type { HistoricalCacheIdentity } from "@/core/historical-intelligence/cache/cacheTypes"
import type { ReplayOrderbookCoordinatesV2 } from "./replayOrderbookCacheV2"

export const REPLAY_INITIALIZATION_DISCOVERY_SCHEMA_VERSION = "1"
export const REPLAY_INITIALIZATION_DISCOVERY_DATASET_ID = "orderbook-initialization-discovery"

export type ReplayInitializationStatus =
  | "initializable"
  | "not_initializable"
  | "source_missing"
  | "unknown"

export type ReplayContinuityStatus =
  | "continuous"
  | "gap"
  | "unknown"
  | "not_applicable"

export interface ReplayInitializationWindowInspection {
  window: ReplayOrderbookCoordinatesV2
  sourceFile: string
  sourceAvailable: boolean
  httpStatus: number | null
  totalRows: number
  rowsInspected: number
  snapshotRows: number
  updateRows: number
  malformedRows: number
  outOfWindowRows: number
  firstTimestamp: string | null
  lastTimestamp: string | null
  firstUpdateId: string | null
  firstPrevFinalUpdateId: string | null
  lastUpdateId: string | null
  withinWindowContinuity: ReplayContinuityStatus
  gapCount: number | null
  error: string | null
}

export interface ReplayInitializationCandidate {
  candidateId: string
  window: ReplayOrderbookCoordinatesV2
  snapshotStartTimestamp: string
  snapshotEndTimestamp: string
  sequenceId: string | null
  bidLevelCount: number
  askLevelCount: number
  usable: boolean
  postSnapshotFirstUpdateId: string | null
  postSnapshotLastUpdateId: string | null
  postSnapshotContinuity: ReplayContinuityStatus
  postSnapshotGapCount: number | null
}

export interface ReplayInitializationBoundary {
  fromWindow: ReplayOrderbookCoordinatesV2
  toWindow: ReplayOrderbookCoordinatesV2
  fromLastUpdateId: string | null
  toFirstPrevFinalUpdateId: string | null
  status: ReplayContinuityStatus
  reason: string
}

export interface ReplayInitializationDiscovery {
  schemaVersion: 1
  targetWindow: ReplayOrderbookCoordinatesV2
  lookbackHours: number
  generatedAt: string
  inspectedWindows: ReplayInitializationWindowInspection[]
  candidateSnapshots: ReplayInitializationCandidate[]
  selectedCandidate: ReplayInitializationCandidate | null
  boundaries: ReplayInitializationBoundary[]
  continuityStatus: ReplayContinuityStatus
  initializationStatus: ReplayInitializationStatus
  reasons: string[]
}

export function replayInitializationDiscoveryIdentity(
  target: ReplayOrderbookCoordinatesV2,
): HistoricalCacheIdentity {
  return {
    namespace: "replay",
    datasetId: REPLAY_INITIALIZATION_DISCOVERY_DATASET_ID,
    partition: {
      exchange: target.exchange.trim().toLowerCase(),
      symbol: target.symbol.trim().toUpperCase(),
      date: target.date,
      hour: String(target.hour).padStart(2, "0"),
    },
  }
}
