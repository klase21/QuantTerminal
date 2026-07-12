# Population Verification Suite

## Unit Suite

`tests/data-platform/population/postgres/runUnitSuite.ts` validates isolated-target safety, D2 URL rejection, deterministic Unit expansion, immutable object behavior, Candidate identity, fixture normalization binding, deterministic fake D2 behavior, and conflict/cancellation watermark blocking.

## Integration Suite

`runIsolatedIntegrationSuite.ts` requires `D3_ISOLATED_POSTGRES_URL`. It bootstraps D2 dependencies only inside that disposable target, applies D3 migrations, checks rerun behavior, Job deduplication and intentional rerun, deterministic expansion, real parallel claims, stale heartbeat rejection, resumable work, and initial reconciliation.

The integration suite does not contact providers or object storage. The current environment lacked the D3 URL, so it returned `BLOCKED` before creating a client.

## Remaining Certification Work

Live execution must expand coverage before Phase 3: checksum-change rejection, reset/reapply, lease expiry/reclaim, stale checkpoint/completion, all checkpoint stages, all Retrieval outcomes, typed Candidate conflict, validation/quality reconstruction, D2 outcome variants, retry/cancellation races, full partial aggregation, crash injection, privilege denial, full reconciliation, and bounded `EXPLAIN` review.

Static checks cannot certify PostgreSQL syntax, locking, privileges, or query plans.
