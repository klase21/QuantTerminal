# Phase 5 Context Signal-to-Memory End-to-End Audit

**Project:** Theta  
**Phase:** 5  
**Sprint:** P5-27  
**Scope:** Local Runner context-aware factual pipeline  
**Decision:** **CONTEXT SIGNAL-TO-MEMORY PIPELINE NEEDS CLEANUP**

## 1. Executive Summary

The local pipeline successfully captures and persists one finalized Context
Snapshot beside each Signal Snapshot, preserves explicit unavailable evidence,
continues through Historical Memory, and prevents duplicate factual rows under
identical repeated execution.

It is not ready for final certification because two objective integration
defects remain:

1. **Context lineage stops after SignalCapture.** Local Runner discards the
   captured Context Snapshot object and ID. OutcomeRecording currently sets its
   `contextReference` to the Signal Snapshot ID, not the Context Snapshot ID.
   Historical Memory consequently contains no reference to the persisted
   Context Snapshot.
2. **Conflicting duplicate context is not rejected.** A repeated capture with
   the same `signalId + snapshotVersion` but different evidence reaches SQLite
   as `DUPLICATE`. SignalCapture accepts that status as success without
   confirming that the existing `evidenceSetHash` matches. The stored record is
   not overwritten, but the immutable-content conflict is not surfaced.

These are narrow lineage and conflict-detection defects. No fabricated data,
ownership drift, provider expansion, or downstream Knowledge execution was
found.

## 2. Implemented Pipeline Inventory

```text
SignalCapture
  -> SIGNAL_SNAPSHOT
     + CONTEXT_SNAPSHOT
  -> TrackingInitialization
  -> EvaluationWindow
  -> PriceObservation
  -> SignalEvaluation
  -> OutcomeRecording
  -> HistoricalMemoryWrite
```

| Stage | Input | Output | Owner | Persisted kind | Idempotency basis | Unavailable behavior | Forbidden responsibilities |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SignalCapture | Scanner opportunity, existing opportunity fields, approved source metadata, optional explicit context evidence | Frozen Signal Snapshot plus finalized Context Snapshot | Scanner owns Signal content; Context Snapshot Runtime owns evidence validation/finalization | `SIGNAL_SNAPSHOT`, `CONTEXT_SNAPSHOT`, completion `JOB_STATE` | Signal snapshot ID; Context `signalId + snapshotVersion` | Missing Scanner output is unavailable; absent context categories become explicit unavailable; malformed/unapproved explicit evidence is validation error | Evaluation, outcome, learning, provider fetching, inferred evidence |
| TrackingInitialization | Same-run, explicit, or persisted Signal Snapshot | Canonical Tracking lifecycle | Signal Tracking Runtime | `SIGNAL_TRACKING` | `signalId + snapshotId + createdAt` | Missing snapshot unavailable; malformed identity invalid | Reading or changing Context evidence, observing prices, evaluating |
| EvaluationWindow | Tracking lifecycle and runner time | Due-window work references | Signal Tracking Runtime owns windows; Local Runner owns invocation | `JOB_STATE` | `trackingId + windowId` | Missing tracking unavailable; not-due is no-op | Fetching prices, mutating Context, custom windows, evaluation |
| PriceObservation | Due-window work, Tracking, Signal Snapshot | Exact-boundary factual market observation | Approved provider owns facts; Source Governance owns source status/freshness | `PRICE_OBSERVATION`, completion `JOB_STATE` | `trackingId + windowId` | Missing exact source observation returns unavailable | Evaluation, interpolation, outcome, Context mutation |
| SignalEvaluation | Source-backed entry and observation facts | Canonical evaluated or unavailable result | Signal Evaluation Runtime | `SIGNAL_EVALUATION`, completion `JOB_STATE` | `signalId + snapshotId + windowId` | Missing required facts yields runtime unavailable metrics or validation failure | Outcome creation, price fetch, confidence, narrative |
| OutcomeRecording | Completed Evaluation and matching Signal Snapshot | Finalized Signal Outcome plus Outcome Event | Signal Outcome and Outcome Recorder runtimes | `SIGNAL_OUTCOME`, `OUTCOME_EVENT`, completion `JOB_STATE` | Outcome: `signalId + windowId`; event: `outcomeId + eventVersion` | Missing completed evaluation or required Signal facts remains unavailable | Memory, learning, new metrics, interpretation |
| HistoricalMemoryWrite | Same-run, explicit, or persisted Outcome Event | Canonical Historical Memory record | Historical Memory Runtime | `HISTORICAL_MEMORY`, completion `JOB_STATE` | `eventId` | Missing event unavailable; malformed event invalid | Pattern, Learning, Calibration, Playbook, similarity |

