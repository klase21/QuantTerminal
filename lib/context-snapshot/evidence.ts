import {
  CONTEXT_EVIDENCE_AVAILABILITY,
  CONTEXT_EVIDENCE_CATEGORIES,
  CONTEXT_EVIDENCE_FRESHNESS,
  type ContextEvidenceAvailability,
  type ContextEvidenceCategory,
  type ContextEvidenceFreshness,
  type ContextEvidenceItem,
  type ContextJsonValue,
  type ContextSnapshotResult,
} from "@/lib/context-snapshot/types"

const CATEGORY_SET = new Set<string>(CONTEXT_EVIDENCE_CATEGORIES)
const FRESHNESS_SET = new Set<string>(CONTEXT_EVIDENCE_FRESHNESS)
const AVAILABILITY_SET = new Set<string>(CONTEXT_EVIDENCE_AVAILABILITY)

export function isContextEvidenceCategory(value: unknown): value is ContextEvidenceCategory {
  return typeof value === "string" && CATEGORY_SET.has(value)
}

export function isContextEvidenceFreshness(value: unknown): value is ContextEvidenceFreshness {
  return typeof value === "string" && FRESHNESS_SET.has(value)
}

export function isContextEvidenceAvailability(value: unknown): value is ContextEvidenceAvailability {
  return typeof value === "string" && AVAILABILITY_SET.has(value)
}

export function isContextJsonValue(value: unknown): value is ContextJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isContextJsonValue)
  if (typeof value !== "object") return false
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return false
  return Object.values(value as Record<string, unknown>).every(isContextJsonValue)
}

export function freezeContextJsonValue(value: ContextJsonValue): ContextJsonValue {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeContextJsonValue))
  if (value !== null && typeof value === "object") {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, freezeContextJsonValue(entry)]),
    ))
  }
  return value
}

export function contextEvidenceKey(evidence: ContextEvidenceItem): string {
  return `${evidence.category}|${encodeURIComponent(evidence.sourceId ?? "UNAVAILABLE")}`
}

export function createContextEvidence(
  input: ContextEvidenceItem,
): ContextSnapshotResult<ContextEvidenceItem> {
  if (!input || typeof input !== "object") {
    return { success: false, errors: [{ code: "malformed_evidence", message: "Context evidence must be an object." }] }
  }
  const errors = [] as Array<{ code: "invalid_category" | "invalid_timestamp" | "malformed_evidence" | "malformed_payload"; message: string; field?: string }>
  if (!isContextEvidenceCategory(input.category)) errors.push({ code: "invalid_category", message: "Evidence category is not canonical.", field: "category" })
  if (!isContextEvidenceFreshness(input.freshness)) errors.push({ code: "malformed_evidence", message: "Evidence freshness is not canonical.", field: "freshness" })
  if (!isContextEvidenceAvailability(input.availability)) errors.push({ code: "malformed_evidence", message: "Evidence availability is invalid.", field: "availability" })
  if (input.sourceId !== null && (typeof input.sourceId !== "string" || !input.sourceId.trim())) errors.push({ code: "malformed_evidence", message: "sourceId must be non-empty or null.", field: "sourceId" })
  if (input.observedAt !== null && (typeof input.observedAt !== "string" || !Number.isFinite(Date.parse(input.observedAt)))) errors.push({ code: "invalid_timestamp", message: "observedAt must be a valid timestamp or null.", field: "observedAt" })
  if (input.payload !== null && !isContextJsonValue(input.payload)) errors.push({ code: "malformed_payload", message: "Evidence payload must be JSON-safe.", field: "payload" })

  if (input.availability === "AVAILABLE") {
    if (typeof input.sourceId !== "string" || !input.sourceId.trim()) errors.push({ code: "malformed_evidence", message: "Available evidence requires sourceId.", field: "sourceId" })
    if (typeof input.observedAt !== "string" || !Number.isFinite(Date.parse(input.observedAt))) errors.push({ code: "invalid_timestamp", message: "Available evidence requires observedAt.", field: "observedAt" })
    if (input.freshness === "UNAVAILABLE") errors.push({ code: "malformed_evidence", message: "Available evidence cannot have UNAVAILABLE freshness.", field: "freshness" })
    if (input.payload === null) errors.push({ code: "malformed_payload", message: "Available evidence requires payload.", field: "payload" })
    if (input.unavailableReason !== null) errors.push({ code: "malformed_evidence", message: "Available evidence cannot have unavailableReason.", field: "unavailableReason" })
  } else {
    if (input.payload !== null) errors.push({ code: "malformed_payload", message: "Unavailable evidence payload must be null.", field: "payload" })
    if (typeof input.unavailableReason !== "string" || !input.unavailableReason.trim()) errors.push({ code: "malformed_evidence", message: "Unavailable evidence requires a reason.", field: "unavailableReason" })
    if (input.observedAt === null && input.freshness !== "UNAVAILABLE") errors.push({ code: "malformed_evidence", message: "Evidence without observedAt must have UNAVAILABLE freshness.", field: "freshness" })
  }
  if (errors.length > 0) return { success: false, errors }
  return {
    success: true,
    value: Object.freeze({
      category: input.category,
      sourceId: input.sourceId?.trim() ?? null,
      observedAt: input.observedAt === null ? null : new Date(input.observedAt).toISOString(),
      freshness: input.freshness,
      availability: input.availability,
      payload: input.payload === null ? null : freezeContextJsonValue(input.payload),
      unavailableReason: input.unavailableReason?.trim() ?? null,
    }),
  }
}
