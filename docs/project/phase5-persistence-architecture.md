# Phase 5 Autonomous Intelligence Persistence Architecture

**Project:** Theta - Data Intelligence Platform  
**Phase:** 5  
**Sprint:** P5-1  
**Date:** 2026-06-30  
**Status:** Architecture definition  
**Implementation:** Not started

## 1. Purpose

Phase 5 Persistence is the durable boundary beneath the certified Phase 4
runtime foundation. Its purpose is to preserve validated runtime records so
that facts can be replayed, knowledge can be traced to evidence, and future
autonomous workers can resume safely after interruption.

Persistence owns:

* durable storage of immutable facts;
* durable storage of versioned knowledge;
* idempotent writes and duplicate rejection;
* replayable serialized records;
* lifecycle and lineage auditability.

Persistence does not own:

* signal generation;
* signal evaluation logic;
* learning or calibration logic;
* AI or narrative generation;
* scheduling or worker orchestration;
* product UI or page behavior.

Persistence records decisions already made by an owning runtime. It must not
turn missing data into a value, advance a lifecycle on its own, or reinterpret
an `UNAVAILABLE` result.

## 2. Persistence Layers

The three storage categories are logically separate. A first implementation
may use one physical database, but it must preserve these ownership boundaries.

### 2.1 Facts Storage

Facts Storage is append-only and contains serialized records accepted from the
Facts Layer.

| Record | Canonical source | Persistence rule |
| --- | --- | --- |
| Signal Snapshot | Signal generation boundary | Store the frozen emitted snapshot once; never reconstruct missing context. |
| Tracking Lifecycle | Signal Tracking | Append accepted lifecycle observations; do not overwrite prior states. |
| Evaluation Result | Signal Evaluation | Store one objective result or explicit `UNAVAILABLE` result per signal and window. |
| Signal Outcome | Signal Outcome | Store the immutable normalized outcome once per signal and evaluation window. |
| Outcome Event | Outcome Recorder | Store the versioned immutable event and preserve its full fact payload. |
| Historical Memory Record | Historical Memory | Store the canonical memory record and its references without interpretation. |

Facts are immutable even when their runtime lifecycle advances. A transition
creates a new auditable persisted observation; it does not edit the previously
recorded fact.

### 2.2 Knowledge Storage

Knowledge Storage contains interpretations whose evidence and version are
explicit.

| Record | Canonical source | Persistence rule |
| --- | --- | --- |
| Pattern Record | Pattern Runtime | Store each pattern version with its Historical Memory evidence set. |
| Learning Record | Learning Runtime | Store each learning version with referenced Pattern records. |
| Confidence Calibration Record | Confidence Calibration | Store each calibration version with its Learning and Pattern evidence. |
| Playbook Record | Playbook Runtime | Store each approved or non-approved version with its Learning and Calibration evidence. |

Knowledge is versioned, not edited in place. New evidence, conclusions,
calibration output, or rules require a new runtime-approved version. Rejected,
superseded, and archived records remain queryable and immutable.

### 2.3 Operational Storage

Operational Storage supports future autonomous execution without becoming a
source of product intelligence.

It may contain:

* Scheduler Runs;
* Worker Locks;
* Retry State;
* Job State;
* Dead-letter Records.

Operational state is mutable where coordination requires it, but every
mutation must be auditable. Locks may expire, retry counters may advance, and
jobs may change state; none of those changes may mutate a Facts or Knowledge
record. Operational records may point to runtime identities but must not embed
replacement intelligence.

## 3. Storage Philosophy

The canonical rules are:

1. Facts are immutable.
2. Knowledge is immutable within a version and evolves only through a new version.
3. Operational state is mutable but auditable.
4. Append-only storage is preferred for facts, knowledge, transitions, and audit events.
5. Lifecycle changes require an explicit transition already accepted by the owning runtime.
6. Persistence validates identity, schema version, and serialization integrity before writing.
7. Deletion is forbidden in production. Destructive reset is allowed only in explicitly identified local or test environments.
8. `UNAVAILABLE`, null, and rejected states are first-class records and must survive round trips unchanged.
9. A storage backend is never an authority for business meaning; the certified runtime contract remains authoritative.

Physical compaction, backup retention, and archival may be added later, but
they must retain logical replayability and audit history.

## 4. Candidate Storage Backends

### 4.1 Comparison

