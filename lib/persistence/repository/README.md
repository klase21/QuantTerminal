# Phase 5 Persistence Repository Layer

This directory maps certified Phase 4 runtime records into the provider-neutral
`StorageRecord` envelope and delegates persistence operations to the P5-2
`StorageAdapter` contract. It contains no database implementation.

## Purpose

The Repository owns:

* validating a caller's persistence intent;
* invoking the owning Phase 4 runtime validator;
* mapping runtime identity, timestamps, and lineage into storage metadata;
* preserving deterministic idempotency;
* calling `StorageAdapter` methods;
* translating adapter responses into structured Repository results.

It does not own SQL, schemas, migrations, providers, scheduling, runtime
lifecycles, domain logic, learning, AI, or product behavior.

## Runtime Mapping

| Runtime record | Storage kind | Record identity | Parent storage records |
| --- | --- | --- | --- |
| Historical Market | `HISTORICAL_MARKET` | Source + dataset + symbol + interval + provider observation timestamp | None; source fact rather than Signal-derived observation. |
| Historical Funding | `HISTORICAL_FUNDING` | Source + symbol + provider funding timestamp | None; source fact rather than Signal-derived evidence. |
| Historical Open Interest | `HISTORICAL_OPEN_INTEREST` | Source + symbol + provider observation timestamp | None; source fact rather than Signal-derived evidence. |
| Historical Liquidation | `HISTORICAL_LIQUIDATION` | Source + symbol + deterministic provider-event identity | None; source fact rather than Signal-derived evidence. |
| Historical AggTrade | `HISTORICAL_AGG_TRADE` | Source + symbol + provider aggregate-trade ID | None; source fact rather than Signal-derived evidence. |
| Historical Provider Metadata | `HISTORICAL_PROVIDER_METADATA` | Target record kind + immutable target record ID | Target historical fact; metadata attestations never overwrite fact payloads. |
| Historical Dataset Metadata | `HISTORICAL_DATASET_METADATA` | Dataset kind + source + symbol + contract version | Versioned resolution and coverage contract; no market fact mutation. |
| Historical Coverage Projection | `HISTORICAL_COVERAGE_PROJECTION` | Dataset + symbol + UTC day + deterministic source watermark | Immutable cached aggregate; never rewrites historical facts. |
| Signal Snapshot | `SIGNAL_SNAPSHOT` | `snapshotId` | None; capture input remains an opaque payload. |
| Signal Tracking | `SIGNAL_TRACKING` | `trackingId` | Signal Snapshot |
| Context Snapshot | `CONTEXT_SNAPSHOT` | `signalId + snapshotVersion` | Signal Snapshot |
| Price Observation | `PRICE_OBSERVATION` | `trackingId` plus evaluation window | Signal Tracking and optional window `JOB_STATE` |
| Signal Evaluation | `SIGNAL_EVALUATION` | Signal + snapshot + evaluation window composite | Signal Tracking and Price Observation |
| Signal Outcome | `SIGNAL_OUTCOME` | `outcomeId` | Signal Snapshot, optional Context Snapshot, Signal Tracking, and Signal Evaluation |
| Outcome Event | `OUTCOME_EVENT` | `eventId` | Signal Outcome |
| Historical Memory | `HISTORICAL_MEMORY` | `memoryId` | Signal Snapshot, optional Context Snapshot, Signal Evaluation, and Outcome Event |
| Pattern | `PATTERN` | `patternId` plus version/evidence identity | Historical Memory evidence |
| Learning | `LEARNING` | `learningId` plus version/Pattern-set identity | Pattern evidence |
| Confidence Calibration | `CONFIDENCE_CALIBRATION` | `calibrationId` plus version/evidence identity | Learning and Pattern evidence |
| Playbook | `PLAYBOOK` | `playbookId` plus version/evidence identity | Learning and Calibration evidence |

## Operational Records

P5-8 extends the Repository with runtime-independent operational records. They
coordinate future execution infrastructure without adding Scheduler, Worker,
queue, lease, retry-loop, or cron behavior.

| Operational type | Storage kind | Deterministic identity |
| --- | --- | --- |
| `SchedulerRun` | `SCHEDULER_RUN` | `recordId` |
| `WorkerLock` | `WORKER_LOCK` | `recordId` |
| `RetryState` | `RETRY_STATE` | `recordId` |
| `JobState` | `JOB_STATE` | `recordId` |
| `DeadLetter` | `DEAD_LETTER` | `recordId` |

Each operational record supplies its immutable `recordId`,
`operationalVersion`, `schemaVersion`, `createdAt`, canonical `parentRefs`, and
opaque JSON `payload`. Repository maps `operationalVersion` to the storage
envelope's `runtimeVersion`, derives a record-kind-aware idempotency key from
the storage kind and `recordId`, and never interprets payload contents.

Operational identities are unique by storage kind plus `recordId`. Repeated
identities within one batch fail validation before adapter access. Repeated
persisted writes continue to use the adapter's existing `DUPLICATE` result;
Repository adds no result status.

