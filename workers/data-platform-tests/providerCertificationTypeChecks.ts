import { evaluateProviderAdmissibility, type ProviderTier } from "@/lib/data-platform/contracts"
import { PROVIDERS } from "@/lib/data-platform/registry"
export const certifiedProviderIsAdmissible = evaluateProviderAdmissibility({ provider: PROVIDERS[0], datasetId: "funding", maximumTier: "A_OFFICIAL_API", allowLimitedCertification: true, experimentalReadModel: false }).admissible
// @ts-expect-error Provider tiers are controlled.
const invalidTier: ProviderTier = "OFFICIAL"
void invalidTier
