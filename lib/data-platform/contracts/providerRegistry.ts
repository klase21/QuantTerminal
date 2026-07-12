export type ProviderTier = "A_OFFICIAL_API" | "B_OFFICIAL_ARCHIVE" | "C_VERIFIED_PUBLIC" | "D_EXPERIMENTAL" | "E_MANUAL_SYNTHETIC"
export type ProviderCertificationStatus = "CANDIDATE" | "VALIDATING" | "CERTIFIED" | "CERTIFIED_WITH_LIMITATIONS" | "DEGRADED" | "SUSPENDED" | "REVOKED"

export interface ProviderRegistration {
  providerId: string
  displayName: string
  tier: ProviderTier
  certificationStatus: ProviderCertificationStatus
  datasetScope: readonly string[]
  limitations: readonly string[]
  registrationVersion: string
  effectiveAt: string
}
