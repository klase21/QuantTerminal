import { canonicalChecksum, canonicalSerialize, normalizeIdentifier, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import type { ConsistencyInputReference, ConsistencyScope } from "./contracts"

function orderedInput(input: ConsistencyInputReference) {
  return { roleId: input.roleId, canonicalRecordId: input.fact.canonicalRecordId, recordVersion: input.fact.recordVersion, checksum: input.checksum, publicationState: input.publicationState }
}
export function consistencyInputDigest(inputs: readonly ConsistencyInputReference[]): string {
  if (!inputs.length) throw new Error("CONSISTENCY_INPUTS_REQUIRED")
  return canonicalChecksum(inputs.map(orderedInput))
}
export function createConsistencyRunId(input: { readonly ruleSetId: string; readonly ruleSetVersion: string; readonly scope: ConsistencyScope; readonly inputs: readonly ConsistencyInputReference[]; readonly policyVersionId: string }): string {
  return "crun_" + canonicalChecksum({
    ruleSetId: normalizeIdentifier(input.ruleSetId), ruleSetVersion: input.ruleSetVersion,
    scope: { datasetIds: [...input.scope.datasetIds].map(normalizeIdentifier).sort(), subjectId: normalizeIdentifier(input.scope.subjectId), windowStart: normalizeIsoTimestamp(input.scope.windowStart), windowEnd: normalizeIsoTimestamp(input.scope.windowEnd), knowledgeCutoff: normalizeIsoTimestamp(input.scope.knowledgeCutoff) },
    orderedInputDigest: consistencyInputDigest(input.inputs), policyVersionId: input.policyVersionId,
  })
}
export function createConsistencyResultId(input: { readonly runId: string; readonly ruleId: string; readonly ruleVersion: string; readonly orderedInputDigest: string; readonly policyVersionId: string }): string {
  return "cres_" + canonicalChecksum(input)
}
export function consistencyIdentityMaterial(input: unknown): string { return canonicalSerialize(input) }
