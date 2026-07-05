# Repository Sync Infrastructure Audit

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B11.6  
**Scope:** Read-only reverse engineering  
**Decision:** **A. EXTEND EXISTING ARCHITECTURE**

## 1. Entry Points

### 1.1 Canonical Historical Repository backfills

The B2-B7 backfills are exported library functions only. None has:

- a `process.argv` main block;
- a package script;
- an API route;
- a Local Runner handler;
- a Scheduler job type;
- a Cron provider binding; or
- a GitHub Actions workflow.

| Dataset | Exported runner | Executable caller found |
| --- | --- | --- |
| Market pilot | `runBinanceVisionHistoricalBackfill()` | None |
| Market full | `runFullBinanceVisionHistoricalBackfill()` | None |
| Funding | `runBinanceVisionHistoricalFundingBackfill()` | None |
| Open Interest | `runBinanceVisionOpenInterestBackfill()` | None |
| AggTrade | `runBinanceVisionAggTradeBackfill()` | None |
| Liquidation | `runBinanceVisionLiquidationBackfill()` | None |
| Coverage reconciliation | `reconcileHistoricalRepositoryCoverage()` | None |
| Exact coverage | `evaluateRepositoryCoverage()` | None outside manual/test composition |
| Projection write | `writeCoverageProjection()` | None outside manual/test composition |

The previous B-series executions were therefore ad hoc imports or validation
commands, not a checked-in synchronization entry point.

### 1.2 Existing executable surfaces

| Surface | Executable | Relationship to Recent Gap Sync |
| --- | --- | --- |
| `POST /api/admin/backfill/binance-vision/ohlcv` | Yes | Legacy monthly OHLCV path using `localHistoricalStore`; not the canonical `PersistenceRepository` and it also builds snapshots/outcomes. Must not be reused as the Repository sync entry point. |
| `GET /api/admin/historical-data/status` | Yes | Reads the same legacy local historical store only. |
| `POST /api/admin/historical-data/outcomes/rebuild` | Yes | Legacy outcome rebuild, not historical fact synchronization. |
| `GET /api/repository/coverage` | Yes | Projection-only read; no exact evaluation or writes. |
| `GET /api/repository/replay` | Yes | Projection-gated bounded fact read; no synchronization. |
| `GET /api/intelligence/scheduler` | Yes | Status-only endpoint for the separate intelligence-production scheduler. |
| `workers/intelligence-scheduler/runScheduledProduction.ts` | Direct CLI file | Runs the intelligence artifact suite and file scheduler, not Historical Repository backfills. No package script points to it. |
| `npm run test:intelligence` | npm script | The smoke test calls `runScheduledProduction()` for the separate intelligence-production system; it does not dispatch Historical Repository datasets. |
| `workers/local-runner/*` | Library callable | Has no CLI main, API, package script, timer, or service loop. It orchestrates the Signal-to-Memory jobs, not historical sync. |
| `lib/cron-adapter/*` | Contract only | Recognizes LOCAL, MANUAL, VERCEL, and GITHUB_ACTIONS identities but implements no provider. |
| `.github/workflows/ci.yml` | GitHub Actions | Install/build CI only; no sync or scheduled event. |
| `package.json` | npm scripts | Contains intelligence audits/builders only. No historical backfill, Repository sync, projection refresh, Local Runner, or Cron script. |

There is no `vercel.json`, Vercel Cron route, scheduled GitHub workflow,
background service, or production Worker Pool for Historical Repository sync.

## 2. Call Hierarchy

### 2.1 Actual canonical Repository paths

There is no common Entry Point, Runner, or Dataset Dispatcher. The actual
library graphs begin at independently invoked dataset runners.

#### Market OHLCV

```text
[no checked-in executable entry]
  -> runFullBinanceVisionHistoricalBackfill()
  -> createFullHistoricalArchivePlan()
  -> Binance Vision HEAD availability checks
  -> downloadArchive()
  -> parseBinanceVisionHistoricalCsv()
  -> validateHistoricalCandleRange()
  -> persistHistoricalCandles()
  -> PersistenceRepository.saveHistoricalMarketRecord()
  -> Repository mapper / deterministic idempotency key
  -> StorageAdapter.writeRecord()
  -> SQLite or Postgres storage_records
  -X-> no coverage evaluation or projection refresh
```

