import { isLearningStatus } from "@/lib/learning-runtime"
import { isPatternStatus } from "@/lib/pattern-runtime"
import { isSignalDirection } from "@/lib/signal-evaluation"
import { validateCalibrationEvidence } from "@/lib/confidence-calibration/evidence"
import {
  canonicalCalibrationScope,
  createCalibrationIdentity,
} from "@/lib/confidence-calibration/identity"
import {
  CALIBRATION_BANDS,
  CALIBRATION_SCHEMA_VERSION,
  CALIBRATION_STATUSES,
  type CalibrationError,
  type CalibrationModel,
  type CalibrationRecord,
  type CalibrationResult,
  type CalibrationScope,
  type CalibrationValidationResult,
} from "@/lib/confidence-calibration/types"

type UnknownRecord = Record<string, unknown>

const STATUS_SET = new Set<string>(CALIBRATION_STATUSES)
const BAND_SET = new Set<string>(CALIBRATION_BANDS)

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

function isNullableFinite(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function validateStringArray(
  value: unknown,
  field: string,
  errors: CalibrationError[],
): void {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    errors.push({
      code: "malformed_input",
      message: `${field} must be an array of non-empty caller-supplied strings.`,
      field: `calibration.${field}`,
    })
    return
  }
  if (new Set(value).size !== value.length) {
    errors.push({
      code: "malformed_input",
      message: `${field} contains duplicate values.`,
      field: `calibration.${field}`,
    })
  }
}

export function isCalibrationBand(value: unknown): value is CalibrationModel["calibrationBand"] {
  return typeof value === "string" && BAND_SET.has(value)
}

export function validateCalibrationScope(
  input: unknown,
): CalibrationResult<CalibrationScope> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_scope", message: "Calibration scope must be an object." }],
    }
  }
  const errors: CalibrationError[] = []
  for (const field of ["symbol", "timeframe"] as const) {
    if (input[field] !== null && !isNonEmptyString(input[field])) {
      errors.push({
        code: "invalid_scope",
        message: `Calibration scope ${field} must be non-empty or null.`,
        field: `scope.${field}`,
      })
    }
  }
  if (input.direction !== null && !isSignalDirection(input.direction)) {
    errors.push({
      code: "invalid_scope",
      message: "Calibration scope direction is invalid.",
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
        message: "Calibration dateRange requires ordered valid timestamps or null.",
        field: "scope.dateRange",
      })
    }
  }
  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as CalibrationScope }
}

