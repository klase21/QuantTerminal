import {
  canonicalCronTimestamp,
  receiveTrigger,
} from "@/lib/cron-adapter"
import type {
  OperationalRecordPersistenceIntent,
  PersistenceRepository,
} from "@/lib/persistence/repository"
import {
  createLocalExecutionPlans,
  dispatchLocalExecutions,
} from "@/workers/local-runner/dispatch"
import { createWorkerDispatcher } from "@/lib/worker-runtime"
import {
  createNoOpLocalHandlers,
  createNotImplementedLocalHandlers,
} from "@/workers/local-runner/handlers"
import { createLocalRunnerError, createLocalRunnerResult } from "@/workers/local-runner/result"
import { createSignalCaptureHandler } from "@/workers/local-runner/signalCapture"
import type { ScannerSignalSnapshotCandidate } from "@/workers/local-runner/signalCapture"
import { createTrackingInitializationHandler } from "@/workers/local-runner/trackingInitialization"
import { createEvaluationWindowHandler } from "@/workers/local-runner/evaluationWindow"
import type { EvaluationWindowWork } from "@/workers/local-runner/evaluationWindow"
import { createPriceObservationHandler } from "@/workers/local-runner/priceObservation"
import type { PriceObservationRecord } from "@/workers/local-runner/priceObservation"
import { createSignalEvaluationHandler } from "@/workers/local-runner/signalEvaluation"
import { createOutcomeRecordingHandler } from "@/workers/local-runner/outcomeRecording"
import type { SignalEvaluationResult } from "@/lib/signal-evaluation"
import type { OutcomeEvent } from "@/lib/outcome-recorder"
import type { ContextSnapshot } from "@/lib/context-snapshot"
import { createHistoricalMemoryWriteHandler } from "@/workers/local-runner/historicalMemoryWrite"
import type { TrackingLifecycle } from "@/lib/signal-tracking"
import type {
  LocalExecutionResult,
  LocalRunRequest,
  LocalRunnerBootstrap,
  LocalRunnerResult,
  LocalRunSummary,
} from "@/workers/local-runner/types"
import { validateLocalRunRequest } from "@/workers/local-runner/validation"

function freezeSummary(input: LocalRunSummary): LocalRunSummary {
  return Object.freeze({
    ...input,
    executions: Object.freeze([...input.executions]),
    operationalRecordIds: Object.freeze([...input.operationalRecordIds]),
  })
}

function operationalIntents(
  request: LocalRunRequest,
  triggerId: string,
  activationId: string,
  executions: readonly LocalExecutionResult[],
  recordedAt: string,
): readonly OperationalRecordPersistenceIntent[] {
  const schedulerRunId = `local-run:${request.runId}`
  const intents: OperationalRecordPersistenceIntent[] = [{
    operationalRecord: {
      operationalType: "SchedulerRun",
      recordId: schedulerRunId,
      operationalVersion: "local-runner-v1",
      schemaVersion: 1,
      createdAt: request.requestedAt,
      parentRefs: [],
      payload: {
        runId: request.runId,
        triggerId,
        activationId,
        provider: request.triggerProvider,
        dryRun: false,
        executionCount: executions.length,
      },
    },
    recordedAt,
  }]
  for (const execution of executions) {
    intents.push({
      operationalRecord: {
        operationalType: "JobState",
        recordId: `local-job:${request.runId}:${encodeURIComponent(execution.plan.executionId)}`,
        operationalVersion: "local-runner-v1",
        schemaVersion: 1,
        createdAt: request.requestedAt,
        parentRefs: [{ recordKind: "SCHEDULER_RUN", recordId: schedulerRunId }],
        payload: {
          runId: request.runId,
          executionId: execution.plan.executionId,
          workerId: execution.receipt.result.workerId,
          jobType: execution.plan.jobType,
          status: execution.receipt.result.status,
          completedAt: execution.receipt.result.completedAt,
        },
      },
      recordedAt,
    })
  }
  return Object.freeze(intents)
}