The B2 pilot uses `runBinanceVisionHistoricalBackfill()` and
`downloadWeek()` before joining the same parser, validator, and persistence
path.

#### Funding

```text
[no checked-in executable entry]
  -> runBinanceVisionHistoricalFundingBackfill()
  -> createHistoricalFundingMonthPlan()
  -> Binance Vision monthly Funding HEAD checks
  -> monthly archive download
  -> extractFirstCsvFromZip()
  -> Funding parser and 8h validation
  -> persistFunding()
  -> PersistenceRepository.saveHistoricalFundingRecord()
  -> Repository mapper / deterministic idempotency key
  -> StorageAdapter.writeRecord()
  -X-> no projection refresh
```

#### Open Interest

```text
[no checked-in executable entry]
  -> runBinanceVisionOpenInterestBackfill()
  -> canonical Binance capability/symbol validation
  -> explicit day OR findLatestOpenInterestDay()
  -> Binance Vision daily metrics HEAD/download
  -> OI parser and 5m validation
  -> per-record PersistenceRepository.saveHistoricalOpenInterestRecord()
  -> Repository mapper / deterministic idempotency key
  -> StorageAdapter.writeRecord()
  -X-> no projection refresh
```

#### AggTrade

```text
[no checked-in executable entry]
  -> runBinanceVisionAggTradeBackfill()
  -> createBinanceVisionAggTradeCapability()
  -> one explicit Binance Vision daily aggTrades archive
  -> iterateBinanceVisionAggTrades()
  -> validateHistoricalAggTrades()
  -> per-record PersistenceRepository.saveHistoricalAggTradeRecord()
  -> Repository mapper / aggregateTradeId identity
  -> StorageAdapter.writeRecord()
  -X-> no projection refresh
```

#### Liquidation

```text
[no checked-in executable entry]
  -> runBinanceVisionLiquidationBackfill()
  -> Binance Vision official archive attempt
  -> if official 404, explicit Coinalyze enable + mapping gate
  -> provider-specific parser and validation
  -> persistLiquidations()
  -> PersistenceRepository.saveHistoricalLiquidationRecord()
  -> Repository mapper / provider-aware deterministic identity
  -> StorageAdapter.writeRecord()
  -X-> no projection refresh
```

Coinalyze is not a silent fallback. It is optional, experimental, explicitly
enabled, explicitly mapped, and request-key gated.

### 2.2 Projection and Evidence path

Projection primitives exist, but they are disconnected from all five runners:

```text
[manual caller required]
  -> evaluateRepositoryCoverage(repository, symbol, utcDay)
  -> Repository.listStorageRecords() for contracts and facts
  -> RepositoryCoverageReport
  -> writeCoverageProjection(report, computedAt)
  -> PersistenceRepository.saveHistoricalCoverageProjection()
  -> immutable HISTORICAL_COVERAGE_PROJECTION records
```

Evidence is build-on-read from an existing projection:

```text
GET /api/repository/coverage
  -> readCoverageProjectionRecords()
  -> Research Repository client
  -> loadEvidencePacket()
  -> buildEvidencePacket()
```

No sync runner invokes exact coverage, projection writing, or Evidence Packet
building. Evidence Packet building does not persist an Evidence record.

### 2.3 Existing orchestration foundation

The generic execution path is real but has no historical sync vocabulary:

```text
LocalRunRequest
  -> Cron Adapter normalization
  -> createLocalExecutionPlans()
  -> Scheduler Runtime plans
  -> Worker Runtime dispatcher
  -> Signal-to-Memory handlers
  -> Operational Repository records
```

`SCHEDULER_JOB_TYPES` is closed to eleven Signal-to-Memory jobs. It contains no
HistoricalBackfill, DatasetSync, ProjectionRefresh, or EvidenceRefresh job.
Local Runner handlers likewise bind only SignalCapture through
HistoricalMemoryWrite; later knowledge handlers remain no-op/not-implemented.

## 3. Dataset Abstraction Audit

