# Phase 5 Autonomous Intelligence Execution Architecture

Status: Architecture baseline  
Phase: 5  
Sprint: P5-7  
Scope: Execution orchestration design only

## 1. Purpose

The Execution Layer coordinates the ordered movement of already-defined runtime records through persistence and future autonomous processing. It provides the control plane that determines which unit of work may run, when it may run, how it is retried, and which dependency must exist before downstream work begins.

Execution owns:

- orchestration;
- job lifecycle;
- worker responsibility;
- retry policy;
- idempotent execution; and
- dependency ordering.

Execution does not own:

- signal generation logic;
- evaluation mathematics;
- outcome semantics;
- storage adapter behavior;
- learning interpretation;
- UI rendering; or
- AI generation.

The layer invokes certified runtime modules and the provider-neutral Repository. It does not replace either boundary. Missing facts remain unavailable, runtime validation remains authoritative, and every persisted output retains its existing immutable or versioned semantics.

## 2. Canonical Execution Graph

The execution graph is strictly one-way:

```text
Signal Capture
    |
    v
Signal Snapshot Persistence
    |
    v
Tracking Initialization
    |
    v
Evaluation Window Scheduling
    |
    v
Price Observation Collection
    |
    v
Signal Evaluation
    |
    v
Signal Outcome Creation
    |
    v
Outcome Event Recording
    |
    v
Historical Memory Write
    |
    v
Pattern Candidate Queue
    |
    v
Learning Candidate Queue
    |
    v
Calibration Candidate Queue
    |
    v
Playbook Candidate Queue
```

There are no alternate branches. A stage may produce an explicit unavailable result, fail, retry, or enter dead letter according to policy, but it may not skip its predecessor or route around a runtime boundary. In particular, Tracking never skips Evaluation, Outcome Events precede Historical Memory, and Knowledge candidates never consume pre-memory facts.

### Dependency ordering

1. A system-generated signal is frozen before any tracking identity is initialized.
2. The frozen Signal Snapshot is durably recorded before tracking work is accepted.
3. Tracking initialization establishes the canonical windows before any window is activated.
4. A due Evaluation Window precedes price observation collection.
5. Source-backed price observations precede Signal Evaluation.
6. A completed Signal Evaluation precedes Signal Outcome creation.
7. A valid Signal Outcome precedes Outcome Event recording.
8. A recorded Outcome Event precedes Historical Memory creation.
9. Historical Memory references precede Pattern candidacy.
10. Pattern references precede Learning candidacy.
11. Learning and Pattern references precede Calibration candidacy.
12. Learning and Calibration references precede Playbook candidacy.

## 3. Execution Units

An execution unit is a logical, idempotent job. Its input consists of immutable references plus explicitly versioned execution configuration. Its output is either a certified runtime record, a persisted reference, a candidate queue record, or an explicit unavailable result. A job never fills missing domain data.

Terminal states below refer to the logical job: `SUCCEEDED` or `DEAD_LETTERED`, followed by `ARCHIVED` under retention policy. `FAILED` is terminal for an individual attempt but may lead the logical job to `RETRYING`.

### SignalCaptureJob

- **Input:** An existing QuantTerminal signal emission containing its source-owned identity and all fields available at emission time.
- **Output:** A frozen Signal Snapshot persisted through the Repository.
- **Owner:** Execution Layer for capture orchestration; the emitting product system retains signal-generation ownership.
- **Idempotency key:** `signal-capture:{signalId}:{snapshotId}`.
- **Retry policy:** Retry transient repository or storage unavailability. Reject missing identity, malformed timestamps, or unsupported snapshot versions without inventing replacements.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

The job freezes what was emitted. It does not derive confidence, evidence, freshness, health, or market context that was absent from the emission.

### TrackingInitializationJob

- **Input:** Persisted Signal Snapshot reference and canonical tracking identity inputs.
- **Output:** A validated Signal Tracking lifecycle containing the canonical pending windows.
- **Owner:** Signal Tracking Runtime for lifecycle semantics; Execution Layer for invocation and persistence ordering.
- **Idempotency key:** `tracking-initialization:{trackingId}`.
- **Retry policy:** Retry transient parent-load and repository failures. Runtime validation errors and identity conflicts are non-retryable.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

### EvaluationWindowJob

- **Input:** Persisted tracking reference, one canonical evaluation window, and its due time from the Tracking Runtime.
- **Output:** One activated window-work reference eligible for price observation collection.
- **Owner:** Signal Tracking Runtime for window definitions; Scheduler for activation timing; Execution Layer for job state.
- **Idempotency key:** `evaluation-window:{trackingId}:{evaluationWindow}`.
- **Retry policy:** Retry transient claim, clock-service, or repository failures. Unknown windows and impossible due times are non-retryable.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