async function persistOperationalResults(
  repository: PersistenceRepository,
  intents: readonly OperationalRecordPersistenceIntent[],
): Promise<LocalRunnerResult<readonly string[]>> {
  const results = await repository.saveOperationalRecords(intents)
  const successfulIds = intents
    .filter((_, index) => results[index]?.status === "SUCCESS")
    .map((intent) => intent.operationalRecord.recordId)
  if (results.some((result) => result.status === "UNAVAILABLE"
    || result.status === "ADAPTER_ERROR")) {
    return createLocalRunnerResult("STORAGE_UNAVAILABLE", [createLocalRunnerError(
      "storage_unavailable",
      "SQLite could not persist local operational records.",
    )], Object.freeze(successfulIds))
  }
  if (results.some((result) => result.status === "DUPLICATE")) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "duplicate_run_id",
      "Local run operational identity already exists.",
      { field: "runId" },
    )], Object.freeze(successfulIds))
  }
  if (results.some((result) => result.status !== "SUCCESS")) {
    return createLocalRunnerResult("PARTIAL", [createLocalRunnerError(
      "operational_persistence_failed",
      "Some local operational records were not persisted.",
    )], Object.freeze(successfulIds))
  }
  return createLocalRunnerResult("SUCCESS", [], Object.freeze(successfulIds))
}

