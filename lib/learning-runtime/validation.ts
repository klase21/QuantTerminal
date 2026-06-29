import { isSignalDirection } from "@/lib/signal-evaluation"
import { validateLearningEvidence } from "@/lib/learning-runtime/evidence"
import {
  canonicalLearningScope,
  createLearningIdentity,
} from "@/lib/learning-runtime/identity"
import {
  LEARNING_SCHEMA_VERSION,
  LEARNING_STATUSES,
  type LearningConclusion,
  type LearningError,
  type LearningRecord,
  type LearningResult,
  type LearningScope,
  type LearningValidationResult,
} from "@/lib/learning-runtime/types"

type UnknownRecord = Record<string, unknown>

const STATUS_SET = new Set<string>(LEARNING_STATUSES)

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

function validateStringArray(
  value: unknown,
  field: string,
  errors: LearningError[],
): readonly string[] {
  if (!Array.isArray(value)
    || value.some((item) => !isNonEmptyString(item))) {
    errors.push({
      code: "invalid_conclusion",
      message: `${field} must be an array of non-empty caller-supplied strings.`,
      field: `conclusion.${field}`,
    })
    return []
  }
  if (new Set(value).size !== value.length) {
    errors.push({
      code: "invalid_conclusion",
      message: `${field} contains duplicate values.`,
      field: `conclusion.${field}`,
    })
  }
  return value as readonly string[]
}

export function validateLearningScope(input: unknown): LearningResult<LearningScope> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_scope", message: "Learning scope must be an object." }],
    }
  }
  const errors: LearningError[] = []
  for (const field of ["symbol", "timeframe"] as const) {
    if (input[field] !== null && !isNonEmptyString(input[field])) {
      errors.push({
        code: "invalid_scope",
        message: `Learning scope ${field} must be non-empty or null.`,
        field: `scope.${field}`,
      })
    }
  }
  if (input.direction !== null && !isSignalDirection(input.direction)) {
    errors.push({
      code: "invalid_scope",
      message: "Learning scope direction is invalid.",
      field: "scope.direction",
    })
  }
  if (input.dateRange !== null) {
    if (!isRecord(input.dateRange)
      || !isTimestamp(input.dateRange.from)
      || !isTimestamp(input.dateRange.to)
      || Date.parse(input.dateRange.from) > Date.parse(input.dateRange.to)) {
      errors.push({
        code: "invalid_scope",
        message: "Learning dateRange requires ordered valid timestamps or null.",
        field: "scope.dateRange",
      })
    }
  }
  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as LearningScope }
}

export function validateLearningConclusion(
  input: unknown,
  patternIds: ReadonlySet<string>,
  maximumSampleSize: number,
): LearningResult<LearningConclusion> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_conclusion", message: "Learning conclusion is required." }],
    }
  }
  const errors: LearningError[] = []
  if (!isNonEmptyString(input.summary)) {
    errors.push({
      code: "invalid_conclusion",
      message: "Conclusion summary must be explicitly supplied.",
      field: "conclusion.summary",
    })
  }
  validateStringArray(input.applicableConditions, "applicableConditions", errors)
  validateStringArray(input.failureConditions, "failureConditions", errors)
  validateStringArray(input.riskNotes, "riskNotes", errors)
  const supporting = validateStringArray(
    input.supportingPatternIds,
    "supportingPatternIds",
    errors,
  )
  const conflicting = validateStringArray(
    input.conflictingPatternIds,
    "conflictingPatternIds",
    errors,
  )
  const classified = new Set([...supporting, ...conflicting])
  if (classified.size !== supporting.length + conflicting.length) {
    errors.push({
      code: "duplicate_pattern_reference",
      message: "A Pattern cannot be both supporting and conflicting.",
      field: "conclusion",
    })
  }
  if (classified.size !== patternIds.size
    || [...classified].some((patternId) => !patternIds.has(patternId))) {
    errors.push({
      code: "invalid_conclusion",
      message: "Every evidence Pattern must be classified exactly once.",
      field: "conclusion.supportingPatternIds",
    })
  }
  if (!Number.isSafeInteger(input.sampleSize)
    || (input.sampleSize as number) < 1
    || (input.sampleSize as number) > maximumSampleSize) {
    errors.push({
      code: "invalid_sample_metric",
      message: "sampleSize must be positive and cannot exceed referenced Pattern samples.",
      field: "conclusion.sampleSize",
    })
  }
  if (!isFiniteNumber(input.observedWinRate)
    || input.observedWinRate < 0
    || input.observedWinRate > 100) {
    errors.push({
      code: "invalid_sample_metric",
      message: "observedWinRate must be a finite percentage from 0 through 100.",
      field: "conclusion.observedWinRate",
    })
  }
  if (!isFiniteNumber(input.averageReturnPercent)) {
    errors.push({
      code: "invalid_sample_metric",
      message: "averageReturnPercent must be finite.",
      field: "conclusion.averageReturnPercent",
    })
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as LearningConclusion }
}

