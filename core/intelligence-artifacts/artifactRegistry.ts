import type {
  IntelligenceArtifact,
  IntelligenceArtifactPublicationResult,
  IntelligenceArtifactQuery,
  IntelligenceArtifactSearchResult,
} from "@/core/intelligence-artifacts/artifactTypes"

export interface IntelligenceArtifactRegistry {
  publish(artifact: IntelligenceArtifact): Promise<IntelligenceArtifactPublicationResult>
  get(id: string): Promise<IntelligenceArtifact | null>
  search(query?: IntelligenceArtifactQuery): Promise<IntelligenceArtifactSearchResult>
  archive(id: string): Promise<boolean>
  isArchived(id: string): Promise<boolean>
}

export interface IntelligenceArtifactPublisher {
  publish(artifact: IntelligenceArtifact): Promise<IntelligenceArtifactPublicationResult>
}