Each canonical window executes independently. Failure at one window does not cancel or mutate any other window.

### PriceObservationJob

- **Input:** Persisted Signal Snapshot reference, evaluation window, source identity, and an explicitly versioned observation policy.
- **Output:** Source-backed price observations or an explicit unavailable observation result with a reason.
- **Owner:** Execution Layer for collection orchestration; Source Governance for source identity, freshness, and health; providers own observed data.
- **Idempotency key:** `price-observation:{snapshotId}:{evaluationWindow}:{observationPolicyVersion}`.
- **Retry policy:** Retry transient provider, network, rate-limit, and repository failures. After bounded retries, missing source coverage becomes explicit `UNAVAILABLE`; it is never synthesized.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

`SUCCEEDED` means collection completed according to policy. It may carry an unavailable observation result; it does not imply that price data exists.

### SignalEvaluationJob

- **Input:** Signal reference, direction, evaluation window, source-backed entry and observation prices, and their timestamps.
- **Output:** A validated Signal Evaluation Result with `EVALUATED` or explicit `UNAVAILABLE` status.
- **Owner:** Signal Evaluation Runtime for deterministic calculations; Execution Layer for orchestration.
- **Idempotency key:** `signal-evaluation:{signalId}:{snapshotId}:{evaluationWindow}`.
- **Retry policy:** Retry transient parent-load or repository failures. Missing real price data produces `UNAVAILABLE`. Deterministic validation errors are non-retryable.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

The job calls the existing evaluation model. It does not add subjective scores or infer direction correctness when required observations are absent.

### OutcomeRecordingJob

- **Input:** A completed Signal Evaluation Result plus matching Signal Snapshot and Tracking references.
- **Output:** A finalized Signal Outcome followed by its canonical Outcome Event, each persisted in dependency order.
- **Owner:** Signal Outcome Runtime for outcome construction, Outcome Recorder for event semantics, and Execution Layer for ordered invocation.
- **Idempotency key:** `outcome-recording:{outcomeId}:{eventVersion}`.
- **Retry policy:** Resume after partial persistence by loading existing records and writing only the first missing output with the same identities. Retry transient repository failures. Invalid reference relationships or payload conflicts are non-retryable.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

The job does not roll back an already-recorded immutable fact. Repository duplicate results confirm prior completion; they do not authorize replacement.

### HistoricalMemoryWriteJob

- **Input:** A persisted, validated Outcome Event reference.
- **Output:** One canonical Historical Memory Record and reference.
- **Owner:** Historical Memory Runtime for memory semantics; Execution Layer for invocation.
- **Idempotency key:** `historical-memory-write:{outcomeEventId}`.
- **Retry policy:** Retry transient repository failures. Reject raw snapshots, raw evaluations, malformed Outcome Events, and identity conflicts.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

### PatternCandidateJob

- **Input:** Eligible Historical Memory references, a caller-supplied scope, and a versioned candidacy policy.
- **Output:** A queued Pattern candidate containing references only.
- **Owner:** Execution Layer for candidacy and queue state; future Pattern execution owns interpretation.
- **Idempotency key:** `pattern-candidate:{scope}:{evidenceSetHash}:{candidatePolicyVersion}`.
- **Retry policy:** Retry transient repository failures. Missing memory references, duplicate references, or invalid scope are non-retryable after bounded consistency checks.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

This job does not compute metrics, label a pattern, or create a Pattern Record.

### LearningCandidateJob

- **Input:** Validated Pattern references, a caller-supplied scope, and a versioned candidacy policy.
- **Output:** A queued Learning candidate containing references only.
- **Owner:** Execution Layer for candidacy and queue state; future Learning execution owns conclusions.
- **Idempotency key:** `learning-candidate:{scope}:{patternSetHash}:{candidatePolicyVersion}`.
- **Retry policy:** Retry transient repository failures. Missing, rejected, malformed, or duplicate Pattern references are non-retryable after bounded consistency checks.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

This job does not write a conclusion, summary, risk note, or recommendation.

### CalibrationCandidateJob

- **Input:** Validated Learning and Pattern references plus explicitly versioned calibration method and candidacy policy identities.
- **Output:** A queued Calibration candidate containing references and supplied method identity only.
- **Owner:** Execution Layer for candidacy and queue state; future Calibration execution owns confidence interpretation.
- **Idempotency key:** `calibration-candidate:{scope}:{learningSetHash}:{patternSetHash}:{methodVersion}`.
- **Retry policy:** Retry transient repository failures. Missing evidence, invalid method identity, or incompatible references are non-retryable after bounded consistency checks.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

