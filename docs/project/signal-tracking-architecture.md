# Signal Tracking Architecture

**Project:** Theta - Data Intelligence Platform  
**Phase:** 4  
**Sprint:** P4-4  
**Status:** Architecture specification  
**Scope:** Tracking coordination, timing, lifecycle, and failure policy only

## 1. Purpose

Signal Tracking coordinates the autonomous progression of every canonical
QuantTerminal Signal Snapshot through all seven evaluation windows.

Signal Tracking owns:

* creation of the canonical evaluation schedule;
* lifecycle progression for the tracking record and each window task;
* determination of when a window becomes due;
* coordination of source-backed price collection;
* idempotent handoff into Signal Evaluation;
* completion accounting across independent windows.

Signal Tracking does not own:

* signal generation, ranking, reason, direction, or confidence;
* Signal Evaluation metrics or outcome interpretation;
* Historical Memory storage or persistence;
* Learning eligibility or knowledge extraction;
* Pattern or Playbook generation;
* AI, LLM, prediction, or narrative generation;
* Trade execution, user accounts, or broker integration;
* market price data itself.

Tracking answers **when and what must be evaluated**. Signal Evaluation answers
**what the observed market path means under the canonical metric contract**.

## 2. Canonical Tracking Pipeline

The tracking pipeline is linear and has no additional architectural branches:

```text
Signal Generated
  -> Snapshot Frozen
  -> Tracking Queue
  -> Window Scheduler
  -> Price Collection
  -> Evaluation Queue
  -> Outcome Engine
  -> Historical Memory
```

### 2.1 Signal Generated

Scanner emits a canonical signal. Tracking receives only its stable identity
and emission event; it does not create or modify the signal.

### 2.2 Snapshot Frozen

Signal Evaluation freezes the Signal Snapshot defined by P4-3. Tracking binds
to its immutable `snapshotId`. A later Scanner update cannot mutate the
tracking baseline.

### 2.3 Tracking Queue

The snapshot is enrolled for all seven canonical windows. Queue enrollment is
an architecture boundary only; this sprint creates no queue implementation.

### 2.4 Window Scheduler

The scheduler compares each immutable due time against the canonical clock and
makes due window tasks ready. It does not calculate metrics or shift a due time
because processing was late.

### 2.5 Price Collection

A future collector obtains approved, timestamped price observations for the
snapshot identity and exact evaluation window. Tracking coordinates this
request but does not own, fabricate, transform, or interpret market data.

### 2.6 Evaluation Queue

The frozen snapshot, window identity, and collected source-backed observations
are handed to Signal Evaluation. Missing coverage is handed through explicitly
so Signal Evaluation can return `UNAVAILABLE` rather than inferred metrics.

### 2.7 Outcome Engine

Signal Evaluation produces a signal outcome before this stage. Outcome Engine
is the downstream canonical-outcome boundary and may receive that result only
through a future approved **signal-outcome contract**.

This boundary must preserve the P4-3 distinction:

* signal reference price is not an executed entry;
* evaluation-window endpoint is not an executed exit;
* signal return is not realized user PnL;
* a signal outcome is not a user trade Outcome.

The trade-oriented `CanonicalOutcome` defined in P4-1 must not be populated by
renaming signal evaluation fields. P4-4 defines no signal-outcome schema or
Outcome Engine implementation.

### 2.8 Historical Memory

Historical Memory is the downstream storage owner for an accepted canonical
outcome. Tracking neither writes storage nor bypasses Outcome Engine.

Transient and permanent failure handling occurs within pipeline stages. It
does not add an alternate component path or permit Tracking to skip Signal
Evaluation.

## 3. Tracking Identity

Every tracking record has one immutable identity envelope:

```ts
interface SignalTrackingIdentity {
  trackingId: string
  signalId: string
  snapshotId: string
  createdAt: string
  nextEvaluation: string | null
  completedWindows: EvaluationWindow[]
  pendingWindows: EvaluationWindow[]
  status: TrackingStatus
}
```

Field semantics:

* `trackingId`: unique identity for one signal's complete seven-window tracking
  lifecycle.
* `signalId`: immutable identity of the Scanner-generated signal.
* `snapshotId`: immutable identity of the frozen Signal Snapshot.
* `createdAt`: trusted signal emission timestamp used to derive every due time.
* `nextEvaluation`: due time of the earliest pending window, or `null` after all
  windows are terminal.
