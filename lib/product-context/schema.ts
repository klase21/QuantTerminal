import {
  PRODUCT_CONTEXT_DESTINATION_INTENTS,
  PRODUCT_CONTEXT_FRESHNESS_STATES,
  PRODUCT_CONTEXT_PAGES,
  PRODUCT_CONTEXT_SCHEMA_VERSION,
  type ContextValue,
  type DestinationIntent,
  type JsonValue,
  type ProductContextFreshness,
  type ProductContextResult,
  type ProductPage,
  type SharedProductContextV1,
} from "@/lib/product-context/types"

const CONTEXT_VALUE_FIELDS = [
  "thesis",
  "opportunityContext",
  "signalContext",
  "marketStructureContext",
  "evidenceSummary",
  "supportingEvidence",
  "conflictingEvidence",
  "confidenceContext",
  "freshness",
  "replayTarget",
  "validationResult",
  "replayResult",
  "executionContext",
] as const

const PRODUCT_PAGE_SET = new Set<string>(PRODUCT_CONTEXT_PAGES)
const DESTINATION_INTENT_SET = new Set<string>(PRODUCT_CONTEXT_DESTINATION_INTENTS)
const FRESHNESS_SET = new Set<string>(PRODUCT_CONTEXT_FRESHNESS_STATES)

type UnknownRecord = Record<string, unknown>

export interface ProductContextValidationOptions {
  now?: number
  allowExpired?: boolean
}

function failure(
  code: "malformed_input" | "missing_field" | "invalid_field" | "malformed_timestamp" | "unsupported_schema_version" | "expired_context",
  message: string,
  field?: string,
): ProductContextResult<never> {
  return { success: false, error: { code, message, field } }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasOwn(record: UnknownRecord, field: string) {
  return Object.prototype.hasOwnProperty.call(record, field)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value))
}

function isJsonValue(value: unknown, seen = new Set<object>()): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value !== "object") return false
  if (seen.has(value)) return false

  seen.add(value)
  const valid = Array.isArray(value)
    ? value.every((entry) => isJsonValue(entry, seen))
    : Object.values(value as UnknownRecord).every((entry) => isJsonValue(entry, seen))
  seen.delete(value)
  return valid
}

function validateContextValue(value: unknown, field: string): ProductContextResult<ContextValue> {
  if (!isRecord(value)) {
    return failure("invalid_field", `${field} must be a context value object or null.`, field)
  }
  if (!hasOwn(value, "value") || !isJsonValue(value.value)) {
    return failure("invalid_field", `${field}.value must be JSON-safe.`, `${field}.value`)
  }
  if (!isNonEmptyString(value.owner) || !PRODUCT_PAGE_SET.has(value.owner)) {
    return failure("invalid_field", `${field}.owner is not a supported product page.`, `${field}.owner`)
  }
  if (!isNonEmptyString(value.source)) {
    return failure("missing_field", `${field}.source is required.`, `${field}.source`)
  }
  if (!isNonEmptyString(value.freshness) || !FRESHNESS_SET.has(value.freshness)) {
    return failure("invalid_field", `${field}.freshness is invalid.`, `${field}.freshness`)
  }
  if (!isPositiveInteger(value.revision)) {
    return failure("invalid_field", `${field}.revision must be a positive integer.`, `${field}.revision`)
  }

  for (const timestampField of ["observedAt", "generatedAt"] as const) {
    const timestamp = value[timestampField]
    if (timestamp !== undefined && timestamp !== null && !isValidTimestamp(timestamp)) {
      return failure(
        "malformed_timestamp",
        `${field}.${timestampField} must be a valid timestamp or null.`,
        `${field}.${timestampField}`,
      )
    }
  }

  return { success: true, value: value as unknown as ContextValue }
}

export function isProductPage(value: unknown): value is ProductPage {
  return typeof value === "string" && PRODUCT_PAGE_SET.has(value)
}

export function isDestinationIntent(value: unknown): value is DestinationIntent {
  return typeof value === "string" && DESTINATION_INTENT_SET.has(value)
}

export function isProductContextFreshness(value: unknown): value is ProductContextFreshness {
  return typeof value === "string" && FRESHNESS_SET.has(value)
}

export function validateProductContext(
  input: unknown,
  options: ProductContextValidationOptions = {},
): ProductContextResult<SharedProductContextV1> {
  if (!isRecord(input)) {
    return failure("malformed_input", "Product context must be an object.")
  }
  if (!hasOwn(input, "schemaVersion")) {
    return failure("missing_field", "schemaVersion is required.", "schemaVersion")
  }
  if (input.schemaVersion !== PRODUCT_CONTEXT_SCHEMA_VERSION) {
    return failure(
      "unsupported_schema_version",
      `Only product context schema version ${PRODUCT_CONTEXT_SCHEMA_VERSION} is supported.`,
      "schemaVersion",
    )
  }
  if (!isNonEmptyString(input.contextId)) {
    return failure("missing_field", "contextId is required.", "contextId")
  }
  if (!isPositiveInteger(input.revision)) {
    return failure("invalid_field", "revision must be a positive integer.", "revision")
  }
  if (!isNonEmptyString(input.symbol)) {
    return failure("missing_field", "symbol is required.", "symbol")
  }
  if (!isProductPage(input.sourcePage)) {
    return failure("invalid_field", "sourcePage is not a supported product page.", "sourcePage")
  }
  if (!isDestinationIntent(input.destinationIntent)) {
    return failure("invalid_field", "destinationIntent is not supported.", "destinationIntent")
  }

  for (const field of ["createdAt", "updatedAt", "expiresAt"] as const) {
    if (!hasOwn(input, field)) {
      return failure("missing_field", `${field} is required.`, field)
    }
    if (!isValidTimestamp(input[field])) {
      return failure("malformed_timestamp", `${field} must be a valid timestamp.`, field)
    }
  }

  if (Date.parse(input.updatedAt as string) < Date.parse(input.createdAt as string)) {
    return failure("invalid_field", "updatedAt cannot be earlier than createdAt.", "updatedAt")
  }
  if (Date.parse(input.expiresAt as string) <= Date.parse(input.createdAt as string)) {
    return failure("invalid_field", "expiresAt must be later than createdAt.", "expiresAt")
  }
  if (!options.allowExpired && Date.parse(input.expiresAt as string) <= (options.now ?? Date.now())) {
    return failure("expired_context", "Product context has expired.", "expiresAt")
  }

  for (const field of ["exchange", "timeframe"] as const) {
    const value = input[field]
    if (value !== undefined && value !== null && !isNonEmptyString(value)) {
      return failure("invalid_field", `${field} must be a non-empty string or null.`, field)
    }
  }

  for (const field of CONTEXT_VALUE_FIELDS) {
    const value = input[field]
    if (value === undefined || value === null) continue
    const result = validateContextValue(value, field)
    if (result.success === false) return { success: false, error: result.error }
    if ((field === "supportingEvidence" || field === "conflictingEvidence") && !Array.isArray(result.value.value)) {
      return failure("invalid_field", `${field}.value must be an array.`, `${field}.value`)
    }
  }

  return { success: true, value: input as unknown as SharedProductContextV1 }
}