This job does not compute confidence, calibration bands, expected returns, or scores.

### PlaybookCandidateJob

- **Input:** Validated Learning and Confidence Calibration references plus a versioned candidacy and approval policy identity.
- **Output:** A queued Playbook candidate containing references only.
- **Owner:** Execution Layer for candidacy and queue state; future Playbook execution and human approval own operational knowledge.
- **Idempotency key:** `playbook-candidate:{scope}:{learningSetHash}:{calibrationSetHash}:{candidatePolicyVersion}`.
- **Retry policy:** Retry transient repository failures. Missing, rejected, malformed, or incompatible evidence is non-retryable after bounded consistency checks.
- **Terminal states:** `SUCCEEDED`, `DEAD_LETTERED`, `ARCHIVED`.

This job does not generate rules, execution instructions, trade recommendations, or broker actions.

## 4. Job Lifecycle

Canonical logical job states are:

- `QUEUED`
- `CLAIMED`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `RETRYING`
- `DEAD_LETTERED`
- `ARCHIVED`

### Forward-only transitions

```text
QUEUED -> CLAIMED -> RUNNING -> SUCCEEDED -> ARCHIVED
                            \
                             -> FAILED -> RETRYING -> SUCCEEDED -> ARCHIVED
                                                  \
                                                   -> DEAD_LETTERED -> ARCHIVED

RUNNING -> FAILED -> DEAD_LETTERED -> ARCHIVED
```

No state transitions backward. A retry does not move a logical job back to `QUEUED`, `CLAIMED`, or `RUNNING`. Instead, each retry is a new immutable attempt associated with the same logical job and idempotency key. Attempt records have their own identity and forward-only status. Their result advances the parent from `RETRYING` to `SUCCEEDED` or `DEAD_LETTERED`.

### State rules

- `QUEUED`: Persisted and eligible for a future claim when dependency and timing conditions are satisfied.
- `CLAIMED`: Assigned under a bounded lease to one worker attempt.
- `RUNNING`: Runtime or repository work has started for the claimed attempt.
- `SUCCEEDED`: The required output or its canonical duplicate is durably confirmed.
- `FAILED`: The current attempt ended without confirming the required output.
- `RETRYING`: A retryable failure has created a bounded future attempt plan.
- `DEAD_LETTERED`: Work cannot proceed automatically because failure is permanent or retry allowance is exhausted.
- `ARCHIVED`: Terminal operational history retained outside active scheduling.

A lease expiry never rewinds a job. It records the failed attempt and permits a new attempt under `RETRYING` with the same logical idempotency key.

## 5. Idempotent Execution

Every job must be safe to retry.

1. The logical idempotency key is deterministic from the job type, immutable upstream identity, and any configuration version that can affect output.
2. Repeated triggers with the same key resolve to the same logical job rather than creating parallel work.
3. Attempt identities are unique, but all attempts retain the same logical idempotency key.
4. Workers load the expected downstream identity before invocation and persist through the Repository after runtime validation.
5. Repository and adapter uniqueness are the final duplicate authority; a read-before-write check is an optimization, not a correctness boundary.
6. A Repository `DUPLICATE` result is success only when the stored record identity and expected immutable references match.
7. A matching `SUCCEEDED` job is never executed again.
8. Partial pipelines resume at the first missing downstream record. Already-persisted facts and knowledge versions are never rolled back or overwritten.
9. A payload or policy change that can alter output requires a new explicit version and therefore a new idempotency key.
10. Candidate queue retries must not produce duplicate Pattern, Learning, Calibration, or Playbook identities.

Duplicate execution must never duplicate Signal Snapshots, Tracking records, Evaluation Results, Signal Outcomes, Outcome Events, Historical Memory, or Knowledge candidates.

## 6. Retry Policy

### Retryable errors

- transient Repository or storage unavailability;
- timeouts and temporary network interruption;
- provider rate limits with a bounded retry window;
- temporary source outage;
- worker crash or lease loss;
- scheduler delivery duplication or interruption; and
- a parent record not yet visible because of a bounded propagation delay.

### Non-retryable errors

- malformed job payload;
- missing immutable identity;
- unsupported runtime, schema, event, or policy version;
- impossible or malformed timestamps;
- deterministic runtime validation failure;
- incompatible parent references;
- unapproved or unknown source identity;
- an idempotency conflict where the same key describes different content; and
- a permanently missing required parent after the bounded consistency allowance.

