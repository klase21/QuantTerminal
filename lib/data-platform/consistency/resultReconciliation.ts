import { consistencyResultChecksum, consistencyResultTemporalReference, createConsistencyResultIdentity, orderedConsistencyResultInputs } from "./resultIdentity"
import type { ConsistencyResult, ConsistencyResultConflict, ConsistencyResultReconciliation, ConsistencyResultRunReference, ConsistencyResultWriteRequest } from "./resultContracts"

export function reconcileConsistencyResult(result: ConsistencyResult, request: ConsistencyResultWriteRequest, runReferences: readonly ConsistencyResultRunReference[], conflicts: readonly ConsistencyResultConflict[] = []): ConsistencyResultReconciliation {
  const reasons: ConsistencyResultReconciliation["reasonCodes"][number][] = []
  const identity = createConsistencyResultIdentity(request)
  const temporal = consistencyResultTemporalReference(request.alignment)
  const { checksum: _checksum, createdAt: _createdAt, ...material } = result
  if (consistencyResultChecksum(material) !== result.checksum) reasons.push("RESULT_CHECKSUM_MISMATCH")
  if (identity.resultId !== result.resultId || identity.resultIdentity !== result.resultIdentity) reasons.push("RESULT_IDENTITY_MISMATCH")
  if (identity.inputSetIdentity !== result.inputSetIdentity) reasons.push("INPUT_SET_IDENTITY_MISMATCH")
  if (JSON.stringify(orderedConsistencyResultInputs(request.inputs)) !== JSON.stringify(orderedConsistencyResultInputs(result.inputs))) reasons.push("INPUT_REFERENCE_MISMATCH")
  if (result.ruleId !== request.ruleId || result.ruleVersion !== request.ruleVersion) reasons.push("RULE_BINDING_MISMATCH")
  if (result.ruleSetId !== request.runSpecification.ruleSetId || result.ruleSetVersion !== request.runSpecification.ruleSetVersion) reasons.push("RULESET_BINDING_MISMATCH")
  if (result.temporalAlignmentId !== temporal.alignmentId || result.temporalAlignmentChecksum !== temporal.alignmentChecksum) reasons.push("TEMPORAL_ALIGNMENT_MISMATCH")
  if (result.eventTimeWindow.start !== request.runSpecification.eventTimeStart || result.eventTimeWindow.end !== request.runSpecification.eventTimeEnd) reasons.push("EVENT_TIME_MISMATCH")
  if (result.knowledgeMode !== request.runSpecification.knowledgeMode || result.knowledgeTimeCutoff !== request.runSpecification.knowledgeTimeCutoff) reasons.push("KNOWLEDGE_TIME_MISMATCH")
  if (JSON.stringify(result.policyBindings) !== JSON.stringify(request.policyBindings)) reasons.push("POLICY_BINDING_MISMATCH")
  const diagnosticDigest = (diagnostics: typeof result.diagnostics) => canonicalChecksum([...diagnostics].map((diagnostic) => ({ ...diagnostic, inputRoleIds: [...diagnostic.inputRoleIds].sort(), boundedValues: [...diagnostic.boundedValues].sort((left, right) => canonicalChecksum(left).localeCompare(canonicalChecksum(right))) })).sort((left, right) => left.diagnosticId.localeCompare(right.diagnosticId)))
  if (diagnosticDigest(result.diagnostics) !== diagnosticDigest(request.diagnostics)) reasons.push("DIAGNOSTIC_MISMATCH")
  if (!runReferences.some((reference) => reference.resultId === result.resultId && reference.runId === request.runSpecification.runId && reference.runSpecificationChecksum === request.runSpecification.specificationChecksum && reference.sourceAlignmentId === request.alignment.alignmentId && reference.sourceAlignmentChecksum === request.alignment.checksum)) reasons.push("RUN_REFERENCE_MISMATCH")
  if (conflicts.some((conflict) => conflict.resultIdentity !== result.resultIdentity || conflict.existingResultId !== result.resultId || conflict.existingChecksum !== result.checksum)) reasons.push("CONFLICT_AUDIT_MISMATCH")
  return Object.freeze({ consistent: reasons.length === 0, reasonCodes: Object.freeze(reasons), affectedIdentities: Object.freeze([result.resultId, result.resultIdentity, request.runSpecification.runId]) })
}
import { canonicalChecksum } from "@/lib/data-platform/contracts"
