import { isSignalDirection, isSignalOutcomeStatus } from "@/lib/signal-evaluation"
import { isTrackingWindowId } from "@/lib/signal-tracking"
import type {
  HistoricalMemoryQuery,
  HistoricalMemoryResult,
} from "@/lib/historical-memory/types"

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

export function validateHistoricalMemoryQuery(
  input: unknown,
): HistoricalMemoryResult<HistoricalMemoryQuery> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_query", message: "Historical Memory query must be an object." }],
    }
  }

  const errors = [] as Array<{
    code: "invalid_query"
    message: string
    field?: string
  }>
  for (const field of ["symbol", "timeframe"] as const) {
    if (input[field] !== undefined && !isNonEmptyString(input[field])) {
      errors.push({
        code: "invalid_query",
        message: `${field} must be a non-empty string when provided.`,
        field,
      })
    }
  }
  if (input.direction !== undefined && !isSignalDirection(input.direction)) {
    errors.push({ code: "invalid_query", message: "direction is invalid.", field: "direction" })
  }
  if (input.evaluationWindow !== undefined
    && !isTrackingWindowId(input.evaluationWindow)) {
    errors.push({
      code: "invalid_query",
      message: "evaluationWindow is not canonical.",
      field: "evaluationWindow",
    })
  }
  if (input.outcomeStatus !== undefined
    && !isSignalOutcomeStatus(input.outcomeStatus)) {
    errors.push({
      code: "invalid_query",
      message: "outcomeStatus is invalid.",
      field: "outcomeStatus",
    })
  }
  if (input.dateRange !== undefined) {
    if (!isRecord(input.dateRange)
      || !isTimestamp(input.dateRange.from)
      || !isTimestamp(input.dateRange.to)) {
      errors.push({
        code: "invalid_query",
        message: "dateRange requires valid from and to timestamps.",
        field: "dateRange",
      })
    } else if (Date.parse(input.dateRange.from) > Date.parse(input.dateRange.to)) {
      errors.push({
        code: "invalid_query",
        message: "dateRange.from cannot be after dateRange.to.",
        field: "dateRange",
      })
    }
  }

  if (errors.length > 0) return { success: false, errors }
  const query = input as unknown as HistoricalMemoryQuery
  return {
    success: true,
    value: Object.freeze({
      ...(query.symbol !== undefined ? { symbol: query.symbol.trim() } : {}),
      ...(query.timeframe !== undefined ? { timeframe: query.timeframe.trim() } : {}),
      ...(query.direction !== undefined ? { direction: query.direction } : {}),
      ...(query.evaluationWindow !== undefined
        ? { evaluationWindow: query.evaluationWindow }
        : {}),
      ...(query.outcomeStatus !== undefined ? { outcomeStatus: query.outcomeStatus } : {}),
      ...(query.dateRange !== undefined
        ? { dateRange: Object.freeze({ ...query.dateRange }) }
        : {}),
    }),
  }
}

export function createHistoricalMemoryQuery(
  input: HistoricalMemoryQuery,
): HistoricalMemoryResult<HistoricalMemoryQuery> {
  return validateHistoricalMemoryQuery(input)
}
