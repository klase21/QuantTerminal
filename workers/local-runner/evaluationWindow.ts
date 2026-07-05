import type {
  OperationalRecordPersistenceIntent,
  PersistenceRepository,
} from "@/lib/persistence/repository"
import {
  validateTrackingLifecycle,
  type TrackingLifecycle,
  type TrackingWindow,
} from "@/lib/signal-tracking"
import type { WorkerJobHandler } from "@/lib/worker-runtime"
import type { LocalRunRequest } from "@/workers/local-runner/types"

type TrackingResolution =
  | { readonly success: true; readonly value: TrackingLifecycle }
  | {
      readonly success: false
      readonly code: "TRACKING_RECORD_UNAVAILABLE" | "EVALUATION_WINDOW_INPUT_INVALID" | "STORAGE_UNAVAILABLE"
      readonly message: string
      readonly retryable: boolean
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export interface EvaluationWindowWork {
  readonly jobStateRecordId?: string
  readonly trackingId: string
  readonly snapshotId: string
  readonly windowId: TrackingWindow["id"]
  readonly dueAt: string
  readonly readyAt: string
}

function trackingLifecycle(value: unknown): TrackingResolution {
  const validation = validateTrackingLifecycle(value)
  if (validation.success === false) {
    return Object.freeze({
      success: false,
      code: "EVALUATION_WINDOW_INPUT_INVALID",
      message: "Signal Tracking lifecycle is malformed.",
      retryable: false,
    })
  }
  return Object.freeze({ success: true, value: validation.value })
}

export async function resolveTrackingLifecycle(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly initializedTracking: ReadonlyMap<string, TrackingLifecycle>
}): Promise<TrackingResolution> {
  const explicitTracking = options.request.metadata.signalTracking
  const explicitRecordId = typeof options.request.metadata.signalTrackingRecordId === "string"
    ? options.request.metadata.signalTrackingRecordId.trim()
    : ""

  if (isRecord(explicitTracking)) {
    const lifecycle = trackingLifecycle(explicitTracking)
    if (lifecycle.success === false) return lifecycle
    const initialized = options.initializedTracking.get(lifecycle.value.identity.trackingId)
    if (initialized) return trackingLifecycle(initialized)
    if (options.request.dryRun) return lifecycle
    if (options.repository === null) {
      return Object.freeze({
        success: false,
        code: "STORAGE_UNAVAILABLE",
        message: "Signal Tracking lookup requires an available Repository.",
        retryable: true,
      })
    }
    const stored = await options.repository.getStorageRecord({
      recordId: lifecycle.value.identity.trackingId,
      recordKind: "SIGNAL_TRACKING",
    })
    if (stored.status === "NOT_FOUND") {
      return Object.freeze({
        success: false,
        code: "TRACKING_RECORD_UNAVAILABLE",
        message: "Persisted Signal Tracking lifecycle is unavailable.",
        retryable: false,
      })
    }
    if (stored.status !== "SUCCESS") {
      return Object.freeze({
        success: false,
        code: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR"
          ? "STORAGE_UNAVAILABLE"
          : "EVALUATION_WINDOW_INPUT_INVALID",
        message: "Persisted Signal Tracking lifecycle could not be loaded.",
        retryable: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR",
      })
    }
    const persisted = trackingLifecycle(stored.value.payload)
    if (persisted.success === false
      || persisted.value.identity.trackingId !== lifecycle.value.identity.trackingId) {
      return Object.freeze({
        success: false,
        code: "EVALUATION_WINDOW_INPUT_INVALID",
        message: "Persisted Signal Tracking lifecycle does not match the supplied reference.",
        retryable: false,
      })
    }
    return persisted
  }

  if (explicitTracking !== undefined) {
    return Object.freeze({
      success: false,
      code: "EVALUATION_WINDOW_INPUT_INVALID",
      message: "metadata.signalTracking must be a valid tracking lifecycle.",
      retryable: false,
    })
  }

  if (explicitRecordId) {
    const initialized = options.initializedTracking.get(explicitRecordId)
    if (initialized) return trackingLifecycle(initialized)
    if (options.repository === null) {
      return Object.freeze({
        success: false,
        code: "TRACKING_RECORD_UNAVAILABLE",
        message: "Signal Tracking record cannot be resolved without persistence.",
        retryable: false,
      })
    }
    const stored = await options.repository.getStorageRecord({
      recordId: explicitRecordId,
      recordKind: "SIGNAL_TRACKING",
    })
    if (stored.status === "NOT_FOUND") {
      return Object.freeze({
        success: false,
        code: "TRACKING_RECORD_UNAVAILABLE",
        message: "Persisted Signal Tracking lifecycle is unavailable.",
        retryable: false,
      })
    }
    if (stored.status !== "SUCCESS") {
      return Object.freeze({
        success: false,
        code: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR"
          ? "STORAGE_UNAVAILABLE"
          : "EVALUATION_WINDOW_INPUT_INVALID",
        message: "Persisted Signal Tracking lifecycle could not be loaded.",
        retryable: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR",
      })
    }
    if (stored.value.recordId !== explicitRecordId) {
      return Object.freeze({
        success: false,
        code: "EVALUATION_WINDOW_INPUT_INVALID",
        message: "Repository returned a mismatched Signal Tracking record.",
        retryable: false,
      })
    }
    return trackingLifecycle(stored.value.payload)
  }

  const priorInitialization = [...options.initializedTracking.values()].at(-1)
  if (priorInitialization) return trackingLifecycle(priorInitialization)

  return Object.freeze({
    success: false,
    code: "TRACKING_RECORD_UNAVAILABLE",
    message: "No Signal Tracking lifecycle is available for window preparation.",
    retryable: false,
  })
}

