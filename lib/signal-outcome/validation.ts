import {
  createSignalOutcomeId,
} from "@/lib/signal-outcome/identity"
import {
  SIGNAL_OUTCOME_LEARNING_STATUSES,
  SIGNAL_OUTCOME_LIFECYCLE_STATES,
  SIGNAL_OUTCOME_REFERENCE_STATUSES,
  SIGNAL_OUTCOME_SCHEMA_VERSION,
  type SignalOutcome,
  type CompletedSignalEvaluationResult,
  type SignalOutcomeError,
  type SignalOutcomeLearningStatus,
  type SignalOutcomeLifecycleState,
  type SignalOutcomeReference,
  type SignalOutcomeReferenceStatus,
  type SignalOutcomeResult,
  type SignalOutcomeSnapshot,
} from "@/lib/signal-outcome/types"
import {
  isSignalDirection,
  isSignalOutcomeStatus,
  validateSignalEvaluationMetrics,
  validateSignalEvaluationResult,
} from "@/lib/signal-evaluation"
import {
  createTrackingId,
  getTrackingWindowDefinition,
  isTrackingWindowId,
} from "@/lib/signal-tracking"

type UnknownRecord = Record<string, unknown>

const LIFECYCLE_SET = new Set<string>(SIGNAL_OUTCOME_LIFECYCLE_STATES)
const LEARNING_SET = new Set<string>(SIGNAL_OUTCOME_LEARNING_STATUSES)
const REFERENCE_SET = new Set<string>(SIGNAL_OUTCOME_REFERENCE_STATUSES)

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function operation<T>(
  errors: SignalOutcomeError[],
  value?: T,
): SignalOutcomeResult<T> {
  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: value! }
}

function validateReference(
  input: unknown,
  field: string,
): SignalOutcomeResult<SignalOutcomeReference> {
  if (!isRecord(input)
    || typeof input.status !== "string"
    || !REFERENCE_SET.has(input.status)) {
    return {
      success: false,
      errors: [{
        code: "missing_signal_reference",
        message: `${field} must declare AVAILABLE or UNAVAILABLE.`,
        field,
      }],
    }
  }

  if (input.status === "AVAILABLE") {
    if (!isNonEmptyString(input.referenceId) || input.unavailableReason !== null) {
      return {
        success: false,
        errors: [{
          code: "missing_signal_reference",
          message: `${field} AVAILABLE state requires referenceId and no unavailable reason.`,
          field,
        }],
      }
    }
  } else if (input.referenceId !== null || !isNonEmptyString(input.unavailableReason)) {
    return {
      success: false,
      errors: [{
        code: "missing_signal_reference",
        message: `${field} UNAVAILABLE state requires null referenceId and an explicit reason.`,
        field,
      }],
    }
  }

  return { success: true, value: input as unknown as SignalOutcomeReference }
}

export function isSignalOutcomeLifecycleState(
  value: unknown,
): value is SignalOutcomeLifecycleState {
  return typeof value === "string" && LIFECYCLE_SET.has(value)
}

export function isSignalOutcomeLearningStatus(
  value: unknown,
): value is SignalOutcomeLearningStatus {
  return typeof value === "string" && LEARNING_SET.has(value)
}

export function isSignalOutcomeReferenceStatus(
  value: unknown,
): value is SignalOutcomeReferenceStatus {
  return typeof value === "string" && REFERENCE_SET.has(value)
}

export function validateSignalOutcomeSnapshot(
  input: unknown,
): SignalOutcomeResult<SignalOutcomeSnapshot> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{
        code: "missing_signal_reference",
        message: "Signal Outcome requires a Signal Snapshot object.",
        field: "snapshot",
      }],
    }
  }

  const errors: SignalOutcomeError[] = []
  for (const field of [
    "signalId",
    "snapshotId",
    "trackingId",
    "symbol",
    "exchange",
    "timeframe",
  ] as const) {
    if (!isNonEmptyString(input[field])) {
      errors.push({
        code: "missing_signal_reference",
        message: `Signal Snapshot requires ${field}.`,
        field: `snapshot.${field}`,
      })
    }
  }
  if (!isTimestamp(input.signalCreatedAt)) {
    errors.push({
      code: "impossible_timestamp",
      message: "Signal Snapshot signalCreatedAt must be a valid timestamp.",
      field: "snapshot.signalCreatedAt",
    })
  }
  if (!isSignalDirection(input.direction)) {
    errors.push({
      code: "missing_signal_reference",
      message: "Signal Snapshot direction must be LONG, SHORT, or NEUTRAL.",
      field: "snapshot.direction",
    })
  }

  if (isNonEmptyString(input.signalId)
    && isNonEmptyString(input.snapshotId)
    && isTimestamp(input.signalCreatedAt)) {
    const trackingId = createTrackingId({
      signalId: input.signalId,
      snapshotId: input.snapshotId,
      createdAt: input.signalCreatedAt,
    })
    if (trackingId.success === false || input.trackingId !== trackingId.value) {
      errors.push({
        code: "identity_mismatch",
        message: "Signal Snapshot trackingId does not match its immutable references.",
        field: "snapshot.trackingId",
      })
    }
  }

  for (const field of [
    "evidenceReference",
    "replayReference",
    "contextReference",
  ] as const) {
    const reference = validateReference(input[field], `snapshot.${field}`)
    if (reference.success === false) errors.push(...reference.errors)
  }

  return operation(errors, input as unknown as SignalOutcomeSnapshot)
}

