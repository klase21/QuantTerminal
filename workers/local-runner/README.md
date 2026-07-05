# Local Runner Foundation

The Local Runner is a controlled development-only orchestrator for validating
the Phase 5 execution contracts end to end. It wires:

```text
LocalRunRequest
  -> Cron TriggerRequest
  -> SchedulerActivationRequest
  -> Scheduler ExecutionPlan
  -> WorkerExecutionContext
  -> WorkerResult
  -> Repository operational records (SQLite mode only)
```

It is not a production scheduler, Worker Pool, API, or business pipeline.

## Purpose and Ownership

Local Runner owns:

* explicit local manual execution;
* provider-neutral Cron/Scheduler/Worker wiring;
* development validation of execution contracts;
* sequential dependency ordering for selected jobs;
* optional local operational-record persistence; and
* structured local run results.

Local Runner does not own:

* production scheduling;
* live signal generation;
* price interpretation or evaluation mathematics;
* Outcome, Historical Memory, Pattern, Learning, Calibration, or Playbook logic;
* AI, APIs, UI, broker integration, or trade execution.

## Local Run Request

An immutable `LocalRunRequest` contains:

```text
runId
requestedAt
triggerProvider
executionScope
jobTypes
dryRun
metadata
```

Only `LOCAL` and `MANUAL` providers are accepted. Job types must be unique and
belong to the canonical eleven-job Scheduler vocabulary. Metadata is opaque
JSON-safe data and is deep-frozen. A bootstrap instance keeps an in-process
run-ID registry and rejects duplicate manual submissions.

## Bootstrap

`bootstrapLocalRunner()` wires only local/provider-neutral dependencies:

* Cron Adapter;
* Scheduler Runtime functions used by dispatch;
* Worker Runtime with development handlers;
* provider-neutral Repository; and
* SQLite adapter when durable local mode is requested.

It does not configure Vercel, GitHub Actions, Postgres, Neon, production
workers, or environment-driven provider selection.

An injectable `now()` function supplies the actual local run/recording time.
The default uses the local process clock. The request timestamp remains the
identity and creation boundary; it is never substituted for durable recording
time.

## Signal Capture Pilot

`SignalCapture` is the first live-handler pilot. It consumes one existing
Scanner opportunity supplied as `metadata.scannerOpportunity`; it does not call
the Scanner API or any market provider. Capture uses only fields already
present in that object.

The known Scanner fallback setup `Live Market Signal` is not recorded as a
signal reason. Confidence, freshness, market structure, and source metadata are
recorded only when production-approved `_source` metadata accompanies the
opportunity. Missing fields remain `null`; the request timestamp is the capture
boundary and is never presented as source freshness.

A reference entry price is retained only when a production-approved source ID,
positive source price, and source timestamp exactly matching snapshot creation
are supplied. Direction is preserved verbatim and is never normalized into
`LONG`, `SHORT`, or `NEUTRAL`.

Identity is deterministic for the frozen Scanner content and capture timestamp.
SignalCapture also creates exactly one finalized Context Snapshot using the
same Signal creation boundary. Registry-approved Scanner-derived Market
evidence and explicit `metadata.contextEvidence` are preserved. It also accepts
already-fetched source snapshots in `metadata.sectorRotation`,
`metadata.etfFlow`, `metadata.reserveIntelligence`,
`metadata.predictionMarkets`, `metadata.exchangeComparison`, and
`metadata.futuresSymbolContext`.

These inputs map respectively to `SECTOR`, `ETF`, `EXCHANGE`, `PREDICTION`,
`EXCHANGE`, and `DERIVATIVES`. A mapped item is available only when its exact
registered source ID is active and production-approved, `_source` is active or
degraded, canonical freshness is not unavailable, and real `lastUpdatedAt` is
at or before Signal creation. SignalCapture performs no source fetch and never
uses retrieval time as evidence time. Invalid, blocked, late, or absent inputs
are ignored and the category remains explicit `UNAVAILABLE`.