* `completedWindows`: windows with an immutable completed or explicit
  unavailable evaluation result.
* `pendingWindows`: windows not yet terminal, ordered by due time.
* `status`: monotonic aggregate tracking status.

Identity rules:

1. `trackingId`, `signalId`, `snapshotId`, and `createdAt` never change.
2. Window due times are derived once from `createdAt`; retries and restarts do
   not recalculate them from the current time.
3. Each window execution has the idempotency identity
   `trackingId + evaluationWindow`.
4. `completedWindows` is append-only and contains no duplicates.
5. A window cannot be simultaneously completed and pending.
6. `nextEvaluation` is derived from pending window due times and is not a new
   source timestamp.
7. Identity mismatch fails closed and cannot be repaired by substituting a
   different signal, snapshot, symbol, exchange, or timeframe.

This is an architecture contract, not a database schema or runtime type
implementation.

## 4. Evaluation Schedule

The canonical schedule contains exactly these windows:

| Window | Due time |
| --- | --- |
| `1h` | `createdAt + 1 hour` |
| `6h` | `createdAt + 6 hours` |
| `24h` | `createdAt + 24 hours` |
| `3d` | `createdAt + 3 days` |
| `7d` | `createdAt + 7 days` |
| `14d` | `createdAt + 14 days` |
| `30d` | `createdAt + 30 days` |

### 4.1 Canonical Clock

Scheduling uses one trusted UTC clock contract. The canonical clock supplies
comparison time only. It must not replace:

* signal emission time;
* market observation time;
* price source time;
* evaluation completion time.

Clock skew beyond a future approved tolerance must pause readiness and expose a
diagnostic; it must not shift historical due times silently.

### 4.2 Independent Window Execution

Each window:

* has its own immutable due time;
* has its own idempotency identity;
* requests its own required coverage;
* enters Evaluation independently;
* produces its own completed, unavailable, or failed result;
* cannot overwrite another window;
* cannot infer its result from a shorter or longer window.

Failure of one window never cancels, reschedules, or invalidates another.
Completed windows remain immutable while later windows remain pending.

### 4.3 Scheduling Model

The future scheduler should conceptually:

1. materialize all seven due times from the frozen snapshot;
2. select nonterminal windows whose due time is at or before the canonical
   clock;
3. claim a due window through an idempotent lease or equivalent ownership
   mechanism;
4. coordinate price collection for the exact identity and window;
5. hand the observation bundle to the Evaluation Queue;
6. record the terminal window result once;
7. derive `nextEvaluation` from remaining pending windows;
8. archive the parent only after every window is terminal.

P4-4 does not choose or implement cron, timers, queues, leases, workers,
databases, or retry infrastructure.

## 5. Tracking States

The canonical state vocabulary is:

* `QUEUED`
* `WAITING`
* `READY`
* `EVALUATING`
* `COMPLETED`
* `FAILED`
* `ARCHIVED`

### 5.1 Window Task State Machine

Normal forward path:

```text
QUEUED -> WAITING -> READY -> EVALUATING -> COMPLETED -> ARCHIVED
```

Exhausted-failure forward path:

```text
QUEUED -> WAITING -> READY -> EVALUATING -> FAILED -> ARCHIVED
```

No transition may move backward, skip Evaluation, or reopen a terminal window.
`FAILED` is the defined terminal evaluation-attempt state after a permanent
failure or exhausted transient retry policy; it is not an alternate pipeline.

| State | Meaning | Allowed next state |
| --- | --- | --- |
| `QUEUED` | Window task identity exists but has not entered time waiting. | `WAITING` |
| `WAITING` | Window due time is in the future. | `READY` |
| `READY` | Due time has elapsed and the task may be claimed. | `EVALUATING` |
| `EVALUATING` | Price collection and Signal Evaluation handoff are in progress. | `COMPLETED` or `FAILED` |
| `COMPLETED` | An immutable evaluated result exists, including an explicit `UNAVAILABLE` result produced by Signal Evaluation. | `ARCHIVED` |
| `FAILED` | No canonical evaluation result could be produced after the allowed failure policy. | `ARCHIVED` |
| `ARCHIVED` | Terminal task metadata is retained for historical audit. | None |

