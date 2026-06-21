import {
  createReplayLearningArtifact,
  type ReplayLearning,
} from "@/core/replay-learning"
import type {
  IntelligenceArtifactPublicationResult,
} from "@/core/intelligence-artifacts"
import type { DecisionBrief } from "@/core/decision-brief"
import type { InvestigationThesis } from "@/types/investigationThesis"
import { productionIntelligenceArtifactRegistry } from "./productionRegistry"

export async function publishReplayLearningArtifact(input: {
  learning: ReplayLearning
  thesis?: InvestigationThesis
  decisionBrief?: DecisionBrief
}): Promise<IntelligenceArtifactPublicationResult> {
  return productionIntelligenceArtifactRegistry.publish(
    createReplayLearningArtifact(input),
  )
}
