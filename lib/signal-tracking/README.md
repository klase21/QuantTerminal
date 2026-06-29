# Signal Tracking Runtime Foundation

This directory implements the pure runtime model defined by
`docs/project/signal-tracking-architecture.md`. It represents immutable signal
tracking identity, canonical evaluation windows, forward-only lifecycle state,
structured validation, and safe serialization.

It does not schedule, collect, evaluate, persist, or publish anything.

## Modules

* `types.ts`: schema version, immutable runtime types, status/window vocabularies,
  and structured result/error contracts.
* `identity.ts`: deterministic tracking ID and immutable identity creation from
  an existing Signal Snapshot reference.
* `windows.ts`: the seven canonical window definitions and pure due-time model.
* `stateMachine.ts`: allowed parent/window transitions and structured rejection
  of backward, skipped, duplicate, or unknown transitions.
* `validation.ts`: snapshot, identity, window, and lifecycle validation.
* `lifecycle.ts`: pure creation and copy-on-write parent/window transitions.
* `serialize.ts`: non-throwing JSON serialization and deserialization.
* `index.ts`: public runtime exports.

## Ownership

Signal Tracking owns timing and lifecycle coordination only. Scanner owns
signal generation. Signal Evaluation owns evaluation metrics and signal
outcomes. Outcome Engine owns canonical outcome normalization. Historical
Memory owns persistence. Learning and Playbook remain downstream.

The runtime cannot generate a signal, read a market price, calculate a return,
infer user activity, or create a learning result.

## Immutable Runtime Model

`TrackingIdentity` contains only stable `trackingId`, `signalId`, `snapshotId`,
and `createdAt`. Lifecycle progression lives in a separate
`TrackingLifecycle`. Public constructors and transitions return frozen objects
and arrays; transitions create new records rather than mutating prior state.

Tracking IDs are deterministic from the canonical signal ID, snapshot ID, and
normalized creation timestamp. No random ID, ambient clock, or external state
is used.

Each lifecycle contains all seven canonical windows:

```text
1h, 6h, 24h, 3d, 7d, 14d, 30d
```

Due timestamps are pure offsets from the immutable snapshot `createdAt`. This
is schedule representation, not active scheduling.

## State Rules

Normal path:

```text
QUEUED -> WAITING -> READY -> EVALUATING -> COMPLETED -> ARCHIVED
```

Exhausted-failure path:

```text
QUEUED -> WAITING -> READY -> EVALUATING -> FAILED -> ARCHIVED
```

Unknown, backward, skipped, and terminal-state transitions return
`invalid_state_transition`. Window transitions are independent and update
completed/pending accounting without changing parent state automatically.

## Structured Failure

All public construction, transition, validation, and serialization operations
return `TrackingResult<T>`. They do not throw for malformed JSON, invalid
timestamps, duplicate or unknown windows, missing snapshot references, invalid
lifecycles, or rejected transitions.

An explicit unavailable Signal Evaluation result will eventually be a
`COMPLETED` window. `FAILED` is reserved for a future runtime that cannot
complete the evaluation contract itself. This module performs neither case.

## Intentionally Not Implemented

P4-5 includes no:

* cron job, timer, scheduler, queue, lease, or worker;
* database, file, browser, memory repository, or storage adapter;
* network request, market-price adapter, API, or fetch path;
* Signal Evaluation metric or Outcome conversion;
* retry loop, polling, background task, or autonomous enrollment;
* Learning, Pattern, Playbook, AI, LLM, broker, or Trade integration;
* page, route, or product-runtime integration.

## Future P4-6 Dependency

P4-6 may consume this module's frozen Signal Snapshot reference, canonical
window identity, and validated lifecycle result as inputs to a separate Signal
Evaluation runtime. It must not add evaluation fields to Tracking, reinterpret
window due times as market timestamps, mutate completed windows, or convert a
signal outcome into user trade PnL.

Any scheduler, persistence adapter, price collector, or API requires a separate
approved sprint and must preserve the same deterministic identity and
forward-only transition contracts.

