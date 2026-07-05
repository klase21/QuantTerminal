import {
  recordSignalOutcome,
  type OutcomeEvent,
} from "@/lib/outcome-recorder"
import {
  createContextSnapshotId,
  validateContextSnapshot,
  type ContextSnapshot,
} from "@/lib/context-snapshot"
import type {
  OperationalRecordPersistenceIntent,
  PersistenceRepository,
} from "@/lib/persistence/repository"
import {
  validateSignalEvaluationResult,
  isSignalDirection,
  type SignalEvaluationResult,
} from "@/lib/signal-evaluation"
import {
  mergeSignalSnapshotEvaluation,
  transitionSignalOutcomeLifecycle,
  type SignalOutcome,
  type SignalOutcomeReference,
  type SignalOutcomeSnapshot,
} from "@/lib/signal-outcome"
import { createTrackingId } from "@/lib/signal-tracking"
import type { WorkerJobHandler } from "@/lib/worker-runtime"
import type { ScannerSignalSnapshotCandidate } from "@/workers/local-runner/signalCapture"
import type { LocalRunRequest } from "@/workers/local-runner/types"

type EvaluationResolution =
  | { readonly success: true; readonly value: SignalEvaluationResult }
  | { readonly success: false; readonly code: string; readonly message: string; readonly retryable: boolean }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function unavailableReference(reason: string): SignalOutcomeReference {
  return Object.freeze({ status: "UNAVAILABLE", referenceId: null, unavailableReason: reason })
}

async function resolveEvaluation(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly evaluations: ReadonlyMap<string, SignalEvaluationResult>
}): Promise<EvaluationResolution> {
  const prior = [...options.evaluations.values()].at(-1)
  if (prior) return Object.freeze({ success: true, value: prior })

  const explicit = options.request.metadata.signalEvaluation
  if (explicit !== undefined) {
    const validation = validateSignalEvaluationResult(explicit)
    return validation.success
      ? Object.freeze({ success: true, value: validation.value })
      : Object.freeze({ success: false, code: "OUTCOME_RECORDING_INPUT_INVALID", message: "Explicit Signal Evaluation is malformed.", retryable: false })
  }

  const recordId = typeof options.request.metadata.signalEvaluationRecordId === "string"
    ? options.request.metadata.signalEvaluationRecordId.trim()
    : ""
  if (!recordId) {
    return Object.freeze({ success: false, code: "OUTCOME_RECORDING_INPUT_INVALID", message: "OutcomeRecording requires a Signal Evaluation.", retryable: false })
  }
  if (options.repository === null) {
    return Object.freeze({ success: false, code: "OUTCOME_RECORDING_INPUT_INVALID", message: "Persisted Signal Evaluation requires Repository access.", retryable: false })
  }
  const stored = await options.repository.getStorageRecord({ recordId, recordKind: "SIGNAL_EVALUATION" })
  if (stored.status === "NOT_FOUND") {
    return Object.freeze({ success: false, code: "OUTCOME_RECORDING_EVALUATION_UNAVAILABLE", message: "Persisted Signal Evaluation is unavailable.", retryable: false })
  }
  if (stored.status !== "SUCCESS") {
    const storageUnavailable = stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR"
    return Object.freeze({ success: false, code: storageUnavailable ? "STORAGE_UNAVAILABLE" : "OUTCOME_RECORDING_INPUT_INVALID", message: "Persisted Signal Evaluation could not be loaded.", retryable: storageUnavailable })
  }
  const validation = validateSignalEvaluationResult(stored.value.payload)
  return validation.success
    ? Object.freeze({ success: true, value: validation.value })
    : Object.freeze({ success: false, code: "OUTCOME_RECORDING_INPUT_INVALID", message: "Persisted Signal Evaluation is malformed.", retryable: false })
}

