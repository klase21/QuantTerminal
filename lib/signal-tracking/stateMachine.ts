import {
  TRACKING_STATUS_VALUES,
  type TrackingResult,
  type TrackingStatus,
  type WindowStatus,
} from "@/lib/signal-tracking/types"

const STATUS_SET = new Set<string>(TRACKING_STATUS_VALUES)

const ALLOWED_TRANSITIONS = Object.freeze({
  QUEUED: Object.freeze(["WAITING"] as const),
  WAITING: Object.freeze(["READY"] as const),
  READY: Object.freeze(["EVALUATING"] as const),
  EVALUATING: Object.freeze(["COMPLETED", "FAILED"] as const),
  COMPLETED: Object.freeze(["ARCHIVED"] as const),
  FAILED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<TrackingStatus, readonly TrackingStatus[]>>

export function isTrackingStatus(value: unknown): value is TrackingStatus {
  return typeof value === "string" && STATUS_SET.has(value)
}

export function canTransitionTrackingStatus(
  current: TrackingStatus,
  next: TrackingStatus,
): boolean {
  const allowed: readonly TrackingStatus[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function transitionTrackingStatus(
  current: unknown,
  next: unknown,
): TrackingResult<TrackingStatus> {
  if (!isTrackingStatus(current) || !isTrackingStatus(next)) {
    return {
      success: false,
      errors: [{
        code: "invalid_state_transition",
        message: `Tracking transition ${String(current)} -> ${String(next)} uses an unknown state.`,
        field: "status",
      }],
    }
  }

  if (!canTransitionTrackingStatus(current, next)) {
    return {
      success: false,
      errors: [{
        code: "invalid_state_transition",
        message: `Tracking transition ${current} -> ${next} is not allowed.`,
        field: "status",
      }],
    }
  }

  return { success: true, value: next }
}

export function transitionWindowStatus(
  current: unknown,
  next: unknown,
): TrackingResult<WindowStatus> {
  return transitionTrackingStatus(current, next)
}
