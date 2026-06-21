export const REPLAY_LEARNING_SCHEMA_VERSION = 1

export const REPLAY_LEARNING_OBSERVATION_TYPES = [
  "funding",
  "open_interest",
  "liquidation",
  "orderbook",
  "price_structure",
  "other",
] as const

export type ReplayLearningObservationType =
  typeof REPLAY_LEARNING_OBSERVATION_TYPES[number]

export interface ReplayLearningContext {
  exchange: string
  symbol: string
  timeframe: string
  date: string
  hour: number
  investigationTimestamp: string
  thesisId?: string
  selectedHistoricalCaseId?: string
}

export interface ReplayLearningObservation {
  observationId: string
  type: ReplayLearningObservationType
  observedAt: string
  fact: string
  source: string
  evidenceArtifactIds?: string[]
  metadata?: Record<string, string | number | boolean | null>
}

export interface ReplayLearningOutcome {
  outcomeId: string
  horizon: string
  observedAt: string
  fact: string
  source: string
  evidenceArtifactIds?: string[]
  metadata?: Record<string, string | number | boolean | null>
}

export interface ReplayLearning {
  schemaVersion: typeof REPLAY_LEARNING_SCHEMA_VERSION
  learningId: string
  replayContext: ReplayLearningContext
  observations: ReplayLearningObservation[]
  outcomes: ReplayLearningOutcome[]
  evidenceArtifactIds: string[]
  generatedAt: string
}

export interface CreateReplayLearningInput {
  learningId: string
  replayContext: ReplayLearningContext
  observations: ReplayLearningObservation[]
  outcomes: ReplayLearningOutcome[]
  evidenceArtifactIds: string[]
  generatedAt?: string | number | Date
}
