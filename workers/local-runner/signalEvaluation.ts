import { getSource } from "@/lib/data-governance"
import type {
  OperationalRecordPersistenceIntent,
  PersistenceRepository,
} from "@/lib/persistence/repository"
import {
  evaluateSignalWindow,
  isSignalDirection,
  type SignalEvaluationResult,
} from "@/lib/signal-evaluation"
import {
  getTrackingWindowDefinition,
  isTrackingWindowId,
} from "@/lib/signal-tracking"
import type { WorkerJobHandler } from "@/lib/worker-runtime"
import type {
  PriceObservationRecord,
} from "@/workers/local-runner/priceObservation"
import type { ScannerSignalSnapshotCandidate } from "@/workers/local-runner/signalCapture"
import type { LocalRunRequest } from "@/workers/local-runner/types"

type ObservationResolution =
  | { readonly success: true; readonly value: PriceObservationRecord }
  | { readonly success: false; readonly code: string; readonly message: string; readonly retryable: boolean }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseObservation(value: unknown): PriceObservationRecord | null {
  if (!isRecord(value)
    || value.schemaVersion !== 1
    || typeof value.observationId !== "string"
    || typeof value.trackingId !== "string"
    || typeof value.snapshotId !== "string"
    || !isTrackingWindowId(value.windowId)
    || typeof value.observedAt !== "string"
    || !Number.isFinite(Date.parse(value.observedAt))
    || (value.price !== "UNAVAILABLE"
      && (typeof value.price !== "number" || !Number.isFinite(value.price) || value.price <= 0))
    || !isRecord(value.sourceMetadata)
    || typeof value.sourceMetadata.sourceId !== "string"
    || value.sourceMetadata.productionApproved !== true) return null
  const source = getSource(value.sourceMetadata.sourceId)
  if (!source?.productionApproved || source.status !== "ACTIVE") return null
  return value as unknown as PriceObservationRecord
}

async function resolveObservation(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly observedPrices: ReadonlyMap<string, PriceObservationRecord>
}): Promise<ObservationResolution> {
  const prior = [...options.observedPrices.values()].at(-1)
  if (prior) return Object.freeze({ success: true, value: prior })

  const explicit = options.request.metadata.priceObservation
  if (explicit !== undefined) {
    const parsed = parseObservation(explicit)
    return parsed
      ? Object.freeze({ success: true, value: parsed })
      : Object.freeze({ success: false, code: "SIGNAL_EVALUATION_INPUT_INVALID", message: "Explicit Price Observation is malformed or unapproved.", retryable: false })
  }

  const recordId = typeof options.request.metadata.priceObservationRecordId === "string"
    ? options.request.metadata.priceObservationRecordId.trim()
    : ""
  if (!recordId) {
    return Object.freeze({ success: false, code: "SIGNAL_EVALUATION_INPUT_INVALID", message: "SignalEvaluation requires a Price Observation.", retryable: false })
  }
  if (options.repository === null) {
    return Object.freeze({ success: false, code: "SIGNAL_EVALUATION_INPUT_INVALID", message: "Persisted Price Observation requires Repository access.", retryable: false })
  }
  const stored = await options.repository.getStorageRecord({
    recordId,
    recordKind: "PRICE_OBSERVATION",
  })
  if (stored.status === "NOT_FOUND") {
    return Object.freeze({ success: false, code: "SIGNAL_EVALUATION_OBSERVATION_UNAVAILABLE", message: "Persisted Price Observation is unavailable.", retryable: false })
  }
  if (stored.status !== "SUCCESS") {
    return Object.freeze({ success: false, code: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR" ? "STORAGE_UNAVAILABLE" : "SIGNAL_EVALUATION_INPUT_INVALID", message: "Persisted Price Observation could not be loaded.", retryable: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR" })
  }
  const parsed = parseObservation(stored.value.payload)
  return parsed && parsed.observationId === recordId
    ? Object.freeze({ success: true, value: parsed })
    : Object.freeze({ success: false, code: "SIGNAL_EVALUATION_INPUT_INVALID", message: "Persisted Price Observation is malformed or mismatched.", retryable: false })
}