## 3. Context Snapshot Audit

### Capture timing

**PASS**

SignalCapture creates the Signal Snapshot candidate using `requestedAt`, then
creates Context Snapshot with `capturedAt` equal to that same Signal creation
time. Context evidence timestamps later than capture are rejected by the
runtime. No provider is fetched by SignalCapture.

### Finalization before Tracking

**PASS**

SignalCapture invokes the Context Snapshot Runtime and transitions
`CREATED -> FINALIZED` before returning a successful Worker result. Sequential
Local Runner dispatch does not invoke TrackingInitialization until
SignalCapture succeeds.

### Explicit unavailable categories

**PASS**

All nine canonical categories are represented. Categories without approved
capture-time evidence receive:

```text
availability: UNAVAILABLE
freshness: UNAVAILABLE
payload: null
observedAt: null
unavailableReason: explicit category reason
```

Focused execution confirmed one finalized snapshot with nine evidence entries.

### No later regeneration or modification

**PASS WITH LIMITATION**

Tracking, window preparation, observation, evaluation, outcome, and memory
handlers neither import nor mutate Context Snapshot Runtime records. SQLite
retains one immutable Context Snapshot under repeated identical execution.

Idempotent retries reconstruct the deterministic capture candidate before
Repository confirms duplication. This is acceptable only when content is
identical. Conflicting evidence under the same identity is not currently
detected, as documented in the cleanup findings.

### Downstream lineage

**FAIL**

The runner callback retains only `ScannerSignalSnapshotCandidate`; it does not
retain the Context Snapshot returned by SignalCapture. OutcomeRecording builds:

```text
contextReference.referenceId = signalSnapshotId
```

The correct persisted Context Snapshot ID is different. Historical Memory
references only its Outcome Event and receives the incorrect embedded Outcome
context reference. The Context Snapshot is durable but orphaned from the final
Outcome/Memory lineage.

## 4. Persisted Record Flow Audit

The following record kinds are created successfully:

```text
SIGNAL_SNAPSHOT
CONTEXT_SNAPSHOT
SIGNAL_TRACKING
JOB_STATE
PRICE_OBSERVATION
SIGNAL_EVALUATION
SIGNAL_OUTCOME
OUTCOME_EVENT
HISTORICAL_MEMORY
```

Expected parent flow currently implemented:

| Record | Parent |
| --- | --- |
| `SIGNAL_SNAPSHOT` | None |
| `CONTEXT_SNAPSHOT` | `SIGNAL_SNAPSHOT` |
| `SIGNAL_TRACKING` | `SIGNAL_SNAPSHOT` |
| Window `JOB_STATE` | `SIGNAL_TRACKING` |
| `PRICE_OBSERVATION` | `SIGNAL_TRACKING`, optional window `JOB_STATE` |
| `SIGNAL_EVALUATION` | `SIGNAL_TRACKING`, `PRICE_OBSERVATION` |
| `SIGNAL_OUTCOME` | `SIGNAL_TRACKING`, `SIGNAL_EVALUATION` |
| `OUTCOME_EVENT` | `SIGNAL_OUTCOME` |
| `HISTORICAL_MEMORY` | `OUTCOME_EVENT` |

The storage graph includes Context Snapshot as a Signal Snapshot child, but no
edge reconnects it to Signal Outcome or Historical Memory. Record creation
passes; complete context-aware lineage fails.