Explicit `metadata.contextEvidence` wins for the same category/source pair.
Every otherwise absent canonical category is recorded as `UNAVAILABLE` with no
inferred payload.

Dry run returns both `SIGNAL_SNAPSHOT` and `CONTEXT_SNAPSHOT` references without
writing. SQLite mode persists both immutable records and capture completion
through Repository. Context identity is `signalId + snapshotVersion`, its
Repository parent is the Signal Snapshot, and duplicates never overwrite.

Missing or malformed Scanner output returns `UNAVAILABLE`; malformed or
unapproved explicit context returns `VALIDATION_ERROR`. The pilot creates no
tracking, evaluation, outcome, memory, knowledge, or downstream execution.
An identical persisted Context Snapshot is accepted as an idempotent duplicate.
The same identity with different finalized content returns `CONFLICT` after a
Repository read and runtime validation comparison.

## Tracking Initialization Pilot

`TrackingInitialization` is the second live-handler pilot. It consumes an
existing Signal Snapshot through `metadata.signalSnapshot`,
`metadata.signalSnapshotRecordId`, or the preceding `SignalCapture` result in
the same local run. Persistence mode loads and validates the canonical
`SIGNAL_SNAPSHOT` record through Repository before initialization. Dry-run may
validate an explicit in-memory snapshot reference without writing it.

The handler delegates identity, initial `QUEUED` lifecycle state, and all seven
evaluation windows to the existing Signal Tracking Runtime. It does not define
window durations or calculate an evaluation. The resulting `SIGNAL_TRACKING`
record is persisted only through Repository and carries its `SIGNAL_SNAPSHOT`
parent reference. Duplicate initialization returns the deterministic tracking
reference without overwriting the stored lifecycle.

Missing snapshots return `UNAVAILABLE`; malformed or mismatched references
return `VALIDATION_ERROR`. No signal content, confidence, timestamp,
evaluation, or downstream job is generated.

## Evaluation Window Pilot

`EvaluationWindow` is the third live-handler pilot. It consumes an existing
Signal Tracking lifecycle through `metadata.signalTracking`,
`metadata.signalTrackingRecordId`, or the preceding
`TrackingInitialization` result in the same local run. Persistence mode loads
and validates the canonical `SIGNAL_TRACKING` record through Repository.

Readiness uses only each runtime-owned window's `dueAt` and the explicit Worker
start time. A not-due lifecycle returns a successful no-op. Each due window
produces one deterministic `JOB_STATE` readiness reference and one deterministic
future `PriceObservation` execution reference. It does not create a Scheduler
plan, fetch a price, calculate a metric, or create an evaluation result.

SQLite mode persists readiness work through Repository with the tracking record
as parent. The canonical identity is `trackingId + windowId`; duplicate
activation confirms the existing operational record without overwrite. The
immutable tracking lifecycle is not rewritten or advanced by this pilot.

Missing tracking returns `UNAVAILABLE`; malformed or mismatched tracking
returns `VALIDATION_ERROR`.

## Price Observation Pilot

`PriceObservation` is the fourth live-handler pilot. It consumes persisted
Evaluation Window `JOB_STATE` work, prior same-run window work, or an explicit
Signal Tracking lifecycle plus canonical window ID. It resolves the owning
Signal Snapshot for the source symbol before observing.

The sole source is registered, production-approved `binance-live`. For each
window the handler uses the existing Binance Futures 1-minute kline endpoint
through a bounded source client and requires an exact source candle close at
the canonical window end. A missing exact row remains `UNAVAILABLE`. Funding
and open interest remain `UNAVAILABLE` for this window-end observation. No
retrieval timestamp is substituted for a source timestamp.

Freshness is derived by the canonical governance runtime from Binance
`observedAt` and the runner's post-response clock. Each immutable
`PRICE_OBSERVATION` identity is deterministic from `trackingId + windowId`.
SQLite mode persists the observation and its operational completion through
Repository only; duplicates confirm existing records without overwrite.
Dry-run performs the live observation but writes nothing.