Missing source-backed price coverage is not repaired through fabrication. After transient collection attempts are exhausted, the collection completes with an explicit unavailable result so downstream Signal Evaluation can preserve `UNAVAILABLE` semantics.

### Maximum retries

Retry limits are bounded, job-class specific, and versioned configuration. There is no infinite retry. Time-sensitive observation jobs use limits that cannot silently move the canonical evaluation window. Storage recovery jobs may use a longer bounded horizon because their immutable inputs remain valid.

### Backoff

Retries use capped exponential backoff with jitter and honor a provider's real retry-after instruction when available. Backoff changes execution time only; it never changes signal time, evaluation-window time, source timestamps, or recorded facts.

### Dead letter

A job enters `DEAD_LETTERED` when a failure is non-retryable or its retry allowance is exhausted. The dead-letter record retains:

- logical job identity and type;
- immutable input references;
- error category and safe diagnostic detail;
- attempt history references;
- first and last failure times; and
- runtime, schema, and policy versions.

It must not contain credentials, environment details, or unnecessary raw provider payloads. Dead-lettered work is never automatically promoted to success. A future manual replay must pass current validation and use the same logical idempotency rules.

## 7. Worker Boundary

Workers may:

- claim one eligible job under a lease;
- load persisted records through the Repository;
- validate job payloads and parent references;
- call the appropriate certified runtime module;
- persist runtime results through the Repository;
- produce the next canonical job only after confirming its parent output; and
- record structured attempt, retry, and dead-letter state.

Workers must not:

- mutate runtime facts or versioned knowledge records;
- fabricate missing data, timestamps, evidence, outcomes, confidence, or recommendations;
- bypass the Repository or call SQLite/Postgres adapters directly;
- reinterpret runtime validation results;
- call AI unless a separately approved future phase permits it;
- execute trades or call broker APIs;
- infer missing parent records; or
- create alternate pipeline branches.

Each worker invocation handles one execution unit. A worker may enqueue the next unit only after the current output is durably confirmed. Concurrency is coordinated through job identity, lease identity, and Repository-backed uniqueness rather than in-memory assumptions.

## 8. Scheduler Boundary

The Scheduler owns timing only.

It may:

- read canonical due times;
- activate due jobs;
- create deterministic job identities;
- avoid duplicate activation; and
- record scheduler-run operational state.

It must not:

- calculate evaluation metrics;
- collect or interpret prices;
- decide whether a signal succeeded;
- construct outcomes or memory;
- interpret patterns, learning, calibration, or playbooks;
- mutate a Tracking lifecycle directly; or
- fabricate work when a required parent is unavailable.

The canonical clock determines whether work is due. Scheduler delay does not alter the requested evaluation window. If delayed execution prevents source-backed observation of that window, the result remains explicitly unavailable.

## 9. Persistence Boundary

Execution uses the provider-neutral Repository only:

```text
Execution Unit
    |
    v
Persistence Repository
    |
    v
StorageAdapter
    |
    +-- SQLite (local)
    |
    +-- Postgres / Neon (production)
```

Execution never imports, instantiates, queries, or writes a concrete SQLite or Postgres adapter. The Repository maps approved runtime records to opaque `StorageRecord` envelopes and preserves deterministic idempotency. Execution does not inspect database schemas or issue SQL.

### Prerequisites before implementation

The certified persistence foundation intentionally leaves three execution needs unresolved. These are architecture prerequisites, not work performed by this sprint:

1. **Signal Snapshot persistence:** The execution graph requires a durable frozen snapshot, but the current canonical `RecordKind` set does not include a Signal Snapshot record. A dedicated governance and repository mapping decision is required before live capture.
2. **Operational record persistence:** `SCHEDULER_RUN`, `WORKER_LOCK`, `RETRY_STATE`, `JOB_STATE`, and `DEAD_LETTER` kinds exist, but the current Repository does not yet map operational records. Workers and schedulers must not bypass the Repository to compensate.
3. **Lifecycle observation identity:** The certified persistence model stores one canonical identity without overwrite. Intermediate job and tracking lifecycle observations therefore need an append-only event identity or another approved immutable representation before durable execution begins.

No scheduler or worker may be enabled until these boundaries have provider-neutral Repository support.

## 10. Failure Scenarios

### Storage unavailable

The worker does not acknowledge completion and does not produce the next job. The attempt records a retryable storage error when operational persistence is available. A later attempt uses the same logical idempotency key. No in-memory result is treated as durable success.

### Duplicate job

