# Phase 5 Persistence Adapter Certification

**Project:** Theta - Data Intelligence Platform  
**Phase:** 5  
**Sprint:** P5-6  
**Date:** 2026-06-30  
**Scope:** Repository, SQLite adapter, and Postgres/Neon adapter  
**Decision:** PERSISTENCE FOUNDATION CERTIFIED WITH LIMITATIONS

## 1. Certification Scope

This document certifies the Phase 5 persistence foundation implemented in
P5-2 through P5-5:

```text
Phase 4 Runtime Records
  -> Persistence Repository
  -> StorageAdapter
       -> SQLiteStorageAdapter (local development)
       -> PostgresStorageAdapter (production / Neon)
```

The certification covers mapping, validation, storage envelopes,
idempotency, adapter parity, physical schema semantics, opaque payloads,
structured failures, soft archival, health reporting, dependencies, and
prohibited behavior.

It does not certify a live Neon deployment, schema deployment tooling,
schedulers, workers, automatic evaluation, or learning execution.

## 2. Objective Defects Corrected

Two objective defects were corrected during certification:

1. SQLite used `(record_kind, record_id)` as a composite primary key while the
   production Postgres schema used globally unique `record_id`. The SQLite
   schema now uses `record_id TEXT PRIMARY KEY`, aligning duplicate and identity
   semantics for newly created local databases.
2. Postgres structured storage failures retained raw driver causes. Those
   causes could contain connection metadata. Postgres errors are now sanitized
   and expose only canonical status, message, and retryability metadata.

No feature, adapter, package, API, page, scheduler, worker, or Phase 4 runtime
change was introduced by these corrections.

## 3. Layer Certification

### 3.1 Repository Layer

**Decision: PASS**

Verified:

* Repository depends on the `StorageAdapter` interface, not SQLite or Postgres.
* Nine Phase 4 runtime record types map to their canonical record kinds.
* Runtime validators run before storage mapping.
* `recordId`, schema version, creation boundary, and parent lineage are derived
  only from approved runtime identities and references.
* Complete runtime records pass through as opaque JSON payloads.
* P5-2 idempotency helpers create deterministic record-kind-aware keys.
* Successful envelope validation clones and freezes the storage copy without
  freezing or mutating the caller's runtime object.
* Adapter statuses are translated to structured Repository statuses.
* Malformed adapter results fail closed as `ADAPTER_ERROR`.
* Repository contains no SQL, provider client, environment access, scheduler,
  worker, API, or UI behavior.

Canonical mapping:

| Runtime | Storage kind | Parent storage records |
| --- | --- | --- |
| Signal Tracking | `SIGNAL_TRACKING` | None |
| Signal Evaluation | `SIGNAL_EVALUATION` | Signal Tracking |
| Signal Outcome | `SIGNAL_OUTCOME` | Signal Tracking, Signal Evaluation |
| Outcome Event | `OUTCOME_EVENT` | Signal Outcome |
| Historical Memory | `HISTORICAL_MEMORY` | Outcome Event |
| Pattern | `PATTERN` | Historical Memory |
| Learning | `LEARNING` | Pattern |
| Confidence Calibration | `CONFIDENCE_CALIBRATION` | Learning, Pattern |
| Playbook | `PLAYBOOK` | Learning, Confidence Calibration |

### 3.2 SQLite Adapter

**Decision: PASS**

Verified:

* `SQLiteStorageAdapter` implements `StorageAdapter`.
* Adapter is documented and scoped for local development only.
* The canonical `storage_records` table is created idempotently on open.
* All runtime values use positional or named query parameters.
* `INSERT OR IGNORE` plus primary/unique constraints returns `DUPLICATE`
  without overwriting an existing row.
* Payload and parent references are stored as opaque JSON text.
* Reads parse and revalidate the complete storage envelope.
* Malformed persisted JSON fails closed as `STORAGE_ERROR`.
* `markArchived()` changes only the archive flag and never deletes payload.
* Lists exclude archived rows; direct reads retain audit access.
* Health reports `READY`, `DEGRADED`, or `UNAVAILABLE` from database access,
  schema presence, and `PRAGMA quick_check`.

### 3.3 Postgres / Neon Adapter

**Decision: PASS WITH LIMITATIONS**

Verified statically and without a live production connection:

* `PostgresStorageAdapter` implements `StorageAdapter`.
* Postgres.js is configured for a single serverless-friendly connection,
  finite timeouts, and transaction-pooler compatibility.
