import { freezeContextSnapshot } from "@/lib/context-snapshot/contextSnapshot"
import type { ContextSnapshot, ContextSnapshotResult, ContextSnapshotState } from "@/lib/context-snapshot/types"
import { isContextSnapshotState, validateContextSnapshot } from "@/lib/context-snapshot/validation"

const ALLOWED: Readonly<Record<ContextSnapshotState, readonly ContextSnapshotState[]>> = Object.freeze({
  CREATED: Object.freeze(["FINALIZED"] as const),
  FINALIZED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
})

export function canTransitionContextSnapshot(current: ContextSnapshotState, next: ContextSnapshotState): boolean {
  return ALLOWED[current].includes(next)
}

export function transitionContextSnapshot(
  snapshot: ContextSnapshot,
  nextState: ContextSnapshotState,
): ContextSnapshotResult<ContextSnapshot> {
  const current = validateContextSnapshot(snapshot)
  if (current.success === false) return current
  if (!isContextSnapshotState(nextState) || !canTransitionContextSnapshot(current.value.lifecycleState, nextState)) {
    return { success: false, errors: [{ code: "invalid_lifecycle", message: `Context Snapshot transition ${current.value.lifecycleState} -> ${String(nextState)} is not allowed.`, field: "lifecycleState" }] }
  }
  return { success: true, value: freezeContextSnapshot({ ...current.value, lifecycleState: nextState }) }
}
