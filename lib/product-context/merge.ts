import {
  contextAuditMetadata,
  detectContextConflict,
  inspectContextCandidate,
  type ContextLifecycleResult,
} from "@/lib/product-context/conflict"
import type { SharedProductContextV1 } from "@/lib/product-context/types"

const MUTABLE_FIELDS = [
  "symbol",
  "exchange",
  "timeframe",
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
  "sourcePage",
  "destinationIntent",
  "expiresAt",
] as const satisfies readonly (keyof SharedProductContextV1)[]

function hasOwn(context: SharedProductContextV1, field: keyof SharedProductContextV1) {
  return Object.prototype.hasOwnProperty.call(context, field)
}

export function mergeProductContexts(
  existing: SharedProductContextV1,
  incoming: SharedProductContextV1,
  now = Date.now(),
): ContextLifecycleResult<SharedProductContextV1> {
  try {
    const conflict = detectContextConflict(existing, incoming, now)
    if (conflict.status === "CONFLICT" || conflict.status === "ERROR") {
      return { status: conflict.status, issues: conflict.issues }
    }

    const incomingIsNewer = incoming.revision > existing.revision
    const merged: SharedProductContextV1 = { ...existing }

    for (const field of MUTABLE_FIELDS) {
      if (!hasOwn(incoming, field)) continue
      const incomingValue = incoming[field]
      if (incomingIsNewer || (merged[field] == null && incomingValue != null)) {
        ;(merged as unknown as Record<string, unknown>)[field] = incomingValue
      }
    }

    if (incomingIsNewer) {
      merged.revision = incoming.revision
      merged.updatedAt = incoming.updatedAt
    }

    const validation = inspectContextCandidate(merged, now)
    if (validation.status !== "SUCCESS" || !validation.value) {
      return { status: validation.status, issues: validation.issues, audit: validation.audit }
    }

    return {
      status: conflict.status,
      value: validation.value,
      issues: conflict.issues,
      audit: contextAuditMetadata(validation.value, "active"),
    }
  } catch {
    return {
      status: "ERROR",
      issues: [{ code: "unknown_error", message: "Product context merge failed unexpectedly." }],
    }
  }
}

