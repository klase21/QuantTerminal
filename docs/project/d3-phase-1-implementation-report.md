# D3 V1 Phase 1 Implementation Report

## Current Understanding

Phase 1 formalizes the approved Population architecture as contracts, pure helpers, an unapplied SQL blueprint, static tests, and documentation. It does not implement or execute a Scheduler, Coordinator, Worker, provider adapter, object store, normalizer, D2 caller, database connection, or consumer migration.

## Baseline Verification

- Branch: `epic/d2-canonical-persistence`
- HEAD at start: `1cb1c8d778033cfe89b4c23f51a7d70160b7d906`
- Existing changes: six untracked D3 Phase 0 documents; preserved
- D2 tag: `d2-canonical-persistence-v2.1`
- Provider requests, object storage calls, PostgreSQL connections, and migration application: not performed

## D2 Documentation Reconciliation

Only `docs/project/d2-phase-2-implementation-report.md` and `docs/project/d2-phase-2-postgresql-certification-report.md` were adjusted. Test evidence was not changed. Their gate meaning is now `D2 COMPLETE WITH CERTIFICATION LIMITATIONS`: D3 contract work is allowed; production deployment and consumer cutover remain blocked until partial-migration failure injection and the required production-readiness review are approved. Missing bounded-query `EXPLAIN` review remains a non-integrity limitation.

## Changed Files

Phase 1 added:

- `lib/data-platform/population/contracts.ts`
- `lib/data-platform/population/identity.ts`
- `lib/data-platform/population/stateMachines.ts`
- `lib/data-platform/population/events.ts`
- `lib/data-platform/population/mapping.ts`
- `lib/data-platform/population/index.ts`
- `lib/data-platform/population/postgres/schema.ts`
- `lib/data-platform/population/postgres/index.ts`
- `lib/data-platform/population/postgres/migrations/001_population_control_plane.sql`
- six D3 static test modules and `runD3Phase1Suite.ts`
- the seven required architecture/report documents
- `docs/adr/ADR-009-population-orchestration.md`

The two D2 reports above received bounded wording changes. Phase 0 documents remain intact.

## Population Contracts

Closed contracts cover Job, Run, Unit, Retrieval Attempt, lease, checkpoint, raw reference, typed Candidate, layered validation, quality, normalization input, canonical submission, outcome, retry, watermark eligibility, publication handoff, object storage port, and D2 commit port. No `any` or unbounded canonical payload is used.

## Identity Model

Job request, Job instance, Run, Unit, Retrieval Attempt, Raw Object/Manifest, Candidate, Canonical Record, and Commit identities are distinct. Job request, Unit, and Candidate identities use ordered deterministic inputs. Candidate identity excludes Worker, Run, and execution time. Canonical identity remains D1/D2-owned.

## Job Profiles

The common engine supports `BACKFILL`, `INCREMENTAL`, `CORRECTION`, and `RECONCILIATION`. Profiles bind required dimensions, raw retrieval/reuse policy, retry policy, and watermark policy without inventing numerical limits.

## State Machines

Job, Run, and Unit transitions are closed and fail closed. Unit state is the smallest durable crash-recovery vocabulary from pending through lease, retrieval, raw persistence, Candidate readiness, processing, and terminal outcomes. Job aggregation distinguishes success, partial failure, and failure from required Unit states.

## Event History Model

Operational events are append-only and materialized current state is a read optimization. Contracts cover creation, start, lease, heartbeat, checkpoint, outcome, retry, cancellation, expiry, completion, and watermark decisions. Logs are not orchestration truth.

## Fenced Lease Model

The SQL blueprint uses row locking with `FOR UPDATE SKIP LOCKED`, monotonic per-Unit fencing tokens, and atomic lease/event/state updates. Heartbeat and state advancement require owner and current token. Stale tokens fail closed.

## Checkpoint and Resume

Checkpoints are ordered at raw, Candidate, and canonical boundaries and can reference only durable prior state. Recovery reuses deterministic Unit/Candidate identities and reconciles unknown D2 outcomes. Arbitrary offsets are not accepted without governed provider cursor semantics.

## Population Unit Contract

Immutable scope includes profile, dataset, provider, snapshots/policy, optional venue/subject/window/resolution/partition, and request fingerprint. Mutable execution projection is separate. Scope change creates a new Unit.

## Retrieval Attempt Contract

Every provider interaction is independently observable with safe request fingerprint, timing, transport/HTTP classification, retry metadata, byte/media metadata, manifest reference, and bounded error data. Secrets and sensitive URLs are excluded by contract.

## Raw Artifact and Manifest Contract

D3 orchestration references but does not redefine D2 manifests. Non-trivial payloads are object-first, content-addressed, verified, and retained before Candidate generation. No raw bytes are stored in PostgreSQL. The object storage interface is provider-neutral and has no implementation.

## Typed Candidate Contracts

Bounded variants exist for OHLCV, Funding, Open Interest, Liquidation, and Stream Manifest. Every Candidate preserves source/manifests, parser/schema versions, checksum, validation, quality, and normalization eligibility.

## Validation Contract

Transport, structural, provider-semantic, canonical-eligibility, and cross-record validations are independent immutable results with rule/policy binding and explicit retry, permanent, quarantine, unsupported, or policy-rejected routing.

