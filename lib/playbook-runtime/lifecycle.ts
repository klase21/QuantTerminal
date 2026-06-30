import { freezePlaybookRecord } from "@/lib/playbook-runtime/playbook"
import {
  PLAYBOOK_STATUSES,
  type PlaybookDecisionInput,
  type PlaybookRecord,
  type PlaybookResult,
  type PlaybookStatus,
} from "@/lib/playbook-runtime/types"
import { validatePlaybookRecord } from "@/lib/playbook-runtime/validation"

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze(["CANDIDATE"] as const),
  CANDIDATE: Object.freeze(["APPROVED", "REJECTED"] as const),
  APPROVED: Object.freeze(["SUPERSEDED", "ARCHIVED"] as const),
  REJECTED: Object.freeze(["SUPERSEDED", "ARCHIVED"] as const),
  SUPERSEDED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<PlaybookStatus, readonly PlaybookStatus[]>>

const STATUS_SET = new Set<string>(PLAYBOOK_STATUSES)

export function isPlaybookStatus(value: unknown): value is PlaybookStatus {
  return typeof value === "string" && STATUS_SET.has(value)
}

export function canTransitionPlaybook(
  current: PlaybookStatus,
  next: PlaybookStatus,
): boolean {
  const allowed: readonly PlaybookStatus[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function canReachPlaybookStatus(
  current: PlaybookStatus,
  target: PlaybookStatus,
): boolean {
  if (current === target) return true
  return ALLOWED_TRANSITIONS[current].some((next) => canReachPlaybookStatus(next, target))
}

export function transitionPlaybook(
  record: PlaybookRecord,
  nextStatus: PlaybookStatus,
  decision?: PlaybookDecisionInput,
): PlaybookResult<PlaybookRecord> {
  const current = validatePlaybookRecord(record)
  if (current.success === false) return current
  if (!isPlaybookStatus(nextStatus)
    || !canTransitionPlaybook(current.value.lifecycle.status, nextStatus)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: `Playbook transition ${current.value.lifecycle.status} -> ${String(nextStatus)} is not allowed.`,
        field: "lifecycle.status",
      }],
    }
  }
  const requiresDecision = nextStatus === "APPROVED" || nextStatus === "REJECTED"
  if (requiresDecision && (!decision
    || typeof decision.decidedBy !== "string"
    || decision.decidedBy.trim().length === 0
    || !Number.isFinite(Date.parse(decision.decidedAt))
    || Date.parse(decision.decidedAt) < Date.parse(current.value.createdAt))) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: "Approval or rejection requires a reviewer and valid decision timestamp.",
        field: "lifecycle",
      }],
    }
  }

  const candidate: PlaybookRecord = {
    ...current.value,
    lifecycle: requiresDecision
      ? {
        status: nextStatus,
        decision: nextStatus,
        decidedBy: decision!.decidedBy.trim(),
        decidedAt: decision!.decidedAt,
      }
      : { ...current.value.lifecycle, status: nextStatus },
  }
  const validation = validatePlaybookRecord(candidate)
  if (validation.success === false) return validation
  return { success: true, value: freezePlaybookRecord(validation.value) }
}
