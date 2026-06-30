import { isSignalDirection } from "@/lib/signal-evaluation"
import { validatePlaybookEvidence } from "@/lib/playbook-runtime/evidence"
import {
  canonicalPlaybookScope,
  createPlaybookIdentity,
} from "@/lib/playbook-runtime/identity"
import {
  PLAYBOOK_SCHEMA_VERSION,
  PLAYBOOK_STATUSES,
  type PlaybookError,
  type PlaybookRecord,
  type PlaybookResult,
  type PlaybookRule,
  type PlaybookScope,
  type PlaybookValidationResult,
} from "@/lib/playbook-runtime/types"

type UnknownRecord = Record<string, unknown>

const STATUS_SET = new Set<string>(PLAYBOOK_STATUSES)

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function validateStringArray(
  value: unknown,
  field: string,
  errors: PlaybookError[],
): readonly string[] {
  if (!Array.isArray(value) || value.length === 0
    || value.some((item) => !isNonEmptyString(item))) {
    errors.push({
      code: "malformed_rule",
      message: `${field} must contain caller-supplied non-empty strings.`,
      field,
    })
    return []
  }
  if (new Set(value).size !== value.length) {
    errors.push({
      code: "malformed_rule",
      message: `${field} contains duplicate values.`,
      field,
    })
  }
  return value as readonly string[]
}

export function validatePlaybookScope(input: unknown): PlaybookResult<PlaybookScope> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "invalid_scope", message: "Playbook scope must be an object." }],
    }
  }
  const errors: PlaybookError[] = []
  for (const field of ["symbol", "timeframe"] as const) {
    if (input[field] !== null && !isNonEmptyString(input[field])) {
      errors.push({
        code: "invalid_scope",
        message: `Playbook scope ${field} must be non-empty or null.`,
        field: `scope.${field}`,
      })
    }
  }
  if (input.direction !== null && !isSignalDirection(input.direction)) {
    errors.push({ code: "invalid_scope", message: "Playbook direction is invalid.", field: "scope.direction" })
  }
  if (input.dateRange !== null) {
    if (!isRecord(input.dateRange)
      || !isTimestamp(input.dateRange.from)
      || !isTimestamp(input.dateRange.to)
      || Date.parse(input.dateRange.from) > Date.parse(input.dateRange.to)) {
      errors.push({
        code: "invalid_scope",
        message: "Playbook dateRange requires ordered valid timestamps or null.",
        field: "scope.dateRange",
      })
    }
  }
  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as PlaybookScope }
}

export function validatePlaybookRule(
  input: unknown,
  learningIds: ReadonlySet<string>,
  calibrationIds: ReadonlySet<string>,
): PlaybookResult<PlaybookRule> {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_rule", message: "Playbook rule must be an object." }],
    }
  }
  const errors: PlaybookError[] = []
  for (const field of ["title", "summary"] as const) {
    if (!isNonEmptyString(input[field])) {
      errors.push({
        code: "malformed_rule",
        message: `Playbook rule requires ${field}.`,
        field: `rule.${field}`,
      })
    }
  }
  for (const field of [
    "applicableConditions",
    "entryConditions",
    "exitConditions",
    "riskConditions",
    "invalidationConditions",
    "failureConditions",
  ] as const) {
    validateStringArray(input[field], `rule.${field}`, errors)
  }
  const supportingLearning = validateStringArray(
    input.supportingLearningIds,
    "rule.supportingLearningIds",
    errors,
  )
  const supportingCalibration = validateStringArray(
    input.supportingCalibrationIds,
    "rule.supportingCalibrationIds",
    errors,
  )
  if (supportingLearning.some((id) => !learningIds.has(id))) {
    errors.push({
      code: "invalid_evidence_reference",
      message: "Rule references Learning evidence outside the Playbook.",
      field: "rule.supportingLearningIds",
    })
  }
  if (supportingCalibration.some((id) => !calibrationIds.has(id))) {
    errors.push({
      code: "invalid_evidence_reference",
      message: "Rule references Calibration evidence outside the Playbook.",
      field: "rule.supportingCalibrationIds",
    })
  }
  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as PlaybookRule }
}

