import type {
  IntelligenceArtifactSource,
  IntelligenceArtifactStatus,
  IntelligenceArtifactType,
} from "./artifactTypes"

export const DURABLE_ARTIFACT_STORE_VERSION = 1

export interface DurableArtifactIndexEntry {
  storeVersion: typeof DURABLE_ARTIFACT_STORE_VERSION
  artifactId: string
  artifactType: IntelligenceArtifactType
  generatedAt: string
  expiresAt: string | null
  source: IntelligenceArtifactSource
  payloadPath: string
  schemaVersion: number
  status: IntelligenceArtifactStatus
  symbols: string[]
}

export interface DurableArtifactIndex {
  storeVersion: typeof DURABLE_ARTIFACT_STORE_VERSION
  updatedAt: string
  artifacts: DurableArtifactIndexEntry[]
}

export interface DurableArtifactListOptions {
  includeExpired?: boolean
  includeArchived?: boolean
}
