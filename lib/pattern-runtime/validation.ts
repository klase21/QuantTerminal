import { isSignalDirection, isSignalOutcomeStatus } from "@/lib/signal-evaluation"
import { isTrackingWindowId } from "@/lib/signal-tracking"
import { validatePatternEvidence } from "@/lib/pattern-runtime/evidence"
import {
  canonicalPatternScope,
  createEvidenceSetHash,
  createPatternIdentity,
} from "@/lib/pattern-runtime/identity"
import {
  PATTERN_SCHEMA_VERSION,
  PATTERN_STATUSES,
  type PatternError,
  type PatternMetricSummary,
  type PatternRecord,
  type PatternResult,
  type PatternScope,
  type PatternValidationResult,
} from "@/lib/pattern-runtime/types"

type UnknownRecord = Record<string, unknown>

const STATUS_SET = new Set<string>(PATTERN_STATUSES)

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

export function validatePatternScope(input: unknown): PatternResult<PatternScope> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_scope", message: "Pattern scope must be an object." }],
    }
  }
  const errors: PatternError[] = []
  for (const field of ["symbol", "timeframe"] as const) {
    if (input[field] !== null && !isNonEmptyString(input[field])) {
      errors.push({
        code: "invalid_scope",
        message: `Pattern scope ${field} must be non-empty or null.`,
        field: `scope.${field}`,
      })
    }
  }
  if (input.direction !== null && !isSignalDirection(input.direction)) {
    errors.push({ code: "invalid_scope", message: "Pattern direction is invalid.", field: "scope.direction" })
  }
  if (input.evaluationWindow !== null && !isTrackingWindowId(input.evaluationWindow)) {
    errors.push({
      code: "invalid_scope",
      message: "Pattern evaluationWindow is invalid.",
      field: "scope.evaluationWindow",
    })
  }
  if (input.outcomeStatus !== null && !isSignalOutcomeStatus(input.outcomeStatus)) {
    errors.push({
      code: "invalid_scope",
      message: "Pattern outcomeStatus is invalid.",
      field: "scope.outcomeStatus",
    })
  }
  if (input.dateRange !== null) {
    if (!isRecord(input.dateRange)
      || !isTimestamp(input.dateRange.from)
      || !isTimestamp(input.dateRange.to)
      || Date.parse(input.dateRange.from) > Date.parse(input.dateRange.to)) {
      errors.push({
        code: "invalid_scope",
        message: "Pattern dateRange requires ordered valid timestamps or null.",
        field: "scope.dateRange",
      })
    }
  }
  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as PatternScope }
}

export function validatePatternMetricSummary(
  input: unknown,
  evidenceCount: number,
): PatternResult<PatternMetricSummary> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_metric", message: "Pattern metricSummary is required." }],
    }
  }
  const errors: PatternError[] = []
  if (!Number.isSafeInteger(input.sampleSize) || (input.sampleSize as number) < 1
    || input.sampleSize !== evidenceCount) {
    errors.push({
      code: "invalid_metric",
      message: "sampleSize must equal the positive Historical Memory evidence count.",
      field: "metricSummary.sampleSize",
    })
  }
  if (!isFiniteNumber(input.winRate) || input.winRate < 0 || input.winRate > 100) {
    errors.push({
      code: "invalid_metric",
      message: "winRate must be a finite percentage from 0 through 100.",
      field: "metricSummary.winRate",
    })
  }
  for (const field of [
    "averageReturnPercent",
    "medianReturnPercent",
    "averageMaxFavorableExcursion",
    "averageMaxAdverseExcursion",
  ] as const) {
    if (!isFiniteNumber(input[field])) {
      errors.push({
        code: "invalid_metric",
        message: `${field} must be a finite source-backed value.`,
        field: `metricSummary.${field}`,
      })
    }
  }
  if (!isRecord(input.drawdownProfile)) {
    errors.push({
      code: "invalid_metric",
      message: "drawdownProfile is required.",
      field: "metricSummary.drawdownProfile",
    })
  } else {
    for (const field of ["averageDrawdown", "medianDrawdown", "maximumDrawdown"] as const) {
      if (!isFiniteNumber(input.drawdownProfile[field])) {
        errors.push({
          code: "invalid_metric",
          message: `drawdownProfile.${field} must be finite.`,
          field: `metricSummary.drawdownProfile.${field}`,
        })
      }
    }
  }

  const distributions = [
    ["windowDistribution", input.windowDistribution, "evaluationWindow", isTrackingWindowId],
    ["directionDistribution", input.directionDistribution, "direction", isSignalDirection],
  ] as const
  for (const [field, distribution, key, validator] of distributions) {
    if (!Array.isArray(distribution) || distribution.length === 0) {
      errors.push({
        code: "invalid_metric",
        message: `${field} must contain source-backed counts.`,
        field: `metricSummary.${field}`,
      })
      continue
    }
    const seen = new Set<string>()
    let total = 0
    for (let index = 0; index < distribution.length; index += 1) {
      const entry = distribution[index]
      if (!isRecord(entry) || !validator(entry[key])
        || !Number.isSafeInteger(entry.count) || (entry.count as number) < 0) {
        errors.push({
          code: "invalid_metric",
          message: `${field} contains an invalid entry.`,
          field: `metricSummary.${field}[${index}]`,
        })
        continue
      }
      if (seen.has(entry[key] as string)) {
        errors.push({
          code: "invalid_metric",
          message: `${field} contains a duplicate category.`,
          field: `metricSummary.${field}[${index}]`,
        })
      }
      seen.add(entry[key] as string)
      total += entry.count as number
    }
    if (total !== evidenceCount) {
      errors.push({
        code: "invalid_metric",
        message: `${field} counts must equal sampleSize.`,
        field: `metricSummary.${field}`,
      })
    }
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as PatternMetricSummary }
}