export function validateCalibrationModel(
  input: unknown,
  maximumSampleSize: number,
): CalibrationResult<CalibrationModel> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Calibration model is required." }],
    }
  }
  const errors: CalibrationError[] = []
  if (!isCalibrationBand(input.calibrationBand)) {
    errors.push({
      code: "invalid_band",
      message: "calibrationBand is not canonical.",
      field: "calibration.calibrationBand",
    })
  }
  for (const field of ["rawConfidence", "calibratedConfidence"] as const) {
    if (!isNullableFinite(input[field])
      || (typeof input[field] === "number" && (input[field] < 0 || input[field] > 100))) {
      errors.push({
        code: "invalid_confidence_range",
        message: `${field} must be null or a finite percentage from 0 through 100.`,
        field: `calibration.${field}`,
      })
    }
  }
  if (input.calibrationBand === "UNAVAILABLE") {
    if (input.calibratedConfidence !== null) {
      errors.push({
        code: "invalid_confidence_range",
        message: "UNAVAILABLE calibration must keep calibratedConfidence null.",
        field: "calibration.calibratedConfidence",
      })
    }
  } else if (isCalibrationBand(input.calibrationBand)
    && (!isFiniteNumber(input.rawConfidence) || !isFiniteNumber(input.calibratedConfidence))) {
    errors.push({
      code: "invalid_confidence_range",
      message: "Available calibration bands require raw and calibrated confidence.",
      field: "calibration",
    })
  }
  if (!Number.isSafeInteger(input.sampleSize)
    || (input.sampleSize as number) < 0
    || (input.sampleSize as number) > maximumSampleSize
    || (input.calibrationBand !== "UNAVAILABLE" && input.sampleSize === 0)) {
    errors.push({
      code: "invalid_sample_metric",
      message: "sampleSize must fit the referenced evidence and be positive when available.",
      field: "calibration.sampleSize",
    })
  }
  if (!isNullableFinite(input.observedWinRate)
    || (typeof input.observedWinRate === "number"
      && (input.observedWinRate < 0 || input.observedWinRate > 100))) {
    errors.push({
      code: "invalid_sample_metric",
      message: "observedWinRate must be null or a percentage from 0 through 100.",
      field: "calibration.observedWinRate",
    })
  }
  for (const field of ["expectedReturnPercent", "averageDrawdown"] as const) {
    if (!isNullableFinite(input[field])) {
      errors.push({
        code: "invalid_sample_metric",
        message: `${field} must be null or finite.`,
        field: `calibration.${field}`,
      })
    }
  }
  if (!isRecord(input.calibrationMethod)
    || !isNonEmptyString(input.calibrationMethod.methodId)
    || !Number.isSafeInteger(input.calibrationMethod.methodVersion)
    || (input.calibrationMethod.methodVersion as number) < 1) {
    errors.push({
      code: "invalid_method",
      message: "calibrationMethod requires a methodId and positive version.",
      field: "calibration.calibrationMethod",
    })
  }
  validateStringArray(input.applicableConditions, "applicableConditions", errors)
  validateStringArray(input.failureConditions, "failureConditions", errors)

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as CalibrationModel }
}

