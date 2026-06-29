import { freezeOutcomeEvent, validateOutcomeEvent } from "@/lib/outcome-recorder"
import { createHistoricalMemoryIdentity } from "@/lib/historical-memory/identity"
import {
  createMemoryReference,
  historicalMemoryReferenceKey,
} from "@/lib/historical-memory/validation"
import { validateHistoricalMemory } from "@/lib/historical-memory/validation"
import {
  HISTORICAL_MEMORY_SCHEMA_VERSION,
  type CreateHistoricalMemoryInput,
  type HistoricalMemoryRecord,
  type HistoricalMemoryReference,
  type HistoricalMemoryResult,
} from "@/lib/historical-memory/types"

function sortReferences(
  references: readonly HistoricalMemoryReference[],
): readonly HistoricalMemoryReference[] {
  return [...references].sort((left, right) => (
    historicalMemoryReferenceKey(left).localeCompare(historicalMemoryReferenceKey(right))
  ))
}

export function freezeHistoricalMemory(
  memory: HistoricalMemoryRecord,
): HistoricalMemoryRecord {
  return Object.freeze({
    ...memory,
    identity: Object.freeze({ ...memory.identity }),
    outcomeEvent: freezeOutcomeEvent(memory.outcomeEvent),
    references: Object.freeze(memory.references.map((reference) => (
      Object.freeze({ ...reference })
    ))),
  })
}

export function createHistoricalMemory(
  input: CreateHistoricalMemoryInput,
): HistoricalMemoryResult<HistoricalMemoryRecord> {
  if (!input || typeof input !== "object" || !input.outcomeEvent) {
    return {
      success: false,
      errors: [{
        code: "invalid_outcome_reference",
        message: "Historical Memory accepts only an Outcome Event.",
        field: "outcomeEvent",
      }],
    }
  }

  const eventValidation = validateOutcomeEvent(input.outcomeEvent)
  if (eventValidation.success === false) {
    return {
      success: false,
      errors: eventValidation.errors.map((error) => ({
        code: "invalid_outcome_reference" as const,
        message: error.message,
        field: error.field ? `outcomeEvent.${error.field}` : "outcomeEvent",
        cause: error.cause,
      })),
    }
  }
  const identity = createHistoricalMemoryIdentity(eventValidation.value.identity)
  if (identity.success === false) return identity
  const eventReference = createMemoryReference({
    referenceType: "OUTCOME_EVENT",
    referenceId: eventValidation.value.identity.eventId,
  })
  if (eventReference.success === false) return eventReference

  const references = new Map<string, HistoricalMemoryReference>()
  references.set(historicalMemoryReferenceKey(eventReference.value), eventReference.value)
  for (const reference of input.references ?? []) {
    const validated = createMemoryReference(reference)
    if (validated.success === false) return validated
    references.set(historicalMemoryReferenceKey(validated.value), validated.value)
  }

  const memory: HistoricalMemoryRecord = {
    schemaVersion: HISTORICAL_MEMORY_SCHEMA_VERSION,
    identity: identity.value,
    status: "CREATED",
    createdAt: input.createdAt,
    outcomeEvent: eventValidation.value,
    references: sortReferences([...references.values()]),
  }
  const validation = validateHistoricalMemory(memory, input.existingMemoryIds)
  if (validation.success === false) return validation
  return { success: true, value: freezeHistoricalMemory(validation.value) }
}
