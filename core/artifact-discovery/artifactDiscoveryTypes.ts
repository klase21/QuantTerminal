import type {
  IntelligenceArtifactQuery,
  IntelligenceArtifactType,
} from "@/core/intelligence-artifacts"

export const ARTIFACT_DISCOVERY_SCHEMA_VERSION = 1

export const ARTIFACT_DISCOVERY_CATEGORIES = [
  "historical_pattern",
  "event_pattern",
  "replay_pattern",
  "market_memory_candidate",
  "unknown",
] as const

export type ArtifactDiscoveryCategory =
  typeof ARTIFACT_DISCOVERY_CATEGORIES[number]

export interface ArtifactDiscoveryRecord {
  schemaVersion: typeof ARTIFACT_DISCOVERY_SCHEMA_VERSION
  discoveryId: string
  artifactId: string
  artifactType: IntelligenceArtifactType
  symbols: string[]
  tags: string[]
  category: ArtifactDiscoveryCategory
  discoveredAt: string
}

export interface ArtifactDiscoveryQuery {
  artifactIds?: string[]
  artifactTypes?: IntelligenceArtifactType[]
  symbols?: string[]
  tags?: string[]
  categories?: ArtifactDiscoveryCategory[]
  generatedAfter?: string
  generatedBefore?: string
  includeExpired?: boolean
  includeArchived?: boolean
  limit?: number
  offset?: number
}

export interface ArtifactDiscoveryResult {
  records: ArtifactDiscoveryRecord[]
  total: number
  offset: number
  limit: number
}

export type ArtifactDiscoveryRegistryQuery = Pick<
  IntelligenceArtifactQuery,
  | "generatedAfter"
  | "generatedBefore"
  | "includeExpired"
  | "includeArchived"
>
