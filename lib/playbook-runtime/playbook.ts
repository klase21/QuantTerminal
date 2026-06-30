import { freezeCalibrationRecord } from "@/lib/confidence-calibration"
import { freezeLearningRecord } from "@/lib/learning-runtime"
import {
  createPlaybookCalibrationEvidence,
  createPlaybookLearningEvidence,
} from "@/lib/playbook-runtime/evidence"
import { createPlaybookIdentity } from "@/lib/playbook-runtime/identity"
import {
  PLAYBOOK_SCHEMA_VERSION,
  type CreatePlaybookInput,
  type PlaybookEvidence,
  type PlaybookRecord,
  type PlaybookResult,
} from "@/lib/playbook-runtime/types"
import { validatePlaybookRecord } from "@/lib/playbook-runtime/validation"

export function freezePlaybookRecord(record: PlaybookRecord): PlaybookRecord {
  return Object.freeze({
    ...record,
    identity: Object.freeze({
      ...record.identity,
      scope: Object.freeze({
        ...record.identity.scope,
        dateRange: record.identity.scope.dateRange
          ? Object.freeze({ ...record.identity.scope.dateRange })
          : null,
      }),
    }),
    lifecycle: Object.freeze({ ...record.lifecycle }),
    evidence: Object.freeze(record.evidence.map((item) => (
      item.evidenceType === "LEARNING"
        ? Object.freeze({
          evidenceType: "LEARNING" as const,
          learning: freezeLearningRecord(item.learning),
        })
        : Object.freeze({
          evidenceType: "CALIBRATION" as const,
          calibration: freezeCalibrationRecord(item.calibration),
        })
    ))),
    rules: Object.freeze(record.rules.map((rule) => Object.freeze({
      ...rule,
      applicableConditions: Object.freeze([...rule.applicableConditions]),
      entryConditions: Object.freeze([...rule.entryConditions]),
      exitConditions: Object.freeze([...rule.exitConditions]),
      riskConditions: Object.freeze([...rule.riskConditions]),
      invalidationConditions: Object.freeze([...rule.invalidationConditions]),
      failureConditions: Object.freeze([...rule.failureConditions]),
      supportingLearningIds: Object.freeze([...rule.supportingLearningIds]),
      supportingCalibrationIds: Object.freeze([...rule.supportingCalibrationIds]),
    }))),
  })
}

export function createPlaybook(
  input: CreatePlaybookInput,
): PlaybookResult<PlaybookRecord> {
  if (!input || typeof input !== "object"
    || !Array.isArray(input.learningRecords)
    || !Array.isArray(input.calibrationRecords)) {
    return {
      success: false,
      errors: [{
        code: "malformed_input",
        message: "Playbook requires validated Learning and Calibration records.",
        field: "evidence",
      }],
    }
  }
  const evidence: PlaybookEvidence[] = []
  for (const learning of input.learningRecords) {
    const result = createPlaybookLearningEvidence(learning)
    if (result.success === false) return result
    evidence.push(result.value)
  }
  for (const calibration of input.calibrationRecords) {
    const result = createPlaybookCalibrationEvidence(calibration)
    if (result.success === false) return result
    evidence.push(result.value)
  }
  evidence.sort((left, right) => {
    const leftId = left.evidenceType === "LEARNING"
      ? left.learning.identity.learningId
      : left.calibration.identity.calibrationId
    const rightId = right.evidenceType === "LEARNING"
      ? right.learning.identity.learningId
      : right.calibration.identity.calibrationId
    return `${left.evidenceType}|${leftId}`.localeCompare(`${right.evidenceType}|${rightId}`)
  })
  const identity = createPlaybookIdentity(input.playbookVersion, input.scope, evidence)
  if (identity.success === false) return identity
  const record: PlaybookRecord = {
    schemaVersion: PLAYBOOK_SCHEMA_VERSION,
    identity: identity.value,
    lifecycle: {
      status: "DRAFT",
      decision: null,
      decidedBy: null,
      decidedAt: null,
    },
    createdAt: input.createdAt,
    evidence,
    rules: input.rules,
  }
  const validation = validatePlaybookRecord(record, input.existingPlaybookIds)
  if (validation.success === false) return validation
  return { success: true, value: freezePlaybookRecord(validation.value) }
}