| Backend | Local development fit | Production fit | Vercel compatibility | Cron / worker compatibility | Migration complexity | Future scale |
| --- | --- | --- | --- | --- | --- | --- |
| SQLite | Excellent: zero-service, transactional, deterministic local file | Poor for multi-instance Vercel production; suitable for a single durable host | Local SQLite files are not durable or shared across Vercel Functions | Good for one local process; coordination weak across distributed workers | Low locally; moderate when moving SQL and concurrency assumptions to Postgres | Moderate for single-node workloads |
| PostgreSQL, self-managed | Good through a local service or container, but heavier than SQLite | Excellent relational durability, transactions, constraints, and concurrency | Compatible through a reachable database and pooled connections | Excellent, including transactional claims and worker coordination | Medium operational burden; low logical migration risk when Postgres is the production contract | High, subject to operating capacity |
| Supabase Postgres | Good through local tooling or a hosted development project | Strong managed Postgres with backups and optional platform services | Strong; transaction pooling is intended for transient serverless or edge clients | Strong; direct/session connections suit persistent workers and pooled connections suit serverless jobs | Medium because connection modes and optional platform services require discipline | High |
| Neon | Good through a hosted development branch or local Postgres-compatible tooling | Strong managed serverless Postgres | Excellent; Neon is a native Vercel Marketplace integration and the successor for former Vercel Postgres stores | Strong; pooled connections and the serverless driver support transient jobs, while ordinary Postgres clients support workers | Low to medium; standard Postgres keeps the adapter portable | High, with autoscaling, branching, restore, and scale-to-zero considerations |
| Vercel Postgres | Not a current standalone backend choice | Retired as a separate product | Existing stores were migrated to Neon; new Postgres storage is selected through Vercel Marketplace | Determined by the selected Marketplace provider | Treat as a migration alias, not a new architecture target | Determined by provider |
| Turso / LibSQL | Excellent SQLite-compatible local experience | Good for remote SQLite/libSQL workloads; less aligned with the selected Postgres production contract | Good through remote Turso storage; local embedded replicas require a durable filesystem and are unsuitable for Vercel Functions | Suitable for remote jobs, but lock and concurrency behavior differs from Postgres worker patterns | Medium to high because dialect, concurrency, and migration paths diverge from Postgres | Moderate to high for distributed read-heavy use, with provider-specific semantics |

### 4.2 Evidence Behind the Comparison

