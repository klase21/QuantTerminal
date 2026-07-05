# Worker Runtime Foundation

The Worker Runtime is the provider-neutral execution boundary for Phase 5. It
claims Scheduler-ready execution plans, dispatches them to caller-supplied
job handlers, and returns immutable structured execution results.

This foundation binds no handler to a Phase 4 runtime. It contains no business
implementation, persistence, Worker Pool, API, clock, timer, or background
process.

## Ownership

Worker Runtime owns:

* validating and claiming executable Scheduler plans;
* canonical job-type dispatch;
* Worker execution identity and lifecycle;
* structured execution completion metadata;
* immutable produced-record references;
* downstream execution references; and
* execution lineage preservation.

Worker Runtime never owns scheduling or retry timing, signal evaluation,
outcome generation, Historical Memory semantics, Learning, Confidence
Calibration, Playbook generation, persistence implementation, AI, or trading.

## Scheduler Relationship

`WorkerExecutionContext` accepts only a validated Scheduler `ExecutionPlan` in
`READY` state. Context fields are immutable:

```text
executionId
workerId
jobType
executionPlan
claimedAt
startedAt
```

The context must match the Scheduler identity and job type. `claimedAt` cannot
precede the Scheduler readiness event, and `startedAt` cannot precede the
claim. Worker Runtime does not calculate readiness, change run windows, create
retry timing, or modify Scheduler Runtime.

## Execution Identity and Lifecycle

A Worker attempt identity is deterministic from:

```text
executionId + workerId + claimedAt
```

Duplicate Scheduler `executionId` values are rejected within a Worker context
set. The lifecycle is forward-only:

```text
CREATED -> CLAIMED -> RUNNING -> SUCCEEDED -> ARCHIVED
                    |       |
                    |       +-> FAILED -> ARCHIVED
                    +----------> CANCELLED -> ARCHIVED
```

Lifecycle transitions append immutable history entries. Backward transitions
and history rewrites are rejected.

## Dispatch Philosophy

The dispatcher supports exactly the Scheduler job vocabulary:

```text
SignalCapture
TrackingInitialization
EvaluationWindow
PriceObservation
SignalEvaluation
OutcomeRecording
HistoricalMemoryWrite
PatternCandidate
LearningCandidate
CalibrationCandidate
PlaybookCandidate
```

Handlers are injected by the caller. This module does not import or bind a
Signal, Evaluation, Outcome, Memory, Pattern, Learning, Calibration, or
Playbook implementation. Dispatch selects the handler matching `jobType`,
passes the immutable context, and validates the handler's structured result.

A handler may return only:

* produced record references;
* downstream execution IDs; or
* a structured execution error.

The Worker does not inspect record payloads, decide what a result means, or
generate downstream execution plans. Missing handlers and malformed handler
results become explicit failed execution metadata.

## Worker Result

An immutable `WorkerResult` contains:

```text
executionId
workerId
status
completedAt
producedRecords
nextExecutionIds
error (optional)
```

Statuses are `SUCCEEDED`, `FAILED`, and `CANCELLED`. Failed results require an
error. Only successful results may expose produced records or next execution
IDs. References are unique and cannot point to the current execution.

## Execution Lineage

Lineage preserves:

* the Scheduler parent execution ID;
* the retry parent when the Scheduler retry count is greater than zero;
* all Scheduler dependency execution IDs; and
* downstream IDs returned by dispatch.

Lineage is copied into a frozen representation. The Worker neither changes
upstream identity nor invents downstream jobs.

## Repository Relationship

Worker Runtime imports no Repository or StorageAdapter. A future integration
may persist `WorkerLock`, `JobState`, `RetryState`, and `DeadLetter` operational
records through the provider-neutral Repository. It must not write directly to
SQLite or Postgres.

Produced records in `WorkerResult` are references only. A handler or future
orchestrator remains responsible for passing runtime records to Repository
under the existing opaque-payload and idempotency contracts.

## Runtime Relationship

Phase 4 runtimes remain the sole owners of business validation and output
semantics. Future bindings may adapt one certified runtime operation to one
handler. Worker Runtime only invokes that supplied boundary and transports its
references; it never interprets domain values.

## Merge, Query, and Serialization

Lifecycle merge is append-only and requires an exact history prefix. Completed
results are immutable: only an identical result may merge. Query types define
worker, execution, job, lifecycle, result-status, and completion-window
filters without implementing search.

Serialization validates before JSON encoding. Deserialization reparses,
revalidates identities and lifecycles, and reconstructs frozen values. No
persistence format is implied.

## Future Execution

A future Worker Pool may coordinate claims, leases, concurrency, and process
health around these contracts. Future distributed execution may transport the
serialized context and result while preserving deterministic identities and
duplicate rejection.

Neither future boundary may move scheduling, business logic, or storage
implementation into Worker Runtime.

## Intentionally Not Implemented

This module includes no:

* Cron, Vercel Cron, GitHub Actions, timer, or scheduling process;
* Worker Pool, queue consumer, lease store, thread, or distributed service;
* API, route, page, UI, Repository call, StorageAdapter call, or database;
* live job binding, live signal capture, live price collection, evaluation,
  outcome generation, learning, confidence, Playbook generation, AI, or trade
  execution.

