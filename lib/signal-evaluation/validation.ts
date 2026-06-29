import { isSignalDirection } from "@/lib/signal-evaluation/direction"
import {
  SIGNAL_EVALUATION_SCHEMA_VERSION,
  SIGNAL_EVALUATION_STATUSES,
  SIGNAL_OUTCOME_STATUSES,
  type SignalEvaluationError,
  type SignalEvaluationInput,
  type SignalEvaluationMetrics,
  type SignalEvaluationOperationResult,
  type SignalEvaluationResult,
  type SignalEvaluationStatus,
  type SignalOutcomeStatus,
} from "@/lib/signal-evaluation/types"
import {
  getTrackingWindowDefinition,
  isTrackingWindowId,
  validateSignalSnapshotReference,
} from "@/lib/signal-tracking"

type UnknownRecord = Record<string, unknown>

const EVALUATION_STATUS_SET = new Set<string>(SIGNAL_EVALUATION_STATUSES)
const OUTCOME_STATUS_SET = new Set<string>(SIGNAL_OUTCOME_STATUSES)

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function result<T>(errors: SignalEvaluationError[], value?: T): SignalEvaluationOperationResult<T> {
  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: value! }
}

export function isSignalEvaluationStatus(value: unknown): value is SignalEvaluationStatus {
  return typeof value === "string" && EVALUATION_STATUS_SET.has(value)
}

export function isSignalOutcomeStatus(value: unknown): value is SignalOutcomeStatus {
  return typeof value === "string" && OUTCOME_STATUS_SET.has(value)
}

export function validateSignalEvaluationInput(
  input: unknown,
): SignalEvaluationOperationResult<SignalEvaluationInput> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Signal evaluation input must be an object." }],
    }
  }

  const errors: SignalEvaluationError[] = []
  const signalReference = validateSignalSnapshotReference(input.signalReference)
  if (signalReference.success === false) {
    const invalidTimestamp = signalReference.errors.some((error) => error.code === "invalid_timestamp")
    errors.push({
      code: invalidTimestamp ? "impossible_timestamp" : "missing_signal_reference",
      message: invalidTimestamp
        ? "Signal Snapshot createdAt must be a valid timestamp."
        : "Signal evaluation requires a valid Signal Snapshot reference.",
      field: invalidTimestamp ? "signalReference.createdAt" : "signalReference",
    })
  }

  if (!isSignalDirection(input.direction)) {
    errors.push({
      code: "invalid_direction",
      message: "Signal direction must be LONG, SHORT, or NEUTRAL.",
      field: "direction",
    })
  }

  if (input.entryPrice === null || input.entryPrice === undefined) {
    errors.push({
      code: "missing_entry_price",
      message: "Signal evaluation reference entryPrice is unavailable.",
      field: "entryPrice",
    })
  } else if (!isFiniteNumber(input.entryPrice) || input.entryPrice <= 0) {
    errors.push({
      code: "invalid_metric_value",
      message: "Signal evaluation entryPrice must be a positive finite number.",
      field: "entryPrice",
    })
  }
  if (!isNonEmptyString(input.entrySourceId)) {
    errors.push({
      code: "missing_entry_price",
      message: "Signal evaluation entry price requires a source ID.",
      field: "entrySourceId",
    })
  }

  if (!isRecord(input.window) || !isTrackingWindowId(input.window.id)) {
    errors.push({
      code: "unknown_evaluation_window",
      message: "Signal evaluation window is not canonical.",
      field: "window.id",
    })
  } else {
    const definition = getTrackingWindowDefinition(input.window.id)
    const createdAt = signalReference.success ? Date.parse(signalReference.value.createdAt) : NaN
    if (!isTimestamp(input.window.startsAt) || !isTimestamp(input.window.endsAt)) {
      errors.push({
        code: "impossible_timestamp",
        message: "Evaluation window requires valid startsAt and endsAt timestamps.",
        field: "window",
      })
    } else if (Number.isFinite(createdAt) && definition.success) {
      if (Date.parse(input.window.startsAt) !== createdAt
        || Date.parse(input.window.endsAt) !== createdAt + definition.value.durationMs) {
        errors.push({
          code: "impossible_timestamp",
          message: "Evaluation window timestamps must match the Signal Snapshot and canonical duration.",
          field: "window",
        })
      }
    }
  }

  if (!Array.isArray(input.observations) || input.observations.length === 0) {
    errors.push({
      code: "missing_observation_price",
      message: "Signal evaluation requires at least one source-backed observation price.",
      field: "observations",
    })
  } else {
    const startsAt = isRecord(input.window) && isTimestamp(input.window.startsAt)
      ? Date.parse(input.window.startsAt)
      : NaN
    const endsAt = isRecord(input.window) && isTimestamp(input.window.endsAt)
      ? Date.parse(input.window.endsAt)
      : NaN
    let previousTimestamp = Number.NEGATIVE_INFINITY

    for (let index = 0; index < input.observations.length; index += 1) {
      const observation = input.observations[index]
      const field = `observations[${index}]`
      if (!isRecord(observation)) {
        errors.push({
          code: "missing_observation_price",
          message: `${field} must be a source-backed price observation.`,
          field,
        })
        continue
      }
      if (observation.price === null || observation.price === undefined) {
        errors.push({
          code: "missing_observation_price",
          message: `${field}.price is unavailable.`,
          field: `${field}.price`,
        })
      } else if (!isFiniteNumber(observation.price) || observation.price <= 0) {
        errors.push({
          code: "invalid_metric_value",
          message: `${field}.price must be a positive finite number.`,
          field: `${field}.price`,
        })
      }
      if (!isNonEmptyString(observation.sourceId)) {
        errors.push({
          code: "missing_observation_price",
          message: `${field}.sourceId is required.`,
          field: `${field}.sourceId`,
        })
      }
      if (!isTimestamp(observation.observedAt)) {
        errors.push({
          code: "impossible_timestamp",
          message: `${field}.observedAt must be a valid timestamp.`,
          field: `${field}.observedAt`,
        })
        continue
      }

      const observedAt = Date.parse(observation.observedAt)
      if (observedAt < previousTimestamp
        || (Number.isFinite(startsAt) && observedAt < startsAt)
        || (Number.isFinite(endsAt) && observedAt > endsAt)) {
        errors.push({
          code: "impossible_timestamp",
          message: `${field}.observedAt is out of order or outside the evaluation window.`,
          field: `${field}.observedAt`,
        })
      }
      previousTimestamp = observedAt
    }

    const last = input.observations[input.observations.length - 1]
    if (isRecord(last) && isTimestamp(last.observedAt) && Number.isFinite(endsAt)
      && Date.parse(last.observedAt) !== endsAt) {
      errors.push({
        code: "impossible_timestamp",
        message: "The final observation must match the canonical window end.",
        field: `observations[${input.observations.length - 1}].observedAt`,
      })
    }
  }

  if (input.invalidationPrice !== undefined && input.invalidationPrice !== null
    && (!isFiniteNumber(input.invalidationPrice) || input.invalidationPrice <= 0)) {
    errors.push({
      code: "invalid_metric_value",
      message: "invalidationPrice must be a positive finite number or null.",
      field: "invalidationPrice",
    })
  }

  return result(errors, input as unknown as SignalEvaluationInput)
}

