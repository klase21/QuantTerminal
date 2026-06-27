import { validateProductContext } from "@/lib/product-context/schema"
import type {
  ProductContextError,
  SharedProductContextV1,
} from "@/lib/product-context/types"

export type ContextLifecycleStatus = "SUCCESS" | "WARNING" | "CONFLICT" | "ERROR"

export type ContextLifecycleIssueCode =
  | "stale_write"
  | "duplicate_revision"
  | "revision_mismatch"
  | "incompatible_schema_version"
  | "immutable_field_conflict"
  | "expired_context"
  | "invalid_timestamp"
  | "invalid_ttl"
  | "invalid_context"
  | "context_not_found"
  | "context_closed"
  | "storage_unavailable"
  | "storage_failure"
  | "unknown_error"

export interface ContextLifecycleIssue {
  code: ContextLifecycleIssueCode
  message: string
  field?: string
}

export interface ContextLifecycleResult<T> {
  status: ContextLifecycleStatus
  value?: T
  issues: ContextLifecycleIssue[]
  audit?: ContextAuditMetadata
}

export interface ContextAuditMetadata {
  contextId: string
  schemaVersion: number
  createdAt: string
  updatedAt: string
  expiresAt: string
  revision: number
  state: "active" | "expired" | "cleared"
  clearedAt?: string
}

export interface ContextConflictReport {
  status: ContextLifecycleStatus
  issues: ContextLifecycleIssue[]
}

function issueFromValidationError(error: ProductContextError): ContextLifecycleIssue {
  if (error.code === "unsupported_schema_version") {
    return { code: "incompatible_schema_version", message: error.message, field: error.field }
  }
  if (error.code === "malformed_timestamp") {
    return { code: "invalid_timestamp", message: error.message, field: error.field }
  }
  if (error.code === "expired_context") {
    return { code: "expired_context", message: error.message, field: error.field }
  }
  return { code: "invalid_context", message: error.message, field: error.field }
}

export function lifecycleError(
  status: ContextLifecycleStatus,
  code: ContextLifecycleIssueCode,
  message: string,
  field?: string,
): ContextLifecycleResult<never> {
  return { status, issues: [{ code, message, field }] }
}

export function contextAuditMetadata(
  context: SharedProductContextV1,
  state: ContextAuditMetadata["state"],
  clearedAt?: string,
): ContextAuditMetadata {
  return {
    contextId: context.contextId,
    schemaVersion: context.schemaVersion,
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
    expiresAt: context.expiresAt,
    revision: context.revision,
    state,
    clearedAt,
  }
}

export function inspectContextCandidate(
  context: unknown,
  now = Date.now(),
): ContextLifecycleResult<SharedProductContextV1> {
  const validation = validateProductContext(context, { allowExpired: true, now })
  if (validation.success === false) {
    const issue = issueFromValidationError(validation.error)
    return { status: issue.code === "incompatible_schema_version" ? "CONFLICT" : "ERROR", issues: [issue] }
  }

  const value = validation.value
  if (Date.parse(value.expiresAt) < Date.parse(value.updatedAt)) {
    return lifecycleError(
      "ERROR",
      "invalid_ttl",
      "expiresAt cannot be earlier than updatedAt.",
      "expiresAt",
    )
  }
  if (Date.parse(value.expiresAt) <= now) {
    return {
      status: "CONFLICT",
      value,
      issues: [{ code: "expired_context", message: "Product context has expired.", field: "expiresAt" }],
      audit: contextAuditMetadata(value, "expired"),
    }
  }

  return {
    status: "SUCCESS",
    value,
    issues: [],
    audit: contextAuditMetadata(value, "active"),
  }
}

export function detectContextConflict(
  existing: SharedProductContextV1,
  incoming: SharedProductContextV1,
  now = Date.now(),
): ContextConflictReport {
  const existingInspection = inspectContextCandidate(existing, now)
  if (existingInspection.status !== "SUCCESS") {
    return { status: existingInspection.status, issues: existingInspection.issues }
  }

  const incomingInspection = inspectContextCandidate(incoming, now)
  if (incomingInspection.status !== "SUCCESS") {
    return { status: incomingInspection.status, issues: incomingInspection.issues }
  }

  if (existing.schemaVersion !== incoming.schemaVersion) {
    return {
      status: "CONFLICT",
      issues: [{
        code: "incompatible_schema_version",
        message: "Product contexts use incompatible schema versions.",
        field: "schemaVersion",
      }],
    }
  }
  if (existing.contextId !== incoming.contextId) {
    return {
      status: "CONFLICT",
      issues: [{
        code: "immutable_field_conflict",
        message: "Product contexts do not share the same contextId.",
        field: "contextId",
      }],
    }
  }
  if (existing.createdAt !== incoming.createdAt) {
    return {
      status: "CONFLICT",
      issues: [{
        code: "immutable_field_conflict",
        message: "createdAt is immutable and cannot differ between revisions.",
        field: "createdAt",
      }],
    }
  }
  if (incoming.revision < existing.revision) {
    return {
      status: "CONFLICT",
      issues: [{
        code: "stale_write",
        message: `Incoming revision ${incoming.revision} cannot overwrite revision ${existing.revision}.`,
        field: "revision",
      }],
    }
  }
  if (incoming.revision === existing.revision) {
    return {
      status: "WARNING",
      issues: [{
        code: "duplicate_revision",
        message: `Revision ${incoming.revision} already exists and requires deterministic merge.`,
        field: "revision",
      }],
    }
  }
  if (Date.parse(incoming.updatedAt) <= Date.parse(existing.updatedAt)) {
    return {
      status: "ERROR",
      issues: [{
        code: "invalid_timestamp",
        message: "A newer revision must have an updatedAt later than the existing revision.",
        field: "updatedAt",
      }],
    }
  }

  return { status: "SUCCESS", issues: [] }
}

