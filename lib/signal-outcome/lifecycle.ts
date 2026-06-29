import { freezeSignalOutcome } from "@/lib/signal-outcome/outcome"
import {
  SIGNAL_OUTCOME_LIFECYCLE_STATES,
  type SignalOutcome,
  type SignalOutcomeLifecycleState,
  type SignalOutcomeResult,
} from "@/lib/signal-outcome/types"
import {
  isSignalOutcomeLifecycleState,
  validateSignalOutcome,
} from "@/lib/signal-outcome/validation"

const ALLOWED_TRANSITIONS = Object.freeze({
  CREATED: Object.freeze(["VALIDATED"] as const),
  VALIDATED: Object.freeze(["FINALIZED"] as const),
  FINALIZED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<SignalOutcomeLifecycleState, readonly SignalOutcomeLifecycleState[]>>

const LIFECYCLE_SET = new Set<string>(SIGNAL_OUTCOME_LIFECYCLE_STATES)

export function canTransitionSignalOutcome(
  current: SignalOutcomeLifecycleState,
  next: SignalOutcomeLifecycleState,
): boolean {
  const allowed: readonly SignalOutcomeLifecycleState[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function transitionSignalOutcomeLifecycle(
  outcome: SignalOutcome,
  nextState: SignalOutcomeLifecycleState,
): SignalOutcomeResult<SignalOutcome> {
  const current = validateSignalOutcome(outcome)
  if (current.success === false) return current
  if (!isSignalOutcomeLifecycleState(nextState) || !LIFECYCLE_SET.has(nextState)) {
    return {
      success: false,
      errors: [{
        code: "inconsistent_lifecycle",
        message: `Unknown Signal Outcome lifecycle state ${String(nextState)}.`,
        field: "lifecycleState",
      }],
    }
  }
  if (!canTransitionSignalOutcome(current.value.lifecycleState, nextState)) {
    return {
      success: false,
      errors: [{
        code: "inconsistent_lifecycle",
        message: `Signal Outcome transition ${current.value.lifecycleState} -> ${nextState} is not allowed.`,
        field: "lifecycleState",
      }],
    }
  }

  const candidate: SignalOutcome = {
    ...current.value,
    lifecycleState: nextState,
  }
  const validation = validateSignalOutcome(candidate)
  if (validation.success === false) return validation
  return { success: true, value: freezeSignalOutcome(validation.value) }
}

