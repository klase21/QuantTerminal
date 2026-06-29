import { freezeHistoricalMemory } from "@/lib/historical-memory/memory"
import {
  HISTORICAL_MEMORY_STATUSES,
  type HistoricalMemoryRecord,
  type HistoricalMemoryResult,
  type HistoricalMemoryStatus,
} from "@/lib/historical-memory/types"
import { validateHistoricalMemory } from "@/lib/historical-memory/validation"

const ALLOWED_TRANSITIONS = Object.freeze({
  CREATED: Object.freeze(["VERIFIED"] as const),
  VERIFIED: Object.freeze(["INDEXED"] as const),
  INDEXED: Object.freeze(["ARCHIVED"] as const),
  ARCHIVED: Object.freeze([] as const),
}) satisfies Readonly<Record<HistoricalMemoryStatus, readonly HistoricalMemoryStatus[]>>

const STATUS_SET = new Set<string>(HISTORICAL_MEMORY_STATUSES)

export function isHistoricalMemoryStatus(
  value: unknown,
): value is HistoricalMemoryStatus {
  return typeof value === "string" && STATUS_SET.has(value)
}

export function canTransitionHistoricalMemory(
  current: HistoricalMemoryStatus,
  next: HistoricalMemoryStatus,
): boolean {
  const allowed: readonly HistoricalMemoryStatus[] = ALLOWED_TRANSITIONS[current]
  return allowed.includes(next)
}

export function transitionHistoricalMemory(
  memory: HistoricalMemoryRecord,
  nextStatus: HistoricalMemoryStatus,
): HistoricalMemoryResult<HistoricalMemoryRecord> {
  const current = validateHistoricalMemory(memory)
  if (current.success === false) return current
  if (!isHistoricalMemoryStatus(nextStatus)
    || !canTransitionHistoricalMemory(current.value.status, nextStatus)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: `Historical Memory transition ${current.value.status} -> ${String(nextStatus)} is not allowed.`,
        field: "status",
      }],
    }
  }

  const candidate: HistoricalMemoryRecord = {
    ...current.value,
    status: nextStatus,
  }
  const validation = validateHistoricalMemory(candidate)
  if (validation.success === false) return validation
  return { success: true, value: freezeHistoricalMemory(validation.value) }
}
