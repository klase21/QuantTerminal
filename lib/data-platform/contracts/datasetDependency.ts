export type DatasetDependencyType =
  | "FACT_INPUT" | "PROJECTION_INPUT" | "EVIDENCE_INPUT"
  | "COVERAGE_INPUT" | "QUALITY_INPUT" | "CONSISTENCY_INPUT"

export interface DatasetDependency {
  upstreamDatasetId: string
  dependencyType: DatasetDependencyType
  required: boolean
  minimumCompatibleVersion: string
  watermarkRequirement: "EXACT" | "AT_LEAST" | "NOT_REQUIRED"
  failureBehavior: "BLOCK" | "PARTIAL" | "UNAVAILABLE"
}

export function validateDatasetDependency(value: DatasetDependency): boolean {
  return Boolean(value.upstreamDatasetId && value.minimumCompatibleVersion)
    && (!value.required || value.failureBehavior !== "UNAVAILABLE")
}
