import { canonicalSchedulerTimestamp } from "@/lib/scheduler-runtime"
import { createWorkerExecutionIdentity } from "@/lib/worker-runtime/identity"
import {
  WORKER_LIFECYCLE_STATES,
  WORKER_SCHEMA_VERSION,
  type WorkerExecutionContext,
  type WorkerLifecycle,
  type WorkerLifecycleState,
  type WorkerRuntimeResult,
} from "@/lib/worker-runtime/types"

const STATE_SET = new Set<string>(WORKER_LIFECYCLE_STATES)
const ALLOWED_TRANSITIONS = Object.freeze({
  CREATED: Object.freeze(["CLAIMED", "CANCELLED"] as const),
  CLAIMED: Object.freeze(["RUNNING", "CANCELLED"] as const),
  RUNNING: Object.freeze(["SUCCEEDED", "FAILED", "CANCELLED"] as const),
  SUCCEEDED: Object.freeze(["ARCHIVED"] as const),
  FAILED: Object.freeze(["ARCHIVED"] as const),
  CANCELLED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<WorkerLifecycleState, readonly WorkerLifecycleState[]>>

export function isWorkerLifecycleState(value: unknown): value is WorkerLifecycleState {
  return typeof value === "string" && STATE_SET.has(value)
}

export function canTransitionWorkerLifecycle(
  current: WorkerLifecycleState,
  next: WorkerLifecycleState,
): boolean {
  const allowed: readonly WorkerLifecycleState[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function freezeWorkerLifecycle(lifecycle: WorkerLifecycle): WorkerLifecycle {
  return Object.freeze({
    ...lifecycle,
    identity: Object.freeze({ ...lifecycle.identity }),
    history: Object.freeze(lifecycle.history.map((entry) => Object.freeze({ ...entry }))),
  })
}

export function createWorkerLifecycle(
  context: WorkerExecutionContext,
): WorkerRuntimeResult<WorkerLifecycle> {
  const identity = createWorkerExecutionIdentity(context)
  if (identity.success === false) return identity
  return {
    success: true,
    value: freezeWorkerLifecycle({
      schemaVersion: WORKER_SCHEMA_VERSION,
      identity: identity.value,
      state: "CREATED",
      history: [{ state: "CREATED", occurredAt: identity.value.claimedAt }],
    }),
  }
}

export function transitionWorkerLifecycle(
  lifecycle: WorkerLifecycle,
  nextState: WorkerLifecycleState,
  occurredAt: string,
): WorkerRuntimeResult<WorkerLifecycle> {
  if (!isWorkerLifecycleState(lifecycle?.state) || !isWorkerLifecycleState(nextState)
    || !canTransitionWorkerLifecycle(lifecycle.state, nextState)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle_transition",
        message: `Worker transition ${String(lifecycle?.state)} -> ${String(nextState)} is not allowed.`,
        field: "state",
      }],
    }
  }
  const canonicalOccurredAt = canonicalSchedulerTimestamp(occurredAt)
  const latest = lifecycle.history[lifecycle.history.length - 1]?.occurredAt
  if (!canonicalOccurredAt || !latest
    || Date.parse(canonicalOccurredAt) < Date.parse(latest)) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Worker lifecycle occurredAt must be valid and non-decreasing.",
        field: "occurredAt",
      }],
    }
  }
  return {
    success: true,
    value: freezeWorkerLifecycle({
      ...lifecycle,
      state: nextState,
      history: [...lifecycle.history, { state: nextState, occurredAt: canonicalOccurredAt }],
    }),
  }
}

