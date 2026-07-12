import type { ProviderCertificationStatus, ProviderRegistration, ProviderTier } from "./providerRegistry"

const TIER_RANK: Record<ProviderTier, number> = {
  A_OFFICIAL_API: 1, B_OFFICIAL_ARCHIVE: 2, C_VERIFIED_PUBLIC: 3, D_EXPERIMENTAL: 4, E_MANUAL_SYNTHETIC: 5,
}

export interface ProviderAdmissibilityRequest {
  provider: ProviderRegistration
  datasetId: string
  maximumTier: ProviderTier
  allowLimitedCertification: boolean
  experimentalReadModel: boolean
}

export interface ProviderAdmissibilityResult { admissible: boolean; reasons: readonly string[] }

export function certificationPermitsProduction(status: ProviderCertificationStatus, allowLimited: boolean): boolean {
  return status === "CERTIFIED" || (allowLimited && status === "CERTIFIED_WITH_LIMITATIONS")
}

export function evaluateProviderAdmissibility(input: ProviderAdmissibilityRequest): ProviderAdmissibilityResult {
  const reasons: string[] = []
  if (TIER_RANK[input.provider.tier] > TIER_RANK[input.maximumTier]) reasons.push("PROVIDER_TIER_INSUFFICIENT")
  if (!certificationPermitsProduction(input.provider.certificationStatus, input.allowLimitedCertification)) reasons.push("CERTIFICATION_NOT_PRODUCTION_ADMISSIBLE")
  if (!input.provider.datasetScope.includes(input.datasetId)) reasons.push("DATASET_OUT_OF_SCOPE")
  if (input.provider.tier === "D_EXPERIMENTAL" && !input.experimentalReadModel) reasons.push("EXPERIMENTAL_READ_MODEL_REQUIRED")
  if (input.provider.tier === "E_MANUAL_SYNTHETIC") reasons.push("SYNTHETIC_PROVIDER_NOT_CANONICAL")
  return { admissible: reasons.length === 0, reasons }
}