export function validateSignalOutcome(
  input: unknown,
): SignalOutcomeResult<SignalOutcome> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Signal Outcome must be an object." }],
    }
  }
  if (input.schemaVersion !== SIGNAL_OUTCOME_SCHEMA_VERSION) {
    return {
      success: false,
      errors: [{
        code: "unsupported_schema_version",
        message: `Only Signal Outcome schema version ${SIGNAL_OUTCOME_SCHEMA_VERSION} is supported.`,
        field: "schemaVersion",
      }],
    }
  }

  const errors: SignalOutcomeError[] = []
  if (!isSignalOutcomeLifecycleState(input.lifecycleState)) {
    errors.push({
      code: "inconsistent_lifecycle",
      message: "Signal Outcome lifecycleState is invalid.",
      field: "lifecycleState",
    })
  }
  if (!isSignalOutcomeLearningStatus(input.learningStatus)) {
    errors.push({
      code: "inconsistent_lifecycle",
      message: "Signal Outcome learningStatus is invalid.",
      field: "learningStatus",
    })
  }

  if (!isRecord(input.identity)) {
    errors.push({
      code: "missing_signal_reference",
      message: "Signal Outcome identity is required.",
      field: "identity",
    })
  }
  if (!isRecord(input.timing)) {
    errors.push({
      code: "impossible_timestamp",
      message: "Signal Outcome timing is required.",
      field: "timing",
    })
  }
  if (!isRecord(input.signal)) {
    errors.push({
      code: "missing_signal_reference",
      message: "Signal Outcome signal fields are required.",
      field: "signal",
    })
  }

  if (isRecord(input.identity) && isRecord(input.timing)) {
    for (const field of ["outcomeId", "signalId", "snapshotId", "trackingId"] as const) {
      if (!isNonEmptyString(input.identity[field])) {
        errors.push({
          code: "missing_signal_reference",
          message: `Signal Outcome identity requires ${field}.`,
          field: `identity.${field}`,
        })
      }
    }
    if (!isTimestamp(input.timing.signalCreatedAt) || !isTimestamp(input.timing.evaluatedAt)) {
      errors.push({
        code: "impossible_timestamp",
        message: "Signal Outcome timing values must be valid timestamps.",
        field: "timing",
      })
    }
    if (!isTrackingWindowId(input.timing.evaluationWindow)) {
      errors.push({
        code: "invalid_evaluation_window",
        message: "Signal Outcome evaluationWindow is not canonical.",
        field: "timing.evaluationWindow",
      })
    } else if (isTimestamp(input.timing.signalCreatedAt) && isTimestamp(input.timing.evaluatedAt)) {
      const definition = getTrackingWindowDefinition(input.timing.evaluationWindow)
      if (!definition.success
        || Date.parse(input.timing.evaluatedAt)
          !== Date.parse(input.timing.signalCreatedAt) + definition.value.durationMs) {
        errors.push({
          code: "impossible_timestamp",
          message: "evaluatedAt must equal the canonical evaluation window end.",
          field: "timing.evaluatedAt",
        })
      }
    }

    if (isNonEmptyString(input.identity.signalId) && isTrackingWindowId(input.timing.evaluationWindow)) {
      const expectedOutcomeId = createSignalOutcomeId(
        input.identity.signalId,
        input.timing.evaluationWindow,
      )
      if (expectedOutcomeId.success === false || input.identity.outcomeId !== expectedOutcomeId.value) {
        errors.push({
          code: "identity_mismatch",
          message: "outcomeId does not match signalId and evaluationWindow.",
          field: "identity.outcomeId",
        })
      }
    }
    if (isNonEmptyString(input.identity.signalId)
      && isNonEmptyString(input.identity.snapshotId)
      && isTimestamp(input.timing.signalCreatedAt)) {
      const expectedTrackingId = createTrackingId({
        signalId: input.identity.signalId,
        snapshotId: input.identity.snapshotId,
        createdAt: input.timing.signalCreatedAt,
      })
      if (expectedTrackingId.success === false
        || input.identity.trackingId !== expectedTrackingId.value) {
        errors.push({
          code: "identity_mismatch",
          message: "trackingId does not match Signal Outcome references.",
          field: "identity.trackingId",
        })
      }
    }
  }

  if (isRecord(input.signal)) {
    for (const field of ["symbol", "exchange", "timeframe"] as const) {
      if (!isNonEmptyString(input.signal[field])) {
        errors.push({
          code: "missing_signal_reference",
          message: `Signal Outcome requires signal.${field}.`,
          field: `signal.${field}`,
        })
      }
    }
    if (!isSignalDirection(input.signal.direction)) {
      errors.push({
        code: "missing_signal_reference",
        message: "Signal Outcome direction is invalid.",
        field: "signal.direction",
      })
    }
  }

  if (!isRecord(input.evaluation) || !isRecord(input.performance)) {
    errors.push({
      code: "invalid_metrics",
      message: "Signal Outcome evaluation and performance are required.",
      field: "evaluation",
    })
  } else {
    if (input.evaluation.evaluationStatus !== "EVALUATED"
      && input.evaluation.evaluationStatus !== "UNAVAILABLE") {
      errors.push({
        code: "inconsistent_lifecycle",
        message: "Signal Outcome requires a completed Evaluation result.",
        field: "evaluation.evaluationStatus",
      })
    }

    const metrics = validateSignalEvaluationMetrics({
      returnPercent: input.performance.returnPercent,
      maxFavorableExcursion: input.performance.maxFavorableExcursion,
      maxAdverseExcursion: input.performance.maxAdverseExcursion,
      drawdown: input.performance.drawdown,
      runup: input.performance.runup,
      timeToMaxFavorable: input.performance.timeToMaxFavorable,
      timeToMaxAdverse: input.performance.timeToMaxAdverse,
      invalidationHit: input.evaluation.invalidationHit,
      directionCorrect: input.evaluation.directionCorrect,
      outcomeStatus: input.evaluation.outcomeStatus,
    })
    if (metrics.success === false) {
      errors.push(...metrics.errors.map((metricError) => ({
        code: "invalid_metrics" as const,
        message: metricError.message,
        field: metricError.field,
      })))
    }
    if (!isSignalOutcomeStatus(input.evaluation.outcomeStatus)) {
      errors.push({
        code: "invalid_metrics",
        message: "Signal Outcome outcomeStatus is invalid.",
        field: "evaluation.outcomeStatus",
      })
    }
    if (input.evaluation.evaluationStatus === "UNAVAILABLE") {
      const performanceValues = Object.values(input.performance)
      if (input.evaluation.outcomeStatus !== "UNAVAILABLE"
        || input.evaluation.directionCorrect !== null
        || input.evaluation.invalidationHit !== null
        || performanceValues.some((value) => value !== null)
        || !isNonEmptyString(input.evaluation.unavailableReason)) {
        errors.push({
          code: "invalid_metrics",
          message: "Unavailable Signal Outcome must preserve null metrics and an explicit reason.",
          field: "evaluation",
        })
      }
    } else if (input.evaluation.unavailableReason !== null) {
      errors.push({
        code: "invalid_metrics",
        message: "Evaluated Signal Outcome cannot include unavailableReason.",
        field: "evaluation.unavailableReason",
      })
    }
  }

  if (!isRecord(input.snapshotReferences)) {
    errors.push({
      code: "missing_signal_reference",
      message: "Signal Outcome snapshotReferences are required.",
      field: "snapshotReferences",
    })
  } else {
    for (const field of [
      "evidenceReference",
      "replayReference",
      "contextReference",
    ] as const) {
      const reference = validateReference(input.snapshotReferences[field], `snapshotReferences.${field}`)
      if (reference.success === false) errors.push(...reference.errors)
    }
  }

  return operation(errors, input as unknown as SignalOutcome)
}

