import {
  createIntelligenceArtifact,
  type IntelligenceArtifact,
  type IntelligenceSupportingEvidence,
} from "@/core/intelligence-artifacts"
import { createEvidenceValidity } from "@/core/evidence-validity"
import type { DecisionBrief } from "@/core/decision-brief"
import type { InvestigationThesis } from "@/types/investigationThesis"
import {
  REPLAY_LEARNING_SCHEMA_VERSION,
  type ReplayLearning,
} from "./replayLearningTypes"

export interface ReplayLearningArtifactMetadata extends Record<string, unknown> {
  confidenceStatus: "not_calibrated"
  learningId: string
  exchange: string
  symbol: string
  timeframe: string
  date: string
  hour: number
  observationCount: number
  outcomeCount: number
  evidenceArtifactIds: string[]
}

function observationEvidence(
  learning: ReplayLearning,
): IntelligenceSupportingEvidence[] {
  return learning.observations.map((observation) => ({
    id: observation.observationId,
    kind: "market_data",
    title: `${observation.type}: ${observation.fact}`,
    observedAt: observation.observedAt,
    source: observation.source,
    references: observation.evidenceArtifactIds,
    metadata: {
      observationType: observation.type,
      ...observation.metadata,
    },
  }))
}

function outcomeEvidence(
  learning: ReplayLearning,
): IntelligenceSupportingEvidence[] {
  return learning.outcomes.map((outcome) => ({
    id: outcome.outcomeId,
    kind: "outcome",
    title: `${outcome.horizon}: ${outcome.fact}`,
    observedAt: outcome.observedAt,
    source: outcome.source,
    references: outcome.evidenceArtifactIds,
    metadata: {
      horizon: outcome.horizon,
      ...outcome.metadata,
    },
  }))
}

export function createReplayLearningArtifact(input: {
  learning: ReplayLearning
  thesis?: InvestigationThesis
  decisionBrief?: DecisionBrief
}): IntelligenceArtifact<ReplayLearningArtifactMetadata> {
  const { learning } = input
  if (
    input.thesis
    && learning.replayContext.thesisId
    && input.thesis.thesisId !== learning.replayContext.thesisId
  ) {
    throw new Error("Replay Learning thesis does not match replay context.")
  }
  const observedAt = [...learning.observations, ...learning.outcomes]
    .map((item) => item.observedAt)
    .sort()
    .at(-1)
  const coverageStatus = learning.observations.length > 0 && learning.outcomes.length > 0
    ? "FULL"
    : "PARTIAL"
  const hour = String(learning.replayContext.hour).padStart(2, "0")

  return createIntelligenceArtifact({
    id: `replay-learning:${learning.learningId}`,
    type: "replay_learning",
    title: `${learning.replayContext.symbol} Replay Learning ${learning.replayContext.date} ${hour}:00 UTC`,
    summary: `${learning.observations.length} factual observations and ${learning.outcomes.length} factual outcomes recorded.`,
    confidence: 0,
    source: {
      system: "replay-learning-v1",
      producerVersion: String(REPLAY_LEARNING_SCHEMA_VERSION),
      dataset: "replay-learning",
      references: learning.evidenceArtifactIds,
    },
    generatedAt: learning.generatedAt,
    expiresAt: null,
    validity: createEvidenceValidity({
      observedAt: observedAt ?? learning.replayContext.investigationTimestamp,
      generatedAt: learning.generatedAt,
      coverageStatus,
      reason: coverageStatus === "FULL"
        ? "Replay Learning contains factual observations and outcomes."
        : "Replay Learning contains only observations or only outcomes.",
    }),
    thesis: input.thesis,
    decisionBrief: input.decisionBrief,
    supportingEvidence: [
      ...observationEvidence(learning),
      ...outcomeEvidence(learning),
    ],
    metadata: {
      confidenceStatus: "not_calibrated",
      learningId: learning.learningId,
      exchange: learning.replayContext.exchange,
      symbol: learning.replayContext.symbol,
      timeframe: learning.replayContext.timeframe,
      date: learning.replayContext.date,
      hour: learning.replayContext.hour,
      observationCount: learning.observations.length,
      outcomeCount: learning.outcomes.length,
      evidenceArtifactIds: learning.evidenceArtifactIds,
    },
    tags: [
      "replay-learning",
      learning.replayContext.symbol.toLowerCase(),
      learning.replayContext.timeframe,
    ],
    subjects: {
      symbols: [learning.replayContext.symbol],
      exchanges: [learning.replayContext.exchange],
      caseIds: learning.replayContext.selectedHistoricalCaseId
        ? [learning.replayContext.selectedHistoricalCaseId]
        : undefined,
    },
  })
}
