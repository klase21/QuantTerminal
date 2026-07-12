# Canonical PostgreSQL Runtime

## Scope

The D2 runtime is isolated under `lib/data-platform/persistence/postgres`. It is not imported by current APIs, pages, workers, Repository adapters, Coverage, Projection, Evidence, or historical backfill.

## Connection Lifecycle

`createIsolatedPostgresClient` accepts an explicit connection string, role intent, bounded connection count, connect timeout, idle timeout, and application name. It rejects targets without an isolated/test/preview marker and rejects production-looking targets. It never reads `DATABASE_URL` or chooses an environment implicitly.

The client supports explicit `READ COMMITTED` transactions and explicit shutdown. The integration harness is the only Phase 2 code that reads `D2_ISOLATED_POSTGRES_URL`. Credentials are redacted to host/database in safety diagnostics.

Role intents are `MIGRATION_OWNER`, `CANONICAL_WRITER`, `BOUNDED_WRITER`, and `READ_ONLY`. A single isolated credential may physically perform all test setup, but each logical privilege remains independently defined and testable through PostgreSQL roles.

## Migration Lifecycle

The migration runner discovers only the four approved Phase 1 files, validates names and unique numbers, hashes exact bytes with SHA-256, and executes migrations sequentially. Each migration and its ledger insert share one transaction. Applied checksums are immutable; a changed applied migration stops the run.

Migration reset is not canonical-data rollback. The reset helper drops only the ten D2 schemas and isolated D2 roles, requires `MIGRATION_OWNER` intent and the exact opt-in `RESET_D2_ISOLATED_DATABASE`, and is additionally protected by target inspection at client creation. Nothing runs on import or application startup.

## Adapter Boundary

`CanonicalPersistenceAdapter` is not `PersistenceRepository`. It exposes bounded snapshot/manifest registration, one-record canonical commit, record/version reads, controlled publication transitions, lineage/outbox/quarantine reads, graph verification, and reconciliation. It exposes no arbitrary SQL or generic JSON fact writer.

Nine typed writers target OHLCV, Funding, OI, Liquidation, Prediction, ETF, Reserve, Macro, and stream manifests. AggTrade and Orderbook bytes remain outside PostgreSQL.

## Deployment Boundary

Phase 2 is local/external-test infrastructure. Migrations, resets, concurrency tests, and reconciliation must not run in Vercel requests. Future bounded serverless reads should use a pooled URL; migrations and canonical writes require a direct or worker-compatible connection. Preview and Production databases remain separate. No current deployment configuration changes in D2.