The handler creates no return, excursion, direction-correctness, evaluation,
outcome, memory, or Knowledge record. Missing work/tracking is a
`VALIDATION_ERROR`; unavailable Binance data remains `UNAVAILABLE`.

## Signal Evaluation Pilot

`SignalEvaluation` is the fifth live-handler pilot. It consumes a prior
same-run Price Observation, persisted `PRICE_OBSERVATION` reference, or
explicit source-backed observation metadata. It resolves the immutable Signal
Snapshot for the exact direction and source-backed emission price.

The handler delegates all calculation and unavailable-result construction to
the existing Signal Evaluation Runtime. It supplies the canonical window from
the snapshot creation time and runtime window definition. Observation time is
never changed to fit the window. Missing entry price or unavailable observed
price produces the runtime's canonical `UNAVAILABLE` metrics; missing direction
remains runner-level `UNAVAILABLE` because direction cannot be inferred.

SQLite mode persists immutable `SIGNAL_EVALUATION` and operational completion
records through Repository only. Evaluation identity is deterministic from
signal ID, snapshot ID, and window; its Repository lineage includes both
`SIGNAL_TRACKING` and `PRICE_OBSERVATION`. Duplicate evaluation never
overwrites the existing result. Dry-run writes nothing.

No evaluation narrative, confidence, execution result, Outcome, Memory, or
Knowledge record is created.

## Outcome Recording Pilot

`OutcomeRecording` is the sixth live-handler pilot. It consumes a prior
same-run Signal Evaluation, persisted `SIGNAL_EVALUATION` reference, or an
explicit runtime-valid evaluation. It also resolves the owning immutable
Signal Snapshot; missing symbol, exchange, timeframe, or direction remains
`UNAVAILABLE` rather than being reconstructed.

The handler delegates merge and identity creation to Signal Outcome Runtime,
advances the runtime-owned lifecycle through `VALIDATED` to `FINALIZED`, then
delegates event creation to Outcome Recorder Runtime. An `UNAVAILABLE`
completed evaluation is preserved as an unavailable factual outcome. Pending
or failed evaluations are not recorded. Evidence and Replay references absent
from the captured snapshot remain explicitly `UNAVAILABLE`. The Context
Snapshot ID is retained when a matching finalized snapshot is available;
otherwise Context remains explicitly `UNAVAILABLE` and the Signal Snapshot ID
is never substituted.

SQLite mode persists `SIGNAL_OUTCOME`, `OUTCOME_EVENT`, and operational
completion through Repository only. Deterministic runtime identities make
duplicate recording confirm existing records without overwrite. Dry-run
creates the immutable runtime values in memory and writes nothing.

No explanation, confidence, reasoning, lesson, recommendation, Memory, or
Knowledge record is generated.

## Historical Memory Write Pilot

`HistoricalMemoryWrite` is the seventh live-handler pilot. It consumes a prior
same-run Outcome Event, persisted `OUTCOME_EVENT` reference, or explicit
runtime-valid Outcome Event. Missing events remain `UNAVAILABLE`; malformed or
mismatched events return `VALIDATION_ERROR`.

The handler delegates deterministic identity, immutable event embedding,
canonical `OUTCOME_EVENT` reference creation, and initial `CREATED` lifecycle
state to Historical Memory Runtime. It adds no interpretation and does not
advance the record into verification or indexing.

SQLite mode persists immutable `HISTORICAL_MEMORY` and operational completion
through Repository only. Duplicate writes confirm the same deterministic
memory identity without overwrite. Dry-run creates the memory in process and
writes nothing.

No Pattern, Learning, Calibration, Playbook, explanation, confidence,
recommendation, or similarity value is generated.

## Development Handlers

The remaining four job types retain explicit development handlers in two modes:

* `NO_OP`: returns structured success with no produced records and no
  downstream execution IDs;
* `NOT_IMPLEMENTED`: returns a structured, non-retryable `NOT_IMPLEMENTED`
  error.

