import { createPatternEvidence } from "@/lib/pattern-runtime/evidence"
import { createPatternIdentity } from "@/lib/pattern-runtime/identity"
import {
  PATTERN_SCHEMA_VERSION,
  type CreatePatternInput,
  type PatternEvidence,
  type PatternRecord,
  type PatternResult,
} from "@/lib/pattern-runtime/types"
import { validatePatternRecord } from "@/lib/pattern-runtime/validation"

export function freezePatternRecord(pattern: PatternRecord): PatternRecord {
  return Object.freeze({
    ...pattern,
    identity: Object.freeze({
      ...pattern.identity,
      scope: Object.freeze({
        ...pattern.identity.scope,
        dateRange: pattern.identity.scope.dateRange
          ? Object.freeze({ ...pattern.identity.scope.dateRange })
          : null,
      }),
    }),
    evidence: Object.freeze(pattern.evidence.map((item) => Object.freeze({ ...item }))),
    metricSummary: Object.freeze({
      ...pattern.metricSummary,
      drawdownProfile: Object.freeze({ ...pattern.metricSummary.drawdownProfile }),
      windowDistribution: Object.freeze(pattern.metricSummary.windowDistribution.map(
        (entry) => Object.freeze({ ...entry }),
      )),
      directionDistribution: Object.freeze(pattern.metricSummary.directionDistribution.map(
        (entry) => Object.freeze({ ...entry }),
      )),
    }),
  })
}

export function createPattern(
  input: CreatePatternInput,
): PatternResult<PatternRecord> {
  if (!input || typeof input !== "object" || !Array.isArray(input.historicalMemory)) {
    return {
      success: false,
      errors: [{
        code: "malformed_input",
        message: "Pattern creation requires Historical Memory records.",
        field: "historicalMemory",
      }],
    }
  }
  const evidence: PatternEvidence[] = []
  for (let index = 0; index < input.historicalMemory.length; index += 1) {
    const result = createPatternEvidence(input.historicalMemory[index])
    if (result.success === false) return result
    evidence.push(result.value)
  }
  const identity = createPatternIdentity(input.patternVersion, input.scope, evidence)
  if (identity.success === false) return identity

  const pattern: PatternRecord = {
    schemaVersion: PATTERN_SCHEMA_VERSION,
    identity: identity.value,
    status: "DRAFT",
    createdAt: input.createdAt,
    interpretation: input.interpretation,
    evidence: [...evidence].sort((left, right) => left.memoryId.localeCompare(right.memoryId)),
    metricSummary: input.metricSummary,
  }
  const validation = validatePatternRecord(pattern, input.existingPatternIds)
  if (validation.success === false) return validation
  return { success: true, value: freezePatternRecord(validation.value) }
}