async function resolveSnapshot(options: {
  readonly snapshotId: string
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly capturedSnapshots: ReadonlyMap<string, ScannerSignalSnapshotCandidate>
}): Promise<ScannerSignalSnapshotCandidate | null> {
  const captured = options.capturedSnapshots.get(options.snapshotId)
  if (captured) return captured
  const supplied = options.request.metadata.signalSnapshot
  if (isRecord(supplied)
    && supplied.snapshotId === options.snapshotId
    && typeof supplied.signalId === "string"
    && typeof supplied.createdAt === "string") {
    return supplied as unknown as ScannerSignalSnapshotCandidate
  }
  if (options.repository === null) return null
  const stored = await options.repository.getStorageRecord({
    recordId: options.snapshotId,
    recordKind: "SIGNAL_SNAPSHOT",
  })
  if (stored.status !== "SUCCESS" || !isRecord(stored.value.payload)
    || stored.value.payload.snapshotId !== options.snapshotId) return null
  return stored.value.payload as unknown as ScannerSignalSnapshotCandidate
}

function evaluationRecordId(
  signalId: string,
  snapshotId: string,
  windowId: string,
): string {
  return [
    "signal-evaluation-v1",
    encodeURIComponent(signalId),
    encodeURIComponent(snapshotId),
    encodeURIComponent(windowId),
  ].join("|")
}

function completionIntent(
  evaluationId: string,
  observationId: string,
  result: SignalEvaluationResult,
  completedAt: string,
): OperationalRecordPersistenceIntent {
  return Object.freeze({
    operationalRecord: Object.freeze({
      operationalType: "JobState" as const,
      recordId: `signal-evaluation-complete-v1:${encodeURIComponent(evaluationId)}`,
      operationalVersion: "signal-evaluation-pilot-v1",
      schemaVersion: 1,
      createdAt: completedAt,
      parentRefs: Object.freeze([
        Object.freeze({ recordKind: "SIGNAL_EVALUATION" as const, recordId: evaluationId }),
        Object.freeze({ recordKind: "PRICE_OBSERVATION" as const, recordId: observationId }),
      ]),
      payload: Object.freeze({
        jobType: "SignalEvaluation",
        evaluationId,
        observationId,
        evaluationStatus: result.status,
        completedAt,
        status: "SUCCEEDED",
      }),
    }),
    recordedAt: completedAt,
  })
}