async function resolveSnapshot(options: {
  readonly snapshotId: string
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly capturedSnapshots: ReadonlyMap<string, ScannerSignalSnapshotCandidate>
}): Promise<ScannerSignalSnapshotCandidate | null> {
  const captured = options.capturedSnapshots.get(options.snapshotId)
  if (captured) return captured
  const explicit = options.request.metadata.signalSnapshot
  if (isRecord(explicit) && explicit.snapshotId === options.snapshotId) {
    return explicit as unknown as ScannerSignalSnapshotCandidate
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

async function resolveContextSnapshot(options: {
  readonly snapshot: ScannerSignalSnapshotCandidate
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly contextSnapshots: ReadonlyMap<string, ContextSnapshot>
}): Promise<ContextSnapshot | null> {
  const sameRun = options.contextSnapshots.get(options.snapshot.snapshotId)
  if (sameRun) return sameRun

  const explicit = options.request.metadata.contextSnapshot
  if (explicit !== undefined) {
    const validation = validateContextSnapshot(explicit)
    return validation.success
      && validation.value.lifecycleState === "FINALIZED"
      && validation.value.identity.signalId === options.snapshot.signalId
      && validation.value.signalSnapshotId === options.snapshot.snapshotId
      ? validation.value
      : null
  }
  if (options.repository === null) return null
  const derivedId = createContextSnapshotId(options.snapshot.signalId, 1)
  if (derivedId.success === false) return null
  const requestedId = typeof options.request.metadata.contextSnapshotRecordId === "string"
    && options.request.metadata.contextSnapshotRecordId.trim()
    ? options.request.metadata.contextSnapshotRecordId.trim()
    : derivedId.value
  const stored = await options.repository.getStorageRecord({
    recordId: requestedId,
    recordKind: "CONTEXT_SNAPSHOT",
  })
  if (stored.status !== "SUCCESS") return null
  const validation = validateContextSnapshot(stored.value.payload)
  return validation.success
    && validation.value.lifecycleState === "FINALIZED"
    && validation.value.identity.signalId === options.snapshot.signalId
    && validation.value.signalSnapshotId === options.snapshot.snapshotId
    ? validation.value
    : null
}

function createOutcomeSnapshot(
  snapshot: ScannerSignalSnapshotCandidate,
  contextSnapshot: ContextSnapshot | null,
): SignalOutcomeSnapshot | null {
  if (!snapshot.exchange || !snapshot.timeframe || !isSignalDirection(snapshot.direction)) return null
  const trackingId = createTrackingId({
    signalId: snapshot.signalId,
    snapshotId: snapshot.snapshotId,
    createdAt: snapshot.createdAt,
  })
  if (trackingId.success === false) return null
  return Object.freeze({
    signalId: snapshot.signalId,
    snapshotId: snapshot.snapshotId,
    trackingId: trackingId.value,
    signalCreatedAt: snapshot.createdAt,
    symbol: snapshot.symbol,
    exchange: snapshot.exchange,
    timeframe: snapshot.timeframe,
    direction: snapshot.direction,
    evidenceReference: unavailableReference("No immutable evidence reference was captured with the Scanner signal."),
    replayReference: unavailableReference("No immutable Replay reference was captured with the Scanner signal."),
    contextReference: contextSnapshot === null
      ? unavailableReference("No finalized Context Snapshot was available for this Signal.")
      : Object.freeze({
          status: "AVAILABLE",
          referenceId: contextSnapshot.identity.contextSnapshotId,
          unavailableReason: null,
        }),
  })
}

function finalizeOutcome(outcome: SignalOutcome): SignalOutcome | null {
  const validated = transitionSignalOutcomeLifecycle(outcome, "VALIDATED")
  if (validated.success === false) return null
  const finalized = transitionSignalOutcomeLifecycle(validated.value, "FINALIZED")
  return finalized.success ? finalized.value : null
}

function completionIntent(
  evaluationId: string,
  outcome: SignalOutcome,
  event: OutcomeEvent,
  completedAt: string,
): OperationalRecordPersistenceIntent {
  return Object.freeze({
    operationalRecord: Object.freeze({
      operationalType: "JobState" as const,
      recordId: `outcome-recording-complete-v1:${encodeURIComponent(event.identity.eventId)}`,
      operationalVersion: "outcome-recording-pilot-v1",
      schemaVersion: 1,
      createdAt: completedAt,
      parentRefs: Object.freeze([
        Object.freeze({ recordKind: "SIGNAL_EVALUATION" as const, recordId: evaluationId }),
        Object.freeze({ recordKind: "SIGNAL_SNAPSHOT" as const, recordId: outcome.identity.snapshotId }),
        ...(outcome.snapshotReferences.contextReference.status === "AVAILABLE"
          ? [Object.freeze({ recordKind: "CONTEXT_SNAPSHOT" as const, recordId: outcome.snapshotReferences.contextReference.referenceId! })]
          : []),
        Object.freeze({ recordKind: "SIGNAL_OUTCOME" as const, recordId: outcome.identity.outcomeId }),
        Object.freeze({ recordKind: "OUTCOME_EVENT" as const, recordId: event.identity.eventId }),
      ]),
      payload: Object.freeze({
        jobType: "OutcomeRecording",
        evaluationId,
        outcomeId: outcome.identity.outcomeId,
        eventId: event.identity.eventId,
        completedAt,
        status: "SUCCEEDED",
      }),
    }),
    recordedAt: completedAt,
  })
}

export function createOutcomeRecordingHandler(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly capturedSnapshots: ReadonlyMap<string, ScannerSignalSnapshotCandidate>
  readonly contextSnapshots: ReadonlyMap<string, ContextSnapshot>
  readonly evaluations: ReadonlyMap<string, SignalEvaluationResult>
  readonly onRecorded?: (outcome: SignalOutcome, event: OutcomeEvent) => void
}): WorkerJobHandler {
  return async (context) => {
    const resolved = await resolveEvaluation(options)
    if (resolved.success === false) {
      return Object.freeze({ success: false, error: Object.freeze({ code: resolved.code, message: resolved.message, retryable: resolved.retryable }) })
    }
    const evaluation = resolved.value
    if (evaluation.status !== "EVALUATED" && evaluation.status !== "UNAVAILABLE") {
      return Object.freeze({ success: false, error: Object.freeze({ code: "OUTCOME_RECORDING_EVALUATION_UNAVAILABLE", message: "Signal Evaluation is not complete.", retryable: false }) })
    }
    const snapshot = await resolveSnapshot({
      snapshotId: evaluation.signalReference.snapshotId,
      request: options.request,
      repository: options.repository,
      capturedSnapshots: options.capturedSnapshots,
    })
    const contextSnapshot = snapshot
      ? await resolveContextSnapshot({
          snapshot,
          request: options.request,
          repository: options.repository,
          contextSnapshots: options.contextSnapshots,
        })
      : null
    const outcomeSnapshot = snapshot ? createOutcomeSnapshot(snapshot, contextSnapshot) : null
    if (!outcomeSnapshot) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "OUTCOME_RECORDING_EVALUATION_UNAVAILABLE", message: "The complete source Signal Snapshot is unavailable.", retryable: false }) })
    }
    const merged = mergeSignalSnapshotEvaluation({ snapshot: outcomeSnapshot, evaluation })
    if (merged.success === false) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "OUTCOME_RECORDING_INPUT_INVALID", message: "Signal Outcome Runtime rejected the supplied immutable facts.", retryable: false }) })
    }
    const outcome = finalizeOutcome(merged.value)
    if (!outcome) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "OUTCOME_RECORDING_INPUT_INVALID", message: "Signal Outcome lifecycle could not be finalized.", retryable: false }) })
    }
    const recorded = recordSignalOutcome(outcome, { recordedAt: context.startedAt })
    if (recorded.success === false) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "OUTCOME_RECORDING_INPUT_INVALID", message: "Outcome Recorder Runtime rejected the finalized outcome.", retryable: false }) })
    }
    const event = recorded.value
    const references = Object.freeze([
      Object.freeze({ recordId: outcome.identity.outcomeId, recordKind: "SIGNAL_OUTCOME" }),
      Object.freeze({ recordId: event.identity.eventId, recordKind: "OUTCOME_EVENT" }),
    ])
    if (options.request.dryRun) {
      options.onRecorded?.(outcome, event)
      return Object.freeze({ success: true, value: Object.freeze({ producedRecords: references, nextExecutionIds: Object.freeze([]) }) })
    }
    if (options.repository === null) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "STORAGE_UNAVAILABLE", message: "Outcome persistence is unavailable.", retryable: true }) })
    }
    const outcomeSaved = await options.repository.saveRuntimeRecord({
      recordKind: "SIGNAL_OUTCOME",
      runtimeRecord: outcome,
      recordedAt: context.startedAt,
    })
    if (outcomeSaved.status !== "SUCCESS" && outcomeSaved.status !== "DUPLICATE") {
      const unavailable = outcomeSaved.status === "UNAVAILABLE" || outcomeSaved.status === "ADAPTER_ERROR"
      return Object.freeze({ success: false, error: Object.freeze({ code: unavailable ? "STORAGE_UNAVAILABLE" : "OUTCOME_RECORDING_PERSISTENCE_FAILED", message: "Signal Outcome could not be persisted through Repository.", retryable: unavailable }) })
    }
    const eventSaved = await options.repository.saveRuntimeRecord({
      recordKind: "OUTCOME_EVENT",
      runtimeRecord: event,
      recordedAt: context.startedAt,
    })
    if (eventSaved.status !== "SUCCESS" && eventSaved.status !== "DUPLICATE") {
      const unavailable = eventSaved.status === "UNAVAILABLE" || eventSaved.status === "ADAPTER_ERROR"
      return Object.freeze({ success: false, error: Object.freeze({ code: unavailable ? "STORAGE_UNAVAILABLE" : "OUTCOME_RECORDING_PERSISTENCE_FAILED", message: "Outcome Event could not be persisted through Repository.", retryable: unavailable }) })
    }
    const evaluationId = `signal-evaluation-v1|${encodeURIComponent(evaluation.signalReference.signalId)}|${encodeURIComponent(evaluation.signalReference.snapshotId)}|${encodeURIComponent(evaluation.window.id)}`
    const completion = await options.repository.saveOperationalRecord(
      completionIntent(evaluationId, outcome, event, context.startedAt),
    )
    if (completion.status !== "SUCCESS" && completion.status !== "DUPLICATE") {
      const unavailable = completion.status === "UNAVAILABLE" || completion.status === "ADAPTER_ERROR"
      return Object.freeze({ success: false, error: Object.freeze({ code: unavailable ? "STORAGE_UNAVAILABLE" : "OUTCOME_RECORDING_PERSISTENCE_FAILED", message: "Outcome Recording completion could not be persisted through Repository.", retryable: unavailable }) })
    }
    options.onRecorded?.(outcome, event)
    return Object.freeze({ success: true, value: Object.freeze({ producedRecords: references, nextExecutionIds: Object.freeze([]) }) })
  }
}
