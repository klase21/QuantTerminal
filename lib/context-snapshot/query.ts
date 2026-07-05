import { isContextEvidenceCategory } from "@/lib/context-snapshot/evidence"
import type { ContextSnapshotQuery, ContextSnapshotResult } from "@/lib/context-snapshot/types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function timestamp(value: unknown): value is string {
  return text(value) && Number.isFinite(Date.parse(value))
}

export function validateContextSnapshotQuery(input: unknown): ContextSnapshotResult<ContextSnapshotQuery> {
  if (!isRecord(input)) return { success: false, errors: [{ code: "invalid_query", message: "Context Snapshot query must be an object." }] }
  const errors = [] as Array<{ code: "invalid_query"; message: string; field?: string }>
  for (const field of ["signalId", "sourceId"] as const) if (input[field] !== undefined && !text(input[field])) errors.push({ code: "invalid_query", message: `${field} must be non-empty when provided.`, field })
  if (input.category !== undefined && !isContextEvidenceCategory(input.category)) errors.push({ code: "invalid_query", message: "category is not canonical.", field: "category" })
  if (input.observedAtRange !== undefined) {
    if (!isRecord(input.observedAtRange) || !timestamp(input.observedAtRange.from) || !timestamp(input.observedAtRange.to)) errors.push({ code: "invalid_query", message: "observedAtRange requires valid from and to timestamps.", field: "observedAtRange" })
    else if (Date.parse(input.observedAtRange.from) > Date.parse(input.observedAtRange.to)) errors.push({ code: "invalid_query", message: "observedAtRange.from cannot follow to.", field: "observedAtRange" })
  }
  if (errors.length > 0) return { success: false, errors }
  const query = input as unknown as ContextSnapshotQuery
  return { success: true, value: Object.freeze({
    ...(query.signalId !== undefined ? { signalId: query.signalId.trim() } : {}),
    ...(query.sourceId !== undefined ? { sourceId: query.sourceId.trim() } : {}),
    ...(query.category !== undefined ? { category: query.category } : {}),
    ...(query.observedAtRange !== undefined ? { observedAtRange: Object.freeze({ ...query.observedAtRange }) } : {}),
  }) }
}

export function createContextSnapshotQuery(input: ContextSnapshotQuery): ContextSnapshotResult<ContextSnapshotQuery> {
  return validateContextSnapshotQuery(input)
}
