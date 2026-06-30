import { canReachPlaybookStatus } from "@/lib/playbook-runtime/lifecycle"
import { canonicalPlaybookScope } from "@/lib/playbook-runtime/identity"
import { freezePlaybookRecord } from "@/lib/playbook-runtime/playbook"
import type { PlaybookRecord, PlaybookResult } from "@/lib/playbook-runtime/types"
import { validatePlaybookRecord } from "@/lib/playbook-runtime/validation"

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    )
  }
  return value
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
}

function evidenceIds(record: PlaybookRecord): {
  learning: ReadonlySet<string>
  calibration: ReadonlySet<string>
} {
  const learning = new Set<string>()
  const calibration = new Set<string>()
  for (const item of record.evidence) {
    if (item.evidenceType === "LEARNING") learning.add(item.learning.identity.learningId)
    else calibration.add(item.calibration.identity.calibrationId)
  }
  return { learning, calibration }
}

function retainsEvidence(newer: PlaybookRecord, older: PlaybookRecord): boolean {
  const next = evidenceIds(newer)
  const previous = evidenceIds(older)
  return [...previous.learning].every((id) => next.learning.has(id))
    && [...previous.calibration].every((id) => next.calibration.has(id))
}

export function mergePlaybookRecords(
  leftInput: PlaybookRecord,
  rightInput: PlaybookRecord,
): PlaybookResult<PlaybookRecord> {
  const left = validatePlaybookRecord(leftInput)
  if (left.success === false) return left
  const right = validatePlaybookRecord(rightInput)
  if (right.success === false) return right
  if (canonicalPlaybookScope(left.value.identity.scope)
    !== canonicalPlaybookScope(right.value.identity.scope)) {
    return {
      success: false,
      errors: [{
        code: "identity_mismatch",
        message: "Playbooks with different scopes cannot be merged.",
        field: "identity.scope",
      }],
    }
  }

  if (left.value.identity.playbookVersion !== right.value.identity.playbookVersion) {
    const newer = left.value.identity.playbookVersion > right.value.identity.playbookVersion
      ? left.value
      : right.value
    const older = newer === left.value ? right.value : left.value
    if (!retainsEvidence(newer, older)) {
      return {
        success: false,
        errors: [{
          code: "version_required",
          message: "A newer Playbook version must retain all prior evidence references.",
          field: "evidence",
        }],
      }
    }
    return { success: true, value: freezePlaybookRecord(newer) }
  }

  if (left.value.identity.playbookId !== right.value.identity.playbookId
    || !sameValue(left.value.identity, right.value.identity)
    || left.value.createdAt !== right.value.createdAt
    || !sameValue(left.value.evidence, right.value.evidence)
    || !sameValue(left.value.rules, right.value.rules)) {
    return {
      success: false,
      errors: [{
        code: "immutable_rule_conflict",
        message: "Playbook rules or evidence changes require a new version.",
        field: "identity.playbookVersion",
      }],
    }
  }

  let lifecycle = left.value.lifecycle
  if (canReachPlaybookStatus(left.value.lifecycle.status, right.value.lifecycle.status)) {
    lifecycle = right.value.lifecycle
  } else if (!canReachPlaybookStatus(right.value.lifecycle.status, left.value.lifecycle.status)) {
    return {
      success: false,
      errors: [{
        code: "invalid_lifecycle",
        message: "Playbook lifecycle branches cannot merge within one version.",
        field: "lifecycle.status",
      }],
    }
  }
  const merged: PlaybookRecord = { ...left.value, lifecycle }
  const validation = validatePlaybookRecord(merged)
  if (validation.success === false) return validation
  return { success: true, value: freezePlaybookRecord(validation.value) }
}
