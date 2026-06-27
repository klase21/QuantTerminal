import {
  contextAuditMetadata,
  inspectContextCandidate,
  lifecycleError,
  type ContextAuditMetadata,
  type ContextLifecycleIssue,
  type ContextLifecycleResult,
} from "@/lib/product-context/conflict"
import { mergeProductContexts } from "@/lib/product-context/merge"
import {
  clearProductContext,
  loadProductContext,
  saveProductContext,
} from "@/lib/product-context/sessionStorage"
import type { SharedProductContextV1 } from "@/lib/product-context/types"

const activeContexts = new Map<string, SharedProductContextV1>()
const expiredContexts = new Map<string, SharedProductContextV1>()
const auditRecords = new Map<string, ContextAuditMetadata>()

export type ProductContextUpdates = Partial<Omit<
  SharedProductContextV1,
  "schemaVersion" | "contextId" | "createdAt" | "revision" | "updatedAt"
>>

export interface UpdateContextInput {
  contextId: string
  expectedRevision: number
  updatedAt: string
  changes: ProductContextUpdates
}

export interface ExpireContextInput {
  contextId: string
  expectedRevision: number
  expiredAt: string
}

export interface ClearContextInput {
  contextId: string
  clearedAt?: string
}

export interface ClearedContextResult {
  contextId: string
  cleared: true
}

function storageIssue(code: "storage_unavailable" | "storage_failure", message: string): ContextLifecycleIssue {
  return { code, message }
}

function rememberActive(context: SharedProductContextV1) {
  activeContexts.set(context.contextId, context)
  expiredContexts.delete(context.contextId)
  const audit = contextAuditMetadata(context, "active")
  auditRecords.set(context.contextId, audit)
  return audit
}

function rememberExpired(context: SharedProductContextV1) {
  activeContexts.delete(context.contextId)
  expiredContexts.set(context.contextId, context)
  const audit = contextAuditMetadata(context, "expired")
  auditRecords.set(context.contextId, audit)
  return audit
}

function persistActive(
  context: SharedProductContextV1,
  issues: ContextLifecycleIssue[] = [],
): ContextLifecycleResult<SharedProductContextV1> {
  const saved = saveProductContext(context)
  if (saved.success === false) {
    if (saved.error.code !== "storage_unavailable" && saved.error.code !== "storage_failure") {
      return {
        status: "ERROR",
        issues: [{ code: "invalid_context", message: saved.error.message, field: saved.error.field }],
      }
    }
    const audit = rememberActive(context)
    return {
      status: "WARNING",
      value: context,
      issues: [...issues, storageIssue(saved.error.code, saved.error.message)],
      audit,
    }
  }

  const audit = rememberActive(context)
  return { status: issues.length ? "WARNING" : "SUCCESS", value: context, issues, audit }
}

function currentContext(contextId: string): ContextLifecycleResult<SharedProductContextV1> {
  const active = activeContexts.get(contextId)
  if (active) return { status: "SUCCESS", value: active, issues: [], audit: auditRecords.get(contextId) }

  const expired = expiredContexts.get(contextId)
  if (expired) {
    return {
      status: "CONFLICT",
      value: expired,
      issues: [{ code: "expired_context", message: "Product context has expired.", field: "expiresAt" }],
      audit: auditRecords.get(contextId),
    }
  }

  const loaded = loadProductContext(contextId)
  if (loaded.success === true) {
    const audit = rememberActive(loaded.value)
    return { status: "SUCCESS", value: loaded.value, issues: [], audit }
  }
  if (loaded.error.code === "expired_context") {
    return lifecycleError("CONFLICT", "expired_context", loaded.error.message, loaded.error.field)
  }
  if (loaded.error.code === "not_found") {
    return lifecycleError("ERROR", "context_not_found", loaded.error.message, loaded.error.field)
  }
  if (loaded.error.code === "storage_unavailable" || loaded.error.code === "storage_failure") {
    return lifecycleError("ERROR", loaded.error.code, loaded.error.message)
  }
  return lifecycleError("ERROR", "invalid_context", loaded.error.message, loaded.error.field)
}