export function validatePatternRecord(
  input: unknown,
  existingPatternIds: ReadonlySet<string> = new Set<string>(),
): PatternValidationResult {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Pattern Record must be an object." }],
    }
  }
  const errors: PatternError[] = []
  if (input.schemaVersion !== PATTERN_SCHEMA_VERSION) {
    errors.push({
      code: "unsupported_schema_version",
      message: `Only Pattern schema version ${PATTERN_SCHEMA_VERSION} is supported.`,
      field: "schemaVersion",
    })
  }
  if (typeof input.status !== "string" || !STATUS_SET.has(input.status)) {
    errors.push({ code: "invalid_lifecycle", message: "Pattern status is invalid.", field: "status" })
  }
  if (!isTimestamp(input.createdAt)) {
    errors.push({ code: "invalid_timestamp", message: "Pattern createdAt is invalid.", field: "createdAt" })
  }
  if (!isNonEmptyString(input.interpretation)) {
    errors.push({
      code: "malformed_input",
      message: "Pattern interpretation must be explicitly supplied.",
      field: "interpretation",
    })
  }
  if (!isRecord(input.identity)) {
    errors.push({
      code: "missing_pattern_identity",
      message: "Pattern identity is required.",
      field: "identity",
    })
  }

  const scope = isRecord(input.identity)
    ? validatePatternScope(input.identity.scope)
    : { success: false as const, errors: [] }
  if (scope.success === false) errors.push(...scope.errors)

  const evidence = [] as PatternRecord["evidence"][number][]
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    errors.push({
      code: "missing_evidence_reference",
      message: "Pattern requires Historical Memory evidence.",
      field: "evidence",
    })
  } else {
    const seen = new Set<string>()
    for (let index = 0; index < input.evidence.length; index += 1) {
      const result = validatePatternEvidence(input.evidence[index])
      if (result.success === false) {
        errors.push(...result.errors.map((error) => ({
          ...error,
          field: `evidence[${index}]`,
        })))
        continue
      }
      if (seen.has(result.value.memoryId)) {
        errors.push({
          code: "duplicate_evidence_reference",
          message: `Duplicate Historical Memory evidence ${result.value.memoryId}.`,
          field: `evidence[${index}]`,
        })
      }
      seen.add(result.value.memoryId)
      evidence.push(result.value)
    }
  }

  if (scope.success && evidence.length > 0) {
    for (const [index, item] of evidence.entries()) {
      const selectors = [
        ["symbol", scope.value.symbol, item.symbol],
        ["timeframe", scope.value.timeframe, item.timeframe],
        ["direction", scope.value.direction, item.direction],
        ["evaluationWindow", scope.value.evaluationWindow, item.evaluationWindow],
        ["outcomeStatus", scope.value.outcomeStatus, item.outcomeStatus],
      ] as const
      for (const [field, expected, actual] of selectors) {
        if (expected !== null && expected !== actual) {
          errors.push({
            code: "invalid_scope",
            message: `Evidence does not match Pattern scope ${field}.`,
            field: `evidence[${index}].${field}`,
          })
        }
      }
      if (scope.value.dateRange
        && (Date.parse(item.evaluatedAt) < Date.parse(scope.value.dateRange.from)
          || Date.parse(item.evaluatedAt) > Date.parse(scope.value.dateRange.to))) {
        errors.push({
          code: "invalid_scope",
          message: "Evidence evaluation boundary is outside Pattern scope dateRange.",
          field: `evidence[${index}].evaluatedAt`,
        })
      }
      if (isTimestamp(input.createdAt)
        && Date.parse(input.createdAt) < Date.parse(item.memoryCreatedAt)) {
        errors.push({
          code: "invalid_timestamp",
          message: "Pattern createdAt cannot precede its Historical Memory evidence.",
          field: "createdAt",
        })
      }
    }
  }

  const metrics = validatePatternMetricSummary(input.metricSummary, evidence.length)
  if (metrics.success === false) errors.push(...metrics.errors)

  if (isRecord(input.identity) && scope.success && evidence.length > 0) {
    const version = input.identity.patternVersion
    const expected = createPatternIdentity(version as number, scope.value, evidence)
    if (expected.success === false) {
      errors.push(...expected.errors)
    } else if (input.identity.patternId !== expected.value.patternId
      || input.identity.evidenceSetHash !== expected.value.evidenceSetHash
      || canonicalPatternScope(input.identity.scope as PatternScope)
        !== canonicalPatternScope(expected.value.scope)) {
      errors.push({
        code: "identity_mismatch",
        message: "Pattern identity does not match its version, scope, and evidence set.",
        field: "identity",
      })
    }
    if (typeof input.identity.patternId === "string"
      && existingPatternIds.has(input.identity.patternId)) {
      errors.push({
        code: "duplicate_pattern_identity",
        message: `Pattern identity ${input.identity.patternId} already exists.`,
        field: "identity.patternId",
      })
    }
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as PatternRecord }
}