export function validateSignalEvaluationMetrics(
  input: unknown,
): SignalEvaluationOperationResult<SignalEvaluationMetrics> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_metric_value", message: "Evaluation metrics must be an object.", field: "metrics" }],
    }
  }

  const errors: SignalEvaluationError[] = []
  const numericFields = [
    "returnPercent",
    "maxFavorableExcursion",
    "maxAdverseExcursion",
    "drawdown",
    "runup",
    "timeToMaxFavorable",
    "timeToMaxAdverse",
  ] as const
  for (const field of numericFields) {
    const value = input[field]
    if (value !== null && !isFiniteNumber(value)) {
      errors.push({
        code: "invalid_metric_value",
        message: `${field} must be a finite number or null.`,
        field: `metrics.${field}`,
      })
    }
  }

  if (isFiniteNumber(input.maxFavorableExcursion) && input.maxFavorableExcursion < 0) {
    errors.push({ code: "invalid_metric_value", message: "maxFavorableExcursion cannot be negative.", field: "metrics.maxFavorableExcursion" })
  }
  if (isFiniteNumber(input.maxAdverseExcursion) && input.maxAdverseExcursion > 0) {
    errors.push({ code: "invalid_metric_value", message: "maxAdverseExcursion cannot be positive.", field: "metrics.maxAdverseExcursion" })
  }
  for (const field of ["drawdown", "runup", "timeToMaxFavorable", "timeToMaxAdverse"] as const) {
    if (isFiniteNumber(input[field]) && input[field] < 0) {
      errors.push({ code: "invalid_metric_value", message: `${field} cannot be negative.`, field: `metrics.${field}` })
    }
  }
  if (input.invalidationHit !== null && typeof input.invalidationHit !== "boolean") {
    errors.push({ code: "invalid_metric_value", message: "invalidationHit must be boolean or null.", field: "metrics.invalidationHit" })
  }
  if (input.directionCorrect !== null && typeof input.directionCorrect !== "boolean") {
    errors.push({ code: "invalid_metric_value", message: "directionCorrect must be boolean or null.", field: "metrics.directionCorrect" })
  }
  if (!isSignalOutcomeStatus(input.outcomeStatus)) {
    errors.push({ code: "invalid_metric_value", message: "outcomeStatus is invalid.", field: "metrics.outcomeStatus" })
  }

  return result(errors, input as unknown as SignalEvaluationMetrics)
}