export function createContext(
  context: SharedProductContextV1,
  now = Date.now(),
): ContextLifecycleResult<SharedProductContextV1> {
  try {
    if (activeContexts.has(context.contextId)) {
      return lifecycleError(
        "CONFLICT",
        "duplicate_revision",
        `Context ${context.contextId} already exists in memory.`,
        "contextId",
      )
    }
    if (expiredContexts.has(context.contextId) || auditRecords.get(context.contextId)?.state === "cleared") {
      return lifecycleError(
        "CONFLICT",
        "context_closed",
        `Context ${context.contextId} was expired or cleared and cannot be reactivated.`,
        "contextId",
      )
    }

    const inspection = inspectContextCandidate(context, now)
    if (inspection.status !== "SUCCESS" || !inspection.value) return inspection

    const stored = loadProductContext(context.contextId)
    if (stored.success === true) {
      return lifecycleError(
        "CONFLICT",
        "duplicate_revision",
        `Context ${context.contextId} already exists in sessionStorage.`,
        "contextId",
      )
    }
    if (stored.error.code !== "not_found" && stored.error.code !== "storage_unavailable") {
      if (stored.error.code === "expired_context") {
        return lifecycleError("CONFLICT", "expired_context", stored.error.message, stored.error.field)
      }
      return lifecycleError("ERROR", "invalid_context", stored.error.message, stored.error.field)
    }

    return persistActive(inspection.value)
  } catch {
    return lifecycleError("ERROR", "unknown_error", "Product context creation failed unexpectedly.")
  }
}

export function updateContext(
  input: UpdateContextInput,
  now = Date.now(),
): ContextLifecycleResult<SharedProductContextV1> {
  try {
    const current = currentContext(input.contextId)
    if (current.status !== "SUCCESS" || !current.value) return current
    if (Date.parse(current.value.expiresAt) <= now) {
      const audit = rememberExpired(current.value)
      return {
        status: "CONFLICT",
        value: current.value,
        issues: [{ code: "expired_context", message: "Expired context cannot be updated.", field: "expiresAt" }],
        audit,
      }
    }
    if (input.expectedRevision !== current.value.revision) {
      const code = input.expectedRevision < current.value.revision ? "stale_write" : "revision_mismatch"
      return lifecycleError(
        "CONFLICT",
        code,
        `Expected revision ${input.expectedRevision}, but current revision is ${current.value.revision}.`,
        "revision",
      )
    }
    if (!Number.isFinite(Date.parse(input.updatedAt)) || Date.parse(input.updatedAt) <= Date.parse(current.value.updatedAt)) {
      return lifecycleError(
        "ERROR",
        "invalid_timestamp",
        "updatedAt must be a valid timestamp later than the current updatedAt.",
        "updatedAt",
      )
    }

    const candidate: SharedProductContextV1 = {
      ...current.value,
      ...input.changes,
      schemaVersion: current.value.schemaVersion,
      contextId: current.value.contextId,
      createdAt: current.value.createdAt,
      revision: current.value.revision + 1,
      updatedAt: input.updatedAt,
    }
    const inspection = inspectContextCandidate(candidate, now)
    if (inspection.status !== "SUCCESS" || !inspection.value) return inspection
    return persistActive(inspection.value)
  } catch {
    return lifecycleError("ERROR", "unknown_error", "Product context update failed unexpectedly.")
  }
}

export function mergeContext(
  incoming: SharedProductContextV1,
  now = Date.now(),
): ContextLifecycleResult<SharedProductContextV1> {
  try {
    const current = currentContext(incoming.contextId)
    if (current.status === "ERROR" && current.issues[0]?.code === "context_not_found") {
      return createContext(incoming, now)
    }
    if (current.status !== "SUCCESS" || !current.value) return current

    const merged = mergeProductContexts(current.value, incoming, now)
    if ((merged.status !== "SUCCESS" && merged.status !== "WARNING") || !merged.value) return merged
    return persistActive(merged.value, merged.issues)
  } catch {
    return lifecycleError("ERROR", "unknown_error", "Product context lifecycle merge failed unexpectedly.")
  }
}

