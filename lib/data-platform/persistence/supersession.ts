import type { SupersessionReference } from "./contracts"

export function validateSupersession(reference: SupersessionReference): readonly string[] {
  const errors: string[] = []
  if (!reference.supersessionId || !reference.canonicalRecordId || !reference.successorCommitId) errors.push("MISSING_SUPERSESSION_IDENTITY")
  if (!Number.isInteger(reference.predecessorVersion) || reference.predecessorVersion <= 0 || !Number.isInteger(reference.successorVersion) || reference.successorVersion <= 0) errors.push("INVALID_RECORD_VERSION")
  if (reference.successorVersion <= reference.predecessorVersion) errors.push("NON_MONOTONIC_SUPERSESSION")
  return Object.freeze(errors)
}

export function competingCorrections(left: SupersessionReference, right: SupersessionReference): boolean {
  return left.canonicalRecordId === right.canonicalRecordId && left.predecessorVersion === right.predecessorVersion && left.successorCommitId !== right.successorCommitId
}