export function validateUniqueOutcomeIdentities(
  outcomes: readonly SignalOutcome[],
): SignalOutcomeResult<readonly SignalOutcome[]> {
  const seen = new Set<string>()
  for (let index = 0; index < outcomes.length; index += 1) {
    const validation = validateSignalOutcome(outcomes[index])
    if (validation.success === false) return validation
    if (seen.has(validation.value.identity.outcomeId)) {
      return {
        success: false,
        errors: [{
          code: "duplicate_outcome_identity",
          message: `Duplicate Signal Outcome identity ${validation.value.identity.outcomeId}.`,
          field: `outcomes[${index}].identity.outcomeId`,
        }],
      }
    }
    seen.add(validation.value.identity.outcomeId)
  }

  return { success: true, value: outcomes }
}

export function validateCompletedEvaluationForOutcome(
  evaluation: unknown,
): SignalOutcomeResult<CompletedSignalEvaluationResult> {
  const validation = validateSignalEvaluationResult(evaluation)
  if (validation.success === false) {
    return {
      success: false,
      errors: validation.errors.map((evaluationError) => ({
        code: evaluationError.code === "unknown_evaluation_window"
          ? "invalid_evaluation_window" as const
          : evaluationError.code === "impossible_timestamp"
            ? "impossible_timestamp" as const
            : evaluationError.code === "missing_signal_reference"
              ? "missing_signal_reference" as const
              : "invalid_metrics" as const,
        message: evaluationError.message,
        field: evaluationError.field,
      })),
    }
  }
  if ((validation.value.status !== "EVALUATED" && validation.value.status !== "UNAVAILABLE")
    || validation.value.metrics === null) {
    return {
      success: false,
      errors: [{
        code: "inconsistent_lifecycle",
        message: "Signal Outcome requires an EVALUATED or UNAVAILABLE result with metrics.",
        field: "evaluation.status",
      }],
    }
  }
  return {
    success: true,
    value: validation.value as CompletedSignalEvaluationResult,
  }
}
