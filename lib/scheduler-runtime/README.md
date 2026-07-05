# Scheduler Runtime Foundation

The Scheduler Runtime is the provider-neutral timing and execution-lifecycle
model for Phase 5. It defines when an execution unit may become ready, which
dependencies must already be resolved, how execution attempts are identified,
and how retry lineage is represented.

It contains pure TypeScript only. It reads no clock, starts no timer, executes
no work, and stores nothing.

## Ownership

Scheduler Runtime owns:

* execution timing and allowed run windows;
* execution ordering and dependency resolution;
* deterministic execution identity;
* forward-only execution lifecycle;
* retry scheduling metadata; and
* append-only execution history.

It never owns signal generation or evaluation, price collection, outcome
calculation, Historical Memory semantics, Pattern or Learning interpretation,
confidence, Playbook generation, AI, trading, persistence implementation, or
UI behavior.

## Supported Jobs

Only these job types are accepted:

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

The runtime has no custom-job extension path. Job payloads and business inputs
remain outside `ExecutionPlan`.

## Execution Plan

An immutable `ExecutionPlan` contains:

```text
executionId
parentExecutionId
jobType
scheduledAt
earliestRunAt
latestRunAt
retryPolicy
dependencyIds
executionState
executionHistory
```

`executionId` is deterministic from `jobType`, `parentExecutionId`, and the
canonical `scheduledAt`. The initial history entry is `CREATED` at
`scheduledAt`. All timestamps are caller supplied and canonicalized. The
runtime never substitutes the current time.

## Lifecycle

The lifecycle is forward-only:

```text
CREATED -> SCHEDULED -> READY -> CLAIMED -> RUNNING -> SUCCEEDED -> ARCHIVED
                                             |
                                             v
                                           FAILED -> RETRYING -> ARCHIVED
                                              |
                                              v
                                        DEAD_LETTERED -> ARCHIVED
```

Invalid or backward transitions return structured errors. Transition helpers
return new frozen plans and append a history entry; they never mutate the
input. Existing history entries cannot be changed by merge.

## Dependencies and Readiness

`activateExecution()` accepts an explicit evaluation timestamp and a set of
resolved execution IDs. It moves a `SCHEDULED` plan to `READY` only when:

* every declared dependency is resolved; and
* the supplied timestamp is within `earliestRunAt` and `latestRunAt`.

Missing dependencies remain explicit validation failures. The Scheduler does
not infer completion, inspect dependency outputs, or decide business success.

## Retry Philosophy

Retry metadata contains:

```text
retryCount
maxRetryCount
retryAfter
retryReason
backoffPolicy
```

Backoff policies are metadata only: `NONE`, `FIXED`, or `EXPONENTIAL`. There is
no timer or backoff calculation. A retry creates a new child `ExecutionPlan`
whose `parentExecutionId` references the failed attempt. The failed parent
advances to `RETRYING`; it is not rewritten as successful. Retry counts are
bounded, and exhausted policies reject new attempts.

## Merge and Serialization

Merge permits only an incoming plan whose immutable identity, timing, retry,
and dependency fields match and whose history contains the existing history
as an exact prefix. Plan-set merge appends new identities and rejects duplicate
identities within either input set.

Serialization validates before writing JSON. Deserialization parses,
revalidates deterministic identity and lifecycle, and reconstructs a deeply
frozen plan. No persistence format or provider behavior is included.

## Repository Relationship

The Scheduler Runtime does not import or call the Persistence Repository.
Future orchestration may map Scheduler plans and lifecycle observations into
the P5 operational record models (`SchedulerRun`, `JobState`, `RetryState`,
`WorkerLock`, and `DeadLetter`) through the Repository. It must not call a
StorageAdapter directly.

The current persistence certification notes that append-only lifecycle
observation identity must be explicit. Scheduler execution identities and
history provide the runtime basis; durable mapping remains future integration
work.

## Future Integrations

Future Cron, Vercel Cron, or GitHub Actions integrations may supply explicit
times and request activation. They must not move timing or lifecycle rules out
of this runtime.

Future Workers may claim `READY` plans and report explicit lifecycle events.
They must not mutate plans, bypass validation, or use Scheduler Runtime to
perform business logic.

## Intentionally Not Implemented

This module includes no:

* Cron, Vercel Cron, GitHub Actions, scheduler process, timer, or background loop;
* Worker, queue, lease implementation, lock service, or live execution;
* API, route, page, UI, database, Repository call, or StorageAdapter call;
* signal evaluation, outcome calculation, Historical Memory write, learning,
  confidence computation, Playbook generation, AI, or trading.

The runtime activates execution units conceptually. It never executes or
interprets them.

