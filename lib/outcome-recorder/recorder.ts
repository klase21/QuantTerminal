import { createOutcomeEventIdentity } from "@/lib/outcome-recorder/identity"
import { freezeOutcomeEvent } from "@/lib/outcome-recorder/event"
import { validateOutcomeEvent } from "@/lib/outcome-recorder/validation"
import {
  OUTCOME_EVENT_SCHEMA_VERSION,
  type CreateOutcomeEventInput,
  type OutcomeEvent,
  type OutcomeRecorderResult,
  type RecordSignalOutcomeOptions,
} from "@/lib/outcome-recorder/types"
import type { SignalOutcome } from "@/lib/signal-outcome"

export function createOutcomeEvent(
  input: CreateOutcomeEventInput,
): OutcomeRecorderResult<OutcomeEvent> {
  if (!input || typeof input !== "object" || !input.outcome) {
    return {
      success: false,
      errors: [{
        code: "missing_outcome_reference",
        message: "Outcome Recorder requires a Signal Outcome.",
        field: "outcome",
      }],
    }
  }

  const eventVersion = input.eventVersion ?? "OUTCOME_EVENT_V1"
  const identity = createOutcomeEventIdentity(
    input.outcome.identity?.outcomeId,
    eventVersion,
  )
  if (identity.success === false) return identity

  const event: OutcomeEvent = {
    schemaVersion: OUTCOME_EVENT_SCHEMA_VERSION,
    identity: identity.value,
    status: "RECORDED",
    source: "SIGNAL_OUTCOME",
    recordedAt: input.recordedAt,
    payload: { signalOutcome: input.outcome },
  }
  const validation = validateOutcomeEvent(event, input.existingEventIds)
  if (validation.success === false) return validation

  return { success: true, value: freezeOutcomeEvent(validation.value) }
}

export function recordSignalOutcome(
  outcome: SignalOutcome,
  options: RecordSignalOutcomeOptions,
): OutcomeRecorderResult<OutcomeEvent> {
  return createOutcomeEvent({ outcome, ...options })
}
