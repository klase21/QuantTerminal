import type {
  SignalOutcome,
  SignalOutcomeReference,
} from "@/lib/signal-outcome/types"

function freezeReference(reference: SignalOutcomeReference): SignalOutcomeReference {
  return Object.freeze({ ...reference })
}

export function freezeSignalOutcome(outcome: SignalOutcome): SignalOutcome {
  return Object.freeze({
    ...outcome,
    identity: Object.freeze({ ...outcome.identity }),
    timing: Object.freeze({ ...outcome.timing }),
    signal: Object.freeze({ ...outcome.signal }),
    evaluation: Object.freeze({ ...outcome.evaluation }),
    performance: Object.freeze({ ...outcome.performance }),
    snapshotReferences: Object.freeze({
      evidenceReference: freezeReference(outcome.snapshotReferences.evidenceReference),
      replayReference: freezeReference(outcome.snapshotReferences.replayReference),
      contextReference: freezeReference(outcome.snapshotReferences.contextReference),
    }),
  })
}

export function isFinalizedSignalOutcome(outcome: SignalOutcome): boolean {
  return outcome.lifecycleState === "FINALIZED" || outcome.lifecycleState === "ARCHIVED"
}

