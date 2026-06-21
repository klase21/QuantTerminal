import type {
  ArtifactDiscoveryCategory,
  ArtifactDiscoveryQuery,
  ArtifactDiscoveryRecord,
} from "@/core/artifact-discovery"
import type { EvidenceCoverageStatus } from "@/core/evidence-validity"

export const MEMORY_ELIGIBILITY_SCHEMA_VERSION = 1

export const MEMORY_ELIGIBILITY_STATUSES = [
  "candidate",
  "eligible",
  "population_ready",
  "insufficient_evidence",
] as const

export type MemoryEligibilityStatus =
  typeof MEMORY_ELIGIBILITY_STATUSES[number]

export interface MemoryEligibilityRecord {
  schemaVersion: typeof MEMORY_ELIGIBILITY_SCHEMA_VERSION
  eligibilityId: string
  category: ArtifactDiscoveryCategory
  artifactCount: number
  coverageStatus: EvidenceCoverageStatus
  eligibilityStatus: MemoryEligibilityStatus
  evaluatedAt: string
  supportingArtifactIds: string[]
}

export interface MemoryEligibilityCandidate {
  discovery: ArtifactDiscoveryRecord
  coverageStatus: EvidenceCoverageStatus
}

export interface MemoryEligibilityQuery extends ArtifactDiscoveryQuery {
  eligibilityStatuses?: MemoryEligibilityStatus[]
}

export interface MemoryEligibilityResult {
  records: MemoryEligibilityRecord[]
  total: number
  offset: number
  limit: number
}