* SQLite remains an excellent embedded local database, but Vercel states that
  function filesystems are ephemeral and cannot provide the shared permanent
  storage SQLite requires in production. See
  [Vercel's SQLite guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel).
* PostgreSQL provides transactional isolation suitable for idempotent writes
  and concurrent worker claims. See the
  [PostgreSQL transaction isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html).
* Supabase supplies a full Postgres database and recommends transaction-mode
  pooling for temporary serverless clients while reserving direct or session
  connections for persistent clients. See
  [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).
* Neon provides Postgres with serverless connection options, pooling,
  branching, autoscaling, and scale-to-zero. See the
  [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver),
  [connection pooling](https://neon.com/docs/connect/connection-pooling), and
  [scale-to-zero](https://neon.com/docs/introduction/scale-to-zero) documentation.
* Vercel Postgres is no longer offered as a separate product. Vercel migrated
  existing stores to Neon in December 2024 and now directs new projects to
  Marketplace Postgres providers. See
  [Postgres on Vercel](https://vercel.com/docs/postgres) and
  [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage).
* Turso documents libSQL as SQLite-compatible, while local embedded replicas
  require filesystem access and therefore do not fit filesystem-less
  serverless functions. See [libSQL](https://docs.turso.tech/libsql) and
  [Turso embedded replicas](https://docs.turso.tech/features/embedded-replicas/introduction).

## 5. Recommended Architecture

### 5.1 Default

**Local development:** SQLite.

SQLite provides transactions, unique constraints, deterministic local tests,
and a low operational footprint. File-backed JSONL may be supported later as
an export, audit, or recovery format, but it should not be the primary local
store because it cannot safely provide concurrent idempotency and lifecycle
claims by itself.

**Production:** managed Postgres-compatible storage.

The default V1 production recommendation is **Neon Postgres**, deployed in the
same or nearest practical region to the Vercel application and accessed with a
serverless-safe pooled or HTTP connection mode. This choice fits the current
Vercel storage model while preserving standard Postgres semantics. Scale-to-zero
must be evaluated against scheduler latency before autonomous execution is
enabled; latency-sensitive production workers may require an always-active
compute setting.

**Alternative production provider:** Supabase Postgres is acceptable when its
broader platform capabilities are desired. The persistence contract must use
the Postgres boundary rather than couple canonical records to provider-specific
Auth, Realtime, or Data API behavior.

### 5.2 Adapter Boundary

All application code must depend on a storage adapter contract, not a provider
SDK. The future adapter should expose capability-oriented operations for:

* append immutable fact;
* append versioned knowledge;
* read by canonical identity;
* list/query by the runtime's existing query contract;
* append lifecycle observation;
* claim/update audited operational work;
* verify idempotency and content integrity.

The SQLite and Postgres adapters must pass the same contract tests. Provider
selection, credentials, pooling, and migration execution remain outside the
runtime models.

### 5.3 Logical Topology

V1 should use one physical database with three logically isolated namespaces
or ownership groups:

```text
Facts Storage       append-only runtime facts and transitions
Knowledge Storage   append-only versioned interpretations
Operational Storage mutable coordination state plus append-only audit history
```

Separate physical stores are not justified until measured scale, retention, or
security requirements demand them. Logical separation is mandatory from the
first implementation.

## 6. Persistence Boundary

Persistence accepts only a runtime record that has:

1. passed its owning runtime validator;
2. been serialized by that runtime's canonical serializer;
3. retained its runtime `schemaVersion` and identity;
4. supplied explicit lifecycle and unavailable states.

The adapter stores the serialized representation and indexing metadata. It may
verify a checksum and deserialize for validation, but it must not mutate the
runtime object or normalize away null and unavailable values.

Persistence must not:

* calculate evaluations or outcomes;
* derive patterns or learning;
* compute confidence or select calibration bands;
* generate playbook rules;
* supply missing timestamps, evidence, or references;
* advance runtime lifecycle state.

Reads return the stored serialized record for reconstruction through the owning
runtime deserializer. A persistence model is not a second domain model.

## 7. Canonical Idempotency

Every write has a stable entity identity and a canonical idempotency key.
Prefixes prevent cross-type collisions.

| Record | Canonical idempotency key |
| --- | --- |
| Signal Snapshot | `signal-snapshot:{snapshotId}` |
| Tracking Lifecycle observation | `tracking-lifecycle:{trackingId}:{canonicalPayloadChecksum}` |
| Evaluation Result | `signal-evaluation:{signalId}:{snapshotId}:{evaluationWindow}` |
| Signal Outcome | `signal-outcome:{outcomeId}` |
| Outcome Event | `outcome-event:{eventId}` where `eventId` already binds `outcomeId + eventVersion` |
| Historical Memory | `historical-memory:{memoryId}` where `memoryId` is derived from the Outcome Event |
| Pattern | `pattern:{patternId}:{patternVersion}:{evidenceSetHash}` |
| Learning | `learning:{learningId}:{learningVersion}:{patternSetHash}` |
| Calibration | `calibration:{calibrationId}:{calibrationVersion}:{learningSetHash}:{patternSetHash}` |
| Playbook | `playbook:{playbookId}:{playbookVersion}:{learningSetHash}:{calibrationSetHash}` |

`canonicalPayloadChecksum` is a persistence integrity value over the exact
canonical serialized bytes. It is not product intelligence and must never be
used as evidence. It lets distinct forward lifecycle observations coexist
without allowing a retry to create duplicates.

Idempotency behavior:

* same key and same checksum: return the existing record as an idempotent success;
* same key and different checksum: reject as an identity conflict;
* new versioned identity: append a new record;
* stale or backward lifecycle observation: reject before storage;
* retries must reuse the original idempotency key.

Uniqueness must be enforced by the storage backend, not by a read-then-write
check in application memory.

## 8. Auditability

Every persisted record must retain or record:

| Field | Rule |
| --- | --- |
| `createdAt` | Original runtime/source timestamp; preserve exactly and never replace with write time. |
| `recordedAt` | Infrastructure timestamp for successful durable acceptance. |
| `version` | Runtime schema/event/knowledge version as applicable. |
| `sourceRuntime` | Canonical runtime name that produced the serialized record. |
| `payloadChecksum` | Deterministic integrity hash of canonical serialized bytes. |
| `parentReference` | Immediate upstream canonical identity or identities. |
| `lifecycleState` | State already accepted by the owning runtime. |
| `idempotencyKey` | Stable write identity used for duplicate control. |

Audit history must also capture rejected writes without storing an invalid
record as canonical data. A rejection entry may include failure category,
attempted identity, timestamp, and checksum; it must not copy secrets or
untrusted raw payloads into logs.

The following lineage must remain traversable:

```text
Signal Snapshot
  -> Tracking Lifecycle
  -> Evaluation Result
  -> Signal Outcome
  -> Outcome Event
  -> Historical Memory
  -> Pattern
  -> Learning
  -> Confidence Calibration
  -> Playbook
```

## 9. Failure Policy

| Failure | Required behavior |
| --- | --- |
| Duplicate write | Return idempotent success only when identity and checksum match; otherwise return conflict. Never create a second canonical record. |
| Partial write | Use an atomic transaction for one canonical record plus its audit/index metadata. Roll back the whole unit on failure. Downstream work may start only after commit. |
| Storage outage | Fail closed, retain no in-memory claim of durability, and return a retryable unavailable result. Future workers retry with the same idempotency key. |
| Corrupted payload | Reject or quarantine as non-canonical, preserve diagnostic metadata, and never deserialize it into active runtime state. |
| Migration mismatch | Stop writes for the affected record type, keep reads available where safe, and require an explicit compatible migration. Never coerce silently. |
| Stale schema version | Preserve already stored records for replay; reject unsupported new writes and route them to an auditable dead-letter state. |

Cross-layer progress is commit-by-commit. A committed parent remains valid if a
downstream write fails; the downstream job retries from the committed parent.
The system must not use a broad transaction to imply that evaluation, memory,
or learning occurred when its owning runtime did not complete.

Dead-letter records are operational diagnostics, not facts or knowledge. A
dead-letter item can be retried or resolved, but it cannot be promoted without
passing the canonical runtime validator and ordinary idempotent write path.

## 10. Phase 5 Dependency Graph

```text
Certified Phase 4 Runtime
          |
          v
Persistence Adapter
          |
          v
Storage Backend
          |
          v
Scheduler / Workers
          |
          v
Automatic Evaluation
          |
          v
Historical Memory
          |
          v
Learning Execution
```

The arrows indicate dependency and data flow, not ownership transfer:

* Runtime defines valid records.
* Persistence Adapter enforces the storage contract.
* Storage Backend supplies durability and transaction guarantees.
* Scheduler and Workers coordinate future execution through Operational Storage.
* Automatic Evaluation invokes the existing evaluation runtime; it does not move evaluation logic into persistence.
* Historical Memory accepts only canonical Outcome Events.
* Learning Execution consumes versioned knowledge inputs after facts are durable.

Scheduler and worker implementation remains out of scope. Persistence must be
usable without either one.

## 11. P5-2 Recommendation

**Recommended next sprint:** `P5-2 - Storage Adapter Interface`.

P5-2 should define provider-neutral TypeScript contracts and structured
results for immutable append, versioned append, identity lookup, lifecycle
observation, idempotency conflict, and operational claims.

P5-2 should remain runtime infrastructure only:

* no database schema;
* no SQLite or Postgres implementation;
* no provider SDK;
* no API or page integration;
* no scheduler or worker;
* no package change;
* contract tests may use in-memory test doubles only if they are not production-reachable and are explicitly test-scoped.

The following sprint may then implement the SQLite development adapter against
the certified interface before a Postgres production adapter is introduced.

## 12. Validation

| Check | Result |
| --- | --- |
| `docs/project/phase5-persistence-architecture.md` exists | PASS |
| Purpose and ownership boundaries are complete | PASS |
| Facts, Knowledge, and Operational storage are separated | PASS |
| Candidate backends are compared | PASS |
| Local and production defaults are recommended | PASS |
| Idempotency and audit requirements are defined | PASS |
| Failure policy and dependency graph are complete | PASS |
| Runtime files changed | NO |
| API files changed | NO |
| Package files changed | NO |
| Database schemas, adapters, workers, or schedulers implemented | NO |
| Build required | NO |

**Validation decision:** PASS. P5-1 defines architecture only and leaves all
persistence implementation to separately governed Phase 5 sprints.
