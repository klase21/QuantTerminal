import type {
  StandardArtifactMetadata,
  StandardArtifactType,
} from "@/core/artifact-standardization"
import type {
  DeployableCoverageSurface,
} from "@/core/deployable-snapshots"

export const DATA_HEALTH_SCHEMA_VERSION = 1

export const DATA_HEALTH_STATUSES = [
  "current",
  "stale",
  "missing",
  "invalid",
  "unsupported",
] as const

export type DataHealthStatus = typeof DATA_HEALTH_STATUSES[number]

export interface DataHealthRecord {
  artifactType: StandardArtifactType | string
  partitionKey: string
  path: string
  status: DataHealthStatus
  reason: string
  generatedAt: string | null
  maxAgeMs: number | null
  ageMs: number | null
  freshness: StandardArtifactMetadata["freshness"] | null
  coverage: StandardArtifactMetadata["coverage"] | null
  recordCount: number | null
  payloadSizeBytes: number | null
  sourceHash: string | null
}

export interface ProductSurfaceHealthSummary {
  surface: DeployableCoverageSurface
  currentEvidenceCount: number
  staleEvidenceCount: number
  missingEvidenceCount: number
  blockingIssues: string[]
}

export interface DataHealthAuditReport {
  schemaVersion: typeof DATA_HEALTH_SCHEMA_VERSION
  auditedAt: string
  readOnly: true
  status: "PASS" | "FAIL"
  summary: {
    totalArtifacts: number
    currentCount: number
    staleCount: number
    missingCount: number
    invalidCount: number
    unsupportedCount: number
  }
  artifacts: DataHealthRecord[]
  productSurfaces: ProductSurfaceHealthSummary[]
  structuralFailures: string[]
}
