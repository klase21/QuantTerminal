import { isSignalDirection, isSignalOutcomeStatus } from "@/lib/signal-evaluation"
import { isTrackingWindowId } from "@/lib/signal-tracking"
import { isPatternStatus } from "@/lib/pattern-runtime/lifecycle"
import type { PatternQuery, PatternResult } from "@/lib/pattern-runtime/types"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

export function validatePatternQuery(input: unknown): PatternResult<PatternQuery> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_query", message: "Pattern query must be an object." }],
    }
  }
  const errors: Array<{ code: "invalid_query"; message: string; field?: string }> = []
  for (const field of ["symbol", "timeframe"] as const) {
    if (input[field] !== undefined && !isNonEmptyString(input[field])) {
      errors.push({ code: "invalid_query", message: `${field} must be non-empty.`, field })
    }
  }
  if (input.direction !== undefined && !isSignalDirection(input.direction)) {
    errors.push({ code: "invalid_query", message: "direction is invalid.", field: "direction" })
  }
  if (input.evaluationWindow !== undefined && !isTrackingWindowId(input.evaluationWindow)) {
    errors.push({
      code: "invalid_query",
      message: "evaluationWindow is invalid.",
      field: "evaluationWindow",
    })
  }
  if (input.outcomeStatus !== undefined && !isSignalOutcomeStatus(input.outcomeStatus)) {
    errors.push({
      code: "invalid_query",
      message: "outcomeStatus is invalid.",
      field: "outcomeStatus",
    })
  }
  if (input.patternStatus !== undefined && !isPatternStatus(input.patternStatus)) {
    errors.push({
      code: "invalid_query",
      message: "patternStatus is invalid.",
      field: "patternStatus",
    })
  }
  if (input.minimumSampleSize !== undefined
    && (!Number.isSafeInteger(input.minimumSampleSize)
      || (input.minimumSampleSize as number) < 1)) {
    errors.push({
      code: "invalid_query",
      message: "minimumSampleSize must be a positive safe integer.",
      field: "minimumSampleSize",
    })
  }
  if (input.dateRange !== undefined) {
    if (!isRecord(input.dateRange)
      || !isTimestamp(input.dateRange.from)
      || !isTimestamp(input.dateRange.to)
      || Date.parse(input.dateRange.from) > Date.parse(input.dateRange.to)) {
      errors.push({
        code: "invalid_query",
        message: "dateRange requires ordered valid timestamps.",
        field: "dateRange",
      })
    }
  }

  if (errors.length > 0) return { success: false, errors }
  const query = input as unknown as PatternQuery
  return {
    success: true,
    value: Object.freeze({
      ...(query.symbol !== undefined ? { symbol: query.symbol.trim() } : {}),
      ...(query.timeframe !== undefined ? { timeframe: query.timeframe.trim() } : {}),
      ...(query.direction !== undefined ? { direction: query.direction } : {}),
      ...(query.evaluationWindow !== undefined ? { evaluationWindow: query.evaluationWindow } : {}),
      ...(query.outcomeStatus !== undefined ? { outcomeStatus: query.outcomeStatus } : {}),
      ...(query.patternStatus !== undefined ? { patternStatus: query.patternStatus } : {}),
      ...(query.minimumSampleSize !== undefined
        ? { minimumSampleSize: query.minimumSampleSize }
        : {}),
      ...(query.dateRange !== undefined
        ? { dateRange: Object.freeze({ ...query.dateRange }) }
        : {}),
    }),
  }
}

export function createPatternQuery(input: PatternQuery): PatternResult<PatternQuery> {
  return validatePatternQuery(input)
}
