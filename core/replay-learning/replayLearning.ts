import {
  REPLAY_LEARNING_OBSERVATION_TYPES,
  REPLAY_LEARNING_SCHEMA_VERSION,
  type CreateReplayLearningInput,
  type ReplayLearning,
  type ReplayLearningObservation,
  type ReplayLearningOutcome,
} from "./replayLearningTypes"

function required(value: string, field: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`Replay Learning ${field} is required.`)
  return normalized
}

function iso(value: string | number | Date, field: string) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Replay Learning ${field} is invalid.`)
  }
  return date.toISOString()
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort()
}

function normalizeObservation(
  observation: ReplayLearningObservation,
): ReplayLearningObservation {
  if (!REPLAY_LEARNING_OBSERVATION_TYPES.includes(observation.type)) {
    throw new Error(`Replay Learning observation type ${observation.type} is invalid.`)
  }
  return {
    ...observation,
    observationId: required(observation.observationId, "observationId"),
    observedAt: iso(observation.observedAt, "observation observedAt"),
    fact: required(observation.fact, "observation fact"),
    source: required(observation.source, "observation source"),
    evidenceArtifactIds: observation.evidenceArtifactIds
      ? unique(observation.evidenceArtifactIds)
      : undefined,
  }
}

function normalizeOutcome(outcome: ReplayLearningOutcome): ReplayLearningOutcome {
  return {
    ...outcome,
    outcomeId: required(outcome.outcomeId, "outcomeId"),
    horizon: required(outcome.horizon, "outcome horizon"),
    observedAt: iso(outcome.observedAt, "outcome observedAt"),
    fact: required(outcome.fact, "outcome fact"),
    source: required(outcome.source, "outcome source"),
    evidenceArtifactIds: outcome.evidenceArtifactIds
      ? unique(outcome.evidenceArtifactIds)
      : undefined,
  }
}

export function createReplayLearning(
  input: CreateReplayLearningInput,
): ReplayLearning {
  const symbol = required(input.replayContext.symbol, "replayContext.symbol").toUpperCase()
  const exchange = required(input.replayContext.exchange, "replayContext.exchange").toLowerCase()
  const timeframe = required(input.replayContext.timeframe, "replayContext.timeframe")
  const date = required(input.replayContext.date, "replayContext.date")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Replay Learning replayContext.date must use YYYY-MM-DD.")
  }
  if (
    !Number.isInteger(input.replayContext.hour)
    || input.replayContext.hour < 0
    || input.replayContext.hour > 23
  ) {
    throw new Error("Replay Learning replayContext.hour must be an integer from 0 to 23.")
  }

  const observations = input.observations
    .map(normalizeObservation)
    .sort((left, right) => (
      Date.parse(left.observedAt) - Date.parse(right.observedAt)
      || left.observationId.localeCompare(right.observationId)
    ))
  const outcomes = input.outcomes
    .map(normalizeOutcome)
    .sort((left, right) => (
      Date.parse(left.observedAt) - Date.parse(right.observedAt)
      || left.outcomeId.localeCompare(right.outcomeId)
    ))
  if (observations.length === 0 && outcomes.length === 0) {
    throw new Error("Replay Learning requires at least one factual observation or outcome.")
  }

  const nestedEvidenceIds = [
    ...observations.flatMap((item) => item.evidenceArtifactIds ?? []),
    ...outcomes.flatMap((item) => item.evidenceArtifactIds ?? []),
  ]
  const evidenceArtifactIds = unique([
    ...input.evidenceArtifactIds,
    ...nestedEvidenceIds,
  ])
  if (evidenceArtifactIds.length === 0) {
    throw new Error("Replay Learning requires at least one evidence artifact id.")
  }

  return {
    schemaVersion: REPLAY_LEARNING_SCHEMA_VERSION,
    learningId: required(input.learningId, "learningId"),
    replayContext: {
      ...input.replayContext,
      symbol,
      exchange,
      timeframe,
      date,
      investigationTimestamp: iso(
        input.replayContext.investigationTimestamp,
        "replayContext.investigationTimestamp",
      ),
      thesisId: input.replayContext.thesisId?.trim() || undefined,
      selectedHistoricalCaseId:
        input.replayContext.selectedHistoricalCaseId?.trim() || undefined,
    },
    observations,
    outcomes,
    evidenceArtifactIds,
    generatedAt: iso(input.generatedAt ?? Date.now(), "generatedAt"),
  }
}

export function isReplayLearning(value: unknown): value is ReplayLearning {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  try {
    const candidate = value as ReplayLearning
    const normalized = createReplayLearning(candidate)
    return (
      candidate.schemaVersion === REPLAY_LEARNING_SCHEMA_VERSION
      && JSON.stringify(normalized) === JSON.stringify(candidate)
    )
  } catch {
    return false
  }
}
