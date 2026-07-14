export const MVP_CERTIFICATION_PROFILE = Object.freeze({
  profileId: "mvp-six-instrument-certification-slice",
  version: "1.0.0",
  repositoryPublicationStateForEligible: "PENDING" as const,
  futureRepositoryCertificationState: "CERTIFIED" as const,
  consumerPublicationState: "NOT_PUBLISHED" as const,
  requiredChecks: Object.freeze([
    "AUTHORITATIVE_PERSISTENCE",
    "SOURCE_AND_IDENTITY_VALID",
    "LINEAGE_PRESENT",
    "COVERAGE_ELIGIBLE",
    "NO_CONFLICT",
    "TIMESTAMPS_VALID",
    "DATASET_REGISTRY_GOVERNED",
    "GRANULARITY_GOVERNED",
    "VALIDATION_ACCEPTABLE",
  ]),
})

export type MvpPublicationEligibility = "PENDING" | "ELIGIBLE" | "PUBLISHED" | "WITHHELD" | "REJECTED"
export interface MvpPublicationEligibilityInput {
  readonly authoritativePersistence: boolean
  readonly sourceAndIdentityValid: boolean
  readonly lineagePresent: boolean
  readonly coverageEligible: boolean
  readonly conflictPresent: boolean
  readonly timestampsValid: boolean
  readonly datasetRegistryGoverned: boolean
  readonly granularityGoverned: boolean
  readonly validationAcceptable: boolean
}
export interface MvpPublicationEligibilityDecision {
  readonly status: Exclude<MvpPublicationEligibility, "PENDING" | "PUBLISHED">
  readonly reasonCodes: readonly string[]
}

export function evaluateMvpPublicationEligibility(input: MvpPublicationEligibilityInput): MvpPublicationEligibilityDecision {
  if (input.conflictPresent) return Object.freeze({ status: "REJECTED", reasonCodes: Object.freeze(["CONFLICT_PRESENT"]) })
  const reasons: string[] = []
  if (!input.authoritativePersistence) reasons.push("AUTHORITATIVE_PERSISTENCE_MISSING")
  if (!input.sourceAndIdentityValid) reasons.push("SOURCE_OR_IDENTITY_INVALID")
  if (!input.lineagePresent) reasons.push("LINEAGE_MISSING")
  if (!input.coverageEligible) reasons.push("COVERAGE_NOT_ELIGIBLE")
  if (!input.timestampsValid) reasons.push("TIMESTAMPS_INVALID")
  if (!input.datasetRegistryGoverned) reasons.push("DATASET_REGISTRY_UNGOVERNED")
  if (!input.granularityGoverned) reasons.push("GRANULARITY_UNGOVERNED")
  if (!input.validationAcceptable) reasons.push("VALIDATION_NOT_ACCEPTABLE")
  return reasons.length
    ? Object.freeze({ status: "WITHHELD", reasonCodes: Object.freeze(reasons) })
    : Object.freeze({ status: "ELIGIBLE", reasonCodes: Object.freeze(["MVP_SLICE_ALL_REQUIRED_CHECKS_PASSED"]) })
}