* The canonical production schema is exported but not executed during runtime
  cold starts.
* Tagged-template parameters, array parameters, and JSON parameters are used;
  no raw `unsafe()` query path exists.
* `INSERT ... ON CONFLICT DO NOTHING` returns `DUPLICATE` without overwrite.
* Parent references and payload are stored as opaque JSONB.
* Reads reconstruct and revalidate the provider-neutral storage envelope.
* `markArchived()` updates only `archived` and performs no hard delete.
* Health reports `READY`, `DEGRADED`, or `UNAVAILABLE` without exposing driver
  errors, connection strings, credentials, or provider responses.
* Adapter code does not read `process.env` or log connection information.

The limitation is that no live Neon database was configured or contacted in
this certification.

## 4. Contract Certification

| Method | Repository | SQLite | Postgres / Neon |
| --- | --- | --- | --- |
| `writeRecord()` | Delegated | PASS | PASS |
| `readRecord()` | Delegated | PASS | PASS |
| `recordExists()` | Delegated | PASS | PASS |
| `listRecords()` | Delegated | PASS | PASS |
| `appendEvent()` | Adapter contract | PASS | PASS |
| `markArchived()` | Delegated | PASS | PASS |
| `healthCheck()` | Adapter contract | PASS | PASS |

Both concrete classes implement the exact provider-neutral interface. No
provider method is required by Repository.

## 5. Schema Compatibility

**Decision: PASS WITH DOCUMENTED PHYSICAL DIFFERENCES**

| Field | SQLite | Postgres | Equivalent meaning |
| --- | --- | --- | --- |
| `record_id` | `TEXT PRIMARY KEY` | `text PRIMARY KEY` | Global immutable storage identity. |
| `record_kind` | `TEXT NOT NULL` | `text NOT NULL` | Canonical P5-2 record kind. |
| `idempotency_key` | `TEXT`, unique index | `text NOT NULL UNIQUE` | Atomic duplicate identity. |
| `runtime_version` | `TEXT NOT NULL` | `text NOT NULL` | Producing runtime version. |
| `schema_version` | positive `INTEGER` | positive decimal `text` validated on read | Numeric runtime schema version after envelope reconstruction. |
| `created_at` | validated timestamp text | `timestamptz` | Runtime/source creation boundary. |
| `recorded_at` | validated timestamp text | `timestamptz` | Persistence acceptance boundary. |
| `parent_refs` | JSON text | `jsonb` | Opaque canonical parent-reference array. |
| `payload` | JSON text | `jsonb` | Opaque runtime payload. |
| `checksum` | nullable text | nullable text | Optional integrity metadata. |
| `archived` | checked `0/1` integer | boolean | Soft archive state. |

Both schemas index record ID, idempotency key, record kind, and archive state.
SQLite initializes a local schema directly. Postgres requires controlled
application of the exported schema before production use.

## 6. Idempotency Certification

**Decision: PASS WITH LIMITATION**

Verified:

* keys are deterministic and record-kind aware;
* identical mapped runtime records produce identical keys;
* SQLite rejects duplicate record IDs and keys with `DUPLICATE`;
* Postgres uses atomic conflict handling and maps an empty `RETURNING` result to
  `DUPLICATE`;
* neither adapter overwrites an existing row;
* neither adapter performs update-on-conflict mutation;
* `appendEvent()` uses the same immutable write path;
* archive updates affect only storage archive metadata.

Accepted limitation: current Repository identities represent one canonical
stored row per runtime record identity. Forward lifecycle observations that
retain the same runtime identity are not yet modeled as separate persisted
event identities. Future orchestration must define that observation/event
contract before persisting every intermediate lifecycle transition. This does
not affect immutable final-record writes certified here.

## 7. Opaque Payload Certification

**Decision: PASS**

Verified:

* Repository uses runtime-specific code only to validate records and extract
  identity, timestamps, and approved parent references.
* The complete runtime object remains an opaque JSON payload after mapping.
* Storage validation deep-clones and freezes the storage representation.
* SQLite serializes opaque payloads as JSON text.
* Postgres passes opaque payloads through the client's JSONB parameter helper.
* Neither adapter imports or branches on Signal, Outcome, Event, Memory,
  Pattern, Learning, Calibration, or Playbook runtime types.
* No adapter calculates, enriches, rewrites, or interprets payload content.

## 8. Failure Policy Certification

**Decision: PASS**

