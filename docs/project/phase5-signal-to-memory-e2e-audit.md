# Phase 5 Signal-to-Memory End-to-End Audit

**Project:** Theta  
**Phase:** 5  
**Sprint:** P5-23  
**Scope:** Local Runner Signal-to-Memory pipeline only  
**Decision:** **SIGNAL-TO-MEMORY PIPELINE READY FOR CERTIFICATION**

## 1. Audit Scope

This audit reviews the implemented local factual pipeline:

```text
SignalCapture
  -> TrackingInitialization
  -> EvaluationWindow
  -> PriceObservation
  -> SignalEvaluation
  -> OutcomeRecording
  -> HistoricalMemoryWrite
```

The review covers Local Runner handlers, their owning Phase 4 runtimes, the
provider-neutral Repository mappings, SQLite-backed local persistence, and
inactive downstream handlers. It does not certify production scheduling,
distributed execution, APIs, UI, or Knowledge Layer execution.

Historical Memory in this pipeline is the immutable Phase 4 fact record. It
does not replace the Replay historical cache or the intelligence artifact
registry defined by ADR-005 and ADR-006.

## 2. Pipeline Inventory

| Stage | Input | Output | Owner | Persisted kind | Idempotency basis | Unavailable behavior | Forbidden responsibilities |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SignalCapture | Existing Scanner opportunity supplied in run metadata | Frozen Scanner Signal Snapshot candidate | Scanner owns signal content; Local Runner owns capture invocation | `SIGNAL_SNAPSHOT` | Deterministic `snapshotId` from frozen signal identity/content and capture boundary; Repository key uses `snapshotId` | Missing/malformed opportunity returns `UNAVAILABLE`; absent optional fields remain null | Evaluation, direction inference, confidence generation, tracking, outcomes |
| TrackingInitialization | Same-run, explicit, or persisted Signal Snapshot | Canonical Tracking lifecycle with seven runtime windows | Signal Tracking Runtime | `SIGNAL_TRACKING` | `trackingId` from `signalId + snapshotId + createdAt` | Missing snapshot returns `UNAVAILABLE`; malformed/mismatched input returns validation error | Price observation, scheduling timers, evaluation, signal rewriting |
| EvaluationWindow | Same-run, explicit, or persisted Tracking lifecycle | Due-window `JOB_STATE` work reference | Signal Tracking Runtime owns windows; Local Runner compares due time | `JOB_STATE` | `trackingId + windowId` | Missing tracking is `UNAVAILABLE`; malformed tracking is validation error; not-due work is successful no-op | Price fetch, metrics, evaluation results, custom windows |
| PriceObservation | Due window work, Tracking lifecycle, owning Signal Snapshot | Immutable exact-boundary market observation | Binance owns market facts; Source Governance owns source status/freshness vocabulary; Local Runner collects | `PRICE_OBSERVATION` | `trackingId + windowId` | Missing work is validation error; source or exact candle absence returns `UNAVAILABLE` | Evaluation, interpolation, fallback calculation, outcome classification |
| SignalEvaluation | Same-run, explicit, or persisted Price Observation plus owning Signal Snapshot | Canonical Signal Evaluation result | Signal Evaluation Runtime | `SIGNAL_EVALUATION` | `signalId + snapshotId + windowId` | Missing observation/snapshot/direction is unavailable or invalid; missing entry/observed price produces runtime `UNAVAILABLE` metrics | Price fetching, direction inference, confidence, outcome/event creation |
| OutcomeRecording | Same-run, explicit, or persisted completed Signal Evaluation plus matching Snapshot | Finalized Signal Outcome and canonical Outcome Event | Signal Outcome Runtime and Outcome Recorder Runtime | `SIGNAL_OUTCOME`, `OUTCOME_EVENT` | Outcome: `signalId + windowId`; event: `outcomeId + OUTCOME_EVENT_V1` | Missing/incomplete evaluation or required snapshot facts remains unavailable; invalid identity/lifecycle fails validation | New metrics, narratives, confidence, memory, learning |
| HistoricalMemoryWrite | Same-run, explicit, or persisted Outcome Event | Canonical immutable Historical Memory record | Historical Memory Runtime | `HISTORICAL_MEMORY` | `eventId` | Missing persisted event returns `UNAVAILABLE`; malformed/mismatched event fails validation | Pattern, Learning, Calibration, Playbook, similarity, interpretation |

