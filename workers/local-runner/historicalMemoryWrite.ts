import {
  createHistoricalMemory,
  type HistoricalMemoryRecord,
} from "@/lib/historical-memory"
import {
  validateOutcomeEvent,
  type OutcomeEvent,
} from "@/lib/outcome-recorder"
import type {
  OperationalRecordPersistenceIntent,
  PersistenceRepository,
} from "@/lib/persistence/repository"
import type { WorkerJobHandler } from "@/lib/worker-runtime"
import type { LocalRunRequest } from "@/workers/local-runner/types"

type OutcomeEventResolution =
  | { readonly success: true; readonly value: OutcomeEvent }
  | { readonly success: false; readonly code: string; readonly message: string; readonly retryable: boolean }

async function resolveOutcomeEvent(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly outcomeEvents: ReadonlyMap<string, OutcomeEvent>
}): Promise<OutcomeEventResolution> {
  const prior = [...options.outcomeEvents.values()].at(-1)
  if (prior) return Object.freeze({ success: true, value: prior })

  const explicit = options.request.metadata.outcomeEvent
  if (explicit !== undefined) {
    const validation = validateOutcomeEvent(explicit)
    return validation.success
      ? Object.freeze({ success: true, value: validation.value })
      : Object.freeze({ success: false, code: "HISTORICAL_MEMORY_INPUT_INVALID", message: "Explicit Outcome Event is malformed.", retryable: false })
  }

  const recordId = typeof options.request.metadata.outcomeEventRecordId === "string"
    ? options.request.metadata.outcomeEventRecordId.trim()
    : ""
  if (!recordId) {
    return Object.freeze({ success: false, code: "HISTORICAL_MEMORY_INPUT_INVALID", message: "HistoricalMemoryWrite requires an Outcome Event.", retryable: false })
  }
  if (options.repository === null) {
    return Object.freeze({ success: false, code: "HISTORICAL_MEMORY_INPUT_INVALID", message: "Persisted Outcome Event requires Repository access.", retryable: false })
  }
  const stored = await options.repository.getStorageRecord({
    recordId,
    recordKind: "OUTCOME_EVENT",
  })
  if (stored.status === "NOT_FOUND") {
    return Object.freeze({ success: false, code: "HISTORICAL_MEMORY_EVENT_UNAVAILABLE", message: "Persisted Outcome Event is unavailable.", retryable: false })
  }
  if (stored.status !== "SUCCESS") {
    const unavailable = stored.status === "UNAVAILABLE" || stored.status === "ADAPTER_ERROR"
    return Object.freeze({ success: false, code: unavailable ? "STORAGE_UNAVAILABLE" : "HISTORICAL_MEMORY_INPUT_INVALID", message: "Persisted Outcome Event could not be loaded.", retryable: unavailable })
  }
  const validation = validateOutcomeEvent(stored.value.payload)
  return validation.success && validation.value.identity.eventId === recordId
    ? Object.freeze({ success: true, value: validation.value })
    : Object.freeze({ success: false, code: "HISTORICAL_MEMORY_INPUT_INVALID", message: "Persisted Outcome Event is malformed or mismatched.", retryable: false })
}

function completionIntent(
  event: OutcomeEvent,
  memory: HistoricalMemoryRecord,
  completedAt: string,
): OperationalRecordPersistenceIntent {
  const outcome = event.payload.signalOutcome
  const evaluationId = [
    "signal-evaluation-v1",
    encodeURIComponent(outcome.identity.signalId),
    encodeURIComponent(outcome.identity.snapshotId),
    encodeURIComponent(outcome.timing.evaluationWindow),
  ].join("|")
  const contextReference = outcome.snapshotReferences.contextReference
  return Object.freeze({
    operationalRecord: Object.freeze({
      operationalType: "JobState" as const,
      recordId: `historical-memory-write-complete-v1:${encodeURIComponent(memory.identity.memoryId)}`,
      operationalVersion: "historical-memory-write-pilot-v1",
      schemaVersion: 1,
      createdAt: completedAt,
      parentRefs: Object.freeze([
        Object.freeze({ recordKind: "SIGNAL_SNAPSHOT" as const, recordId: outcome.identity.snapshotId }),
        ...(contextReference.status === "AVAILABLE"
          ? [Object.freeze({ recordKind: "CONTEXT_SNAPSHOT" as const, recordId: contextReference.referenceId! })]
          : []),
        Object.freeze({ recordKind: "SIGNAL_EVALUATION" as const, recordId: evaluationId }),
        Object.freeze({ recordKind: "OUTCOME_EVENT" as const, recordId: event.identity.eventId }),
        Object.freeze({ recordKind: "HISTORICAL_MEMORY" as const, recordId: memory.identity.memoryId }),
      ]),
      payload: Object.freeze({
        jobType: "HistoricalMemoryWrite",
        eventId: event.identity.eventId,
        memoryId: memory.identity.memoryId,
        memoryStatus: memory.status,
        completedAt,
        status: "SUCCEEDED",
      }),
    }),
    recordedAt: completedAt,
  })
}