export function validateLearningRecord(
  input: unknown,
  existingLearningIds: ReadonlySet<string> = new Set<string>(),
): LearningValidationResult {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Learning Record must be an object." }],
    }
  }
  const errors: LearningError[] = []
  if (input.schemaVersion !== LEARNING_SCHEMA_VERSION) {
    errors.push({
      code: "unsupported_schema_version",
      message: `Only Learning schema version ${LEARNING_SCHEMA_VERSION} is supported.`,
      field: "schemaVersion",
    })
  }
  if (typeof input.status !== "string" || !STATUS_SET.has(input.status)) {
    errors.push({
      code: "invalid_lifecycle",
      message: "Learning status is invalid.",
      field: "status",
    })
  }
  if (!isTimestamp(input.createdAt)) {
    errors.push({
      code: "invalid_timestamp",
      message: "Learning createdAt is invalid.",
      field: "createdAt",
    })
  }
  if (!isRecord(input.identity)) {
    errors.push({
      code: "missing_learning_identity",
      message: "Learning identity is required.",
      field: "identity",
    })
  }

  const scope = isRecord(input.identity)
    ? validateLearningScope(input.identity.scope)
    : { success: false as const, errors: [] }
  if (scope.success === false) errors.push(...scope.errors)

  const evidence = [] as LearningRecord["evidence"][number][]
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    errors.push({
      code: "missing_pattern_reference",
      message: "Learning requires Pattern evidence.",
      field: "evidence",
    })
  } else {
    const seen = new Set<string>()
    for (let index = 0; index < input.evidence.length; index += 1) {
      const result = validateLearningEvidence(input.evidence[index])
      if (result.success === false) {
        errors.push(...result.errors.map((error) => ({
          ...error,
          field: `evidence[${index}]`,
        })))
        continue
      }
      const patternId = result.value.pattern.identity.patternId
      if (seen.has(patternId)) {
        errors.push({
          code: "duplicate_pattern_reference",
          message: `Duplicate Pattern evidence ${patternId}.`,
          field: `evidence[${index}]`,
        })
      }
      seen.add(patternId)
      evidence.push(result.value)
    }
  }

  if (scope.success && evidence.length > 0) {
    for (const [index, item] of evidence.entries()) {
      const pattern = item.pattern
      const selectors = [
        ["symbol", scope.value.symbol, pattern.identity.scope.symbol],
        ["timeframe", scope.value.timeframe, pattern.identity.scope.timeframe],
        ["direction", scope.value.direction, pattern.identity.scope.direction],
      ] as const
      for (const [field, expected, actual] of selectors) {
        if (expected !== null && expected !== actual) {
          errors.push({
            code: "invalid_scope",
            message: `Pattern evidence does not match Learning scope ${field}.`,
            field: `evidence[${index}].pattern.identity.scope.${field}`,
          })
        }
      }
      if (scope.value.dateRange
        && (Date.parse(pattern.createdAt) < Date.parse(scope.value.dateRange.from)
          || Date.parse(pattern.createdAt) > Date.parse(scope.value.dateRange.to))) {
        errors.push({
          code: "invalid_scope",
          message: "Pattern creation time is outside Learning scope dateRange.",
          field: `evidence[${index}].pattern.createdAt`,
        })
      }
      if (isTimestamp(input.createdAt)
        && Date.parse(input.createdAt) < Date.parse(pattern.createdAt)) {
        errors.push({
          code: "invalid_timestamp",
          message: "Learning createdAt cannot precede its Pattern evidence.",
          field: "createdAt",
        })
      }
    }
  }

  const patternIds = new Set(evidence.map((item) => item.pattern.identity.patternId))
  const maximumSampleSize = evidence.reduce(
    (total, item) => total + item.pattern.metricSummary.sampleSize,
    0,
  )
  const conclusion = validateLearningConclusion(
    input.conclusion,
    patternIds,
    maximumSampleSize,
  )
  if (conclusion.success === false) errors.push(...conclusion.errors)

  if (isRecord(input.identity) && scope.success && evidence.length > 0) {
    const expected = createLearningIdentity(
      input.identity.learningVersion as number,
      scope.value,
      evidence,
    )
    if (expected.success === false) {
      errors.push(...expected.errors)
    } else if (input.identity.learningId !== expected.value.learningId
      || input.identity.patternSetHash !== expected.value.patternSetHash
      || canonicalLearningScope(input.identity.scope as LearningScope)
        !== canonicalLearningScope(expected.value.scope)) {
      errors.push({
        code: "identity_mismatch",
        message: "Learning identity does not match its version, scope, and Pattern set.",
        field: "identity",
      })
    }
    if (typeof input.identity.learningId === "string"
      && existingLearningIds.has(input.identity.learningId)) {
      errors.push({
        code: "duplicate_learning_identity",
        message: `Learning identity ${input.identity.learningId} already exists.`,
        field: "identity.learningId",
      })
    }
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as LearningRecord }
}
