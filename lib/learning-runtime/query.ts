import { isSignalDirection } from "@/lib/signal-evaluation"
import { isLearningStatus } from "@/lib/learning-runtime/lifecycle"
import type { LearningQuery, LearningResult } from "@/lib/learning-runtime/types"

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

export function validateLearningQuery(input: unknown): LearningResult<LearningQuery> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_query", message: "Learning query must be an object." }],
    }
  }
  const errors: Array<{ code: "invalid_query"; message: string; field?: string }> = []
  for (const field of ["symbol", "timeframe", "patternId"] as const) {
    if (input[field] !== undefined && !isNonEmptyString(input[field])) {
      errors.push({ code: "invalid_query", message: `${field} must be non-empty.`, field })
    }
  }
  if (input.direction !== undefined && !isSignalDirection(input.direction)) {
    errors.push({ code: "invalid_query", message: "direction is invalid.", field: "direction" })
  }
  if (input.learningStatus !== undefined && !isLearningStatus(input.learningStatus)) {
    errors.push({
      code: "invalid_query",
      message: "learningStatus is invalid.",
      field: "learningStatus",
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
  const query = input as unknown as LearningQuery
  return {
    success: true,
    value: Object.freeze({
      ...(query.symbol !== undefined ? { symbol: query.symbol.trim() } : {}),
      ...(query.timeframe !== undefined ? { timeframe: query.timeframe.trim() } : {}),
      ...(query.direction !== undefined ? { direction: query.direction } : {}),
      ...(query.learningStatus !== undefined ? { learningStatus: query.learningStatus } : {}),
      ...(query.minimumSampleSize !== undefined
        ? { minimumSampleSize: query.minimumSampleSize }
        : {}),
      ...(query.patternId !== undefined ? { patternId: query.patternId.trim() } : {}),
      ...(query.dateRange !== undefined
        ? { dateRange: Object.freeze({ ...query.dateRange }) }
        : {}),
    }),
  }
}

export function createLearningQuery(input: LearningQuery): LearningResult<LearningQuery> {
  return validateLearningQuery(input)
}