export function createSignalEvaluationHandler(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly capturedSnapshots: ReadonlyMap<string, ScannerSignalSnapshotCandidate>
  readonly observedPrices: ReadonlyMap<string, PriceObservationRecord>
  readonly onEvaluated?: (evaluation: SignalEvaluationResult) => void
}): WorkerJobHandler {
  return async (context) => {
    const observation = await resolveObservation(options)
    if (observation.success === false) {
      return Object.freeze({ success: false, error: Object.freeze({ code: observation.code, message: observation.message, retryable: observation.retryable }) })
    }
    const snapshot = await resolveSnapshot({
      snapshotId: observation.value.snapshotId,
      request: options.request,
      repository: options.repository,
      capturedSnapshots: options.capturedSnapshots,
    })
    if (!snapshot || snapshot.snapshotId !== observation.value.snapshotId) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "SIGNAL_EVALUATION_OBSERVATION_UNAVAILABLE", message: "Owning Signal Snapshot is unavailable.", retryable: false }) })
    }
    if (!isSignalDirection(snapshot.direction)) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "SIGNAL_EVALUATION_UNAVAILABLE", message: "Source signal direction is unavailable.", retryable: false }) })
    }
    const definition = getTrackingWindowDefinition(observation.value.windowId)
    if (definition.success === false) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "SIGNAL_EVALUATION_INPUT_INVALID", message: "Observation window is not canonical.", retryable: false }) })
    }
    const window = Object.freeze({
      id: observation.value.windowId,
      startsAt: snapshot.createdAt,
      endsAt: new Date(Date.parse(snapshot.createdAt) + definition.value.durationMs).toISOString(),
    })
    const entryPrice = typeof snapshot.entryPrice === "number"
      && Number.isFinite(snapshot.entryPrice)
      && snapshot.entryPrice > 0
      ? snapshot.entryPrice
      : null
    const entrySourceId = typeof snapshot.entrySourceId === "string"
      ? snapshot.entrySourceId
      : "UNAVAILABLE"
    const observationPrice = typeof observation.value.price === "number"
      ? observation.value.price
      : null
    const sourceId = observation.value.sourceMetadata.sourceId
    const evaluated = evaluateSignalWindow({
      signalReference: Object.freeze({
        snapshotId: snapshot.snapshotId,
        signalId: snapshot.signalId,
        createdAt: snapshot.createdAt,
      }),
      window,
      direction: snapshot.direction,
      entryPrice,
      entrySourceId,
      observations: Object.freeze([Object.freeze({
        observedAt: observation.value.observedAt,
        price: observationPrice,
        sourceId,
      })]),
      invalidationPrice: null,
    })
    if (evaluated.success === false) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "SIGNAL_EVALUATION_INPUT_INVALID", message: "Signal Evaluation Runtime rejected the source-backed inputs.", retryable: false }) })
    }
    const evaluationId = evaluationRecordId(
      snapshot.signalId,
      snapshot.snapshotId,
      observation.value.windowId,
    )
    const reference = Object.freeze({ recordId: evaluationId, recordKind: "SIGNAL_EVALUATION" })
    if (options.request.dryRun) {
      options.onEvaluated?.(evaluated.value)
      return Object.freeze({ success: true, value: Object.freeze({ producedRecords: Object.freeze([reference]), nextExecutionIds: Object.freeze([]) }) })
    }
    if (options.repository === null) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "STORAGE_UNAVAILABLE", message: "Signal Evaluation persistence is unavailable.", retryable: true }) })
    }
    const saved = await options.repository.saveRuntimeRecord({
      recordKind: "SIGNAL_EVALUATION",
      runtimeRecord: evaluated.value,
      recordedAt: context.startedAt,
    })
    if (saved.status !== "SUCCESS" && saved.status !== "DUPLICATE") {
      return Object.freeze({ success: false, error: Object.freeze({ code: saved.status === "UNAVAILABLE" || saved.status === "ADAPTER_ERROR" ? "STORAGE_UNAVAILABLE" : "SIGNAL_EVALUATION_PERSISTENCE_FAILED", message: "Signal Evaluation could not be persisted through Repository.", retryable: saved.status === "UNAVAILABLE" || saved.status === "ADAPTER_ERROR" }) })
    }
    const completion = await options.repository.saveOperationalRecord(
      completionIntent(evaluationId, observation.value.observationId, evaluated.value, context.startedAt),
    )
    if (completion.status !== "SUCCESS" && completion.status !== "DUPLICATE") {
      return Object.freeze({ success: false, error: Object.freeze({ code: completion.status === "UNAVAILABLE" || completion.status === "ADAPTER_ERROR" ? "STORAGE_UNAVAILABLE" : "SIGNAL_EVALUATION_PERSISTENCE_FAILED", message: "Signal Evaluation completion could not be persisted through Repository.", retryable: completion.status === "UNAVAILABLE" || completion.status === "ADAPTER_ERROR" }) })
    }
    options.onEvaluated?.(evaluated.value)
    return Object.freeze({ success: true, value: Object.freeze({ producedRecords: Object.freeze([reference]), nextExecutionIds: Object.freeze([]) }) })
  }
}
