import { evaluateFreshness, getSource } from "@/lib/data-governance"
import {
  observeBinanceFuturesAt,
  type BinanceFuturesObservation,
} from "@/lib/data-sources/binanceFuturesObservationClient"
import type {
  OperationalRecordPersistenceIntent,
  PersistenceRepository,
} from "@/lib/persistence/repository"
import type { StorageJsonValue } from "@/lib/persistence"
import {
  isTrackingWindowId,
  validateTrackingLifecycle,
  type TrackingLifecycle,
  type TrackingWindowId,
} from "@/lib/signal-tracking"
import type { WorkerJobHandler } from "@/lib/worker-runtime"
import type {
  EvaluationWindowWork,
} from "@/workers/local-runner/evaluationWindow"
import { resolveTrackingLifecycle } from "@/workers/local-runner/evaluationWindow"
import type { ScannerSignalSnapshotCandidate } from "@/workers/local-runner/signalCapture"
import type { LocalRunRequest } from "@/workers/local-runner/types"

export const PRICE_OBSERVATION_SCHEMA_VERSION = 1 as const

export interface PriceObservationRecord {
  readonly schemaVersion: typeof PRICE_OBSERVATION_SCHEMA_VERSION
  readonly observationId: string
  readonly trackingId: string
  readonly snapshotId: string
  readonly windowId: TrackingWindowId
  readonly observedAt: string
  readonly symbol: string
  readonly exchange: string
  readonly price: number | "UNAVAILABLE"
  readonly fundingRate: number | "UNAVAILABLE"
  readonly openInterest: number | "UNAVAILABLE"
  readonly sourceMetadata: {
    readonly sourceId: "binance-live"
    readonly sourceName: string
    readonly productionApproved: true
    readonly sourceTimestamps: BinanceFuturesObservation["sourceTimestamps"]
  }
  readonly freshness: {
    readonly status: string
    readonly reason: string
    readonly lastUpdatedAt: string | null
    readonly retrievedAt: string | null
  }
}

type WorkResolution =
  | { readonly success: true; readonly lifecycle: TrackingLifecycle; readonly works: readonly EvaluationWindowWork[] }
  | { readonly success: false; readonly code: string; readonly message: string; readonly retryable: boolean }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseWindowWork(value: unknown): EvaluationWindowWork | null {
  if (!isRecord(value)
    || value.jobType !== "PriceObservation"
    || typeof value.trackingId !== "string"
    || typeof value.snapshotId !== "string"
    || !isTrackingWindowId(value.windowId)
    || typeof value.dueAt !== "string"
    || !Number.isFinite(Date.parse(value.dueAt))
    || typeof value.readyAt !== "string"
    || !Number.isFinite(Date.parse(value.readyAt))) return null
  return Object.freeze({
    jobStateRecordId: typeof value.jobStateRecordId === "string"
      ? value.jobStateRecordId
      : undefined,
    trackingId: value.trackingId,
    snapshotId: value.snapshotId,
    windowId: value.windowId,
    dueAt: new Date(value.dueAt).toISOString(),
    readyAt: new Date(value.readyAt).toISOString(),
  })
}

async function loadTracking(
  trackingId: string,
  options: {
    readonly repository: PersistenceRepository | null
    readonly initializedTracking: ReadonlyMap<string, TrackingLifecycle>
  },
): Promise<TrackingLifecycle | null> {
  const initialized = options.initializedTracking.get(trackingId)
  if (initialized) return initialized
  if (options.repository === null) return null
  const stored = await options.repository.getStorageRecord({
    recordId: trackingId,
    recordKind: "SIGNAL_TRACKING",
  })
  if (stored.status !== "SUCCESS") return null
  const validation = validateTrackingLifecycle(stored.value.payload)
  return validation.success ? validation.value : null
}