export function validateCalibrationRecord(
  input: unknown,
  existingCalibrationIds: ReadonlySet<string> = new Set<string>(),
): CalibrationValidationResult {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Calibration Record must be an object." }],
    }
  }
  const errors: CalibrationError[] = []
  if (input.schemaVersion !== CALIBRATION_SCHEMA_VERSION) {
    errors.push({
      code: "unsupported_schema_version",
      message: `Only Calibration schema version ${CALIBRATION_SCHEMA_VERSION} is supported.`,
      field: "schemaVersion",
    })
  }
  if (typeof input.status !== "string" || !STATUS_SET.has(input.status)) {
    errors.push({
      code: "invalid_lifecycle",
      message: "Calibration status is invalid.",
      field: "status",
    })
  }
  if (!isTimestamp(input.createdAt)) {
    errors.push({
      code: "invalid_timestamp",
      message: "Calibration createdAt is invalid.",
      field: "createdAt",
    })
  }
  if (!isRecord(input.identity)) {
    errors.push({
      code: "missing_calibration_identity",
      message: "Calibration identity is required.",
      field: "identity",
    })
  }

  const scope = isRecord(input.identity)
    ? validateCalibrationScope(input.identity.scope)
    : { success: false as const, errors: [] }
  if (scope.success === false) errors.push(...scope.errors)

  const evidence = [] as CalibrationRecord["evidence"][number][]
  const learningIds = new Set<string>()
  const patternIds = new Set<string>()
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    errors.push({
      code: "missing_evidence_reference",
      message: "Calibration requires Learning and Pattern evidence.",
      field: "evidence",
    })
  } else {
    for (let index = 0; index < input.evidence.length; index += 1) {
      const result = validateCalibrationEvidence(input.evidence[index])
      if (result.success === false) {
        errors.push(...result.errors.map((error) => ({ ...error, field: `evidence[${index}]` })))
        continue
      }
      const id = result.value.evidenceType === "LEARNING"
        ? result.value.learning.identity.learningId
        : result.value.pattern.identity.patternId
      const seen = result.value.evidenceType === "LEARNING" ? learningIds : patternIds
      if (seen.has(id)) {
        errors.push({
          code: "duplicate_evidence_reference",
          message: `Duplicate ${result.value.evidenceType} evidence ${id}.`,
          field: `evidence[${index}]`,
        })
      }
      seen.add(id)
      evidence.push(result.value)
    }
  }
  if (learningIds.size === 0 || patternIds.size === 0) {
    errors.push({
      code: "missing_evidence_reference",
      message: "Calibration requires at least one Learning and one Pattern record.",
      field: "evidence",
    })
  }

  if (scope.success && evidence.length > 0) {
    for (const [index, item] of evidence.entries()) {
      const itemScope = item.evidenceType === "LEARNING"
        ? item.learning.identity.scope
        : item.pattern.identity.scope
      const itemCreatedAt = item.evidenceType === "LEARNING"
        ? item.learning.createdAt
        : item.pattern.createdAt
      const selectors = [
        ["symbol", scope.value.symbol, itemScope.symbol],
        ["timeframe", scope.value.timeframe, itemScope.timeframe],
        ["direction", scope.value.direction, itemScope.direction],
      ] as const
      for (const [field, expected, actual] of selectors) {
        if (expected !== null && expected !== actual) {
          errors.push({
            code: "invalid_scope",
            message: `Evidence does not match Calibration scope ${field}.`,
            field: `evidence[${index}]`,
          })
        }
      }
      if (scope.value.dateRange
        && (Date.parse(itemCreatedAt) < Date.parse(scope.value.dateRange.from)
          || Date.parse(itemCreatedAt) > Date.parse(scope.value.dateRange.to))) {
        errors.push({
          code: "invalid_scope",
          message: "Evidence creation time is outside Calibration scope dateRange.",
          field: `evidence[${index}]`,
        })
      }
      if (isTimestamp(input.createdAt)
        && Date.parse(input.createdAt) < Date.parse(itemCreatedAt)) {
        errors.push({
          code: "invalid_timestamp",
          message: "Calibration createdAt cannot precede its evidence.",
          field: "createdAt",
        })
      }
      if (item.evidenceType === "LEARNING" && !isLearningStatus(item.learning.status)) {
        errors.push({
          code: "invalid_evidence_reference",
          message: "Learning evidence status is invalid.",
          field: `evidence[${index}]`,
        })
      }
      if (item.evidenceType === "PATTERN" && !isPatternStatus(item.pattern.status)) {
        errors.push({
          code: "invalid_evidence_reference",
          message: "Pattern evidence status is invalid.",
          field: `evidence[${index}]`,
        })
      }
    }
  }

  const maximumSampleSize = evidence.reduce((total, item) => (
    total + (item.evidenceType === "LEARNING"
      ? item.learning.conclusion.sampleSize
      : item.pattern.metricSummary.sampleSize)
  ), 0)
  const calibration = validateCalibrationModel(input.calibration, maximumSampleSize)
  if (calibration.success === false) errors.push(...calibration.errors)

  if (isRecord(input.identity) && scope.success && learningIds.size > 0 && patternIds.size > 0) {
    const expected = createCalibrationIdentity(
      input.identity.calibrationVersion as number,
      scope.value,
      evidence,
    )
    if (expected.success === false) {
      errors.push(...expected.errors)
    } else if (input.identity.calibrationId !== expected.value.calibrationId
      || input.identity.learningSetHash !== expected.value.learningSetHash
      || input.identity.patternSetHash !== expected.value.patternSetHash
      || canonicalCalibrationScope(input.identity.scope as CalibrationScope)
        !== canonicalCalibrationScope(expected.value.scope)) {
      errors.push({
        code: "identity_mismatch",
        message: "Calibration identity does not match version, scope, and evidence sets.",
        field: "identity",
      })
    }
    if (typeof input.identity.calibrationId === "string"
      && existingCalibrationIds.has(input.identity.calibrationId)) {
      errors.push({
        code: "duplicate_calibration_identity",
        message: `Calibration identity ${input.identity.calibrationId} already exists.`,
        field: "identity.calibrationId",
      })
    }
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as CalibrationRecord }
}
