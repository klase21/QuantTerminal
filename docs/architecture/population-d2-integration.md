# D3 to D2 Canonical Commit Integration

## Bounded Port

`createD3ToD2CanonicalCommitPort` accepts the certified D2 `CanonicalPersistenceAdapter`. For each Candidate command it registers the verified `RawObjectManifest`, reads the exact latest immutable version boundary, and either returns the existing duplicate reference, fails closed, or submits one bounded commit. D3 performs no direct D2 table writes and preserves D2 duplicate, conflict, transaction, lineage, publication, and outbox outcomes.

## Durable Non-Production Factory

`createDurableCanonicalPostgresClientFromEnvironment` reads only `D2_CANONICAL_POSTGRES_URL`. The target must be one of `quantterminal_d2_backfill`, `quantterminal_d2_nonprod`, or `quantterminal_d2_development`. Certification, system, and production-like targets fail closed. The implementation reuses the certified D2 pool, transaction, retry, outbox, and graceful-shutdown path rather than introducing a second persistence runtime.

The existing D2 client has bounded connection and idle timeouts but no explicit statement, lock, or idle-in-transaction timeout settings. This block does not invent new timeout values. Durable schema/role certification must confirm server- or role-level values before the canary.

## Latest Version and Correction Planning

`readLatestCanonicalVersion` requires canonical record ID, dataset ID, business identity, and provider ID. It orders by immutable record version, not insertion time, and returns bounded governance, checksum, publication, and supersession metadata. Identity-dimension disagreement returns `CONFLICT`; invalid requests and unavailable targets remain distinct.

Provider correction planning is explicit. Identical content returns `DUPLICATE` without a new commit. Changed content advances exactly one version only when `ALLOW_PROVIDER_CORRECTION` is selected; otherwise it fails closed. The correction retains a predecessor reference and rebuilds deterministic commit and lineage identities. Unknown target outcomes remain retryable through the original idempotency boundary.

## Current Operational State

The public boundary is implemented and verified on the D2 isolated certification target. The prior separate durable targets are configured and authenticate, but they do not satisfy the committed foreign-key topology. The integrated database is not yet configured, so no durable schema, role, canary, or historical Fact has been certified.

## Integrated Backfill Topology

The committed D3 schema has physical foreign keys to D2-owned Raw Artifact, governance, Canonical Commit, and quarantine objects. Durable backfill therefore uses one physical database, `quantterminal_backfill`, with distinct D2 and D3 login roles and object ownership. D3 still commits facts only through `CanonicalPersistenceAdapter`; physical locality permits database-local references but grants no direct D3 fact-table mutation.

The `INTEGRATED_BACKFILL` target profile requires both URLs to use the same host, port, and database while retaining the exact distinct roles `qt_d2_backfill_owner` and `qt_d3_backfill_owner`. Dedicated and isolated profiles retain their previous rules.