| Question | Market | Funding | Open Interest | AggTrade | Liquidation |
| --- | --- | --- | --- | --- | --- |
| Common runner interface | No | No | No | No | No |
| Common result lifecycle | Similar status strings | Similar | Similar | Similar | Similar plus provider reason codes |
| Provider contract | Constants/direct Vision planner | Direct Vision monthly planner; separate capability model exists | Capability/symbol model | Capability/symbol model | Priority and explicit experimental gate |
| Repository contract | Dataset-specific save method | Dataset-specific save method | Dataset-specific save method | Dataset-specific save method | Dataset-specific save method |
| Native range | Pilot week or discovered full history | Discovered monthly history | One explicit/latest day | One explicit day | One explicit day |
| Progress callback | Full runner only | Yes | No | Yes, every 10,000 | No |
| Reusable parser/validator/identity | Yes | Yes | Yes | Yes | Yes |

### Shared behavior

All five already share the important integrity boundary:

- explicit `PersistenceRepository` injection;
- source-backed provider timestamps;
- deterministic record identity and checksum;
- structured status results rather than normal-control-flow throws;
- Repository-enforced duplicate rejection;
- provider tier/resolution metadata;
- no overwrite semantics; and
- injectable `fetchImpl` for validation.

### Inconsistent behavior

There is no common `HistoricalDatasetSyncAdapter` or dispatch registry. Each
runner independently owns:

- date/range planning;
- archive availability probing;
- provider invocation;
- parser and validation sequence;
- persistence loop;
- progress shape; and
- error/reason shape.

The runners are reusable implementations, but they are not interchangeable
sync units today.

## 4. Sync Capability

| Capability | Status | Evidence |
| --- | --- | --- |
| Incremental sync | **PARTIAL / manual** | OI, AggTrade, and Liquidation accept one day. Market full and Funding rediscover broad history. No shared latest-observation-to-target planner exists. |
| Checkpoint | **NO** | No canonical runner persists archive/day cursor, watermark, or completion checkpoint. The legacy `localHistoricalStore` has ingestion jobs but belongs to another store. |
| Resume | **PARTIAL via idempotency** | A rerun safely rejects existing records, but generally redownloads and reparses source archives. It does not resume from a durable cursor. |
| Idempotent rerun | **YES** | Deterministic identities plus Repository uniqueness return `DUPLICATE` without overwrite. |
| Retry execution | **NO** | Dataset runners make one request per probe/archive and return errors. |
| Retry policy model | **AVAILABLE, NOT INTEGRATED** | Scheduler Runtime models retry count, retry-after, and backoff policy, but no historical job uses it. |
| Rate limiting | **NO** | No shared limiter or provider budget. |
| Backoff execution | **NO** | Scheduler stores backoff metadata only; it does not calculate timers or execute waits. |
| Cancellation | **NO** | Backfill options expose no `AbortSignal`; long archive loops and writes cannot be cooperatively cancelled. |
| Progress reporting | **PARTIAL** | Market full, Funding, and AggTrade expose incompatible callbacks. OI and Liquidation do not. |
| Logging | **PARTIAL** | Structured result/error arrays and optional callbacks exist; no common run log, correlation ID, or durable audit event is wired. |
| Concurrency control | **NO** | No lock/lease integration, provider concurrency limit, or multi-process exclusion. |
| Dead letter | **MODEL ONLY** | Operational Repository and Scheduler define dead-letter records/states; no backfill binds them. |

## 5. Scheduler Capability

| Mode | Current support | Explanation |
| --- | --- | --- |
| Manual library call | **YES** | A developer can import and invoke each runner with a Repository and explicit `recordedAt`. |
| Manual CLI | **NO canonical CLI** | No historical runner has a main block or package script. Ad hoc `tsx -e` is possible but not infrastructure. |
| Local Runner | **FOUNDATION ONLY** | Cron/Scheduler/Worker/Repository wiring exists, but historical job types and handlers do not. Local Runner itself has no executable entry point. |
| Scheduled execution | **NO** | Scheduler Runtime is pure state transition logic and reads no clock/timer. |
| Background Worker | **NO** | Worker Runtime dispatches injected handlers in process; no Worker Pool/service exists. |
| Cron | **NO implementation** | Cron Adapter normalizes provider identities only. No Vercel/GitHub/local provider triggers it. |
| GitHub Actions | **NO sync workflow** | Existing CI runs install/build on push/PR only. |
| Service mode | **NO** | No daemon, polling loop, queue consumer, lease heartbeat, or process supervisor. |

The separate intelligence-production scheduler is not reusable as-is: it uses
its own file scheduler/artifact workflow and invokes intelligence-suite
builders, not Historical Repository dataset runners.

