# D2 V2.1 Phase 1 Implementation Report

## Outcome

Phase 1 translates approved D2 governance into bounded TypeScript contracts, four unapplied SQL migration blueprints, static contract tests, architecture documents, and ADR-008. It does not connect PostgreSQL, apply migrations, modify existing adapters, migrate SQLite, or change consumers.

## Changed Files

### New persistence contracts

- `lib/data-platform/persistence/contracts.ts`
- `lib/data-platform/persistence/identity.ts`
- `lib/data-platform/persistence/publication.ts`
- `lib/data-platform/persistence/lineage.ts`
- `lib/data-platform/persistence/supersession.ts`
- `lib/data-platform/persistence/canonicalCommit.ts`
- `lib/data-platform/persistence/parity.ts`
- `lib/data-platform/persistence/index.ts`
- `lib/data-platform/persistence/postgres/schema.ts`
- `lib/data-platform/persistence/postgres/index.ts`

### Unapplied migrations

- `lib/data-platform/persistence/postgres/migrations/001_control_and_raw.sql`
- `lib/data-platform/persistence/postgres/migrations/002_repository_lifecycle.sql`
- `lib/data-platform/persistence/postgres/migrations/003_canonical_fact_tables.sql`
- `lib/data-platform/persistence/postgres/migrations/004_governance_and_read_models.sql`

### Tests

- `workers/data-platform-tests/persistenceContractTypeChecks.ts`
- `workers/data-platform-tests/canonicalPersistenceIdentityChecks.ts`
- `workers/data-platform-tests/publicationStateChecks.ts`
- `workers/data-platform-tests/canonicalCommitContractChecks.ts`
- `workers/data-platform-tests/supersessionLineageChecks.ts`
- `workers/data-platform-tests/sqlMigrationChecks.ts`
- `workers/data-platform-tests/protectedScopeChecks.ts`
- `workers/data-platform-tests/runD2Phase1Suite.ts`

### Documentation

- `docs/architecture/canonical-persistence-governance-reinforcement.md`
- `docs/architecture/canonical-persistence-contracts.md`
- `docs/architecture/postgresql-schema-blueprint.md`
- `docs/architecture/sqlite-postgresql-parity.md`
- `docs/adr/ADR-008-canonical-persistence.md`
- `docs/project/d2-phase-1-implementation-report.md`

### Bounded correction

- `lib/data-platform/contracts/lineage.ts`: removed `SUPERSEDES` from the D1 lineage relationship vocabulary. Supersession now has a dedicated D2 contract and SQL relation.

No protected persistence, runtime, API, page, worker, package, lockfile, environment, or deployment file changed.

## Contract Inventory

Phase 1 defines Canonical Commit and command/result types, typed canonical fact unions, deterministic identities, Repository envelopes and versions, publication decisions and transitions, supersession, lineage, raw manifests, outbox, quarantine, conflicts, and SQLite parity results. The commit result is exhaustive across `SUCCESS`, `DUPLICATE`, `CONFLICT`, `REJECTED`, and `RETRYABLE_FAILURE`.

Canonical facts use typed domain fields and exact decimal strings in TypeScript. They do not carry generic payload JSON.

## Identity Rules

Business identity is an explicitly ordered dataset-specific tuple. Canonical Record ID is stable over corrections; record version is positive and monotonic. Provider identity is excluded for OHLCV and Funding, where venue/time defines the canonical observation, and included where provider semantics identify the observation. Commit ID is deterministic over idempotency key, record ID, version, and checksum, making retry identity stable.

## Migration Inventory and Dependency Order

1. `001`: ten schemas, immutable snapshots, raw manifests, Canonical Commits, and outbox.
2. `002`: Repository envelopes/versions, append-only publication decisions, supersession, lineage, and controlled state transition helper.
3. `003`: typed OHLCV, Funding, OI, Liquidation, Prediction, ETF, Reserve, Macro, and stream-manifest tables.
4. `004`: Quality, Coverage, Projection, Evidence, Consistency, and Quarantine tables.