export async function runLocalRequest(
  input: LocalRunRequest,
  bootstrap: LocalRunnerBootstrap,
): Promise<LocalRunnerResult<LocalRunSummary>> {
  const request = validateLocalRunRequest(input)
  if (request.status !== "SUCCESS" || !request.value) {
    return createLocalRunnerResult(request.status, request.errors)
  }
  if (!bootstrap.runRegistry.claim(request.value.runId)) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "duplicate_run_id",
      "runId has already been claimed by this Local Runner.",
      { field: "runId" },
    )])
  }

  const runTimestamp = canonicalCronTimestamp(bootstrap.now())
  if (!runTimestamp || Date.parse(runTimestamp) < Date.parse(request.value.requestedAt)) {
    return createLocalRunnerResult("VALIDATION_ERROR", [createLocalRunnerError(
      "invalid_timestamp",
      "Local Runner clock must return a valid time at or after requestedAt.",
      { field: "requestedAt" },
    )])
  }
  const received = receiveTrigger({
    provider: request.value.triggerProvider,
    requestedAt: request.value.requestedAt,
    triggerType: request.value.triggerProvider === "MANUAL" ? "MANUAL" : "SCHEDULED",
    executionScope: request.value.executionScope,
    metadata: Object.freeze({ ...request.value.metadata, runId: request.value.runId }),
  })
  if (received.success === false) {
    return createLocalRunnerResult("EXECUTION_ERROR", received.errors.map(
      (error) => createLocalRunnerError(error.code, error.message, {
        field: error.field,
        cause: error.cause,
      }),
    ))
  }
  const normalized = bootstrap.cronAdapter.normalize(
    received.value,
    runTimestamp,
    runTimestamp,
  )
  if (normalized.success === false) {
    return createLocalRunnerResult("EXECUTION_ERROR", normalized.errors.map(
      (error) => createLocalRunnerError(error.code, error.message),
    ))
  }
  const plans = createLocalExecutionPlans(request.value, runTimestamp)
  if (plans.status !== "SUCCESS" || !plans.value) {
    return createLocalRunnerResult(plans.status, plans.errors)
  }
  const activation = bootstrap.cronAdapter.activate(
    normalized.value,
    plans.value.map((plan) => plan.executionId),
    `LOCAL_RUN:${request.value.executionScope}`,
    runTimestamp,
  )
  if (activation.success === false) {
    return createLocalRunnerResult("EXECUTION_ERROR", activation.errors.map(
      (error) => createLocalRunnerError(error.code, error.message),
    ))
  }

  const capturedSnapshots = new Map<string, ScannerSignalSnapshotCandidate>()
  const contextSnapshots = new Map<string, ContextSnapshot>()
  const initializedTracking = new Map<string, TrackingLifecycle>()
  const preparedWindows = new Map<string, EvaluationWindowWork>()
  const observedPrices = new Map<string, PriceObservationRecord>()
  const signalEvaluations = new Map<string, SignalEvaluationResult>()
  const outcomeEvents = new Map<string, OutcomeEvent>()
  const signalCaptureHandler = createSignalCaptureHandler({
    request: request.value,
    repository: bootstrap.repository,
    onCaptured(candidate, contextSnapshot) {
      capturedSnapshots.set(candidate.snapshotId, candidate)
      contextSnapshots.set(candidate.snapshotId, contextSnapshot)
    },
  })
  const trackingInitializationHandler = createTrackingInitializationHandler({
    request: request.value,
    repository: bootstrap.repository,
    capturedSnapshots,
    onInitialized(lifecycle) {
      initializedTracking.set(lifecycle.identity.trackingId, lifecycle)
    },
  })
  const evaluationWindowHandler = createEvaluationWindowHandler({
    request: request.value,
    repository: bootstrap.repository,
    initializedTracking,
    onPrepared(work) {
      preparedWindows.set(work.jobStateRecordId, work)
    },
  })
  const priceObservationHandler = createPriceObservationHandler({
    request: request.value,
    repository: bootstrap.repository,
    capturedSnapshots,
    initializedTracking,
    preparedWindows,
    now: bootstrap.now,
    onObserved(record) {
      observedPrices.set(record.observationId, record)
    },
  })
  const signalEvaluationHandler = createSignalEvaluationHandler({
    request: request.value,
    repository: bootstrap.repository,
    capturedSnapshots,
    observedPrices,
    onEvaluated(evaluation) {
      signalEvaluations.set(
        `${evaluation.signalReference.signalId}:${evaluation.window.id}`,
        evaluation,
      )
    },
  })
  const outcomeRecordingHandler = createOutcomeRecordingHandler({
    request: request.value,
    repository: bootstrap.repository,
    capturedSnapshots,
    contextSnapshots,
    evaluations: signalEvaluations,
    onRecorded(_outcome, event) {
      outcomeEvents.set(event.identity.eventId, event)
    },
  })
  const historicalMemoryWriteHandler = createHistoricalMemoryWriteHandler({
    request: request.value,
    repository: bootstrap.repository,
    outcomeEvents,
  })
  const handlers = bootstrap.handlerMode === "NOT_IMPLEMENTED"
    ? createNotImplementedLocalHandlers(
        signalCaptureHandler,
        trackingInitializationHandler,
        evaluationWindowHandler,
        priceObservationHandler,
        signalEvaluationHandler,
        outcomeRecordingHandler,
        historicalMemoryWriteHandler,
      )
    : createNoOpLocalHandlers(
        signalCaptureHandler,
        trackingInitializationHandler,
        evaluationWindowHandler,
        priceObservationHandler,
        signalEvaluationHandler,
        outcomeRecordingHandler,
        historicalMemoryWriteHandler,
      )
  const dispatcher = createWorkerDispatcher(handlers)
  if (dispatcher.success === false) {
    return createLocalRunnerResult("EXECUTION_ERROR", dispatcher.errors.map(
      (error) => createLocalRunnerError(error.code, error.message),
    ))
  }

  const dispatched = await dispatchLocalExecutions(
    request.value,
    plans.value,
    dispatcher.value,
    runTimestamp,
  )
  const executions = dispatched.value ?? Object.freeze([])
  let summary = freezeSummary({
    request: request.value,
    trigger: activation.value.trigger,
    activation: activation.value.activation,
    executions,
    operationalRecordIds: [],
    dryRun: request.value.dryRun,
  })

  if (request.value.dryRun) {
    return createLocalRunnerResult(dispatched.status, dispatched.errors, summary)
  }
  if (bootstrap.storageStatus !== "READY" || bootstrap.repository === null) {
    return createLocalRunnerResult("STORAGE_UNAVAILABLE", [createLocalRunnerError(
      "storage_unavailable",
      "SQLite-backed mode requires an available local Repository.",
    )], summary)
  }

  const persistence = await persistOperationalResults(
    bootstrap.repository,
    operationalIntents(
      request.value,
      activation.value.trigger.request.triggerId,
      activation.value.activation.activationId,
      executions,
      runTimestamp,
    ),
  )
  summary = freezeSummary({
    ...summary,
    operationalRecordIds: persistence.value ?? [],
  })
  if (persistence.status !== "SUCCESS") {
    return createLocalRunnerResult(persistence.status, persistence.errors, summary)
  }
  return createLocalRunnerResult(dispatched.status, dispatched.errors, summary)
}