export function expireContext(
  input: ExpireContextInput,
  now = Date.now(),
): ContextLifecycleResult<SharedProductContextV1> {
  try {
    const current = currentContext(input.contextId)
    if (current.status !== "SUCCESS" || !current.value) return current
    if (input.expectedRevision !== current.value.revision) {
      const code = input.expectedRevision < current.value.revision ? "stale_write" : "revision_mismatch"
      return lifecycleError(
        "CONFLICT",
        code,
        `Expected revision ${input.expectedRevision}, but current revision is ${current.value.revision}.`,
        "revision",
      )
    }
    const expiredAt = Date.parse(input.expiredAt)
    if (!Number.isFinite(expiredAt) || expiredAt > now || expiredAt <= Date.parse(current.value.updatedAt)) {
      return lifecycleError(
        "ERROR",
        "invalid_timestamp",
        "expiredAt must be valid, no later than now, and later than the current updatedAt.",
        "expiredAt",
      )
    }

    const expired: SharedProductContextV1 = {
      ...current.value,
      revision: current.value.revision + 1,
      updatedAt: input.expiredAt,
      expiresAt: input.expiredAt,
    }
    const inspection = inspectContextCandidate(expired, now)
    if (inspection.status === "ERROR") return inspection

    const audit = rememberExpired(expired)
    const cleared = clearProductContext(input.contextId)
    if (cleared.success === false) {
      const code = cleared.error.code === "storage_unavailable" ? "storage_unavailable" : "storage_failure"
      return {
        status: "WARNING",
        value: expired,
        issues: [storageIssue(code, cleared.error.message)],
        audit,
      }
    }
    return { status: "SUCCESS", value: expired, issues: [], audit }
  } catch {
    return lifecycleError("ERROR", "unknown_error", "Product context expiration failed unexpectedly.")
  }
}

export function clearContext(
  input: ClearContextInput,
): ContextLifecycleResult<ClearedContextResult> {
  try {
    const active = activeContexts.get(input.contextId)
    const expired = expiredContexts.get(input.contextId)
    const existingAudit = auditRecords.get(input.contextId)
    const source = active ?? expired

    activeContexts.delete(input.contextId)
    expiredContexts.delete(input.contextId)

    let audit = existingAudit
    if (source) {
      audit = contextAuditMetadata(source, "cleared", input.clearedAt)
      auditRecords.set(input.contextId, audit)
    } else if (existingAudit) {
      audit = { ...existingAudit, state: "cleared", clearedAt: input.clearedAt ?? existingAudit.clearedAt }
      auditRecords.set(input.contextId, audit)
    }

    const cleared = clearProductContext(input.contextId)
    const value = { contextId: input.contextId, cleared: true as const }
    if (cleared.success === false) {
      const code = cleared.error.code === "storage_unavailable" ? "storage_unavailable" : "storage_failure"
      return { status: "WARNING", value, issues: [storageIssue(code, cleared.error.message)], audit }
    }
    return { status: "SUCCESS", value, issues: [], audit }
  } catch {
    return lifecycleError("ERROR", "unknown_error", "Product context clearing failed unexpectedly.")
  }
}

export function inspectContext(contextId: string): ContextLifecycleResult<SharedProductContextV1> {
  try {
    const active = activeContexts.get(contextId)
    if (active) return inspectContextCandidate(active)

    const expired = expiredContexts.get(contextId)
    if (expired) {
      return {
        status: "WARNING",
        value: expired,
        issues: [{ code: "expired_context", message: "Expired context is available for inspection only." }],
        audit: auditRecords.get(contextId),
      }
    }

    return lifecycleError("ERROR", "context_not_found", `Context ${contextId} is not available in memory.`)
  } catch {
    return lifecycleError("ERROR", "unknown_error", "Product context inspection failed unexpectedly.")
  }
}

export function getContextAuditMetadata(contextId: string) {
  return auditRecords.get(contextId)
}