export function validatePlaybookRecord(
  input: unknown,
  existingPlaybookIds: ReadonlySet<string> = new Set<string>(),
): PlaybookValidationResult {
  if (!isRecord(input)) {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Playbook Record must be an object." }],
    }
  }
  const errors: PlaybookError[] = []
  if (input.schemaVersion !== PLAYBOOK_SCHEMA_VERSION) {
    errors.push({
      code: "unsupported_schema_version",
      message: `Only Playbook schema version ${PLAYBOOK_SCHEMA_VERSION} is supported.`,
      field: "schemaVersion",
    })
  }
  if (!isTimestamp(input.createdAt)) {
    errors.push({ code: "invalid_timestamp", message: "Playbook createdAt is invalid.", field: "createdAt" })
  }
  if (!isRecord(input.identity)) {
    errors.push({
      code: "missing_playbook_identity",
      message: "Playbook identity is required.",
      field: "identity",
    })
  }
  if (!isRecord(input.lifecycle)
    || typeof input.lifecycle.status !== "string"
    || !STATUS_SET.has(input.lifecycle.status)) {
    errors.push({
      code: "invalid_lifecycle",
      message: "Playbook lifecycle is invalid.",
      field: "lifecycle",
    })
  } else {
    const decided = input.lifecycle.decision === "APPROVED"
      || input.lifecycle.decision === "REJECTED"
    const terminalDecisionState = input.lifecycle.status === "APPROVED"
      || input.lifecycle.status === "REJECTED"
      || input.lifecycle.status === "SUPERSEDED"
      || input.lifecycle.status === "ARCHIVED"
    if (terminalDecisionState !== decided
      || (decided && (!isNonEmptyString(input.lifecycle.decidedBy)
        || !isTimestamp(input.lifecycle.decidedAt)
        || (isTimestamp(input.createdAt)
          && Date.parse(input.lifecycle.decidedAt) < Date.parse(input.createdAt))))
      || (!decided && (input.lifecycle.decidedBy !== null || input.lifecycle.decidedAt !== null))) {
      errors.push({
        code: "invalid_lifecycle",
        message: "Playbook decision metadata does not match lifecycle state.",
        field: "lifecycle",
      })
    }
    if (input.lifecycle.status === "APPROVED" && input.lifecycle.decision !== "APPROVED") {
      errors.push({ code: "invalid_lifecycle", message: "APPROVED requires approval metadata.", field: "lifecycle" })
    }
    if (input.lifecycle.status === "REJECTED" && input.lifecycle.decision !== "REJECTED") {
      errors.push({ code: "invalid_lifecycle", message: "REJECTED requires rejection metadata.", field: "lifecycle" })
    }
  }

  const scope = isRecord(input.identity)
    ? validatePlaybookScope(input.identity.scope)
    : { success: false as const, errors: [] }
  if (scope.success === false) errors.push(...scope.errors)

  const evidence = [] as PlaybookRecord["evidence"][number][]
  const learningIds = new Set<string>()
  const calibrationIds = new Set<string>()
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    errors.push({
      code: "missing_learning_reference",
      message: "Playbook requires Learning and Calibration evidence.",
      field: "evidence",
    })
  } else {
    for (let index = 0; index < input.evidence.length; index += 1) {
      const result = validatePlaybookEvidence(input.evidence[index])
      if (result.success === false) {
        errors.push(...result.errors.map((error) => ({ ...error, field: `evidence[${index}]` })))
        continue
      }
      const id = result.value.evidenceType === "LEARNING"
        ? result.value.learning.identity.learningId
        : result.value.calibration.identity.calibrationId
      const seen = result.value.evidenceType === "LEARNING" ? learningIds : calibrationIds
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
  if (learningIds.size === 0) {
    errors.push({
      code: "missing_learning_reference",
      message: "Playbook requires at least one VALIDATED Learning record.",
      field: "evidence",
    })
  }
  if (calibrationIds.size === 0) {
    errors.push({
      code: "missing_calibration_reference",
      message: "Playbook requires at least one VALIDATED Calibration record.",
      field: "evidence",
    })
  }

  if (scope.success && evidence.length > 0) {
    for (const [index, item] of evidence.entries()) {
      const itemScope = item.evidenceType === "LEARNING"
        ? item.learning.identity.scope
        : item.calibration.identity.scope
      const itemCreatedAt = item.evidenceType === "LEARNING"
        ? item.learning.createdAt
        : item.calibration.createdAt
      for (const [field, expected, actual] of [
        ["symbol", scope.value.symbol, itemScope.symbol],
        ["timeframe", scope.value.timeframe, itemScope.timeframe],
        ["direction", scope.value.direction, itemScope.direction],
      ] as const) {
        if (expected !== null && expected !== actual) {
          errors.push({
            code: "invalid_scope",
            message: `Evidence does not match Playbook scope ${field}.`,
            field: `evidence[${index}]`,
          })
        }
      }
      if (scope.value.dateRange
        && (Date.parse(itemCreatedAt) < Date.parse(scope.value.dateRange.from)
          || Date.parse(itemCreatedAt) > Date.parse(scope.value.dateRange.to))) {
        errors.push({
          code: "invalid_scope",
          message: "Evidence creation time is outside Playbook scope dateRange.",
          field: `evidence[${index}]`,
        })
      }
      if (isTimestamp(input.createdAt)
        && Date.parse(input.createdAt) < Date.parse(itemCreatedAt)) {
        errors.push({
          code: "invalid_timestamp",
          message: "Playbook createdAt cannot precede its evidence.",
          field: "createdAt",
        })
      }
    }
  }

  const rules: PlaybookRule[] = []
  const supportedLearning = new Set<string>()
  const supportedCalibration = new Set<string>()
  if (!Array.isArray(input.rules) || input.rules.length === 0) {
    errors.push({ code: "malformed_rule", message: "Playbook requires at least one rule.", field: "rules" })
  } else {
    const titles = new Set<string>()
    for (let index = 0; index < input.rules.length; index += 1) {
      const result = validatePlaybookRule(input.rules[index], learningIds, calibrationIds)
      if (result.success === false) {
        errors.push(...result.errors.map((error) => ({ ...error, field: `rules[${index}]` })))
        continue
      }
      if (titles.has(result.value.title)) {
        errors.push({
          code: "malformed_rule",
          message: `Duplicate Playbook rule title ${result.value.title}.`,
          field: `rules[${index}].title`,
        })
      }
      titles.add(result.value.title)
      result.value.supportingLearningIds.forEach((id) => supportedLearning.add(id))
      result.value.supportingCalibrationIds.forEach((id) => supportedCalibration.add(id))
      rules.push(result.value)
    }
  }
  if ([...learningIds].some((id) => !supportedLearning.has(id))) {
    errors.push({
      code: "invalid_evidence_reference",
      message: "Every Learning evidence record must support at least one rule.",
      field: "rules",
    })
  }
  if ([...calibrationIds].some((id) => !supportedCalibration.has(id))) {
    errors.push({
      code: "invalid_evidence_reference",
      message: "Every Calibration evidence record must support at least one rule.",
      field: "rules",
    })
  }

  if (isRecord(input.identity) && scope.success
    && learningIds.size > 0 && calibrationIds.size > 0) {
    const expected = createPlaybookIdentity(
      input.identity.playbookVersion as number,
      scope.value,
      evidence,
    )
    if (expected.success === false) {
      errors.push(...expected.errors)
    } else if (input.identity.playbookId !== expected.value.playbookId
      || input.identity.learningSetHash !== expected.value.learningSetHash
      || input.identity.calibrationSetHash !== expected.value.calibrationSetHash
      || canonicalPlaybookScope(input.identity.scope as PlaybookScope)
        !== canonicalPlaybookScope(expected.value.scope)) {
      errors.push({
        code: "identity_mismatch",
        message: "Playbook identity does not match version, scope, and evidence sets.",
        field: "identity",
      })
    }
    if (typeof input.identity.playbookId === "string"
      && existingPlaybookIds.has(input.identity.playbookId)) {
      errors.push({
        code: "duplicate_playbook_identity",
        message: `Playbook identity ${input.identity.playbookId} already exists.`,
        field: "identity.playbookId",
      })
    }
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, value: input as unknown as PlaybookRecord }
}