All runtime and handler outputs are immutable. Repository receives opaque
runtime payloads and extracts only validated identity, timestamps, schema
version, and parent references for the storage envelope.

## 3. Persisted Record Flow

The factual and operational lineage is:

```text
SIGNAL_SNAPSHOT
  -> SIGNAL_TRACKING
  -> JOB_STATE (due Evaluation Window)
  -> PRICE_OBSERVATION
  -> SIGNAL_EVALUATION
  -> SIGNAL_OUTCOME
  -> OUTCOME_EVENT
  -> HISTORICAL_MEMORY
```

Repository parent references preserve this flow:

| Record kind | Canonical parent references |
| --- | --- |
| `SIGNAL_SNAPSHOT` | None |
| `SIGNAL_TRACKING` | `SIGNAL_SNAPSHOT` |
| Evaluation-window `JOB_STATE` | `SIGNAL_TRACKING` |
| `PRICE_OBSERVATION` | `SIGNAL_TRACKING`, due-window `JOB_STATE` when available |
| `SIGNAL_EVALUATION` | `SIGNAL_TRACKING`, `PRICE_OBSERVATION` |
| `SIGNAL_OUTCOME` | `SIGNAL_TRACKING`, `SIGNAL_EVALUATION` |
| `OUTCOME_EVENT` | `SIGNAL_OUTCOME` |
| `HISTORICAL_MEMORY` | `OUTCOME_EVENT` |

Handler-specific completion records and Local Runner execution records use
`JOB_STATE`; each durable local run also records one `SCHEDULER_RUN`. No
Knowledge record is written by the implemented pipeline.

## 4. Boundary Audit

**PASS**

* SignalCapture freezes supplied Scanner fields and performs no evaluation.
* TrackingInitialization calls Signal Tracking Runtime and performs no market observation.
* EvaluationWindow uses runtime-owned due times and performs no fetch.
* PriceObservation records provider facts and performs no evaluation math.
* SignalEvaluation delegates calculations to `evaluateSignalWindow()` and creates no Outcome.
* OutcomeRecording delegates to Signal Outcome and Outcome Recorder runtimes and creates no Memory.
* HistoricalMemoryWrite delegates to `createHistoricalMemory()` and creates no Pattern, Learning, Calibration, or Playbook.
* Handlers persist only through Repository; none writes directly to SQLite or Postgres.
* Dependencies are one-way and no handler imports a downstream Knowledge runtime.

## 5. No-Fabrication Audit

**PASS**

| Field or behavior | Audit result |
| --- | --- |
| Signal direction | Preserved verbatim from Scanner; evaluation requires canonical `LONG`, `SHORT`, or `NEUTRAL` and never infers it. |
| Confidence | Retained only when supplied with production-approved source metadata; otherwise null. Never generated downstream. |
| Entry price | Retained only when positive, production-source-backed, and timestamped exactly at snapshot creation. |
| Observed price | Exact Binance Futures 1-minute candle close at the canonical window boundary; no interpolation or estimation. |
| Funding / open interest | Historical window observation leaves unsupported values `UNAVAILABLE`; no estimate or fallback calculation. |
| Freshness | Derived by canonical governance runtime from real `observedAt` and explicit retrieval time. Retrieval time never replaces the source timestamp. |
| Evaluation metrics | Calculated only by Signal Evaluation Runtime from supplied entry and observation facts; absent prices yield null unavailable metrics. |
| Outcome | Copies validated evaluation facts and immutable references; no narrative, reasoning, or user-trade claim. |
| Memory | Embeds the validated Outcome Event unchanged and adds only its canonical event reference. |
| Knowledge | No learning conclusion, pattern label, confidence calibration, recommendation, similarity score, or Playbook is produced. |

## 6. Source Audit

**PASS**

PriceObservation uses only `binance-live`:

* registry state: production-approved and `ACTIVE`;
* authority: Binance public Spot and Futures REST/WebSocket;
* quality: `HIGH`;
* source policy: existing Binance Futures 1-minute kline client only;
* observation timestamp: Binance candle `closeTime`, required to match the canonical evaluation-window end exactly;
* freshness input: `lastUpdatedAt = observedAt`; `retrievedAt` is separate collection metadata;
* unavailable behavior: missing exact candle, failed request, invalid result, or inactive registry source returns explicit unavailable failure;
* fallback behavior: none in this pilot;
* unsupported funding and OI at historical candle boundaries remain `UNAVAILABLE`.

