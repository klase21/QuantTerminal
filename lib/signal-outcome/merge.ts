import { createSignalOutcomeIdentity } from "@/lib/signal-outcome/identity"
import { freezeSignalOutcome } from "@/lib/signal-outcome/outcome"
import {
  SIGNAL_OUTCOME_SCHEMA_VERSION,
  type SignalOutcome,
  type SignalOutcomeMergeInput,
  type SignalOutcomeResult,
} from "@/lib/signal-outcome/types"
import {
  validateCompletedEvaluationForOutcome,
  validateSignalOutcome,
  validateSignalOutcomeSnapshot,
} from "@/lib/signal-outcome/validation"

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    )
  }
  return value
}

function sameOutcome(left: SignalOutcome, right: SignalOutcome): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
}

export function mergeSignalSnapshotEvaluation(
  input: SignalOutcomeMergeInput,
): SignalOutcomeResult<SignalOutcome> {
  if (!input || typeof input !== "object") {
    return {
      success: false,
      errors: [{ code: "malformed_input", message: "Signal Outcome merge input must be an object." }],
    }
  }

  const snapshot = validateSignalOutcomeSnapshot(input.snapshot)
  if (snapshot.success === false) return snapshot
  const evaluation = validateCompletedEvaluationForOutcome(input.evaluation)
  if (evaluation.success === false) return evaluation

  if (snapshot.value.signalId !== evaluation.value.signalReference.signalId
    || snapshot.value.snapshotId !== evaluation.value.signalReference.snapshotId
    || Date.parse(snapshot.value.signalCreatedAt)
      !== Date.parse(evaluation.value.signalReference.createdAt)) {
    return {
      success: false,
      errors: [{
        code: "identity_mismatch",
        message: "Signal Snapshot and Evaluation references do not match.",
        field: "evaluation.signalReference",
      }],
    }
  }
  if (snapshot.value.direction !== evaluation.value.direction) {
    return {
      success: false,
      errors: [{
        code: "merge_conflict",
        message: "Signal Snapshot direction cannot be overwritten by Evaluation.",
        field: "direction",
      }],
    }
  }

  const identity = createSignalOutcomeIdentity(snapshot.value, evaluation.value.window.id)
  if (identity.success === false) return identity
  const metrics = evaluation.value.metrics!
  const outcome: SignalOutcome = {
    schemaVersion: SIGNAL_OUTCOME_SCHEMA_VERSION,
    lifecycleState: "CREATED",
    identity: identity.value,
    timing: {
      signalCreatedAt: snapshot.value.signalCreatedAt,
      evaluationWindow: evaluation.value.window.id,
      evaluatedAt: evaluation.value.window.endsAt,
    },
    signal: {
      symbol: snapshot.value.symbol,
      exchange: snapshot.value.exchange,
      timeframe: snapshot.value.timeframe,
      direction: snapshot.value.direction,
    },
    evaluation: {
      evaluationStatus: evaluation.value.status,
      outcomeStatus: metrics.outcomeStatus,
      directionCorrect: metrics.directionCorrect,
      invalidationHit: metrics.invalidationHit,
      unavailableReason: evaluation.value.unavailableReason,
    },
    performance: {
      returnPercent: metrics.returnPercent,
      maxFavorableExcursion: metrics.maxFavorableExcursion,
      maxAdverseExcursion: metrics.maxAdverseExcursion,
      drawdown: metrics.drawdown,
      runup: metrics.runup,
      timeToMaxFavorable: metrics.timeToMaxFavorable,
      timeToMaxAdverse: metrics.timeToMaxAdverse,
    },
    snapshotReferences: {
      evidenceReference: snapshot.value.evidenceReference,
      replayReference: snapshot.value.replayReference,
      contextReference: snapshot.value.contextReference,
    },
    learningStatus: "pending",
  }

  const validation = validateSignalOutcome(outcome)
  if (validation.success === false) return validation
  return { success: true, value: freezeSignalOutcome(validation.value) }
}

export function mergeSignalOutcomes(
  existing: SignalOutcome,
  incoming: SignalOutcome,
): SignalOutcomeResult<SignalOutcome> {
  const left = validateSignalOutcome(existing)
  if (left.success === false) return left
  const right = validateSignalOutcome(incoming)
  if (right.success === false) return right

  if (left.value.identity.outcomeId !== right.value.identity.outcomeId) {
    return {
      success: false,
      errors: [{
        code: "identity_mismatch",
        message: "Signal Outcomes with different identities cannot be merged.",
        field: "identity.outcomeId",
      }],
    }
  }
  if (!sameOutcome(left.value, right.value)) {
    return {
      success: false,
      errors: [{
        code: "merge_conflict",
        message: "Duplicate Signal Outcome identity contains conflicting immutable fields.",
        field: "identity.outcomeId",
      }],
    }
  }

  return { success: true, value: freezeSignalOutcome(left.value) }
}

