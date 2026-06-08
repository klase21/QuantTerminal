import type { DecisionRecord, OutcomeRecord } from "./decisionRecordTypes"
import type { EventRecord } from "./eventRecordTypes"
import type { MemoryRecord, ReplayCaseRecord } from "./historicalRecordTypes"
import type { PlaybookRecord } from "./playbookRecordTypes"

export type HistoricalPersistenceValidationResult =
  | {
      ok: true
    }
  | {
      ok: false
      errors: string[]
    }

type ValidatedRecord = {
  title?: string
  symbol?: string
  confidence?: number
  status?: string
  audit?: {
    createdAt?: string
    updatedAt?: string
    schemaVersion?: number
  }
}

const STATUSES = new Set(["draft", "active", "archived"])

function baseErrors(record: ValidatedRecord) {
  const errors: string[] = []
  if (record.title !== undefined && !record.title.trim()) errors.push("title is required")
  if (record.symbol !== undefined && !record.symbol.trim()) errors.push("symbol is required")
  if (record.confidence !== undefined && (record.confidence < 0 || record.confidence > 100)) {
    errors.push("confidence must be between 0 and 100")
  }
  if (record.status !== undefined && !STATUSES.has(record.status)) errors.push("status is invalid")
  if (record.audit) {
    if (!record.audit.createdAt) errors.push("audit.createdAt is required")
    if (!record.audit.updatedAt) errors.push("audit.updatedAt is required")
    if (!record.audit.schemaVersion) errors.push("audit.schemaVersion is required")
  }
  return errors
}

function result(errors: string[]): HistoricalPersistenceValidationResult {
  return errors.length ? { ok: false, errors } : { ok: true }
}

export function validateReplayCaseRecord(record: Omit<ReplayCaseRecord, "id">): HistoricalPersistenceValidationResult {
  const errors = baseErrors(record)
  if (!record.setup.trim()) errors.push("setup is required")
  if (!record.outcome.trim()) errors.push("outcome is required")
  if (!record.narrativeClaim.trim()) errors.push("narrativeClaim is required")
  if (!record.eventWindow.start || !record.eventWindow.end) errors.push("eventWindow start and end are required")
  return result(errors)
}

export function validateDecisionRecord(record: Omit<DecisionRecord, "id">): HistoricalPersistenceValidationResult {
  const errors = baseErrors(record)
  if (!record.caseId.trim()) errors.push("caseId is required")
  if (!record.decidedAt.trim()) errors.push("decidedAt is required")
  if (!record.decisionReason.trim()) errors.push("decisionReason is required")
  if (!record.futureRule.trim()) errors.push("futureRule is required")
  return result(errors)
}

export function validateOutcomeRecord(record: Omit<OutcomeRecord, "id">): HistoricalPersistenceValidationResult {
  const errors = baseErrors(record)
  if (!record.symbol.trim()) errors.push("symbol is required")
  if (!record.observedAt.trim()) errors.push("observedAt is required")
  if (!record.actualOutcome.trim()) errors.push("actualOutcome is required")
  return result(errors)
}

export function validateEventRecord(record: Omit<EventRecord, "id">): HistoricalPersistenceValidationResult {
  const errors = baseErrors(record)
  if (!record.timestamp.trim()) errors.push("timestamp is required")
  if (!record.sourceId.trim()) errors.push("sourceId is required")
  if (!record.title.trim()) errors.push("title is required")
  if (!record.summary.trim()) errors.push("summary is required")
  return result(errors)
}

export function validateMemoryRecord(record: Omit<MemoryRecord, "id">): HistoricalPersistenceValidationResult {
  const errors = baseErrors(record)
  if (!record.title.trim()) errors.push("title is required")
  if (!record.summary.trim()) errors.push("summary is required")
  return result(errors)
}

export function validatePlaybookRecord(record: Omit<PlaybookRecord, "id">): HistoricalPersistenceValidationResult {
  const errors = baseErrors(record)
  if (!record.title.trim()) errors.push("title is required")
  if (!record.historicalLesson.trim()) errors.push("historicalLesson is required")
  if (!record.keyConfirmationSignal.trim()) errors.push("keyConfirmationSignal is required")
  return result(errors)
}

export function assertValidPersistenceRecord(validation: HistoricalPersistenceValidationResult) {
  if ("errors" in validation) throw new Error(validation.errors.join("; "))
}
