import {
  validateSignalOutcome,
  type SignalOutcomeError,
} from "@/lib/signal-outcome"
import {
  createOutcomeEventId,
  isOutcomeEventVersion,
} from "@/lib/outcome-recorder/identity"
import { isDuplicateOutcomeEventIdentity } from "@/lib/outcome-recorder/dedupe"
import {
  OUTCOME_EVENT_SCHEMA_VERSION,
  type OutcomeEvent,
  type OutcomeEventValidationResult,
  type OutcomeRecorderError,
} from "@/lib/outcome-recorder/types"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function mapOutcomeError(error: SignalOutcomeError): OutcomeRecorderError {
  return {
    code: error.code === "missing_signal_reference"
      ? "missing_signal_reference"
      : "invalid_outcome",
    message: error.message,
    field: error.field ? `payload.signalOutcome.${error.field}` : "payload.signalOutcome",
    cause: error.cause,
  }
}

export function validateOutcomeEvent(
  input: unknown,
  existingEventIds: ReadonlySet<string> = new Set<string>(),
): OutcomeEventValidationResult {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Outcome Event must be an object." }],
    }
  }

  const errors: OutcomeRecorderError[] = []
  if (input.schemaVersion !== OUTCOME_EVENT_SCHEMA_VERSION) {
    errors.push({
      code: "unsupported_schema_version",
      message: `Only Outcome Event schema version ${OUTCOME_EVENT_SCHEMA_VERSION} is supported.`,
      field: "schemaVersion",
    })
  }
  if (input.status !== "RECORDED") {
    errors.push({
      code: "invalid_status",
      message: "Outcome Event status must be RECORDED.",
      field: "status",
    })
  }
  if (input.source !== "SIGNAL_OUTCOME") {
    errors.push({
      code: "malformed_payload",
      message: "Outcome Event source must be SIGNAL_OUTCOME.",
      field: "source",
    })
  }
  if (!isTimestamp(input.recordedAt)) {
    errors.push({
      code: "invalid_timestamp",
      message: "Outcome Event recordedAt must be a valid timestamp.",
      field: "recordedAt",
    })
  }

  if (!isRecord(input.identity)) {
    errors.push({
      code: "missing_outcome_reference",
      message: "Outcome Event identity is required.",
      field: "identity",
    })
  }
  if (!isRecord(input.payload) || !isRecord(input.payload.signalOutcome)) {
    errors.push({
      code: "malformed_payload",
      message: "Outcome Event payload requires a Signal Outcome.",
      field: "payload.signalOutcome",
    })
  }

  if (isRecord(input.identity)) {
    if (!isNonEmptyString(input.identity.eventId)) {
      errors.push({
        code: "missing_outcome_reference",
        message: "Outcome Event identity requires eventId.",
        field: "identity.eventId",
      })
    }
    if (!isNonEmptyString(input.identity.outcomeId)) {
      errors.push({
        code: "missing_outcome_reference",
        message: "Outcome Event identity requires outcomeId.",
        field: "identity.outcomeId",
      })
    }
    if (!isOutcomeEventVersion(input.identity.eventVersion)) {
      errors.push({
        code: "invalid_event_version",
        message: "Outcome Event identity uses an unsupported event version.",
        field: "identity.eventVersion",
      })
    }
  }

  if (isRecord(input.payload) && isRecord(input.payload.signalOutcome)) {
    const outcomeValidation = validateSignalOutcome(input.payload.signalOutcome)
    if (outcomeValidation.success === false) {
      errors.push(...outcomeValidation.errors.map(mapOutcomeError))
    } else {
      const outcome = outcomeValidation.value
      if (outcome.lifecycleState !== "FINALIZED") {
        errors.push({
          code: "invalid_outcome",
          message: "Outcome Recorder accepts only FINALIZED Signal Outcomes.",
          field: "payload.signalOutcome.lifecycleState",
        })
      }
      if (outcome.learningStatus !== "pending") {
        errors.push({
          code: "invalid_outcome",
          message: "Outcome Recorder accepts only pre-learning Signal Outcomes.",
          field: "payload.signalOutcome.learningStatus",
        })
      }
      if (isTimestamp(input.recordedAt)
        && Date.parse(input.recordedAt) < Date.parse(outcome.timing.evaluatedAt)) {
        errors.push({
          code: "invalid_timestamp",
          message: "recordedAt cannot precede the Signal Outcome evaluation boundary.",
          field: "recordedAt",
        })
      }

      if (isRecord(input.identity)) {
        if (input.identity.outcomeId !== outcome.identity.outcomeId) {
          errors.push({
            code: "missing_outcome_reference",
            message: "Outcome Event outcomeId does not match its Signal Outcome.",
            field: "identity.outcomeId",
          })
        }
        if (isOutcomeEventVersion(input.identity.eventVersion)) {
          const expectedEventId = createOutcomeEventId(
            outcome.identity.outcomeId,
            input.identity.eventVersion,
          )
          if (expectedEventId.success === false
            || input.identity.eventId !== expectedEventId.value) {
            errors.push({
              code: "missing_outcome_reference",
              message: "Outcome Event eventId does not match outcomeId and eventVersion.",
              field: "identity.eventId",
            })
          }
        }
        if (isNonEmptyString(input.identity.eventId)
          && isNonEmptyString(input.identity.outcomeId)
          && isOutcomeEventVersion(input.identity.eventVersion)
          && isDuplicateOutcomeEventIdentity(
            input.identity as unknown as OutcomeEvent["identity"],
            existingEventIds,
          )) {
          errors.push({
            code: "duplicate_event",
            message: `Outcome Event ${input.identity.eventId} is already recorded.`,
            field: "identity.eventId",
          })
        }
      }
    }
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as OutcomeEvent }
}
