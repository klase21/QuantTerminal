# Phase 5 Persistence Contracts

This directory defines the provider-neutral persistence boundary approved by
`docs/project/phase5-persistence-architecture.md`. It contains contracts and
pure helpers only. It does not store data.

## Purpose

The persistence boundary accepts serialized, runtime-validated records and
gives future storage adapters a common contract for durable writes, reads,
idempotency, append-only events, archival metadata, and health reporting.

Persistence treats every runtime payload as opaque JSON. It validates only the
storage envelope. Signal Tracking, Signal Evaluation, Signal Outcome, Outcome
Recorder, Historical Memory, Pattern, Learning, Confidence Calibration, and
Playbook remain the sole authorities for their payload internals.

## Modules

* `types.ts`: JSON, storage envelope, locator, list, archive, and health types.
* `recordKind.ts`: canonical Facts, Knowledge, and Operational record kinds.
* `idempotency.ts`: deterministic record-kind-aware key creation, validation,
  and comparison.
* `adapter.ts`: provider-neutral asynchronous `StorageAdapter` interface.
* `result.ts`: structured success and failure result vocabulary.
* `errors.ts`: structured persistence error model.
* `serialization.ts`: safe Storage Record JSON round trips.
* `validation.ts`: storage-envelope and opaque-JSON validation.
* `index.ts`: public exports.

## Record Envelope

`StorageRecord` contains:

```text
recordId
recordKind
idempotencyKey
runtimeVersion
schemaVersion
createdAt
recordedAt
parentRefs
payload
checksum (optional)
```

`createdAt` belongs to the runtime record. `recordedAt` is the caller-supplied
durable-recording time. The helpers read no ambient clock and never substitute
one timestamp for the other.

Payload validation permits JSON-safe primitives, arrays, and plain objects.
It rejects cycles, non-finite numbers, class instances, functions, symbols,
and undefined values. Successful validation clones and freezes the payload;
the caller's runtime object is never frozen or mutated.

## Adapter Contract

The interface defines:

* `writeRecord()` for canonical idempotent record writes;
* `readRecord()` and `recordExists()` by record kind and ID;
* `listRecords()` through a provider-neutral query and cursor page;
* `appendEvent()` for append-only storage observations;
* `markArchived()` for explicit storage archival metadata;
* `healthCheck()` for canonical `READY`, `DEGRADED`, or `UNAVAILABLE`
  backend health.

Every method returns a structured result and must not use thrown exceptions as
normal control flow. A concrete adapter must enforce uniqueness atomically and
must distinguish duplicate, conflict, unavailable, and storage-error states.
`markArchived()` must not rewrite the opaque runtime payload or imply a runtime
lifecycle transition.

## Record Kinds

Facts:

```text
SIGNAL_SNAPSHOT
SIGNAL_TRACKING
PRICE_OBSERVATION
SIGNAL_EVALUATION
SIGNAL_OUTCOME
OUTCOME_EVENT
HISTORICAL_MEMORY
```

Knowledge:

```text
PATTERN
LEARNING
CONFIDENCE_CALIBRATION
PLAYBOOK
```

Operational:

```text
SCHEDULER_RUN
WORKER_LOCK
RETRY_STATE
JOB_STATE
DEAD_LETTER
```

## Idempotency

Keys use the canonical form:

```text
<RECORD_KIND>:<encoded identity part>[:<encoded identity part>...]
```

Identity parts are caller-owned canonical runtime identities. Helpers encode
parts without interpreting them, reject empty or non-canonical inputs, and
ensure the key belongs to its declared record kind. Comparison accepts only
two valid keys with the same record kind and identical decoded identity parts.

A concrete adapter must apply the architecture policy:

* same key and same payload checksum is an idempotent duplicate;
* same key and different content is a conflict;
* a new versioned runtime identity is a new write;
* uniqueness is enforced by storage, not an in-memory pre-check.

Checksums remain optional at this contract stage. They are integrity metadata,
not evidence, confidence, or product intelligence.

## Structured Results

Canonical statuses are:

```text
SUCCESS
DUPLICATE
NOT_FOUND
VALIDATION_ERROR
STORAGE_ERROR
CONFLICT
UNAVAILABLE
```

Failures contain structured errors with a code, message, retryability flag,
and optional field/cause. This layer does not retry or recover automatically.

## Intentionally Not Implemented

P5-2 includes no:

* SQLite, Postgres, Neon, Supabase, Turso, or other provider implementation;
* database schema, table, index, migration, client, query, or connection;
* file, browser, memory, or JSONL repository;
* API, route, page, UI, worker, scheduler, queue, lease, retry loop, or cron;
* runtime-payload interpretation or mutation;
* signal generation, evaluation, outcome creation, learning, calibration,
  Playbook generation, AI, or execution behavior.

## Future Adapters

A future SQLite development adapter and Postgres production adapter may
implement `StorageAdapter` under separately approved sprints. Both must pass
the same contract tests, preserve opaque serialized payloads, enforce atomic
idempotency, and return this module's structured results without changing the
certified Phase 4 runtimes.