export function createHistoricalMemoryWriteHandler(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly outcomeEvents: ReadonlyMap<string, OutcomeEvent>
  readonly onWritten?: (memory: HistoricalMemoryRecord) => void
}): WorkerJobHandler {
  return async (context) => {
    const resolved = await resolveOutcomeEvent(options)
    if (resolved.success === false) {
      return Object.freeze({ success: false, error: Object.freeze({ code: resolved.code, message: resolved.message, retryable: resolved.retryable }) })
    }
    const event = resolved.value
    const contextReference = event.payload.signalOutcome.snapshotReferences.contextReference
    const created = createHistoricalMemory({
      outcomeEvent: event,
      createdAt: context.startedAt,
      references: contextReference.status === "AVAILABLE"
        ? [Object.freeze({ referenceType: "CONTEXT", referenceId: contextReference.referenceId! })]
        : [],
    })
    if (created.success === false) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "HISTORICAL_MEMORY_INPUT_INVALID", message: "Historical Memory Runtime rejected the immutable Outcome Event.", retryable: false }) })
    }
    const memory = created.value
    const reference = Object.freeze({
      recordId: memory.identity.memoryId,
      recordKind: "HISTORICAL_MEMORY",
    })
    if (options.request.dryRun) {
      options.onWritten?.(memory)
      return Object.freeze({ success: true, value: Object.freeze({ producedRecords: Object.freeze([reference]), nextExecutionIds: Object.freeze([]) }) })
    }
    if (options.repository === null) {
      return Object.freeze({ success: false, error: Object.freeze({ code: "STORAGE_UNAVAILABLE", message: "Historical Memory persistence is unavailable.", retryable: true }) })
    }
    const saved = await options.repository.saveRuntimeRecord({
      recordKind: "HISTORICAL_MEMORY",
      runtimeRecord: memory,
      recordedAt: context.startedAt,
    })
    if (saved.status !== "SUCCESS" && saved.status !== "DUPLICATE") {
      const unavailable = saved.status === "UNAVAILABLE" || saved.status === "ADAPTER_ERROR"
      return Object.freeze({ success: false, error: Object.freeze({ code: unavailable ? "STORAGE_UNAVAILABLE" : "HISTORICAL_MEMORY_PERSISTENCE_FAILED", message: "Historical Memory could not be persisted through Repository.", retryable: unavailable }) })
    }
    const completion = await options.repository.saveOperationalRecord(
      completionIntent(event, memory, context.startedAt),
    )
    if (completion.status !== "SUCCESS" && completion.status !== "DUPLICATE") {
      const unavailable = completion.status === "UNAVAILABLE" || completion.status === "ADAPTER_ERROR"
      return Object.freeze({ success: false, error: Object.freeze({ code: unavailable ? "STORAGE_UNAVAILABLE" : "HISTORICAL_MEMORY_PERSISTENCE_FAILED", message: "Historical Memory completion could not be persisted through Repository.", retryable: unavailable }) })
    }
    options.onWritten?.(memory)
    return Object.freeze({ success: true, value: Object.freeze({ producedRecords: Object.freeze([reference]), nextExecutionIds: Object.freeze([]) }) })
  }
}
