# Postgres / Neon Storage Adapter

This directory implements the production P5-2 `StorageAdapter` for
Postgres-compatible storage. Neon Postgres is the recommended Vercel provider,
but the adapter uses standard Postgres semantics and remains provider-neutral
above the client boundary.

## Dependency Decision

P5-5 adds `postgres` (Postgres.js) as the only new dependency. It is a
lightweight Postgres client with bundled TypeScript declarations, tagged
template parameterization, JSONB support, and compatibility with Neon pooled
connection strings. No ORM, Prisma, migration framework, or provider SDK is
introduced.

The adapter configures one connection per instance, disables prepared
statements for transaction-pooler compatibility, and applies finite idle and
connect timeouts. Callers must provide the connection string; the adapter does
not read environment variables or log credentials.

## Adapter Contract

`PostgresStorageAdapter` implements exactly:

```text
writeRecord
readRecord
recordExists
listRecords
appendEvent
markArchived
healthCheck
```

`createPostgresPersistenceRepository(connectionString)` wires the adapter into
the P5-3 Repository without changing runtime or Repository contracts.

## Schema

`POSTGRES_STORAGE_SCHEMA` defines the canonical production table:

```text
storage_records
  record_id text primary key
  record_kind text not null
  idempotency_key text not null unique
  runtime_version text not null
  schema_version text not null
  created_at timestamptz not null
  recorded_at timestamptz not null
  parent_refs jsonb not null
  payload jsonb not null
  checksum text null
  archived boolean not null default false
```

Indexes cover record ID, idempotency key, record kind, and archive state.

The adapter does not execute DDL at runtime. Production provisioning must apply
the exported idempotent schema through a separately controlled deployment
step. This avoids schema mutation during Vercel cold starts and does not create
a migration system.

The Postgres schema stores `schema_version` as canonical decimal text to match
the approved P5-5 schema. Deserialization accepts positive integer text only
and reconstructs the P5-2 numeric envelope field.

## Idempotency

Writes use parameterized `INSERT ... ON CONFLICT DO NOTHING`. A duplicate
record ID or idempotency key returns `DUPLICATE`. No existing row is overwritten
or updated. `appendEvent()` uses the same immutable write path.

Postgres constraints make duplicate enforcement atomic. The adapter does not
perform read-before-write duplicate checks.

## Opaque JSONB

`parentRefs` and the complete runtime `payload` are written as JSONB after
P5-2 envelope validation. The adapter reads and revalidates the envelope but
never inspects Signal, Evaluation, Outcome, Event, Memory, Pattern, Learning,
Calibration, or Playbook fields.

Invalid persisted JSONB structure, timestamps, parent references, or schema
version fail closed as `STORAGE_ERROR`. No fallback values are generated.

## Listing

Lists use parameterized filters for record kind, JSONB parent containment,
creation range, cursor, and limit. Results are ordered by globally unique
`record_id`; the last returned ID is the opaque continuation cursor. Archived
records are excluded from lists but remain available to direct reads and
existence checks.

## Archive Behavior

`markArchived()` updates only the `archived` flag. Payload, parent references,
identity, timestamps, schema metadata, and checksum remain untouched. Repeated
archive requests return `DUPLICATE`. There is no hard delete.

## Health

Health performs only read-only queries:

* `READY`: Postgres is reachable and `storage_records` exists.
* `DEGRADED`: Postgres is reachable but the canonical table is absent.
* `UNAVAILABLE`: no client is configured or the health query cannot connect.

Health messages never contain connection strings, credentials, provider
responses, or SQL error detail. Operational adapter failures likewise omit raw
driver causes so connection metadata cannot escape through structured errors.

## Relationship to SQLite

SQLite remains the local-development adapter. Postgres/Neon is the production
adapter. Both implement the same StorageAdapter methods, structured result
vocabulary, idempotency policy, opaque payload boundary, archive semantics,
Repository wiring, and no-fabrication rules.

Provider-specific differences are limited to physical representation:

* SQLite stores JSON as text; Postgres stores JSONB.
* SQLite stores numeric schema version; the approved Postgres schema stores it
  as decimal text.
* SQLite uses a local row cursor; Postgres uses globally unique record ID.
* SQLite initializes its local schema; Postgres requires controlled schema
  provisioning.

## Not Implemented

P5-5 includes no API, page, scheduler, queue, worker, automatic signal capture,
automatic evaluation, learning execution, AI, ORM, migration system, or Phase 4
runtime change. No live Neon connection is required for static validation.