async function resolveWork(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly initializedTracking: ReadonlyMap<string, TrackingLifecycle>
  readonly preparedWindows: ReadonlyMap<string, EvaluationWindowWork>
}): Promise<WorkResolution> {
  const priorWorks = [...options.preparedWindows.values()]
  if (priorWorks.length) {
    const lifecycle = await loadTracking(priorWorks[0]!.trackingId, options)
    return lifecycle
      ? Object.freeze({ success: true, lifecycle, works: Object.freeze(priorWorks) })
      : Object.freeze({ success: false, code: "PRICE_OBSERVATION_INPUT_INVALID", message: "Prepared window has no tracking lifecycle.", retryable: false })
  }

  const jobStateRecordId = typeof options.request.metadata.evaluationWindowJobStateRecordId === "string"
    ? options.request.metadata.evaluationWindowJobStateRecordId.trim()
    : ""
  if (jobStateRecordId) {
    if (options.repository === null) {
      return Object.freeze({ success: false, code: "PRICE_OBSERVATION_INPUT_INVALID", message: "Evaluation-window job state requires persistence.", retryable: false })
    }
    const stored = await options.repository.getOperationalRecord({
      recordId: jobStateRecordId,
      recordKind: "JOB_STATE",
    })
    if (stored.status !== "SUCCESS") {
      return Object.freeze({ success: false, code: "PRICE_OBSERVATION_INPUT_INVALID", message: "Evaluation-window job state is unavailable.", retryable: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR" })
    }
    const work = parseWindowWork({
      ...(stored.value.payload as Record<string, unknown>),
      jobStateRecordId: stored.value.recordId,
    })
    if (!work) {
      return Object.freeze({ success: false, code: "PRICE_OBSERVATION_INPUT_INVALID", message: "Evaluation-window job state is malformed.", retryable: false })
    }
    const lifecycle = await loadTracking(work.trackingId, options)
    return lifecycle
      ? Object.freeze({ success: true, lifecycle, works: Object.freeze([work]) })
      : Object.freeze({ success: false, code: "PRICE_OBSERVATION_INPUT_INVALID", message: "Evaluation-window job state has no tracking lifecycle.", retryable: false })
  }

  const hasTrackingInput = options.request.metadata.signalTracking !== undefined
    || typeof options.request.metadata.signalTrackingRecordId === "string"
  if (!hasTrackingInput) {
    return Object.freeze({ success: false, code: "PRICE_OBSERVATION_INPUT_INVALID", message: "PriceObservation requires evaluation-window work or Signal Tracking input.", retryable: false })
  }
  const resolved = await resolveTrackingLifecycle({
    request: options.request,
    repository: options.repository,
    initializedTracking: options.initializedTracking,
  })
  if (resolved.success === false) {
    return Object.freeze({ success: false, code: "PRICE_OBSERVATION_INPUT_INVALID", message: resolved.message, retryable: resolved.retryable })
  }
  const windowId = options.request.metadata.evaluationWindow
  if (!isTrackingWindowId(windowId)) {
    return Object.freeze({ success: false, code: "PRICE_OBSERVATION_INPUT_INVALID", message: "A canonical evaluationWindow is required with Signal Tracking input.", retryable: false })
  }
  const window = resolved.value.windows.find((candidate) => candidate.id === windowId)
  if (!window || Date.parse(window.dueAt) > Date.parse(options.request.requestedAt)) {
    return Object.freeze({ success: false, code: "PRICE_OBSERVATION_INPUT_INVALID", message: "Requested evaluation window is not due.", retryable: false })
  }
  const work = Object.freeze({
    trackingId: resolved.value.identity.trackingId,
    snapshotId: resolved.value.identity.snapshotId,
    windowId: window.id,
    dueAt: window.dueAt,
    readyAt: options.request.requestedAt,
  })
  return Object.freeze({ success: true, lifecycle: resolved.value, works: Object.freeze([work]) })
}

async function resolveSnapshot(
  snapshotId: string,
  options: {
    readonly request: LocalRunRequest
    readonly repository: PersistenceRepository | null
    readonly capturedSnapshots: ReadonlyMap<string, ScannerSignalSnapshotCandidate>
  },
): Promise<ScannerSignalSnapshotCandidate | null> {
  const captured = options.capturedSnapshots.get(snapshotId)
  if (captured) return captured
  const supplied = options.request.metadata.signalSnapshot
  if (isRecord(supplied) && supplied.snapshotId === snapshotId && typeof supplied.symbol === "string") {
    return supplied as unknown as ScannerSignalSnapshotCandidate
  }
  if (options.repository === null) return null
  const stored = await options.repository.getStorageRecord({ recordId: snapshotId, recordKind: "SIGNAL_SNAPSHOT" })
  if (stored.status !== "SUCCESS" || !isRecord(stored.value.payload)
    || stored.value.payload.snapshotId !== snapshotId || typeof stored.value.payload.symbol !== "string") return null
  return stored.value.payload as unknown as ScannerSignalSnapshotCandidate
}

function observationId(trackingId: string, windowId: string): string {
  return `price-observation-v1:${encodeURIComponent(trackingId)}:${encodeURIComponent(windowId)}`
}

function completionIntent(
  observation: PriceObservationRecord,
  jobStateRecordId: string | undefined,
  completedAt: string,
): OperationalRecordPersistenceIntent {
  return Object.freeze({
    operationalRecord: Object.freeze({
      operationalType: "JobState" as const,
      recordId: `price-observation-complete-v1:${encodeURIComponent(observation.trackingId)}:${encodeURIComponent(observation.windowId)}`,
      operationalVersion: "price-observation-pilot-v1",
      schemaVersion: 1,
      createdAt: completedAt,
      parentRefs: Object.freeze([
        Object.freeze({ recordKind: "PRICE_OBSERVATION" as const, recordId: observation.observationId }),
        ...(jobStateRecordId
          ? [Object.freeze({ recordKind: "JOB_STATE" as const, recordId: jobStateRecordId })]
          : []),
      ]),
      payload: Object.freeze({
        jobType: "PriceObservation",
        observationId: observation.observationId,
        trackingId: observation.trackingId,
        windowId: observation.windowId,
        completedAt,
        status: "SUCCEEDED",
      }),
    }),
    recordedAt: completedAt,
  })
}

export function createPriceObservationHandler(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly capturedSnapshots: ReadonlyMap<string, ScannerSignalSnapshotCandidate>
  readonly initializedTracking: ReadonlyMap<string, TrackingLifecycle>
  readonly preparedWindows: ReadonlyMap<string, EvaluationWindowWork>
  readonly now: () => string
  readonly onObserved?: (record: PriceObservationRecord) => void
}): WorkerJobHandler {
  return async (context) => {
    const work = await resolveWork(options)
    if (work.success === false) {
      return Object.freeze({ success: false, error: Object.freeze({ code: work.code, message: work.message, retryable: work.retryable }) })
    }
    const snapshot = await resolveSnapshot(work.lifecycle.identity.snapshotId, options)
    if (!snapshot) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "PRICE_OBSERVATION_INPUT_INVALID", message: "Signal Snapshot with source symbol is unavailable.", retryable: false }) })
    }
    const source = getSource("binance-live")
    if (!source?.productionApproved || source.status !== "ACTIVE") {
      return Object.freeze({ success: false, error: Object.freeze({ code: "PRICE_SOURCE_UNAVAILABLE", message: "Approved Binance Live source is unavailable.", retryable: true }) })
    }
    const sourceResults = await Promise.all(work.works.map((window) =>
      observeBinanceFuturesAt(snapshot.symbol, window.dueAt)))
    const unavailableSource = sourceResults.find((result) => result.status === "UNAVAILABLE")
    if (unavailableSource?.status === "UNAVAILABLE") {
      return Object.freeze({ success: false, error: Object.freeze({ code: "PRICE_SOURCE_UNAVAILABLE", message: unavailableSource.reason, retryable: true }) })
    }
    const successfulSourceResults = sourceResults.filter(
      (result): result is Extract<typeof result, { readonly status: "SUCCESS" }> => (
        result.status === "SUCCESS"
      ),
    )
    if (successfulSourceResults.length !== work.works.length) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "PRICE_SOURCE_UNAVAILABLE", message: "Binance Futures observation result is unavailable.", retryable: true }) })
    }
    const retrievedAtValue = options.now()
    const retrievedAt = Number.isFinite(Date.parse(retrievedAtValue))
      ? new Date(retrievedAtValue).toISOString()
      : context.startedAt
    const records = work.works.map((window, index): PriceObservationRecord => {
      const sourceResult = successfulSourceResults[index]!
      const freshness = evaluateFreshness({
        sourceId: sourceResult.observation.sourceId,
        lastUpdatedAt: sourceResult.observation.observedAt,
        retrievedAt,
      })
      return Object.freeze({
      schemaVersion: PRICE_OBSERVATION_SCHEMA_VERSION,
      observationId: observationId(window.trackingId, window.windowId),
      trackingId: window.trackingId,
      snapshotId: window.snapshotId,
      windowId: window.windowId,
      observedAt: sourceResult.observation.observedAt,
      symbol: sourceResult.observation.symbol,
      exchange: sourceResult.observation.exchange,
      price: sourceResult.observation.price,
      fundingRate: sourceResult.observation.fundingRate ?? "UNAVAILABLE",
      openInterest: sourceResult.observation.openInterest ?? "UNAVAILABLE",
      sourceMetadata: Object.freeze({
        sourceId: "binance-live",
        sourceName: source.displayName,
        productionApproved: true,
        sourceTimestamps: sourceResult.observation.sourceTimestamps,
      }),
      freshness: Object.freeze({
        status: freshness.status,
        reason: freshness.reason,
        lastUpdatedAt: freshness.lastUpdatedAt,
        retrievedAt: freshness.retrievedAt,
      }),
      })
    })
    const producedRecords = Object.freeze(records.map((record) => Object.freeze({
      recordId: record.observationId,
      recordKind: "PRICE_OBSERVATION",
    })))
    if (options.request.dryRun) {
      records.forEach((record) => options.onObserved?.(record))
      return Object.freeze({ success: true, value: Object.freeze({ producedRecords, nextExecutionIds: Object.freeze([]) }) })
    }
    if (options.repository === null) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "STORAGE_UNAVAILABLE", message: "Price Observation persistence is unavailable.", retryable: true }) })
    }
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index]!
      const window = work.works[index]!
      const saved = await options.repository.savePriceObservation({
        observationId: record.observationId,
        trackingId: record.trackingId,
        windowId: record.windowId,
        schemaVersion: record.schemaVersion,
        observedAt: record.observedAt,
        recordedAt: retrievedAt,
        payload: record as unknown as StorageJsonValue,
        jobStateRecordId: window.jobStateRecordId,
      })
      if (saved.status !== "SUCCESS" && saved.status !== "DUPLICATE") {
        return Object.freeze({ success: false, error: Object.freeze({ code: saved.status === "UNAVAILABLE" || saved.status === "ADAPTER_ERROR" ? "STORAGE_UNAVAILABLE" : "PRICE_OBSERVATION_PERSISTENCE_FAILED", message: "Price Observation could not be persisted through Repository.", retryable: saved.status === "UNAVAILABLE" || saved.status === "ADAPTER_ERROR" }) })
      }
      const completion = await options.repository.saveOperationalRecord(
        completionIntent(record, window.jobStateRecordId, retrievedAt),
      )
      if (completion.status !== "SUCCESS" && completion.status !== "DUPLICATE") {
        return Object.freeze({ success: false, error: Object.freeze({ code: completion.status === "UNAVAILABLE" || completion.status === "ADAPTER_ERROR" ? "STORAGE_UNAVAILABLE" : "PRICE_OBSERVATION_PERSISTENCE_FAILED", message: "Price Observation completion could not be persisted through Repository.", retryable: completion.status === "UNAVAILABLE" || completion.status === "ADAPTER_ERROR" }) })
      }
      options.onObserved?.(record)
    }
    return Object.freeze({ success: true, value: Object.freeze({ producedRecords, nextExecutionIds: Object.freeze([]) }) })
  }
}
