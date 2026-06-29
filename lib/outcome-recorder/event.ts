import { freezeSignalOutcome } from "@/lib/signal-outcome"
import type { OutcomeEvent } from "@/lib/outcome-recorder/types"

export function freezeOutcomeEvent(event: OutcomeEvent): OutcomeEvent {
  return Object.freeze({
    ...event,
    identity: Object.freeze({ ...event.identity }),
    payload: Object.freeze({
      signalOutcome: freezeSignalOutcome(event.payload.signalOutcome),
    }),
  })
}