## Mapping Boundary

Historical persistence intents carry `providerTier`, `canonical`, `verified`,
and `confidence`. Canonical records require `CANONICAL / true / true / 1.0`.
Experimental records require `EXPERIMENTAL / false / false` and confidence no
higher than `0.65`. Repository validates this metadata while keeping the full
historical payload opaque.

Every mapper:

1. invokes the runtime's existing validator;
2. extracts only canonical identity, schema version, creation boundary, and
   approved parent references;
3. creates a record-kind-aware idempotency key with the P5-2 helper;
4. passes the complete runtime record as opaque JSON;
5. validates the resulting `StorageRecord` envelope.

The storage validator clones and freezes the mapped payload. The original
runtime input is never mutated, rewritten, enriched, or frozen by Repository.

`recordedAt` and an optional checksum are caller-supplied persistence metadata.
Repository reads no clock and does not fabricate either value. Evaluation and
Outcome creation boundaries use their canonical evaluation-window end, not a
retrieval or persistence timestamp.

## Idempotency

The same validated runtime identity always produces the same key. Knowledge
keys include their version and evidence-set hashes. Signal Evaluation uses its
certified composite identity because the Phase 4 runtime has no standalone
`evaluationId`.

Repository does not perform a read-before-write duplicate check. It passes the
canonical key to `StorageAdapter`; the concrete adapter remains responsible for
atomic duplicate and conflict enforcement.

## Repository Interface

`createPersistenceRepository(adapter)` exposes:

```text
saveSignalSnapshot
savePriceObservation
saveHistoricalMarketRecord
saveHistoricalFundingRecord
saveHistoricalOpenInterestRecord
saveHistoricalLiquidationRecord
saveHistoricalAggTradeRecord
saveHistoricalProviderMetadata
saveHistoricalDatasetMetadata
saveHistoricalCoverageProjection
saveRuntimeRecord
saveManyRuntimeRecords
getStorageRecord
recordExists
archiveStorageRecord
listStorageRecords
```

`saveSignalSnapshot` closes the explicit execution-architecture gap for the
Signal Capture pilot. Repository validates snapshot identity, timestamps,
schema version, and JSON safety, then stores the complete candidate as opaque
payload. It does not interpret Scanner fields or create missing signal data.

`savePriceObservation` stores an immutable, source-backed observation as an
opaque payload. Repository validates observation identity, tracking/window
identity, timestamps, schema version, parent references, and JSON safety. Its
idempotency key is deterministic from `trackingId + windowId`; it never updates
an existing observation.

`saveHistoricalMarketRecord` stores a validated historical market fact without
inventing Signal Tracking lineage. Its payload remains opaque; Repository uses
only source, dataset, symbol, interval, and provider observation time to derive
the deterministic idempotency key.

`saveHistoricalFundingRecord` stores a source-backed funding fact keyed by its
provider funding timestamp. It does not infer freshness or create Signal,
Context, Tracking, Evaluation, Outcome, or Memory lineage.

It also exposes the operational-only surface:

```text
saveOperationalRecord
saveOperationalRecords
getOperationalRecord
listOperationalRecords
```

Operational reads validate that the adapter returns only the requested
operational identity. Operational lists always constrain `recordKinds` to the
canonical operational set, or to a caller-supplied subset of that set. The
methods delegate to the unchanged `StorageAdapter` contract.

Batch save returns one structured result per input and preserves input order.
It does not claim transactionality across records. Adapter exceptions are
defensively converted to `ADAPTER_ERROR`; normal control flow must use the
structured result contract.

Repository statuses are:

```text
SUCCESS
DUPLICATE
NOT_FOUND
VALIDATION_ERROR
ADAPTER_ERROR
CONFLICT
UNAVAILABLE
```

Successful adapter records are revalidated before Repository returns them.
Malformed adapter results fail closed as `ADAPTER_ERROR`.

## No Fabrication and No Mutation

Repository never generates or changes signals, evaluations, outcomes,
evidence, memory, interpretations, conclusions, confidence, Playbooks,
timestamps, or parent identities. Missing or invalid runtime identity remains
a validation failure. Unsupported operational mapping remains explicit.

## Intentionally Not Implemented

P5-3 includes no:

* SQLite, Postgres, Neon, Supabase, Turso, file, memory, or browser adapter;
* database client, SQL, schema, table, index, migration, transaction, or query;
* API, page, UI, scheduler, queue, worker, lease, retry loop, or cron;
* runtime lifecycle transition, evaluation, learning, AI, or execution logic.

Future SQLite and Postgres adapters may implement `StorageAdapter` without
changing these mappers. They must preserve opaque payloads, atomic
idempotency, structured failures, and the same parent lineage.

Future Scheduler integration may create these operational models and persist
them through Repository. Scheduler timing, state transitions, retry policy,
claims, and execution remain outside Repository ownership.