function dueWindows(lifecycle: TrackingLifecycle, evaluatedAt: string): readonly TrackingWindow[] {
  if (["COMPLETED", "FAILED", "ARCHIVED"].includes(lifecycle.status)) return Object.freeze([])
  const evaluatedAtMs = Date.parse(evaluatedAt)
  return Object.freeze(lifecycle.windows.filter((window) =>
    window.terminalResult === null
      && window.status !== "EVALUATING"
      && Date.parse(window.dueAt) <= evaluatedAtMs))
}

function windowWorkId(trackingId: string, windowId: string): string {
  return `evaluation-window-ready-v1:${encodeURIComponent(trackingId)}:${encodeURIComponent(windowId)}`
}

function priceObservationExecutionId(trackingId: string, windowId: string): string {
  return `price-observation-v1:${encodeURIComponent(trackingId)}:${encodeURIComponent(windowId)}`
}

function createWindowWork(
  lifecycle: TrackingLifecycle,
  window: TrackingWindow,
  readyAt: string,
): EvaluationWindowWork {
  return Object.freeze({
    jobStateRecordId: windowWorkId(lifecycle.identity.trackingId, window.id),
    trackingId: lifecycle.identity.trackingId,
    snapshotId: lifecycle.identity.snapshotId,
    windowId: window.id,
    dueAt: window.dueAt,
    readyAt,
  })
}

function operationalIntents(
  lifecycle: TrackingLifecycle,
  windows: readonly TrackingWindow[],
  readyAt: string,
): readonly OperationalRecordPersistenceIntent[] {
  return Object.freeze(windows.map((window) => Object.freeze({
    operationalRecord: Object.freeze({
      operationalType: "JobState" as const,
      recordId: windowWorkId(lifecycle.identity.trackingId, window.id),
      operationalVersion: "evaluation-window-pilot-v1",
      schemaVersion: 1,
      createdAt: readyAt,
      parentRefs: Object.freeze([Object.freeze({
        recordKind: "SIGNAL_TRACKING" as const,
        recordId: lifecycle.identity.trackingId,
      })]),
      payload: Object.freeze({
        jobType: "PriceObservation",
        trackingId: lifecycle.identity.trackingId,
        snapshotId: lifecycle.identity.snapshotId,
        windowId: window.id,
        dueAt: window.dueAt,
        readyAt,
        status: "READY",
      }),
    }),
    recordedAt: readyAt,
  })))
}

export function createEvaluationWindowHandler(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly initializedTracking: ReadonlyMap<string, TrackingLifecycle>
  readonly onPrepared?: (work: EvaluationWindowWork) => void
}): WorkerJobHandler {
  return async (context) => {
    const resolved = await resolveTrackingLifecycle(options)
    if (resolved.success === false) {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: resolved.code,
          message: resolved.message,
          retryable: resolved.retryable,
        }),
      })
    }

    const windows = dueWindows(resolved.value, context.startedAt)
    if (windows.length === 0) {
      return Object.freeze({
        success: true,
        value: Object.freeze({
          producedRecords: Object.freeze([]),
          nextExecutionIds: Object.freeze([]),
        }),
      })
    }

    const producedRecords = Object.freeze(windows.map((window) => Object.freeze({
      recordId: windowWorkId(resolved.value.identity.trackingId, window.id),
      recordKind: "JOB_STATE",
    })))
    const nextExecutionIds = Object.freeze(windows.map((window) =>
      priceObservationExecutionId(resolved.value.identity.trackingId, window.id)))
    if (options.request.dryRun) {
      windows.forEach((window) => options.onPrepared?.(
        createWindowWork(resolved.value, window, context.startedAt),
      ))
      return Object.freeze({
        success: true,
        value: Object.freeze({ producedRecords, nextExecutionIds }),
      })
    }
    if (options.repository === null) {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: "STORAGE_UNAVAILABLE",
          message: "Evaluation-window operational persistence is unavailable.",
          retryable: true,
        }),
      })
    }

    const saved = await options.repository.saveOperationalRecords(
      operationalIntents(resolved.value, windows, context.startedAt),
    )
    const failed = saved.find((result) => result.status !== "SUCCESS" && result.status !== "DUPLICATE")
    if (failed) {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: failed.status === "UNAVAILABLE" || failed.status === "ADAPTER_ERROR"
            ? "STORAGE_UNAVAILABLE"
            : "EVALUATION_WINDOW_PERSISTENCE_FAILED",
          message: "Evaluation-window work could not be persisted through Repository.",
          retryable: failed.status === "UNAVAILABLE" || failed.status === "ADAPTER_ERROR",
        }),
      })
    }
    windows.forEach((window) => options.onPrepared?.(
      createWindowWork(resolved.value, window, context.startedAt),
    ))
    return Object.freeze({
      success: true,
      value: Object.freeze({ producedRecords, nextExecutionIds }),
    })
  }
}