## 5. Boundary Audit

| Boundary | Result | Evidence |
| --- | --- | --- |
| SignalCapture captures Signal and Context only | PASS | It creates two factual snapshots and operational completion; no evaluation or downstream record. |
| TrackingInitialization does not read/modify evidence | PASS | It consumes only Signal Snapshot and Signal Tracking Runtime. |
| EvaluationWindow does not fetch or mutate Context | PASS | It compares canonical due times and writes operational work only. |
| PriceObservation does not evaluate | PASS | It collects exact-boundary provider facts only. |
| SignalEvaluation does not create Outcomes | PASS | It calls Signal Evaluation Runtime and persists one Evaluation. |
| OutcomeRecording does not create Memory | PASS | It calls Signal Outcome and Recorder runtimes only. |
| HistoricalMemoryWrite creates no Knowledge | PASS | It calls Historical Memory Runtime only. |
| Context identity reaches Outcome/Memory | FAIL | Outcome uses Signal Snapshot ID as its context reference. |

## 6. No-Fabrication Audit

**PASS**

* Context evidence is accepted only from existing Scanner fields or explicit
  metadata and is validated by Context Snapshot Runtime.
* Available context sources must be registered, production-approved, and
  active; unavailable categories carry null payloads and explicit reasons.
* Source metadata and freshness are copied from supplied metadata; capture or
  retrieval time is not substituted for source observation time.
* Signal direction is preserved verbatim and must be canonical before evaluation.
* Confidence is retained only under the existing source-backed Signal capture policy.
* Entry price requires a positive source-backed value timestamped exactly at Signal creation.
* Observed price is an exact provider candle close at the canonical window end.
* Historical funding and OI remain unavailable when the observation path does not supply them.
* Evaluation metrics come only from Signal Evaluation Runtime.
* Outcome contains no generated explanation, reasoning, or user-trade claim.
* No Learning conclusion, Pattern label, Calibration value, recommendation, or Playbook is generated.

## 7. Source Audit

**PASS**

### Context Snapshot

* SignalCapture performs no fetch.
* Scanner-derived evidence is accepted only when supplied metadata names an
  active, production-approved canonical source.
* Explicit available evidence is rejected unless its source is active and
  production-approved.
* No provider fallback exists.
* Missing evidence is unavailable rather than inferred.

### Price Observation

* Uses only registered, active, production-approved `binance-live`.
* Uses the existing Binance Futures exact-boundary 1-minute candle path.
* Requires provider `closeTime` to equal the evaluation-window end.
* Derives freshness from provider `observedAt`, keeping retrieval time separate.
* Missing exact coverage returns unavailable.

No new provider or fetch path was introduced by Context Snapshot integration.

## 8. Idempotency Audit

### Identical duplicate execution

**PASS**

Two complete SQLite runs left exactly one factual record of each kind:

```text
SIGNAL_SNAPSHOT       1
CONTEXT_SNAPSHOT      1
SIGNAL_TRACKING       1
PRICE_OBSERVATION     1
SIGNAL_EVALUATION     1
SIGNAL_OUTCOME        1
OUTCOME_EVENT         1
HISTORICAL_MEMORY     1
```

No factual payload was overwritten. Separate `SCHEDULER_RUN` and per-run
`JOB_STATE` records correctly preserve operational history.

### Conflicting duplicate Context Snapshot

**FAIL**

A focused capture supplied different approved Market evidence under the same
`signalId + snapshotVersion`. The stored Context Snapshot remained unchanged,
but Repository/adapter returned `DUPLICATE` and SignalCapture reported success.
The handler did not compare the existing `evidenceSetHash` and did not surface
the runtime architecture's required immutable conflict.

Cleanup must distinguish:

* identical duplicate: successful idempotent confirmation;
* same identity, different evidence hash: structured conflict, no overwrite.

## 9. Dry-Run Audit

**PASS**

The context-aware seven-stage dry run succeeded. SignalCapture produced both
snapshot references, every downstream stage completed, Repository was absent,
`operationalRecordIds` remained empty, and no SQLite record was written.

