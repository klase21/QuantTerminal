import {
  EXECUTION_STATES,
  type ExecutionState,
  type SchedulerResult,
} from "@/lib/scheduler-runtime/types"

const STATE_SET = new Set<string>(EXECUTION_STATES)

const ALLOWED_TRANSITIONS = Object.freeze({
  CREATED: Object.freeze(["SCHEDULED"] as const),
  SCHEDULED: Object.freeze(["READY"] as const),
  READY: Object.freeze(["CLAIMED"] as const),
  CLAIMED: Object.freeze(["RUNNING"] as const),
  RUNNING: Object.freeze(["SUCCEEDED", "FAILED"] as const),
  SUCCEEDED: Object.freeze(["ARCHIVED"] as const),
  FAILED: Object.freeze(["RETRYING", "DEAD_LETTERED"] as const),
  RETRYING: Object.freeze(["DEAD_LETTERED", "ARCHIVED"] as const),
  DEAD_LETTERED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<ExecutionState, readonly ExecutionState[]>>

export function isExecutionState(value: unknown): value is ExecutionState {
  return typeof value === "string" && STATE_SET.has(value)
}

export function canTransitionExecutionState(
  current: ExecutionState,
  next: ExecutionState,
): boolean {
  const allowed: readonly ExecutionState[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function transitionExecutionState(
  current: unknown,
  next: unknown,
): SchedulerResult<ExecutionState> {
  if (!isExecutionState(current) || !isExecutionState(next)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle_transition",
        message: `Execution transition ${String(current)} -> ${String(next)} uses an unknown state.`,
        field: "executionState",
      }],
    }
  }
  if (!canTransitionExecutionState(current, next)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle_transition",
        message: `Execution transition ${current} -> ${next} is not allowed.`,
        field: "executionState",
      }],
    }
  }
  return { success: true, value: next }
}

export function validateExecutionHistoryTransitions(
  states: readonly ExecutionState[],
): SchedulerResult<readonly ExecutionState[]> {
  if (states.length === 0 || states[0] !== "CREATED") {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: "Execution history must begin with CREATED.",
        field: "executionHistory",
      }],
    }
  }
  for (let index = 1; index < states.length; index += 1) {
    if (!canTransitionExecutionState(states[index - 1], states[index])) {
      return {
        success: false,
        errors: [{
          code: "invalid_lifecycle_transition",
          message: `Execution history contains invalid transition ${states[index - 1]} -> ${states[index]}.`,
          field: `executionHistory.${index}`,
        }],
      }
    }
  }
  return { success: true, value: Object.freeze([...states]) }
}