The deterministic key resolves to the existing logical job. A succeeded job returns its existing output reference. An active job does not permit parallel duplicate execution. A conflicting payload under the same key is a non-retryable conflict.

### Missing parent record

The job retries only when bounded propagation delay is plausible. After that allowance, it is dead-lettered with the missing reference. The worker does not reconstruct the parent from downstream data or alternate sources.

### Missing price observation

Transient source errors are retried within the observation policy. Permanent absence or incomplete coverage produces explicit `UNAVAILABLE` observation and evaluation results. No price, return, excursion, drawdown, or direction correctness is inferred.

### Stale signal

The original Signal Snapshot and freshness remain unchanged. The worker does not refresh or rewrite the signal. It evaluates the canonical historical window only when source-backed observations are available; otherwise the evaluation remains unavailable.

### Partial pipeline completion

Committed immutable outputs remain committed. Recovery loads existing parent and child identities, confirms their compatibility, and resumes from the first missing stage. There is no cross-stage rollback and no overwrite-on-conflict.

### Worker crash

The claim lease expires. The failed attempt is retained, and a new attempt may run under the same logical job and idempotency key. Any write completed before the crash is recovered through Repository duplicate detection.

### Scheduler duplicate trigger

Both triggers derive the same job key. Persistence uniqueness admits one logical job and reports the other as duplicate. The scheduler does not create a second evaluation window or shift its time.

### Malformed payload

Validation fails before runtime invocation. The job records a non-retryable validation error and enters dead letter. No fields are repaired, defaulted, or inferred.

## 11. Environment Model

### Local development

- SQLite is the local persistence adapter behind the Repository.
- Jobs may be invoked manually or by a future local test runner.
- Local execution uses the same identities, validation, retry classification, and one-way graph as production.
- In-process convenience must not become a production concurrency assumption.

### Vercel cron

- A future Vercel cron entry may trigger scheduler activation only.
- Postgres/Neon is used behind the Repository.
- Request-bounded execution should activate or claim compact work, not perform heavy historical processing inside a route.
- Cron delivery is assumed to be duplicate-capable and therefore relies on deterministic job identity.

### GitHub Actions trigger

- A future workflow may initiate manual validation, controlled replay, or bounded backfill jobs.
- It uses the same Repository and idempotency contracts.
- It does not become the canonical source of timestamps or evaluation semantics.
- Secrets and provider credentials remain outside job payloads and diagnostics.

### Dedicated worker service

- A future service may continuously claim jobs, maintain leases, and process independent windows in parallel.
- It uses Postgres-compatible operational state through the Repository.
- Horizontal scale depends on deterministic identity, leases, append-only attempts, and duplicate-safe writes.
- It remains subject to the same runtime, no-fabrication, and ownership boundaries.

These are deployment expectations only. This sprint implements none of them.

## 12. P5-8 Recommendation

The next sprint should be **Scheduler Runtime Foundation**.

P5-8 should define provider-neutral, pure runtime contracts for:

- canonical job and attempt identities;
- the forward-only job lifecycle;
- due-time activation for the seven canonical evaluation windows;
- lease and retry metadata;
- deterministic scheduler-run identity;
- structured validation and serialization; and
- explicit unavailable and dead-letter results.

It should not implement cron, workers, APIs, network calls, persistence adapters, live capture, live price collection, or evaluation. Before later integration, dedicated follow-up work must add Repository mappings for Signal Snapshots and operational records and resolve append-only lifecycle observation identity.

## 13. Validation

- `docs/project/phase5-execution-architecture.md` exists: **CONFIRMED**
- Execution purpose and ownership are complete: **CONFIRMED**
- Canonical one-way execution graph is complete: **CONFIRMED**
- All eleven execution units define input, output, owner, idempotency, retry, and terminal behavior: **CONFIRMED**
- Forward-only job lifecycle is complete: **CONFIRMED**
- Worker, Scheduler, and Persistence boundaries are explicit: **CONFIRMED**
- Failure and no-fabrication policies are complete: **CONFIRMED**
- No runtime files changed: **CONFIRMED**
- No persistence files changed: **CONFIRMED**
- No API files changed: **CONFIRMED**
- No package files changed: **CONFIRMED**
- Build required: **NO**

## Architecture Decision

The Phase 5 Execution Layer is defined as a provider-neutral, one-way orchestration boundary. It can progress only through persisted parent references, certified runtime modules, deterministic job identities, and Repository-backed writes. Missing source facts remain unavailable. Execution never becomes a source of signal logic, evaluation semantics, knowledge interpretation, or trade action.
