import {
  createHistoricalMemoryId,
  validateHistoricalMemory,
  type HistoricalMemoryRecord,
} from "@/lib/historical-memory"
import { isSignalDirection, isSignalOutcomeStatus } from "@/lib/signal-evaluation"
import { isTrackingWindowId } from "@/lib/signal-tracking"
import type {
  PatternEvidence,
  PatternResult,
} from "@/lib/pattern-runtime/types"

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

export function createPatternEvidence(
  memory: HistoricalMemoryRecord,
): PatternResult<PatternEvidence> {
  const validation = validateHistoricalMemory(memory)
  if (validation.success === false) {
    return {
      success: false,
      errors: validation.errors.map((error) => ({
        code: "invalid_evidence_reference" as const,
        message: error.message,
        field: error.field ? `historicalMemory.${error.field}` : "historicalMemory",
        cause: error.cause,
      })),
    }
  }
  if (validation.value.status === "CREATED") {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: "Pattern evidence requires VERIFIED, INDEXED, or ARCHIVED Historical Memory.",
        field: "historicalMemory.status",
      }],
    }
  }
  const outcome = validation.value.outcomeEvent.payload.signalOutcome
  return {
    success: true,
    value: Object.freeze({
      memoryId: validation.value.identity.memoryId,
      eventId: validation.value.identity.eventId,
      outcomeId: validation.value.identity.outcomeId,
      memoryStatus: validation.value.status,
      memoryCreatedAt: validation.value.createdAt,
      evaluatedAt: outcome.timing.evaluatedAt,
      symbol: outcome.signal.symbol,
      timeframe: outcome.signal.timeframe,
      direction: outcome.signal.direction,
      evaluationWindow: outcome.timing.evaluationWindow,
      outcomeStatus: outcome.evaluation.outcomeStatus,
    }),
  }
}

export function validatePatternEvidence(
  input: unknown,
): PatternResult<PatternEvidence> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: "Pattern evidence must be a Historical Memory reference.",
        field: "evidence",
      }],
    }
  }
  const evidence = input as Record<string, unknown>
  for (const field of [
    "memoryId",
    "eventId",
    "outcomeId",
    "symbol",
    "timeframe",
  ] as const) {
    if (typeof evidence[field] !== "string" || evidence[field].trim().length === 0) {
      return {
        success: false,
        errors: [{
          code: "invalid_evidence_reference",
          message: `Pattern evidence requires ${field}.`,
          field: `evidence.${field}`,
        }],
      }
    }
  }
  const memoryId = createHistoricalMemoryId(evidence.eventId as string)
  if (memoryId.success === false || memoryId.value !== evidence.memoryId) {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: "Pattern evidence memoryId does not match its Outcome Event reference.",
        field: "evidence.memoryId",
      }],
    }
  }
  if (evidence.memoryStatus !== "VERIFIED"
    && evidence.memoryStatus !== "INDEXED"
    && evidence.memoryStatus !== "ARCHIVED") {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: "Pattern evidence memoryStatus is not eligible.",
        field: "evidence.memoryStatus",
      }],
    }
  }
  if (!isTimestamp(evidence.memoryCreatedAt) || !isTimestamp(evidence.evaluatedAt)) {
    return {
      success: false,
      errors: [{
        code: "invalid_timestamp",
        message: "Pattern evidence timestamps are invalid.",
        field: "evidence",
      }],
    }
  }
  if (!isSignalDirection(evidence.direction)
    || !isTrackingWindowId(evidence.evaluationWindow)
    || !isSignalOutcomeStatus(evidence.outcomeStatus)) {
    return {
      success: false,
      errors: [{
        code: "invalid_evidence_reference",
        message: "Pattern evidence contains invalid historical selectors.",
        field: "evidence",
      }],
    }
  }

  return { success: true, value: input as PatternEvidence }
}
