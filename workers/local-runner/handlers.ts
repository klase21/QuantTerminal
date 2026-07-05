import { SCHEDULER_JOB_TYPES } from "@/lib/scheduler-runtime"
import type { WorkerDispatchHandlers, WorkerJobHandler } from "@/lib/worker-runtime"

const noOpHandler: WorkerJobHandler = () => Object.freeze({
  success: true,
  value: Object.freeze({
    producedRecords: Object.freeze([]),
    nextExecutionIds: Object.freeze([]),
  }),
})

const notImplementedHandler: WorkerJobHandler = () => Object.freeze({
  success: false,
  error: Object.freeze({
    code: "NOT_IMPLEMENTED",
    message: "Local Runner has no live business handler for this job type.",
    retryable: false,
  }),
})

function createHandlers(
  handler: WorkerJobHandler,
  signalCaptureHandler?: WorkerJobHandler,
  trackingInitializationHandler?: WorkerJobHandler,
  evaluationWindowHandler?: WorkerJobHandler,
  priceObservationHandler?: WorkerJobHandler,
  signalEvaluationHandler?: WorkerJobHandler,
  outcomeRecordingHandler?: WorkerJobHandler,
  historicalMemoryWriteHandler?: WorkerJobHandler,
): WorkerDispatchHandlers {
  return Object.freeze(Object.fromEntries(
    SCHEDULER_JOB_TYPES.map((jobType) => [
      jobType,
      jobType === "SignalCapture" && signalCaptureHandler
        ? signalCaptureHandler
        : jobType === "TrackingInitialization" && trackingInitializationHandler
          ? trackingInitializationHandler
          : jobType === "EvaluationWindow" && evaluationWindowHandler
            ? evaluationWindowHandler
            : jobType === "PriceObservation" && priceObservationHandler
              ? priceObservationHandler
              : jobType === "SignalEvaluation" && signalEvaluationHandler
                ? signalEvaluationHandler
                : jobType === "OutcomeRecording" && outcomeRecordingHandler
                  ? outcomeRecordingHandler
                  : jobType === "HistoricalMemoryWrite" && historicalMemoryWriteHandler
                    ? historicalMemoryWriteHandler
                    : handler,
    ]),
  )) as WorkerDispatchHandlers
}

export function createNoOpLocalHandlers(
  signalCaptureHandler?: WorkerJobHandler,
  trackingInitializationHandler?: WorkerJobHandler,
  evaluationWindowHandler?: WorkerJobHandler,
  priceObservationHandler?: WorkerJobHandler,
  signalEvaluationHandler?: WorkerJobHandler,
  outcomeRecordingHandler?: WorkerJobHandler,
  historicalMemoryWriteHandler?: WorkerJobHandler,
): WorkerDispatchHandlers {
  return createHandlers(
    noOpHandler,
    signalCaptureHandler,
    trackingInitializationHandler,
    evaluationWindowHandler,
    priceObservationHandler,
    signalEvaluationHandler,
    outcomeRecordingHandler,
    historicalMemoryWriteHandler,
  )
}

export function createNotImplementedLocalHandlers(
  signalCaptureHandler?: WorkerJobHandler,
  trackingInitializationHandler?: WorkerJobHandler,
  evaluationWindowHandler?: WorkerJobHandler,
  priceObservationHandler?: WorkerJobHandler,
  signalEvaluationHandler?: WorkerJobHandler,
  outcomeRecordingHandler?: WorkerJobHandler,
  historicalMemoryWriteHandler?: WorkerJobHandler,
): WorkerDispatchHandlers {
  return createHandlers(
    notImplementedHandler,
    signalCaptureHandler,
    trackingInitializationHandler,
    evaluationWindowHandler,
    priceObservationHandler,
    signalEvaluationHandler,
    outcomeRecordingHandler,
    historicalMemoryWriteHandler,
  )
}