Neither mode creates Evaluation, Outcome, Memory, Knowledge, or trade data.
These handlers exist only to validate orchestration contracts.

## Dispatch Flow

Selected jobs are converted into immutable Scheduler plans. Each plan after
the first depends on the previous plan's execution ID, preserving the request
order. Plans use the request time as their scheduling boundary and the actual
local run time as the latest allowed execution boundary.

Cron Adapter emits one activation request containing all plan IDs. Local
dispatch then schedules and activates each plan, creates a Worker context, and
invokes the selected local handler. `SignalCapture`, `TrackingInitialization`,
`EvaluationWindow`, `PriceObservation`, `SignalEvaluation`, and
`OutcomeRecording`, plus `HistoricalMemoryWrite`, are the only live pilots.
Tracking, evaluation, outcome, recorder, and memory work delegate to their
certified runtimes; window preparation creates operational references only,
and observation records factual Binance fields only. No Knowledge runtime is
called.

## Dry-Run Mode

When `dryRun` is true:

* Cron, Scheduler, and Worker validation executes in memory;
* immutable trigger, activation, plan, context, and result objects are created;
* no SQLite adapter is required;
* Repository is not called; and
* `operationalRecordIds` remains empty.

Dry run validates the control flow only. A successful no-op result does not
claim that business work occurred.

## SQLite-Backed Mode

When `dryRun` is false, bootstrap requires a local SQLite database path and a
`READY` adapter health check. If SQLite is absent, invalid, or unhealthy, the
runner returns `STORAGE_UNAVAILABLE` without claiming durability.

SQLite mode writes observed operational records:

* one `SchedulerRun` for the local activation; and
* one `JobState` for each Worker result actually produced.

Live pilots may additionally write their owning Facts records through
Repository only:

* `SignalCapture` writes `SIGNAL_SNAPSHOT`;
* `SignalCapture` writes finalized `CONTEXT_SNAPSHOT` and capture completion;
* `TrackingInitialization` writes `SIGNAL_TRACKING`.
* `EvaluationWindow` writes deterministic operational `JOB_STATE` readiness records.
* `PriceObservation` writes immutable `PRICE_OBSERVATION` and completion records.
* `SignalEvaluation` writes immutable `SIGNAL_EVALUATION` and completion records.
* `OutcomeRecording` writes immutable `SIGNAL_OUTCOME`, `OUTCOME_EVENT`, and completion records.
* `HistoricalMemoryWrite` writes immutable `HISTORICAL_MEMORY` and completion records.

It does not invent `WorkerLock`, `RetryState`, `DeadLetter`, or any other Phase
4 runtime records. Writes pass through provider-neutral Repository. Duplicate
durable run identity is reported as `VALIDATION_ERROR`.

## Result Statuses

```text
SUCCESS
PARTIAL
UNAVAILABLE
VALIDATION_ERROR
CONFLICT
NOT_IMPLEMENTED
STORAGE_UNAVAILABLE
EXECUTION_ERROR
```

Results may include the immutable partial summary when a controlled flow stops
after producing valid earlier stages. Missing storage and unimplemented
handlers remain explicit.

## Future Paths

Future Vercel Cron integration may create provider-neutral trigger inputs, but
must not reuse Local Runner as a production service.

Future GitHub Actions integration may invoke a separately governed runner or
validation command without moving workflow behavior into these contracts.

A future Worker Pool may replace sequential in-process dispatch with durable
claims and distributed execution while preserving Scheduler, Worker, and
Repository boundaries.

## Intentionally Not Implemented

This foundation includes no:

* Vercel Cron, GitHub Actions, production scheduling, or API route;
* production Worker Pool, lease service, queue, or distributed process;
* production automatic signal capture, price observation, evaluation, or outcome recording;
* Pattern, Learning, Confidence, or Playbook execution;
* AI, broker integration, trade execution, page, or UI;
* Postgres or production-provider bootstrap;
* package or Phase 4 runtime modification.
