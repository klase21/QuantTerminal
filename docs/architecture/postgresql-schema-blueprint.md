# PostgreSQL Schema Blueprint

## Status

The SQL files under `lib/data-platform/persistence/postgres/migrations` are numbered, reviewable, and unapplied. No migration runner or connection is included.

## Dependency Order

| Migration | Responsibility |
|---|---|
| `001_control_and_raw.sql` | Schemas, immutable registry/provider/policy snapshots, raw manifests, Canonical Commits, and outbox |
| `002_repository_lifecycle.sql` | Envelopes, versions, decisions, supersession, lineage, and controlled publication transition helper |
| `003_canonical_fact_tables.sql` | Nine typed fact/manifest tables |
| `004_governance_and_read_models.sql` | Quality, coverage, projection, evidence, consistency, and quarantine metadata |

## Schema Ownership

`control` owns definitions, commit audit, migration history, and outbox. `raw` owns content-addressed manifests but never archive bytes. `canonical` owns typed fact domain columns. `repository` owns traceability, immutable versions, publication history, supersession, and lineage. Remaining schemas own their named governance or derived responsibility.

## Fact Rules

Every typed table includes Canonical Record ID, business identity, positive record version, unique commit ID, provider identity, immutable snapshot bindings, schema and normalization versions, checksum, governed timestamps, and creation time. Domain values use exact `numeric`, never floating point. No typed fact is duplicated into an unconstrained Repository JSON payload.

AggTrade and Orderbook have no raw tick table. `canonical.stream_manifests` references verified `raw.objects` for bounded windows and optional sequence/count metadata.

## Constraints

- Primary keys identify physical rows or audit entities.
- Unique `(canonical_record_id, record_version)` constraints prevent duplicate versions.
- Dataset business/version constraints prevent duplicate physical observations.
- Foreign keys require immutable snapshot, commit, envelope, record, and raw-object identities.
- Checks enforce positive versions, checksum length, state domains, nonnegative sizes/counts, valid windows, OHLCV relationships, and lineage direction.
- Supersession uniqueness prevents branches from one predecessor.
- The partial unique index allows only one materialized `PUBLISHED` version per Canonical Record ID.
- Outbox uniqueness provides one canonical committed event per commit.

## Index Justification

Only known operations receive secondary indexes: bounded symbol/time reads, current version lookup, publication history reconstruction, lineage traversal from either endpoint, unpublished outbox polling, provider/raw window lookup, failed quality/consistency inspection, and quarantine conflict lookup. Phase 1 adds no speculative partitions or broad JSON indexes.

## Partitioning

No table is initially partitioned. OHLCV and Liquidations are candidates for monthly range partitioning only after D2/D3 measurements demonstrate that free-tier query or maintenance behavior requires it. Stream payload volume remains outside PostgreSQL.

## Atomicity

PostgreSQL transactions and role restrictions are the enforcement boundary for the polymorphic typed fact/envelope relationship. A Phase 2 commit adapter must be the only writer and must insert all required rows before commit. The current generic Repository cannot write these schemas. Parity and consistency audits detect any administrative bypass; ordinary runtime roles cannot perform one.

## Publication Projection

`repository.publication_decisions` is authoritative. `repository.append_publication_decision` locks the record version, accepts only a legal transition, appends the next decision sequence, and updates current state in the same transaction. Direct current-state updates are not an approved privilege.

## Raw Objects

`raw.objects` records content hash, size, media type, compression, retrieval time, provider snapshot, retention, verification, and object key. PostgreSQL stores no raw bytes. Required publication fails closed unless the manifest exists and is verified.

## Static Validation Limits

Phase 1 tests inspect numbering, required DDL, constraints, separation, and prohibited raw-byte storage. They do not parse PostgreSQL grammar, apply migrations, validate planner behavior, test privileges, or prove transaction behavior against a server. Those remain Phase 2 integration gates.