## Data Quality Contract

Candidate and Unit evaluation results bind D1 policy and provider certification. Blocking/advisory history is immutable. Re-evaluation does not mutate prior results or create a fact version by itself, and quality is not AI confidence.

## Normalization Submission Contract

A bounded Normalizer Registry accepts typed Candidate plus immutable governance and manifest references and returns a D2 command. No normalizer is implemented. Coordinator code cannot normalize.

## D2 Commit Mapping

`SUCCESS -> COMMITTED`, `DUPLICATE -> DUPLICATE`, `CONFLICT -> CONFLICT`, `REJECTED -> PERMANENT_FAILURE`, and `RETRYABLE_FAILURE -> RETRYABLE_FAILURE`. Conflict is never success. Only committed and duplicate outcomes are initially watermark-eligible.

## Retry Taxonomy

The closed taxonomy covers transport, HTTP, capability, empty/malformed/decompression/checksum/parser/schema/governance/validation/quality, D2, PostgreSQL, worker, lease, and cancellation conditions. Retry policies reference external versions; no attempt counts or delays are hardcoded.

## Batch and Partial Failure Rules

Successful Units remain durable. Mixed required terminal outcomes produce `PARTIAL`; unresolved Units remain resumable; batch retries retain logical Unit identity. Cancellation preserves commits and conflicts remain visible.

## Watermark Eligibility

Eligibility is an append-only decision separate from Watermark mutation. Success and duplicate may be eligible. Conflict, retryable failure, missing/permanent failure, and quality quarantine block. Empty is not automatically complete; unsupported and cancelled do not imply availability.

## Publication Handoff

Population ends at D2 `PENDING` and emits a bounded policy-linked handoff. No Worker, provider, or Coordinator may publish or bypass certification.

## PostgreSQL Schema Blueprint

One unapplied D3 migration in an isolated namespace defines control-plane, Candidate, validation/quality, submission, outcome, retry, and watermark-decision tables. D2 migration contents and order are unchanged. Current states are projections over event history. No partitioning is introduced.

## Lease Claim Blueprint

The controlled claim function locks one eligible Unit, verifies cancellation/state, increments the token, creates the lease, updates Unit state, appends an event, and returns Unit/token atomically. Heartbeat and advancement reject stale or expired ownership.

## Scheduler Deduplication

Schedule occurrence plus deterministic request identity prevents duplicate delivery from creating uncontrolled Jobs. Intentional reruns require a distinct explicit identity. Scheduler has no canonical write responsibility.

## Object Storage Boundary

The port defines immutable put, stat/hash verification, and streamed read. S3-compatible, managed platform, and local development adapters remain future alternatives; no vendor or adapter implementation is selected.

## Security and Role Boundary

Future roles are Scheduler, Coordinator, Worker, read-only operations, and migration owner. Runtime roles cannot alter schemas, delete history, or write canonical SQL arbitrarily. No credentials were introduced.

## Static Test Results

| Validation | Result |
|---|---|
| TypeScript | PASS |
| D1 regression suite | PASS |
| D2 Phase 1 suite | PASS |
| D2 Phase 2 unit suite | PASS |
| D3 Phase 1 suite | PASS - 30 checks |
| D3 migration filename/numbering | PASS |
| Static SQL fencing/uniqueness/history checks | PASS |
| SQL live execution | NOT RUN - migration is intentionally unapplied |
| Provider/object-store execution | NOT RUN - prohibited |
| Production build | NOT APPLICABLE - prohibited by `AGENTS.md` |

## Protected-System Review

Existing backfills, D2 implementation and migrations, Repository, SQLite, generic PostgreSQL adapter, Coverage, Projection, Evidence, schedulers, workers, APIs, pages, and UI remain unchanged. No active runtime imports the D3 population namespace.

## Package and Lockfile Review

No package or lockfile changes.

## Known Limitations

- SQL is statically reviewed but unapplied and not validated by live PostgreSQL.
- Object storage and provider adapters are interfaces only.
- No executable Worker, Coordinator, lease runtime, normalizer, scheduler, or publication runtime exists.
- D2 partial-migration failure injection and production-readiness review remain outstanding.
- Retry limits, lease duration, payload bound, quality thresholds, freshness, and SLAs require approved policies.

## Risks

Static SQL may expose PostgreSQL dependency or privilege defects when isolated execution begins. Event reconstruction needs live procedure tests. Candidate JSON is bounded by TypeScript and kind checks but Phase 2 must enforce dataset-specific SQL validation or typed tables before runtime writes. No runtime integration is allowed until these are addressed.

## Blockers

No blocker prevents an isolated D3 Phase 2 control-plane implementation and verification. Production deployment, provider execution, existing-backfill migration, and consumer cutover remain blocked.

## Exact Next Step

In D3 Phase 2, implement only an isolated PostgreSQL control-plane adapter and live integration suite for migration application, event reconstruction, lease claim/heartbeat/reclaim fencing, stale-token rejection, checkpoint durability, Candidate/submission uniqueness, partial Job aggregation, retry history, and watermark eligibility. Keep providers, object storage, D2 runtime invocation, existing backfills, and consumers disconnected.

## Final Gate

`SAFE TO IMPLEMENT D3 PHASE 2 WITH LIMITATIONS`
