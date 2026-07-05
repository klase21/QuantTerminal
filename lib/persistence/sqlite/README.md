# SQLite Storage Adapter

This directory implements the first concrete P5-2 `StorageAdapter` for local
development. It stores P5-3 Repository envelopes in SQLite and has no awareness
of runtime payload internals.

## Dependency Decision

The workspace had no SQLite driver and runs Node 20, which does not provide the
stable built-in `node:sqlite` module. P5-4 therefore adds:

* `better-sqlite3@11.10.0` as the single SQLite runtime dependency;
* `@types/better-sqlite3` as development-only TypeScript declarations.

Version 11.10.0 is used because its Windows prebuilt binary supports the
workspace's Node 20 runtime. The current release had no matching prebuilt in
this environment and would have required adding a C++ build toolchain, which is
outside this sprint.

## Adapter Contract

`SQLiteStorageAdapter` implements exactly the P5-2 methods:

```text
writeRecord
readRecord
recordExists
listRecords
appendEvent
markArchived
healthCheck
```

Construction accepts a database path. Initialization failures are retained as
adapter state; methods return structured `UNAVAILABLE` results instead of
throwing. `:memory:` is supported for focused local checks but is not durable.

`createSQLitePersistenceRepository(path)` wires this adapter into the P5-3
provider-neutral Repository.

## Schema

P5-4 creates one table without a migration framework:

```text
storage_records
  record_id
  record_kind
  idempotency_key
  runtime_version
  schema_version
  created_at
  recorded_at
  parent_refs
  payload
  checksum
  archived
```

`record_id` is the primary key. `idempotency_key` is uniquely indexed.
Additional indexes cover `record_id`, `record_kind`, and `archived`.
Schema creation is idempotent and occurs when the adapter opens the database.
There is no migration system.

## Idempotency

Writes use a parameterized `INSERT OR IGNORE`. A duplicate record ID
or idempotency key returns `DUPLICATE`. Existing records are never overwritten,
merged, or updated on conflict. `appendEvent()` uses the same immutable write
path.

SQLite enforces uniqueness atomically. The adapter does not perform a
read-before-write duplicate decision.

## Opaque Payload

`parentRefs` and `payload` are stored as JSON text after P5-2 envelope
validation. Reads parse and revalidate the complete `StorageRecord`. The
adapter never inspects Signal, Evaluation, Outcome, Event, Memory, Pattern,
Learning, Calibration, or Playbook fields.

Malformed persisted JSON or an invalid persisted envelope fails closed as
`STORAGE_ERROR`. No replacement payload is generated.

## Listing

Lists are ordered by SQLite row identity and use an opaque positive cursor.
Filters use parameterized values. Archived records are excluded from list
results; direct reads and existence checks continue to find them for audit and
replayability.

## Archive Behavior

`markArchived()` changes only the `archived` storage flag. It never deletes or
rewrites payload, parent references, timestamps, runtime identity, or checksum.
Repeated archive requests return `DUPLICATE`. There is no hard-delete method.

## Health

`healthCheck()` performs local, read-only checks for:

* an open database;
* the canonical `storage_records` table;
* SQLite `PRAGMA quick_check` integrity.

It reports `READY`, `DEGRADED`, or `UNAVAILABLE`. It performs no network call,
repair, migration, or payload inspection.

## SQLite Limitations

This adapter is local-development infrastructure only:

* `better-sqlite3` is synchronous beneath the asynchronous adapter contract;
* one SQLite file is not shared durable storage for serverless instances;
* write concurrency and worker coordination are bounded by SQLite locking;
* cursor identity is local to one database file;
* schema evolution requires a separately approved migration sprint;
* archived rows remain on disk by design.

The provider-neutral envelope, Repository, result vocabulary, idempotency keys,
and lineage metadata remain compatible with a future Postgres adapter. P5-5
must implement the same interfaces without changing runtime records.

## Not Implemented

P5-4 includes no Postgres, Neon, Supabase, API, page, scheduler, queue, worker,
automatic evaluation, learning execution, AI, or runtime-module change.
