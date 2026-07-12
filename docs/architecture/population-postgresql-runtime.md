# Population PostgreSQL Runtime

The isolated D3 runtime lives under `lib/data-platform/population/postgres`. It is never initialized on import and accepts only an explicit connection string that passes D3 target classification and differs from application and D2 isolated URLs.

The migration runner discovers only the D3 migration order, hashes each file, records checksums in `control.population_migration_ledger`, skips identical reruns, and rejects changed applied artifacts. D2 `control`, `raw`, `quality`, `coverage`, and `quarantine` dependencies must already exist on the disposable D3 target.

Reset requires `RESET_D3_ISOLATED_DATABASE` and removes only D3 objects from the target. The test harness may reset and bootstrap D2 schemas in the disposable D3 database; it never uses `D2_ISOLATED_POSTGRES_URL`.

The adapter exposes bounded methods rather than arbitrary SQL: Job/Run/Unit creation, claims, heartbeat, checkpoints, Retrieval Attempts, typed Candidates, validation/quality links, submissions, outcomes, retries, cancellation, aggregation, eligibility, resume reads, and reconciliation.

No D3 migration was applied in Phase 2 because `D3_ISOLATED_POSTGRES_URL` was absent.