An `UNAVAILABLE` Signal Evaluation result is a completed factual result, not a
tracking failure. `FAILED` is reserved for inability to complete the evaluation
contract itself.

### 5.2 Aggregate Tracking Status

The parent tracking record uses the same vocabulary monotonically:

1. `QUEUED` while the seven tasks are created.
2. `WAITING` while all nonterminal tasks are waiting for due time.
3. `READY` when the first due task is claimable.
4. `EVALUATING` after the first evaluation starts; it remains `EVALUATING`
   while later windows are waiting or processing so the parent never regresses.
5. `COMPLETED` after all seven tasks are terminal and none is `FAILED`.
6. `FAILED` after all seven tasks are terminal and at least one is `FAILED`.
7. `ARCHIVED` after downstream handoff metadata is finalized.

A single failed window does not move the parent to `FAILED` early and does not
cancel remaining windows.

## 6. Failure Policy

### 6.1 Failure Classes

* **Transient:** a retry may obtain the same required source-backed result
  without changing identity, due time, or evaluation semantics.
* **Permanent:** required identity or source data cannot be recovered under the
  approved contract.
* **Unavailable evaluation:** Signal Evaluation successfully determines that
  required market observations are absent or insufficient. This is
  `COMPLETED` with `UNAVAILABLE`, not `FAILED`.

Retries are allowed only for transient failures. Retry timing, limits, and
backoff require a future implementation contract.

### 6.2 Required Failure Behavior

| Condition | Classification | Required behavior |
| --- | --- | --- |
| Missing price data | Unavailable evaluation when source coverage is conclusively missing; transient only when an approved source is known to publish late | Preserve the missing interval and reason. Signal Evaluation returns `UNAVAILABLE`; never interpolate, carry forward, or invent candles. Other windows continue. |
| Temporary API failure | Transient | Retry the same idempotency identity without changing due time or source contract. Do not mark the window complete until Evaluation returns a result. |
| Expired signal | Permanent identity/coverage review | The frozen snapshot itself remains immutable. If approved historical data fully covers due windows, evaluate those windows normally; otherwise produce explicit unavailable results. Never recreate the signal from current Scanner state. |
| Duplicate execution | Idempotency event | Return or reference the existing window result. Do not collect, evaluate, append, or publish a second result. |
| Scheduler restart | Recovery event | Re-derive due tasks from immutable schedule state, claim only nonterminal idempotency identities, and continue. Never reset completed windows or derive due times from restart time. |
| Network interruption | Transient unless the approved retry policy is exhausted | Release or expire the processing claim safely, then retry the same task. Preserve any published completed result and never treat interrupted partial data as complete. |

### 6.3 Immutable Completion

After a window reaches `COMPLETED`:

* its snapshot identity, window, source references, metrics, unavailable reason,
  and completion metadata are immutable;
* duplicate workers must return the existing result;
* a later source correction requires a separately versioned correction process;
* a longer window cannot update it;
* user trade activity cannot replace it.

No correction process is designed or implemented in P4-4.

## 7. Autonomous Operation

Signal Tracking operates without user interaction.

Every canonical emitted QuantTerminal signal may be automatically enrolled,
scheduled, observed, and handed to Evaluation even if no user:

* opens Scanner;
* clicks or saves the signal;
* enters Research or Replay;
* prepares a trade;
* executes a trade;
* remains online.

Autonomous tracking does not mean autonomous execution. User trade activity is
optional metadata linked by `signalId` or a future approved relationship. It
does not control the signal schedule, evaluation windows, or signal outcome.

The architecture must support process restart and delayed workers without
requiring an active browser session. P4-4 does not implement that runtime.

## 8. Dependencies

### Required Dependencies

| Dependency | Use | Constraint |
| --- | --- | --- |
| Signal Snapshot | Immutable signal identity, emission time, direction, reference price, and provenance | Tracking cannot update or reconstruct it. |
| Market price data | Source-backed baseline and full-window observations | Tracking coordinates collection; Signal Evaluation interprets it. Missing data remains unavailable. |
| Canonical clock | Determines when immutable window due times have elapsed | Clock time cannot substitute for source observation time. |

### Prohibited Dependencies

Signal Tracking must not depend on:

* Trade execution or Trade page state;
* user accounts, user sessions, or browser availability;
* broker or exchange execution APIs;
* AI or LLM services;
* Learning Engine;
* Pattern Engine;
* Playbook Engine;
* Research or Replay generation;
* Dashboard rendering.

Market price adapters may read approved market-data sources, but Signal
Tracking itself does not become a market-data authority.

## 9. Relationship to Evaluation and Outcome

The canonical downstream relationship is:

```text
Tracking
  -> Signal Evaluation
  -> Outcome
  -> Historical Memory
  -> Learning
```

Rules:

1. Tracking never skips Signal Evaluation.
2. Tracking cannot calculate or label evaluation metrics.
3. Signal Evaluation owns the signal outcome.
4. Outcome receives an evaluated result only through an approved outcome-kind
   contract and cannot reinterpret signal metrics as user execution facts.
5. Historical Memory receives canonical accepted records from Outcome, not raw
   Tracking tasks.
6. Learning reads accepted historical records and never feeds back into
   Tracking timing or completed windows.

Until a dedicated signal-outcome contract is approved, the Outcome handoff is
an architectural boundary, not an implemented conversion.

## 10. Scalability Model

The architecture must support thousands of concurrent signals and seven window
tasks per signal without changing evaluation semantics.

### 10.1 Work Decomposition

* One immutable parent record per `trackingId`.
* Seven independently claimable window tasks per parent.
* Due-time ordering separate from signal priority or confidence.
* Window payloads contain references and bounded observations, not unrelated
  product state.

### 10.2 Parallel Workers

Future workers may process different window identities in parallel. They must:

* claim work atomically through a future lease or equivalent;
* use `trackingId + window` as the idempotency boundary;
* avoid concurrent publication for the same window;
* preserve source rate limits and approved provider policy;
* keep expensive historical processing outside product request paths;
* produce the same result regardless of worker identity.

### 10.3 Idempotent Execution

Idempotency requires:

* deterministic window identities and due times;
* duplicate enqueue tolerance;
* duplicate claim detection;
* publish-once terminal results;
* append-only completed-window accounting;
* restart recovery from nonterminal work only;
* no mutation of completed windows.

### 10.4 Bounded Coordination

The future implementation should batch due-time discovery and limit concurrent
source calls by approved provider. It must not poll every signal from a page or
hold UI rendering open while historical observations are collected.

P4-4 selects no queue, cron system, worker framework, database, lock service,
or deployment topology.

## 11. Success Criteria

The Signal Tracking architecture succeeds when:

* every canonical Signal Snapshot receives the same seven immutable due times;
* all window tasks progress independently and only forward;
* one failed window cannot cancel another;
* missing data produces explicit unavailable evaluation, never fabrication;
* retries are limited to transient failures;
* duplicate execution produces one immutable result;
* restart recovery preserves due times and completed windows;
* tracking runs without users, Trade, brokers, AI, or Learning;
* the architecture scales horizontally through idempotent window tasks;
* Tracking always hands observations through Signal Evaluation before Outcome
  or Historical Memory.

## 12. Validation

* `docs/project/signal-tracking-architecture.md` exists.
* The canonical pipeline contains exactly Signal Generated, Snapshot Frozen,
  Tracking Queue, Window Scheduler, Price Collection, Evaluation Queue, Outcome
  Engine, and Historical Memory.
* Tracking identity includes `trackingId`, `signalId`, `snapshotId`,
  `createdAt`, `nextEvaluation`, `completedWindows`, `pendingWindows`, and
  `status`.
* The schedule contains exactly `1h`, `6h`, `24h`, `3d`, `7d`, `14d`, and
  `30d`, and every window executes independently.
* The state model contains exactly `QUEUED`, `WAITING`, `READY`, `EVALUATING`,
  `COMPLETED`, `FAILED`, and `ARCHIVED` with forward-only transitions.
* Missing price data, temporary API failure, expired signal, duplicate
  execution, scheduler restart, and network interruption are governed.
* Autonomous operation, dependency boundaries, Outcome relationship,
  scalability, parallelism, and idempotency are defined.
* No queue, cron job, worker, scheduler, persistence, database, API,
  evaluation, learning, AI, or runtime implementation is introduced.
* Runtime files changed: none.
* API files changed: none.
* Package files changed: none.
* Build and TypeScript validation: not run; this is an architecture-only sprint
  and no build is required.
