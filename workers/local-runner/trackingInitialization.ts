import type { PersistenceRepository } from "@/lib/persistence/repository"
import {
  createTrackingLifecycle,
  validateSignalSnapshotReference,
  type SignalSnapshotReference,
  type TrackingLifecycle,
} from "@/lib/signal-tracking"
import type { WorkerJobHandler } from "@/lib/worker-runtime"
import type { LocalRunRequest } from "@/workers/local-runner/types"
import type { ScannerSignalSnapshotCandidate } from "@/workers/local-runner/signalCapture"

type SnapshotResolution =
  | { readonly success: true; readonly value: SignalSnapshotReference }
  | {
      readonly success: false
      readonly code: "TRACKING_SNAPSHOT_UNAVAILABLE" | "TRACKING_INPUT_INVALID" | "STORAGE_UNAVAILABLE"
      readonly message: string
      readonly retryable: boolean
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function snapshotReference(value: unknown): SnapshotResolution {
  const validation = validateSignalSnapshotReference(value)
  if (validation.success === false) {
    return Object.freeze({
      success: false,
      code: "TRACKING_INPUT_INVALID",
      message: "Signal Snapshot reference is malformed.",
      retryable: false,
    })
  }
  return Object.freeze({ success: true, value: validation.value })
}

async function resolveSnapshotReference(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly capturedSnapshots: ReadonlyMap<string, ScannerSignalSnapshotCandidate>
}): Promise<SnapshotResolution> {
  const explicitSnapshot = options.request.metadata.signalSnapshot
  const explicitRecordId = typeof options.request.metadata.signalSnapshotRecordId === "string"
    ? options.request.metadata.signalSnapshotRecordId.trim()
    : ""

  if (isRecord(explicitSnapshot)) {
    const reference = snapshotReference(explicitSnapshot)
    if (reference.success === false) return reference
    const captured = options.capturedSnapshots.get(reference.value.snapshotId)
    if (captured) return snapshotReference(captured)
    if (options.request.dryRun) return reference
    if (options.repository === null) {
      return Object.freeze({
        success: false,
        code: "STORAGE_UNAVAILABLE",
        message: "Signal Snapshot lookup requires an available Repository.",
        retryable: true,
      })
    }
    const stored = await options.repository.getStorageRecord({
      recordId: reference.value.snapshotId,
      recordKind: "SIGNAL_SNAPSHOT",
    })
    if (stored.status === "NOT_FOUND") {
      return Object.freeze({
        success: false,
        code: "TRACKING_SNAPSHOT_UNAVAILABLE",
        message: "Persisted Signal Snapshot is unavailable.",
        retryable: false,
      })
    }
    if (stored.status !== "SUCCESS") {
      return Object.freeze({
        success: false,
        code: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR"
          ? "STORAGE_UNAVAILABLE"
          : "TRACKING_INPUT_INVALID",
        message: "Persisted Signal Snapshot could not be loaded.",
        retryable: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR",
      })
    }
    const persisted = snapshotReference(stored.value.payload)
    if (persisted.success === false
      || persisted.value.snapshotId !== reference.value.snapshotId
      || persisted.value.signalId !== reference.value.signalId
      || persisted.value.createdAt !== reference.value.createdAt) {
      return Object.freeze({
        success: false,
        code: "TRACKING_INPUT_INVALID",
        message: "Persisted Signal Snapshot does not match the supplied reference.",
        retryable: false,
      })
    }
    return persisted
  }

  if (explicitSnapshot !== undefined) {
    return Object.freeze({
      success: false,
      code: "TRACKING_INPUT_INVALID",
      message: "metadata.signalSnapshot must be a valid snapshot reference.",
      retryable: false,
    })
  }

  if (explicitRecordId) {
    const captured = options.capturedSnapshots.get(explicitRecordId)
    if (captured) return snapshotReference(captured)
    if (options.repository === null) {
      return Object.freeze({
        success: false,
        code: "TRACKING_SNAPSHOT_UNAVAILABLE",
        message: "Signal Snapshot record cannot be resolved without persistence.",
        retryable: false,
      })
    }
    const stored = await options.repository.getStorageRecord({
      recordId: explicitRecordId,
      recordKind: "SIGNAL_SNAPSHOT",
    })
    if (stored.status === "NOT_FOUND") {
      return Object.freeze({
        success: false,
        code: "TRACKING_SNAPSHOT_UNAVAILABLE",
        message: "Persisted Signal Snapshot is unavailable.",
        retryable: false,
      })
    }
    if (stored.status !== "SUCCESS") {
      return Object.freeze({
        success: false,
        code: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR"
          ? "STORAGE_UNAVAILABLE"
          : "TRACKING_INPUT_INVALID",
        message: "Persisted Signal Snapshot could not be loaded.",
        retryable: stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR",
      })
    }
    if (stored.value.recordId !== explicitRecordId) {
      return Object.freeze({
        success: false,
        code: "TRACKING_INPUT_INVALID",
        message: "Repository returned a mismatched Signal Snapshot record.",
        retryable: false,
      })
    }
    return snapshotReference(stored.value.payload)
  }

  const priorCapture = [...options.capturedSnapshots.values()].at(-1)
  if (priorCapture) return snapshotReference(priorCapture)

  return Object.freeze({
    success: false,
    code: "TRACKING_SNAPSHOT_UNAVAILABLE",
    message: "No Signal Snapshot reference is available for tracking initialization.",
    retryable: false,
  })
}

