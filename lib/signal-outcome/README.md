# Signal Outcome Runtime Foundation

This directory implements the immutable Signal Outcome runtime defined by the
Phase 4 Outcome, Signal Evaluation, and Signal Tracking architecture. It
normalizes one completed Signal Evaluation window and one matching frozen
Signal Snapshot into a canonical realized signal outcome.

It does not persist, schedule, evaluate, learn, generate patterns, or modify
product runtime behavior.

## Modules

* `types.ts`: versioned Outcome, snapshot, reference, lifecycle, learning, and
  structured result contracts.
* `identity.ts`: deterministic one-signal-by-one-window Outcome identity.
* `outcome.ts`: deep freezing and finalized-state inspection.
* `validation.ts`: snapshot, identity, timestamp, metric, reference, lifecycle,
  and duplicate validation.
* `merge.ts`: strict Signal Snapshot plus completed Evaluation normalization and
  idempotent immutable-Outcome merge.
* `lifecycle.ts`: forward-only lifecycle transitions.
* `serialize.ts`: safe non-throwing JSON round trips.
* `index.ts`: public exports.

## Runtime Purpose and Ownership

Signal Tracking owns when a canonical window is due. Signal Evaluation owns
the source-backed metrics and signal outcome classification. Signal Outcome
owns only the immutable standardized record produced from those completed
inputs.

Signal Outcome does not own:

* signal generation or prioritization;
* price collection or evaluation;
* Trade execution or user PnL;
* persistence or Historical Memory;
* learning status changes, eligibility, or extraction;
* Pattern, Playbook, recommendation, narrative, confidence, AI, or LLM output.

The runtime accepts only `EVALUATED` or `UNAVAILABLE` Evaluation results with a
metrics object. An unavailable Evaluation becomes a valid Signal Outcome with
null performance, `UNAVAILABLE` outcome status, and the original reason.

## Deterministic Identity

Exactly one Signal Outcome identity exists per:

```text
signalId * evaluationWindow
```

`outcomeId` is deterministically encoded from those two values. `snapshotId`
and `trackingId` must match the frozen signal references, but they do not change
the Outcome identity. A second object with the same Outcome ID is either:

* idempotently identical and reduced to the existing object; or
* rejected as `merge_conflict` when any immutable field differs.

`validateUniqueOutcomeIdentities()` rejects duplicate IDs in a collection.
There is no in-memory registry or persistence layer in P4-7.

## Timing

`signalCreatedAt` comes from the frozen Signal Snapshot. `evaluationWindow`
comes from the completed Evaluation. `evaluatedAt` is the canonical observation
boundary and equals the Evaluation window's `endsAt`.

`evaluatedAt` is not process time, write time, retrieval time, or an ambient
clock value. The runtime reads no clock and invents no timestamp.

## Lifecycle

The only allowed path is:

```text
CREATED -> VALIDATED -> FINALIZED -> ARCHIVED
```

Lifecycle operations replace only `lifecycleState` and return a new deeply
frozen object. Backward, skipped, repeated, and post-archive transitions return
`inconsistent_lifecycle`. No lifecycle transition changes metrics, identity,
references, learning status, or timestamps.

## Merge Philosophy

`mergeSignalSnapshotEvaluation()` is strict normalization, not a patch merge.
It requires:

* matching signal, snapshot, creation-time, and direction identity;
* a deterministic Tracking ID;
* a canonical completed Evaluation window;
* validated source-backed metrics or an explicit unavailable result;
* explicit evidence, Replay, and context reference availability.

The merge copies existing values only. It creates no summary, confidence,
narrative, recommendation, playbook, missing reference, or fallback value.
`learningStatus` is initialized to `pending`; this runtime does not change it.

The only explicitly mutable field is `lifecycleState`, through the lifecycle
module. Every other difference under the same `outcomeId` is a conflict.

## Serialization

Serialization and deserialization validate the complete object and return
`SignalOutcomeResult<T>`. Malformed JSON, unsupported schema, impossible
timestamps, invalid metrics, inconsistent lifecycle, and identity mismatch are
structured failures. Successful deserialization returns a deeply frozen object
and preserves null unavailable values without loss.

No storage adapter, database key, persistence identifier, file path, or API is
part of the model.

## No-Fabrication Rules

Signal Outcome may contain only:

* realized source-backed Signal Evaluation observations;
* immutable Signal Snapshot references;
* evaluated metrics copied without reinterpretation.

It must never generate:

* AI or LLM summaries;
* confidence or confidence adjustments;
* narratives, theses, or evidence;
* recommendations or execution plans;
* Learning, Pattern, or Playbook content;
* user actions, entries, exits, position size, or realized Trade PnL.

A signal reference price and evaluation endpoint remain signal observations;
they are never renamed as executed entry and exit.

## Future Dependencies

```text
Signal Tracking
  -> Signal Evaluation
  -> Signal Outcome
  -> Historical Memory (P4-8)
  -> Learning Engine (future)
  -> Pattern Engine (future)
```

P4-8 may consume only `FINALIZED` immutable Signal Outcomes through a separate
Historical Memory contract. It must not mutate Outcome identity, metrics,
references, timestamps, or unavailable states. Persistence, retention,
indexing, and retrieval remain entirely outside P4-7.

