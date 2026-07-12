import { validateDatasetDependency } from "@/lib/data-platform/contracts"
export const dependencyValid = validateDatasetDependency({ upstreamDatasetId: "funding", dependencyType: "FACT_INPUT", required: true, minimumCompatibleVersion: "1", watermarkRequirement: "AT_LEAST", failureBehavior: "BLOCK" })
