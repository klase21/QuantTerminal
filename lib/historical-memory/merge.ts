import { freezeHistoricalMemory } from "@/lib/historical-memory/memory"
import { historicalMemoryReferenceKey, validateHistoricalMemory } from "@/lib/historical-memory/validation"
import {
  HISTORICAL_MEMORY_STATUSES,
  type HistoricalMemoryRecord,
  type HistoricalMemoryReference,
  type HistoricalMemoryResult,
} from "@/lib/historical-memory/types"

const STATUS_ORDER = new Map(
  HISTORICAL_MEMORY_STATUSES.map((status, index) => [status, index]),
)

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    )
  }
  return value
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
}

export function mergeHistoricalMemory(
  existing: HistoricalMemoryRecord,
  incoming: HistoricalMemoryRecord,
): HistoricalMemoryResult<HistoricalMemoryRecord> {
  const left = validateHistoricalMemory(existing)
  if (left.success === false) return left
  const right = validateHistoricalMemory(incoming)
  if (right.success === false) return right

  if (left.value.identity.memoryId !== right.value.identity.memoryId) {
    return {
      success: false,
      errors: [{
        code: "identity_mismatch",
        message: "Historical Memory records with different identities cannot be merged.",
        field: "identity.memoryId",
      }],
    }
  }
  if (!sameValue(left.value.identity, right.value.identity)
    || left.value.createdAt !== right.value.createdAt
    || !sameValue(left.value.outcomeEvent, right.value.outcomeEvent)) {
    return {
      success: false,
      errors: [{
        code: "immutable_fact_conflict",
        message: "Historical Memory merge cannot overwrite canonical Outcome facts.",
        field: "outcomeEvent",
      }],
    }
  }

  const references = new Map<string, HistoricalMemoryReference>()
  for (const reference of [...left.value.references, ...right.value.references]) {
    references.set(historicalMemoryReferenceKey(reference), reference)
  }
  const mergedStatus = STATUS_ORDER.get(left.value.status)!
    >= STATUS_ORDER.get(right.value.status)!
    ? left.value.status
    : right.value.status
  const merged: HistoricalMemoryRecord = {
    ...left.value,
    status: mergedStatus,
    references: [...references.values()].sort((a, b) => (
      historicalMemoryReferenceKey(a).localeCompare(historicalMemoryReferenceKey(b))
    )),
  }
  const validation = validateHistoricalMemory(merged)
  if (validation.success === false) return validation
  return { success: true, value: freezeHistoricalMemory(validation.value) }
}
