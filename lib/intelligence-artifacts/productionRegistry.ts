import {
  InMemoryIntelligenceArtifactRegistry,
  IntelligenceArtifactReader,
} from "@/core/intelligence-artifacts"

export const productionIntelligenceArtifactRegistry = new InMemoryIntelligenceArtifactRegistry()
export const productionIntelligenceArtifactReader = new IntelligenceArtifactReader(
  productionIntelligenceArtifactRegistry,
)