All migrations are static and unapplied. No runner or database client was added.

## Transaction Boundary

The initial contract commits one record version at a time. One PostgreSQL transaction must validate bindings and raw verification, establish the version boundary, classify duplicate/conflict, and insert the commit, typed fact, envelope, version, required lineage, initial `PENDING` decision, and outbox event. Projection and Evidence refresh remain outside the transaction.

## Duplicate and Conflict Behavior

Same canonical record/version and checksum is `DUPLICATE`. Same canonical record/version with a different checksum is `CONFLICT`, preserving the raw candidate and requiring quarantine. A correction uses a greater version and independent commit. Concurrent corrections lock the predecessor; unique supersession constraints reject branching.

## Publication Model

Decision events are append-only and reconstruct full state. `record_versions.current_publication_state` is a controlled materialized projection. The SQL helper locks the record, validates one of six legal transitions, inserts a decision event, and updates current state atomically. Facts are never deleted to represent publication.

## Lineage and Supersession

Lineage is a strict DAG vocabulary from Raw Object through Fact and Projection to Evidence Packet. Local direction/self-edge checks exist in TypeScript and SQL; graph-wide cycle audit remains asynchronous. Supersession is a separate monotonic relation with unique predecessor and successor boundaries.

## Governance Bindings

Canonical commits and all typed facts require immutable dataset registry, provider registry, provider certification, policy, schema, and normalization references. SQL foreign keys reject unknown snapshot identities. No `latest` resolution exists.

## Role and Immutability Model

Architecture defines read-only application, bounded procedure-only writer, external canonical worker, and migration-owner roles. Runtime roles receive no deletion or arbitrary fact/history update privilege. Actual grants and credentials are intentionally deferred to Phase 2 integration review.

## SQLite Parity

The parity contract classifies legacy rows and requires semantic values, identities, versions, checksums, timestamps, publication state, pagination, and bounded Replay equivalence. Count equality alone cannot certify migration. No SQLite adapter or source data changed.

## Validation

| Check | Result |
|---|---|
| Git baseline and branch inspection | PASS |
| TypeScript `npx tsc --noEmit` | PASS |
| D2 Phase 1 contract suite | PASS |
| Legal publication transitions | PASS |
| Illegal transition rejection | PASS |
| Identity and commit determinism | PASS |
| Checksum-aware duplicate/conflict distinction | PASS |
| Positive and monotonic versions | PASS |
| Supersession and lineage separation | PASS |
| Immutable governance bindings | PASS |
| Migration filename/order uniqueness | PASS |
| Required schema/table inventory | PASS |
| Static SQL constraints and raw-byte exclusion | PASS |
| Prohibited-change scan | PASS |
| Protected-file review | PASS |
| Package and lockfile review | PASS |
| Live PostgreSQL connection | NOT RUN |
| SQL migration application | NOT RUN |
| PostgreSQL grammar/planner validation | NOT RUN |
| Production build | NOT APPLICABLE (`AGENTS.md` prohibits it) |

## Known Limitations

- Static SQL text checks do not replace applying migrations to an isolated PostgreSQL instance.
- Role grants, transaction behavior, procedure security, deadlock handling, and query plans remain unexecuted.
- Graph-wide cycle detection and consistency workers belong to later phases.
- Physical partitioning remains intentionally deferred until measured volume justifies it.
- No local SQLite dataset was migrated or sampled in Phase 1.
- The controlled publication helper requires live integration tests before certification.

## Blockers

No contract blocker remains. Phase 2 must stay isolated from production and current consumers until migration application, rollback, privileges, transaction atomicity, and conflict races pass against a disposable PostgreSQL database.

## Next Approval Gate

`SAFE TO IMPLEMENT PHASE 2 WITH LIMITATIONS`
