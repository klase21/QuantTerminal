import { normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import { consistencyResultChecksum, consistencyResultTemporalReference, createConsistencyResultIdentity, orderedConsistencyResultInputs } from "./resultIdentity"
import { temporalOutcomeChecksum } from "./temporalIdentity"
import type { ConsistencyResult, ConsistencyResultInputReference, ConsistencyResultWriteFailure, ConsistencyResultWriteRequest } from "./resultContracts"

const HEX64 = /^[0-9a-f]{64}$/
const inputKey = (input: ConsistencyResultInputReference) => `${input.roleId}:${input.canonicalRecordId}:${input.recordVersion}:${input.checksum}`

export function validateConsistencyResultRequest(request: ConsistencyResultWriteRequest): ConsistencyResultWriteFailure | null {
  const run = request.runSpecification
  const alignment = request.alignment
  if (alignment.runId !== run.runId || alignment.runSpecificationChecksum !== run.specificationChecksum) return "RUN_SPECIFICATION_MISMATCH"
  if (alignment.eventTimeWindow.start !== run.eventTimeStart || alignment.eventTimeWindow.end !== run.eventTimeEnd || alignment.knowledgeTime.mode !== run.knowledgeMode || alignment.knowledgeTime.cutoff !== run.knowledgeTimeCutoff) return "TEMPORAL_ALIGNMENT_MISMATCH"
  if (request.policyBindings.temporalPolicyId !== run.policyBindings.temporalPolicyId || request.policyBindings.temporalPolicyVersion !== run.policyBindings.temporalPolicyVersion || request.policyBindings.severityPolicyId !== run.policyBindings.severityPolicyId || request.policyBindings.severityPolicyVersion !== run.policyBindings.severityPolicyVersion || JSON.stringify(request.policyBindings.comparisonPolicyReferences) !== JSON.stringify(run.policyBindings.comparisonPolicyReferences)) return "POLICY_BINDING_MISMATCH"
  const { checksum: _checksum, createdAt: _createdAt, ...alignmentMaterial } = alignment
  if (temporalOutcomeChecksum(alignmentMaterial) !== alignment.checksum) return "TEMPORAL_OUTCOME_INVALID"
  if (!request.ruleId.trim() || !request.ruleVersion.trim() || !request.schemaVersion.trim() || !request.diagnosticSchemaVersion.trim()) return "RESULT_CONTENT_INVALID"
  if (!request.inputs.length || request.inputs.some((input) => input.recordVersion < 1 || !input.canonicalRecordId.trim() || !input.roleId.trim() || !input.datasetId.trim() || !input.providerId.trim() || !input.providerSnapshotId.trim() || !input.lineageNodeId.trim() || !HEX64.test(input.checksum) || !Number.isFinite(Date.parse(input.observedAt)) || !Number.isFinite(Date.parse(input.knowledgeAvailableAt)))) return "INPUT_REFERENCE_INVALID"
  const selected = new Map(alignment.selectedInputs.map((input) => [`${input.roleId}:${input.fact.canonicalRecordId}:${input.fact.recordVersion}:${input.checksum}`, input]))
  if (request.inputs.length !== selected.size || request.inputs.some((input) => { const aligned = selected.get(inputKey(input)); return !aligned || input.datasetId !== aligned.fact.datasetId || input.providerId !== aligned.providerId || input.effectiveAt !== aligned.effectiveAt || input.observedAt !== aligned.observedAt || input.knowledgeAvailableAt !== aligned.knowledgeAvailableAt || input.publicationState !== aligned.publicationState || input.supersessionState !== aligned.supersessionState })) return "INPUT_REFERENCE_MISMATCH"
  if (run.knowledgeMode === "AS_KNOWN_THEN" && request.inputs.some((input) => Date.parse(input.knowledgeAvailableAt) > Date.parse(run.knowledgeTimeCutoff))) return "FUTURE_KNOWLEDGE_INPUT"
  if (alignment.status === "BLOCKED_FUTURE_KNOWLEDGE" && request.outcome !== "BLOCKED_FUTURE_KNOWLEDGE") return "TEMPORAL_OUTCOME_INVALID"
  if (alignment.status === "BLOCKED_MISSING_INPUT" && request.outcome !== "BLOCKED_MISSING_INPUT") return "TEMPORAL_OUTCOME_INVALID"
  if (alignment.status === "BLOCKED_INVALID_INPUT" && request.outcome !== "BLOCKED_INVALID_INPUT") return "TEMPORAL_OUTCOME_INVALID"
  if (request.outcome.startsWith("BLOCKED_") !== request.blocking) return "RESULT_CONTENT_INVALID"
  return null
}

export function createImmutableConsistencyResult(request: ConsistencyResultWriteRequest): ConsistencyResult {
  const failure = validateConsistencyResultRequest(request)
  if (failure) throw new Error(failure)
  const identity = createConsistencyResultIdentity(request)
  const temporal = consistencyResultTemporalReference(request.alignment)
  const material = {
    ...identity, ruleId: request.ruleId, ruleVersion: request.ruleVersion,
    ruleSetId: request.runSpecification.ruleSetId, ruleSetVersion: request.runSpecification.ruleSetVersion,
    temporalAlignmentId: temporal.alignmentId, temporalAlignmentChecksum: temporal.alignmentChecksum,
    inputs: orderedConsistencyResultInputs(request.inputs), outcome: request.outcome, severity: request.severity, blocking: request.blocking,
    diagnostics: Object.freeze([...request.diagnostics]), eventTimeWindow: Object.freeze({ ...request.alignment.eventTimeWindow }),
    knowledgeMode: request.alignment.knowledgeTime.mode, knowledgeTimeCutoff: request.alignment.knowledgeTime.cutoff,
    policyBindings: Object.freeze({ ...request.policyBindings, comparisonPolicyReferences: Object.freeze([...request.policyBindings.comparisonPolicyReferences]) }),
    diagnosticSchemaVersion: request.diagnosticSchemaVersion, schemaVersion: request.schemaVersion,
  }
  return Object.freeze({ ...material, checksum: consistencyResultChecksum(material), createdAt: normalizeIsoTimestamp(request.createdAt) })
}