No new provider, API route, interpolation, current-price substitution, or
retrieval-time timestamp substitution exists.

## 7. Idempotency Audit

**PASS**

Repository derives record-kind-aware idempotency keys from the canonical
identities listed in the pipeline inventory. SQLite rejects duplicate record
IDs and idempotency keys atomically. Handlers accept `DUPLICATE` as confirmation
of an already-recorded immutable result and never update on conflict.

Focused duplicate full-chain execution confirmed exactly one persisted record
for each factual kind:

```text
SIGNAL_SNAPSHOT       1
SIGNAL_TRACKING       1
PRICE_OBSERVATION     1
SIGNAL_EVALUATION     1
SIGNAL_OUTCOME        1
OUTCOME_EVENT         1
HISTORICAL_MEMORY     1
```

Operational records use deterministic stage identities where tied to factual
work. Separate local-run identities intentionally produce separate
`SCHEDULER_RUN` and per-run execution `JOB_STATE` audit records; this is
operational history, not duplicated facts.

## 8. Dry-Run Audit

**PASS**

The full seven-stage dry run completed successfully and produced the expected
in-memory references in order. Bootstrap supplied no Repository, no SQLite
database was required, and `operationalRecordIds` remained empty. Live source
observation still occurred because dry run disables persistence, not factual
collection; no durable record was written.

## 9. SQLite Persistence Audit

**PASS**

The focused SQLite run contained only these record kinds:

```text
Facts:
  SIGNAL_SNAPSHOT
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

No `PATTERN`, `LEARNING`, `CONFIDENCE_CALIBRATION`, `PLAYBOOK`, `WORKER_LOCK`,
`RETRY_STATE`, or `DEAD_LETTER` record was created. Payloads remain opaque JSON
and archive/update behavior was not invoked by this pipeline.

## 10. Handler Status Audit

**PASS**

The remaining handlers are inactive:

* `PatternCandidate`
* `LearningCandidate`
* `CalibrationCandidate`
* `PlaybookCandidate`

Focused checks verified both supported development modes:

* `NO_OP`: successful structured result, zero produced records, zero downstream execution IDs;
* `NOT_IMPLEMENTED`: structured non-retryable `NOT_IMPLEMENTED` result.

No inactive handler invokes a Knowledge runtime or persists a Knowledge record.

## 11. Known Limitations

* No external Cron provider integration exists; the local flow uses only the provider-neutral trigger adapter.
* No Vercel Cron integration exists.
* No production Worker Pool, lease, distributed claim, or durable retry execution exists.
* No live Neon connection is required or covered by this local audit.
* Pattern, Learning, Calibration, and Playbook execution are not implemented.
* No UI or API route exposes this pipeline.
* Execution is limited to the development-only Local Runner.
* Price observation is limited to the approved implemented `binance-live` exact-boundary source path.
* Historical funding and open interest are unavailable in the current observation path.
* Only the due windows selected in one local invocation are processed; autonomous enrollment and scheduling are absent.

## 12. Validation Evidence

Validation performed for this audit:

| Check | Result |
| --- | --- |
| TypeScript `npx.cmd tsc --noEmit --pretty false --incremental false` | PASS |
| Full seven-stage dry run | PASS |
| Full seven-stage SQLite run | PASS |
| Duplicate full-chain execution | PASS; factual counts remained one each |
| SQLite record-kind allowlist | PASS |
| Inactive handlers in `NO_OP` mode | PASS |
| Inactive handlers in `NOT_IMPLEMENTED` mode | PASS |
| Prohibited-behavior static scan | PASS; no AI, broker, Knowledge generation, direct database client, or direct handler/runtime network call |

The focused executable audit used real, source-timestamped Binance Futures
boundary prices. No mock provider or fabricated market value was introduced.

## 13. Decision

**SIGNAL-TO-MEMORY PIPELINE READY FOR CERTIFICATION**

The local pipeline preserves one-way ownership, factual provenance,
deterministic identity, Repository-only persistence, immutable fact records,
explicit unavailable behavior, and a hard boundary before the Knowledge
Layer. Remaining limitations are expected production-execution and downstream
Knowledge gaps, not blockers to certifying the implemented local
Signal-to-Memory foundation.
