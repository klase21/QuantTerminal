import { isSignalDirection } from "@/lib/signal-evaluation"
import { isPlaybookStatus } from "@/lib/playbook-runtime/lifecycle"
import type { PlaybookQuery, PlaybookResult } from "@/lib/playbook-runtime/types"

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

export function validatePlaybookQuery(input: unknown): PlaybookResult<PlaybookQuery> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_query", message: "Playbook query must be an object." }],
    }
  }
  const errors: Array<{ code: "invalid_query"; message: string; field?: string }> = []
  for (const field of ["symbol", "timeframe", "learningId", "calibrationId"] as const) {
    if (input[field] !== undefined && !isNonEmptyString(input[field])) {
      errors.push({ code: "invalid_query", message: `${field} must be non-empty.`, field })
    }
  }
  if (input.direction !== undefined && !isSignalDirection(input.direction)) {
    errors.push({ code: "invalid_query", message: "direction is invalid.", field: "direction" })
  }
  if (input.status !== undefined && !isPlaybookStatus(input.status)) {
    errors.push({ code: "invalid_query", message: "status is invalid.", field: "status" })
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
  const query = input as unknown as PlaybookQuery
  return {
    success: true,
    value: Object.freeze({
      ...(query.symbol !== undefined ? { symbol: query.symbol.trim() } : {}),
      ...(query.timeframe !== undefined ? { timeframe: query.timeframe.trim() } : {}),
      ...(query.direction !== undefined ? { direction: query.direction } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.learningId !== undefined ? { learningId: query.learningId.trim() } : {}),
      ...(query.calibrationId !== undefined
        ? { calibrationId: query.calibrationId.trim() }
        : {}),
      ...(query.minimumSampleSize !== undefined
        ? { minimumSampleSize: query.minimumSampleSize }
        : {}),
      ...(query.dateRange !== undefined
        ? { dateRange: Object.freeze({ ...query.dateRange }) }
        : {}),
    }),
  }
}

export function createPlaybookQuery(input: PlaybookQuery): PlaybookResult<PlaybookQuery> {
  return validatePlaybookQuery(input)
}
