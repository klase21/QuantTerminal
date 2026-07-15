# MVP Online Serving Publication Report

Date: 2026-07-15
Scope: local isolated MVP-7A certification only. Neon and Vercel were not accessed.

## Outcome

The explicit publisher created `mvp-serving-corpus:129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949` with serving checksum `129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949`. Its source is the certified Projection corpus checksum `3f33e07c45a8814ac531ee707e8744654d3ae8dfcc84e44fcbc1e792a92824ab`.

The atomic publication contains 870 Projections, 84 Evidence summaries, 84 Replay snapshots, two demo profiles, three supplemental inventory rows, one active exposure, and one initial publication event. The mandatory exact rerun returned `DUPLICATE`; it added one append-only duplicate audit event and no duplicate authoritative record.

## Release selection

- Preserved: all 868 certified crypto Projections.
- Included: latest checksum-valid `MacroContextProjection`.
- Included: checksum-valid `BitcoinEtfFlowProjection`.
- Excluded: superseded Macro version with `IMMUTABLE_PROJECTION_CONTENT_MISMATCH`, disposition `EXCLUDED_SUPERSEDED_IMMUTABLE_CONFLICT`.
- Multiple eligible supplemental identities: none.

The exclusion is publication metadata only. The D4 row was not updated, deleted, or repaired.

## Replay and Evidence

Every one of the 84 Replay windows contains exactly 288 OHLCV points, 288 OI observations, three provider-native Funding events, and 48 30-minute AggTrades buckets. The materialized JSONB payload is 4,977,238 bytes; serialized API responses remain 10,030,198 bytes. No online Replay request accesses canonical tables or Parquet.

All 84 Research projections produced serving Evidence summaries retaining verified Facts, separate Interpretation, supporting Evidence, counter Evidence, Confidence, Coverage, limitations, source Projection identity, and deterministic checksum.

## Local database and roles

The disposable PostgreSQL 16 database is `quantterminal_mvp_serving_isolated`. Total database size is 20,175,895 bytes. Serving/control relations use 12,009,472 bytes, including 1,114,112 bytes of indexes.

The publisher applied and reapplied the checksummed migrations, and migration drift failed closed. The reader passed all required SELECTs and was denied INSERT, UPDATE, DELETE, DDL, and D4 reads. The publisher was also denied D4 reads under its serving identity.

## Runtime certification

A local Next.js process ran with `MVP_SERVING_MODE=serving_postgres` while D4, D2/D3, and `D3_BACKFILL_OBJECT_ROOT` were explicitly blank. Dashboard, Markets, Scanner, Trade, Research, Replay, the materialized Replay API, and serving health all passed. Research and Replay direct entries preserved their deterministic default-context redirects and resolved to HTTP 200.

The same process then ran in `certified_snapshot` mode with no database or truth-plane URL. Default Dashboard, Markets, Scanner, Trade, primary Replay, and health passed. A non-default missing Replay request failed closed as `SERVING_PROJECTION_MISSING`.

## Reproduction

```powershell
npx tsc --noEmit
npx tsx tests/data-platform/mvp-serving/runUnitSuite.ts
npx tsx workers/data-platform/runMvpServing.ts migrate
npx tsx workers/data-platform/runMvpServing.ts publish
npx tsx workers/data-platform/runMvpServing.ts verify
npx tsx workers/data-platform/certifyMvpServing.ts
```

The environment variable values are intentionally omitted. Publication and reader connection strings must never be logged.

## Next boundary

MVP-7B may apply these same migrations and publisher output to Neon PostgreSQL 16 in AWS Singapore using a direct publisher role, then certify a separate pooled read-only role. MVP-7C may configure Vercel only after the Neon corpus identity, checksum, role denial, health endpoint, and fallback drill pass.
