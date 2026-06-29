import { freezeLearningRecord } from "@/lib/learning-runtime/learning"
import {
  LEARNING_STATUSES,
  type LearningRecord,
  type LearningResult,
  type LearningStatus,
} from "@/lib/learning-runtime/types"
import { validateLearningRecord } from "@/lib/learning-runtime/validation"

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze(["CANDIDATE"] as const),
  CANDIDATE: Object.freeze(["VALIDATED", "REJECTED"] as const),
  VALIDATED: Object.freeze(["SUPERSEDED", "ARCHIVED"] as const),
  REJECTED: Object.freeze(["SUPERSEDED", "ARCHIVED"] as const),
  SUPERSEDED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<LearningStatus, readonly LearningStatus[]>>

const STATUS_SET = new Set<string>(LEARNING_STATUSES)

export function isLearningStatus(value: unknown): value is LearningStatus {
  return typeof value === "string" && STATUS_SET.has(value)
}

export function canTransitionLearning(
  current: LearningStatus,
  next: LearningStatus,
): boolean {
  const allowed: readonly LearningStatus[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function canReachLearningStatus(
  current: LearningStatus,
  target: LearningStatus,
): boolean {
  if (current === target) return true
  return ALLOWED_TRANSITIONS[current].some((next) => (
    canReachLearningStatus(next, target)
  ))
}

export function transitionLearning(
  record: LearningRecord,
  nextStatus: LearningStatus,
): LearningResult<LearningRecord> {
  const current = validateLearningRecord(record)
  if (current.success === false) return current
  if (!isLearningStatus(nextStatus)
    || !canTransitionLearning(current.value.status, nextStatus)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: `Learning transition ${current.value.status} -> ${String(nextStatus)} is not allowed.`,
        field: "status",
      }],
    }
  }
  const candidate: LearningRecord = { ...current.value, status: nextStatus }
  const validation = validateLearningRecord(candidate)
  if (validation.success === false) return validation
  return { success: true, value: freezeLearningRecord(validation.value) }
}