export function validateSignalEvaluationResult(
  input: unknown,
): SignalEvaluationOperationResult<SignalEvaluationResult> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Signal evaluation result must be an object." }],
    }
  }
  if (input.schemaVersion !== SIGNAL_EVALUATION_SCHEMA_VERSION) {
    return {
      success: false,
      errors: [{
        code: "unsupported_schema_version",
        message: `Only signal evaluation schema version ${SIGNAL_EVALUATION_SCHEMA_VERSION} is supported.`,
        field: "schemaVersion",
      }],
    }
  }

  const errors: SignalEvaluationError[] = []
  const signalReference = validateSignalSnapshotReference(input.signalReference)
  if (signalReference.success === false) {
    const invalidTimestamp = signalReference.errors.some((error) => error.code === "invalid_timestamp")
    errors.push({
      code: invalidTimestamp ? "impossible_timestamp" : "missing_signal_reference",
      message: invalidTimestamp
        ? "Result Signal Snapshot createdAt must be a valid timestamp."
        : "Result requires a valid Signal Snapshot reference.",
      field: invalidTimestamp ? "signalReference.createdAt" : "signalReference",
    })
  }
  if (!isSignalDirection(input.direction)) {
    errors.push({ code: "invalid_direction", message: "Result direction is invalid.", field: "direction" })
  }
  if (!isSignalEvaluationStatus(input.status)) {
    errors.push({ code: "malformed_input", message: "Result status is invalid.", field: "status" })
  }
  if (!isRecord(input.window) || !isTrackingWindowId(input.window.id)
    || !isTimestamp(input.window.startsAt) || !isTimestamp(input.window.endsAt)) {
    errors.push({ code: "unknown_evaluation_window", message: "Result window is invalid.", field: "window" })
  } else if (signalReference.success) {
    const definition = getTrackingWindowDefinition(input.window.id)
    const startsAt = Date.parse(input.window.startsAt)
    if (!definition.success
      || startsAt !== Date.parse(signalReference.value.createdAt)
      || Date.parse(input.window.endsAt) !== startsAt + definition.value.durationMs) {
      errors.push({ code: "impossible_timestamp", message: "Result window timestamps are impossible.", field: "window" })
    }
  }

  if (input.metrics !== null) {
    const metrics = validateSignalEvaluationMetrics(input.metrics)
    if (metrics.success === false) errors.push(...metrics.errors)
  }
  if (input.status === "EVALUATED" && input.metrics === null) {
    errors.push({ code: "invalid_metric_value", message: "EVALUATED result requires metrics.", field: "metrics" })
  }
  if (input.status === "UNAVAILABLE") {
    if (!isRecord(input.metrics) || input.metrics.outcomeStatus !== "UNAVAILABLE") {
      errors.push({ code: "invalid_metric_value", message: "UNAVAILABLE result requires unavailable metrics.", field: "metrics" })
    } else {
      const unavailableNumericFields = [
        "returnPercent",
        "maxFavorableExcursion",
        "maxAdverseExcursion",
        "drawdown",
        "runup",
        "timeToMaxFavorable",
        "timeToMaxAdverse",
      ] as const
      if (unavailableNumericFields.some((field) => input.metrics[field] !== null)
        || input.metrics.invalidationHit !== null
        || input.metrics.directionCorrect !== null) {
        errors.push({
          code: "invalid_metric_value",
          message: "UNAVAILABLE result metrics must remain null.",
          field: "metrics",
        })
      }
    }
    if (!isNonEmptyString(input.unavailableReason)) {
      errors.push({ code: "malformed_input", message: "UNAVAILABLE result requires a reason.", field: "unavailableReason" })
    }
  } else if (input.status === "ARCHIVED"
    && isRecord(input.metrics)
    && input.metrics.outcomeStatus === "UNAVAILABLE") {
    if (!isNonEmptyString(input.unavailableReason)) {
      errors.push({ code: "malformed_input", message: "Archived unavailable result must preserve its reason.", field: "unavailableReason" })
    }
  } else if (input.unavailableReason !== null) {
    errors.push({ code: "malformed_input", message: "Only UNAVAILABLE result may include unavailableReason.", field: "unavailableReason" })
  }
  if ((input.status === "PENDING" || input.status === "FAILED") && input.metrics !== null) {
    errors.push({ code: "invalid_metric_value", message: `${input.status} result cannot contain metrics.`, field: "metrics" })
  }

  return result(errors, input as unknown as SignalEvaluationResult)
}
