import { canonicalChecksum, normalizeIdentifier, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import type { TemporalAlignmentOutcome } from "./temporalContracts"
import type { ConsistencyResult, ConsistencyResultIdentity, ConsistencyResultInputReference, ConsistencyResultWriteRequest } from "./resultContracts"

function orderedInput(input: ConsistencyResultInputReference) {
  return {
    roleId: normalizeIdentifier(input.roleId), canonicalRecordId: input.canonicalRecordId, recordVersion: input.recordVersion,
    datasetId: normalizeIdentifier(input.datasetId), providerId: normalizeIdentifier(input.providerId), providerSnapshotId: input.providerSnapshotId,
    effectiveAt: input.effectiveAt ? normalizeIsoTimestamp(input.effectiveAt) : null, observedAt: normalizeIsoTimestamp(input.observedAt),
    knowledgeAvailableAt: normalizeIsoTimestamp(input.knowledgeAvailableAt), publicationState: input.publicationState,
    supersessionState: input.supersessionState, checksum: input.checksum, lineageNodeId: input.lineageNodeId,
  }
}

export function orderedConsistencyResultInputs(inputs: readonly ConsistencyResultInputReference[]) {
  return Object.freeze(inputs.map(orderedInput).sort((left, right) => canonicalChecksum(left).localeCompare(canonicalChecksum(right))))
}

export function consistencyResultTemporalReference(alignment: TemporalAlignmentOutcome): { readonly alignmentId: string; readonly alignmentChecksum: string } {
  const material = {
    mode: alignment.mode, selectedInputs: alignment.selectedInputs, rejectedInputs: alignment.rejectedInputs,
    status: alignment.status, blocking: alignment.blocking, reasonCodes: alignment.reasonCodes,
    eventTimeWindow: alignment.eventTimeWindow, knowledgeTime: alignment.knowledgeTime, policy: alignment.policy,
    noLookaheadDecisions: alignment.noLookaheadDecisions, diagnostics: alignment.diagnostics,
  }
  const alignmentChecksum = canonicalChecksum(material)
  return Object.freeze({ alignmentId: "rtalign_" + alignmentChecksum, alignmentChecksum })
}

export function createConsistencyResultIdentity(request: ConsistencyResultWriteRequest): ConsistencyResultIdentity {
  if (!request.inputs.length) throw new Error("RESULT_INPUTS_REQUIRED")
  const inputs = orderedConsistencyResultInputs(request.inputs)
  const inputSetIdentity = "crin_" + canonicalChecksum(inputs)
  const temporal = consistencyResultTemporalReference(request.alignment)
  const material = {
    ruleId: normalizeIdentifier(request.ruleId), ruleVersion: request.ruleVersion,
    ruleSetId: request.runSpecification.ruleSetId, ruleSetVersion: request.runSpecification.ruleSetVersion,
    inputs, inputSetIdentity, temporalAlignmentId: temporal.alignmentId,
    eventTimeWindow: request.alignment.eventTimeWindow, knowledgeMode: request.alignment.knowledgeTime.mode,
    knowledgeTimeCutoff: request.alignment.knowledgeTime.cutoff, policyBindings: request.policyBindings,
    diagnosticSchemaVersion: request.diagnosticSchemaVersion, schemaVersion: request.schemaVersion,
  }
  const resultIdentity = canonicalChecksum(material)
  return Object.freeze({ resultId: "cresult_" + resultIdentity, resultIdentity, inputSetIdentity })
}

export function consistencyResultChecksum(result: Omit<ConsistencyResult, "checksum" | "createdAt">): string {
  const diagnostics = [...result.diagnostics].map((diagnostic) => ({
    diagnosticId: diagnostic.diagnosticId, code: diagnostic.code, schemaVersion: diagnostic.schemaVersion,
    inputRoleIds: [...diagnostic.inputRoleIds].sort(), boundedValues: [...diagnostic.boundedValues].map((value) => ({ ...value })).sort((left, right) => canonicalChecksum(left).localeCompare(canonicalChecksum(right))), explanationCode: diagnostic.explanationCode,
  })).sort((left, right) => left.diagnosticId.localeCompare(right.diagnosticId))
  return canonicalChecksum({ ...result, inputs: orderedConsistencyResultInputs(result.inputs), diagnostics })
}
