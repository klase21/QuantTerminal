import { freezePatternRecord } from "@/lib/pattern-runtime/pattern"
import {
  PATTERN_STATUSES,
  type PatternRecord,
  type PatternResult,
  type PatternStatus,
} from "@/lib/pattern-runtime/types"
import { validatePatternRecord } from "@/lib/pattern-runtime/validation"

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze(["CANDIDATE"] as const),
  CANDIDATE: Object.freeze(["VALIDATED", "REJECTED"] as const),
  VALIDATED: Object.freeze(["ARCHIVED"] as const),
  REJECTED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<PatternStatus, readonly PatternStatus[]>>

const STATUS_SET = new Set<string>(PATTERN_STATUSES)

export function isPatternStatus(value: unknown): value is PatternStatus {
  return typeof value === "string" && STATUS_SET.has(value)
}

export function canTransitionPattern(
  current: PatternStatus,
  next: PatternStatus,
): boolean {
  const allowed: readonly PatternStatus[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function canReachPatternStatus(
  current: PatternStatus,
  target: PatternStatus,
): boolean {
  if (current === target) return true
  return ALLOWED_TRANSITIONS[current].some((next) => (
    canReachPatternStatus(next, target)
  ))
}

export function transitionPattern(
  pattern: PatternRecord,
  nextStatus: PatternStatus,
): PatternResult<PatternRecord> {
  const current = validatePatternRecord(pattern)
  if (current.success === false) return current
  if (!isPatternStatus(nextStatus)
    || !canTransitionPattern(current.value.status, nextStatus)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: `Pattern transition ${current.value.status} -> ${String(nextStatus)} is not allowed.`,
        field: "status",
      }],
    }
  }
  const candidate: PatternRecord = { ...current.value, status: nextStatus }
  const validation = validatePatternRecord(candidate)
  if (validation.success === false) return validation
  return { success: true, value: freezePatternRecord(validation.value) }
}