| Failure | Certified handling |
| --- | --- |
| Duplicate write | `DUPLICATE`; existing row unchanged. |
| Missing record | `NOT_FOUND`; no placeholder record. |
| Invalid input/envelope | `VALIDATION_ERROR`; adapter not called or write not attempted. |
| Storage/provider failure | `STORAGE_ERROR`; structured retryability, no normal-flow throw. |
| Missing/unreachable storage | `UNAVAILABLE`; no false success. |
| Reachable store without schema/integrity | Health `DEGRADED`. |
| Unreachable health target | Health `UNAVAILABLE`. |
| Malformed persisted payload | `STORAGE_ERROR`; no fabricated replacement. |

Repository defensively catches an adapter that violates the no-throw contract
and returns `ADAPTER_ERROR`.

## 9. Dependency Certification

**Decision: PASS WITH EXISTING APPLICATION VULNERABILITIES**

Certified dependency changes:

| Package | Version | Scope | Purpose |
| --- | --- | --- | --- |
| `better-sqlite3` | `11.10.0` | Production dependency | Local SQLite engine with Node 20 Windows prebuilt support. |
| `@types/better-sqlite3` | `7.6.13` | Development dependency | TypeScript declarations only. |
| `postgres` | `3.4.9` | Production dependency | Lightweight Postgres/Neon client with bundled types. |

No ORM, Prisma, migration framework, scheduler package, or unrelated provider
dependency was added.

`npm audit --json` status on 2026-06-30:

* total vulnerable packages: **4**;
* critical: **1**;
* high: **2**;
* moderate: **1**;
* affected packages: direct `next`, transitive `hono`, transitive `undici`,
  and Next's transitive `postcss`;
* `better-sqlite3`, `@types/better-sqlite3`, and `postgres` were not listed as
  affected packages;
* no automatic audit fix was run.

The application dependency vulnerabilities are outside this certification
sprint and remain an objective product limitation.

## 10. No-Prohibited-Behavior Certification

**Decision: PASS**

Static review confirms no persistence layer performs:

* scheduling, timers, cron, queues, leases, or background jobs;
* API route behavior or page rendering;
* AI, narrative, Pattern, Learning, Calibration, or Playbook generation;
* broker access, trade execution, or execution planning;
* live price collection, signal capture, or signal evaluation;
* Phase 4 runtime mutation;
* external data-source fetches;
* automatic Postgres schema migration.

## 11. Known Limitations

1. Live Neon connectivity, permissions, TLS, latency, and deployed schema were
   not tested because no production connection was required or configured.
2. Postgres schema provisioning is manual/controlled; no migration system is
   implemented.
3. SQLite database files created before the P5-6 primary-key correction retain
   their prior schema because no migration is allowed. Local development may
   reset those files; production deletion remains forbidden.
4. SQLite is local-only and is not suitable as shared Vercel storage.
5. Postgres and SQLite use different physical timestamp, JSON, schema-version,
   and cursor representations while preserving the same envelope semantics.
6. Intermediate same-identity lifecycle observations do not yet have a
   dedicated persisted event identity.
7. Four npm-audit findings remain in the broader application dependency tree.

## 12. Final Decision

**PERSISTENCE FOUNDATION CERTIFIED WITH LIMITATIONS**

Repository mapping, both concrete adapters, contract parity, schema semantics,
opaque payload handling, idempotency, soft archival, structured failure, and
health behavior satisfy the Phase 5 persistence architecture after the two
objective corrections made during certification.

The limitations prevent claiming live production deployment readiness. They do
not invalidate the provider-neutral persistence foundation or authorize APIs,
schedulers, workers, automatic evaluation, or learning execution.

## 13. Validation

| Validation | Result |
| --- | --- |
| `npx.cmd tsc --noEmit --pretty false --incremental false` | PASS |
| Repository mapping/delegation smoke check | PASS |
| SQLite adapter in-memory contract smoke check | PASS |
| Postgres adapter connection-free static smoke check | PASS |
| SQLite global record-ID duplicate behavior | PASS |
| SQLite write/read/list/archive/health behavior | PASS |
| Postgres schema and JSONB round trip | PASS |
| Postgres missing-connection degradation and credential sanitization | PASS |
| Adapter method parity | PASS |
| Prohibited-behavior static scan | PASS |
| `npm audit --json` | COMPLETED; 4 findings documented, no fix run |
| Live Neon test | NOT RUN; not required |
| Production build | NOT RUN; prohibited by repository rules and not required |

No package version, API, page, scheduler, worker, or Phase 4 runtime was changed
in P5-6.
