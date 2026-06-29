import { validateOutcomeEvent } from "@/lib/outcome-recorder"
import { createHistoricalMemoryId } from "@/lib/historical-memory/identity"
import {
  HISTORICAL_MEMORY_REFERENCE_TYPES,
  HISTORICAL_MEMORY_SCHEMA_VERSION,
  HISTORICAL_MEMORY_STATUSES,
  type HistoricalMemoryError,
  type HistoricalMemoryRecord,
  type HistoricalMemoryReference,
  type HistoricalMemoryReferenceType,
  type HistoricalMemoryResult,
  type HistoricalMemoryValidationResult,
} from "@/lib/historical-memory/types"

type UnknownRecord = Record<string, unknown>

const STATUS_SET = new Set<string>(HISTORICAL_MEMORY_STATUSES)
const REFERENCE_TYPE_SET = new Set<string>(HISTORICAL_MEMORY_REFERENCE_TYPES)

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

export function isHistoricalMemoryReferenceType(
  value: unknown,
): value is HistoricalMemoryReferenceType {
  return typeof value === "string" && REFERENCE_TYPE_SET.has(value)
}

export function historicalMemoryReferenceKey(
  reference: HistoricalMemoryReference,
): string {
  return `${reference.referenceType}|${encodeURIComponent(reference.referenceId)}`
}

export function createMemoryReference(
  input: HistoricalMemoryReference,
): HistoricalMemoryResult<HistoricalMemoryReference> {
  if (!input || typeof input !== "object"
    || !isHistoricalMemoryReferenceType(input.referenceType)
    || !isNonEmptyString(input.referenceId)) {
    return {
      success: false,
      errors: [{
        code: "malformed_reference",
        message: "Memory reference requires a canonical type and non-empty referenceId.",
        field: "reference",
      }],
    }
  }
  return {
    success: true,
    value: Object.freeze({
      referenceType: input.referenceType,
      referenceId: input.referenceId.trim(),
    }),
  }
}

export function validateHistoricalMemory(
  input: unknown,
  existingMemoryIds: ReadonlySet<string> = new Set<string>(),
): HistoricalMemoryValidationResult {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Historical Memory must be an object." }],
    }
  }

  const errors: HistoricalMemoryError[] = []
  if (input.schemaVersion !== HISTORICAL_MEMORY_SCHEMA_VERSION) {
    errors.push({
      code: "unsupported_schema_version",
      message: `Only Historical Memory schema version ${HISTORICAL_MEMORY_SCHEMA_VERSION} is supported.`,
      field: "schemaVersion",
    })
  }
  if (typeof input.status !== "string" || !STATUS_SET.has(input.status)) {
    errors.push({
      code: "invalid_lifecycle",
      message: "Historical Memory status is invalid.",
      field: "status",
    })
  }
  if (!isTimestamp(input.createdAt)) {
    errors.push({
      code: "invalid_timestamp",
      message: "Historical Memory createdAt must be a valid timestamp.",
      field: "createdAt",
    })
  }
  if (!isRecord(input.identity)) {
    errors.push({
      code: "identity_mismatch",
      message: "Historical Memory identity is required.",
      field: "identity",
    })
  }

  const eventValidation = validateOutcomeEvent(input.outcomeEvent)
  if (eventValidation.success === false) {
    errors.push(...eventValidation.errors.map((error) => ({
      code: "invalid_outcome_reference" as const,
      message: error.message,
      field: error.field ? `outcomeEvent.${error.field}` : "outcomeEvent",
      cause: error.cause,
    })))
  }

  if (isRecord(input.identity) && eventValidation.success) {
    for (const field of ["memoryId", "eventId", "outcomeId"] as const) {
      if (!isNonEmptyString(input.identity[field])) {
        errors.push({
          code: "identity_mismatch",
          message: `Historical Memory identity requires ${field}.`,
          field: `identity.${field}`,
        })
      }
    }
    const event = eventValidation.value
    const expectedMemoryId = createHistoricalMemoryId(event.identity.eventId)
    if (expectedMemoryId.success === false
      || input.identity.memoryId !== expectedMemoryId.value
      || input.identity.eventId !== event.identity.eventId
      || input.identity.outcomeId !== event.identity.outcomeId) {
      errors.push({
        code: "identity_mismatch",
        message: "Historical Memory identity does not match its Outcome Event.",
        field: "identity",
      })
    }
    if (isNonEmptyString(input.identity.memoryId)
      && existingMemoryIds.has(input.identity.memoryId)) {
      errors.push({
        code: "duplicate_memory_identity",
        message: `Historical Memory ${input.identity.memoryId} already exists.`,
        field: "identity.memoryId",
      })
    }
    if (isTimestamp(input.createdAt)
      && Date.parse(input.createdAt) < Date.parse(event.recordedAt)) {
      errors.push({
        code: "invalid_timestamp",
        message: "Historical Memory createdAt cannot precede Outcome Event recordedAt.",
        field: "createdAt",
      })
    }
  }

  if (!Array.isArray(input.references)) {
    errors.push({
      code: "malformed_reference",
      message: "Historical Memory references must be an array.",
      field: "references",
    })
  } else {
    const seen = new Set<string>()
    let eventReferenceFound = false
    for (let index = 0; index < input.references.length; index += 1) {
      const reference = createMemoryReference(
        input.references[index] as HistoricalMemoryReference,
      )
      if (reference.success === false) {
        errors.push(...reference.errors.map((error) => ({
          ...error,
          field: `references[${index}]`,
        })))
        continue
      }
      const key = historicalMemoryReferenceKey(reference.value)
      if (seen.has(key)) {
        errors.push({
          code: "malformed_reference",
          message: `Duplicate Historical Memory reference ${key}.`,
          field: `references[${index}]`,
        })
      }
      seen.add(key)
      if (eventValidation.success
        && reference.value.referenceType === "OUTCOME_EVENT"
        && reference.value.referenceId === eventValidation.value.identity.eventId) {
        eventReferenceFound = true
      }
    }
    if (!eventReferenceFound) {
      errors.push({
        code: "invalid_outcome_reference",
        message: "Historical Memory must reference its canonical Outcome Event.",
        field: "references",
      })
    }
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as HistoricalMemoryRecord }
}
