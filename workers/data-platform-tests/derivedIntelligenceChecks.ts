import { validateDerivedIntelligence } from "@/lib/data-platform/contracts"
import { DERIVED_INTELLIGENCE_REGISTRY } from "@/lib/data-platform/registry"
export const derivedRegistryValid = DERIVED_INTELLIGENCE_REGISTRY.every(validateDerivedIntelligence)
