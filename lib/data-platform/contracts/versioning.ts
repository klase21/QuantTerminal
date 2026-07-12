export type VersionIdentifier = string

export type CompatibilityClassification =
  | "BACKWARD_COMPATIBLE"
  | "FORWARD_COMPATIBLE"
  | "BREAKING"
  | "REQUIRES_RENORMALIZATION"
  | "REQUIRES_REPROJECTION"

export interface VersionSet {
  schemaVersion: VersionIdentifier
  recordVersion: VersionIdentifier
  normalizationVersion: VersionIdentifier
  policyVersion: VersionIdentifier
  registryVersion: VersionIdentifier
  providerRegistrationVersion: VersionIdentifier
}

export interface Supersession {
  previousCanonicalRecordId: string
  previousRecordVersion: VersionIdentifier
  reason: "PROVIDER_CORRECTION" | "SCHEMA_CHANGE" | "NORMALIZATION_CHANGE" | "OPERATOR_RESOLUTION"
  supersededAt: string
}

export interface VersionTransition {
  fromVersion: VersionIdentifier
  toVersion: VersionIdentifier
  compatibility: CompatibilityClassification
  supersession?: Supersession
}

export function validateCorrectionTransition(transition: VersionTransition): boolean {
  return transition.fromVersion !== transition.toVersion && transition.supersession !== undefined
}