export function createTrackingInitializationHandler(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly capturedSnapshots: ReadonlyMap<string, ScannerSignalSnapshotCandidate>
  readonly onInitialized?: (lifecycle: TrackingLifecycle) => void
}): WorkerJobHandler {
  return async (context) => {
    const snapshot = await resolveSnapshotReference(options)
    if (snapshot.success === false) {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: snapshot.code,
          message: snapshot.message,
          retryable: snapshot.retryable,
        }),
      })
    }

    const lifecycle = createTrackingLifecycle(snapshot.value)
    if (lifecycle.success === false) {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: "TRACKING_INPUT_INVALID",
          message: "Signal Tracking Runtime rejected the snapshot reference.",
          retryable: false,
        }),
      })
    }
    const reference = Object.freeze({
      recordId: lifecycle.value.identity.trackingId,
      recordKind: "SIGNAL_TRACKING",
    })
    if (options.request.dryRun) {
      options.onInitialized?.(lifecycle.value)
      return Object.freeze({
        success: true,
        value: Object.freeze({
          producedRecords: Object.freeze([reference]),
          nextExecutionIds: Object.freeze([]),
        }),
      })
    }
    if (options.repository === null) {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: "STORAGE_UNAVAILABLE",
          message: "Signal Tracking persistence is unavailable.",
          retryable: true,
        }),
      })
    }

    const saved = await options.repository.saveRuntimeRecord({
      recordKind: "SIGNAL_TRACKING",
      runtimeRecord: lifecycle.value,
      recordedAt: context.startedAt,
    })
    if (saved.status !== "SUCCESS" && saved.status !== "DUPLICATE") {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: saved.status === "UNAVAILABLE" || saved.status === "ADAPTER_ERROR"
            ? "STORAGE_UNAVAILABLE"
            : "TRACKING_INITIALIZATION_FAILED",
          message: "Signal Tracking lifecycle could not be persisted through Repository.",
          retryable: saved.status === "UNAVAILABLE" || saved.status === "ADAPTER_ERROR",
        }),
      })
    }
    options.onInitialized?.(lifecycle.value)
    return Object.freeze({
      success: true,
      value: Object.freeze({
        producedRecords: Object.freeze([reference]),
        nextExecutionIds: Object.freeze([]),
      }),
    })
  }
}