## 6. Projection Integration

### Available primitives

- `evaluateRepositoryCoverage()` can compute exact day coverage.
- `writeCoverageProjection()` can append deterministic immutable projections.
- `readCoverageProjectionRecords()` supports projection-only consumers.
- `loadEvidencePacket()` can build a non-persisted Evidence Packet from an
  available projection.

### Missing chain

No function currently performs:

```text
successful dataset sync
  -> affected UTC-day set
  -> exact coverage refresh outside request path
  -> projection append
  -> projection lifecycle confirmation
  -> optional Evidence Packet rebuild/read validation
```

Projection refresh can be invoked manually by composing existing primitives,
but it cannot currently be requested as a Scheduler job or automatically
chained after a sync. Evidence Packet refresh is not a write operation and has
no persisted artifact target; it can only rebuild on demand after projections
exist.

AggTrade makes exact coverage expensive. Any post-sync projection refresh must
operate only on affected partitions and execute outside API request paths. The
current exact coverage engine still pages all matching AggTrade records for a
day.

## 7. Existing Reusable Components

Reuse in B11.7:

1. All five provider-specific parsers, validators, identities, and runners.
2. Provider capability and explicit symbol mapping models.
3. `PersistenceRepository` dataset-specific save methods and opaque adapters.
4. Deterministic Repository duplicate handling.
5. Dataset resolution/provider metadata contracts.
6. Scheduler identity, lifecycle, retry metadata, and dependency model.
7. Worker dispatcher and structured result boundary.
8. Operational Repository models for JobState, RetryState, WorkerLock, and
   DeadLetter.
9. Coverage evaluation and projection append primitives.
10. Projection-only Evidence Packet builder.

Do not reuse the legacy admin OHLCV route or `localHistoricalStore` for the new
sync path. It has different storage ownership and mixes ingestion with
snapshot/outcome generation.

## 8. Missing Capabilities

B11.7 needs a thin orchestration extension providing:

- a canonical dataset sync request/result contract;
- a closed five-dataset dispatch registry;
- latest-observation and affected-day planning;
- a consistent explicit target boundary;
- persisted checkpoint/run state through Operational Repository;
- cooperative cancellation;
- common progress events;
- retry classification and Scheduler integration;
- provider rate/concurrency limits;
- durable lock/lease semantics before production concurrency;
- one manual development CLI/runner entry point;
- post-success projection refresh for affected days; and
- explicit separation between projection refresh and Evidence Packet reads.

It must not duplicate parsers, identities, provider clients, Repository
mappers, Scheduler lifecycle, or Worker dispatch.

## 9. Architecture Evaluation

### Decision: A. Extend existing architecture

Recent Gap Sync should **not** introduce an independent synchronization
framework with its own persistence, scheduler, provider model, or lifecycle.
The codebase already has the hard correctness components:

- mature dataset-specific ingestion;
- deterministic and duplicate-safe Repository persistence;
- provider/capability governance;
- operational record contracts;
- Scheduler and Worker runtime foundations; and
- projection/evidence boundaries.

The missing work is integration, not a second architecture. B11.7 should add a
small provider-neutral sync orchestration layer that adapts existing runners
to a common dataset job contract and extends the existing execution vocabulary
deliberately.

Recommended dependency direction:

```text
Manual Sync Entry Point (first)
  -> Existing Cron/Scheduler/Worker contracts
  -> Historical Dataset Sync Dispatcher
  -> Existing dataset runner adapter
  -> Existing provider-specific parser/validator
  -> PersistenceRepository
  -> affected-day Coverage evaluation
  -> immutable Projection write
  -> optional Evidence Packet read/build validation
```

Production Cron, distributed workers, and automatic scheduling should remain
later integrations. B11.7 should first prove manual incremental planning,
checkpointing, cancellation, idempotent reruns, and affected-day projection
refresh without changing dataset semantics.

## 10. Validation

| Check | Result |
| --- | --- |
| Read-only code and documentation inspection | PASS |
| Historical Repository writes | NONE |
| Projection writes/recomputation | NONE |
| External provider requests | NONE |
| Runtime or UI files changed | NONE |
| Package files changed | NONE |
| TypeScript required | NO; documentation-only sprint |
| Prohibited behavior scan | PASS |