Dry run still performs approved PriceObservation collection; it disables
durability, not factual source observation.

## 10. SQLite Persistence Audit

**PASS**

Observed storage kinds were exactly:

```text
Facts:
  SIGNAL_SNAPSHOT
  CONTEXT_SNAPSHOT
  SIGNAL_TRACKING
  PRICE_OBSERVATION
  SIGNAL_EVALUATION
  SIGNAL_OUTCOME
  OUTCOME_EVENT
  HISTORICAL_MEMORY

Operational:
  SCHEDULER_RUN
  JOB_STATE
```

No Knowledge, lock, retry, or dead-letter record was created. Context Snapshot
payload remained opaque, finalized, and parented to Signal Snapshot.

## 11. Handler Status Audit

**PASS**

The following remain inactive:

* `PatternCandidate`
* `LearningCandidate`
* `CalibrationCandidate`
* `PlaybookCandidate`

Focused checks verified `NO_OP` returns success with no produced records and
`NOT_IMPLEMENTED` returns the structured non-retryable status. No Knowledge
runtime is invoked.

## 12. Required Cleanup Before Certification

1. Retain the finalized Context Snapshot ID in Local Runner same-run state.
2. Supply the actual Context Snapshot ID to OutcomeRecording without reading or modifying evidence.
3. Persist that ID as `SignalOutcome.snapshotReferences.contextReference`.
4. Confirm the Outcome Event embeds the corrected immutable reference.
5. Add the Context Snapshot reference to Historical Memory lineage if the approved runtime contract requires a direct `CONTEXT` reference.
6. On duplicate Context persistence, load/compare immutable identity and `evidenceSetHash`; reject conflicting content while accepting identical retries.
7. Add focused checks proving persisted and same-run Context references are identical through Outcome and Memory.

Cleanup must not add source fetches, evidence interpretation, or downstream
Context mutation.

## 13. Known Limitations

* No external Cron integration exists.
* No Vercel Cron integration exists.
* No production Worker Pool, distributed claim, or durable retry executor exists.
* No live Neon test is required or covered.
* Pattern, Learning, Calibration, and Playbook execution are absent.
* No UI exposes this pipeline.
* No API route exposes this pipeline.
* Execution is limited to Local Runner.
* Context Snapshot depends on evidence metadata supplied at Signal creation.
* Price Observation is limited to the approved implemented `binance-live` path.
* Historical funding and open interest remain unavailable on the current exact-candle path.
* Context Snapshot is not yet connected to Outcome/Historical Memory lineage.
* Conflicting duplicate Context content is not yet surfaced as conflict.

## 14. Validation Summary

| Check | Result |
| --- | --- |
| TypeScript `npx.cmd tsc --noEmit --pretty false --incremental false` | PASS |
| Context-aware seven-stage dry run | PASS |
| Context-aware seven-stage SQLite run | PASS |
| Duplicate identical full chain | PASS; one factual record each |
| SQLite record-kind allowlist | PASS |
| Context finalized with nine categories | PASS |
| Context-to-Outcome lineage | FAIL |
| Context-to-Historical-Memory lineage | FAIL |
| Conflicting duplicate detection | FAIL; stored record protected but conflict not reported |
| Inactive handlers | PASS in `NO_OP` and `NOT_IMPLEMENTED` modes |
| Prohibited-behavior scan | PASS; no AI, broker, Knowledge execution, prohibited provider, or Context-capture fetch path |

Focused source-dependent checks used real Binance Futures boundary data. No
mock provider or fabricated market value was introduced.

## 15. Decision

**CONTEXT SIGNAL-TO-MEMORY PIPELINE NEEDS CLEANUP**

Capture, finalization, unavailable handling, Repository persistence, identical
dedupe, dry-run behavior, source governance, and downstream ownership all work.
Final certification is withheld because the persisted Context Snapshot is not
referenced by Outcome or Historical Memory and conflicting immutable Context
content is not rejected explicitly.
