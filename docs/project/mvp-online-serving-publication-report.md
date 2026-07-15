# MVP Online Serving Publication Report

Date: 2026-07-15
Scope: deterministic publication to the existing Neon PostgreSQL 16 project. Vercel was not configured.

## Outcome

Neon contains active serving corpus `mvp-serving-corpus:129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949` with serving checksum `129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949`. Its source corpus checksum remains `3f33e07c45a8814ac531ee707e8744654d3ae8dfcc84e44fcbc1e792a92824ab`.

The first managed publication returned `CREATED`. The immediate exact publication returned `DUPLICATE`, creating no duplicate authoritative Projection, Evidence summary, Replay snapshot, profile, inventory, or exposure row.

## Migrations and roles

The two checksummed PostgreSQL 16 serving migrations are installed. A subsequent managed reverification returned `SKIPPED` for both migration IDs.

`mvp_serving_publisher` performs migration/publication work. `mvp_serving_reader` has serving-schema USAGE and SELECT only. Direct reader certification passed SELECT and denied INSERT, UPDATE, DELETE, and DDL. The reader is not superuser and cannot create databases or roles.

The configured direct URL was used only by the bounded publisher/bootstrap workers. Its value and the generated role passwords were never printed, persisted, or documented. The reader password used for certification was ephemeral and must be rotated during MVP-7C before creating the pooled runtime URL.

## Release selection

- Preserved: 868 certified crypto Projections.
- Included: latest checksum-valid `MacroContextProjection`.
- Included: checksum-valid `BitcoinEtfFlowProjection`.
- Excluded: superseded Macro version, disposition `EXCLUDED_SUPERSEDED_IMMUTABLE_CONFLICT`.
- Multiple eligible supplemental identities: none.

The excluded D4 Projection was not updated, deleted, overwritten, or repaired.

## Replay and Evidence

All 84 Replay snapshots contain exactly 288 OHLCV observations, 288 OI observations, three provider-native Funding events, and 48 deterministic 30-minute AggTrades buckets. All 84 model checksums are distinct and verified. Primary and backup model checksums match the local certification.

All 84 Evidence summaries retain verified Facts, separate Interpretation, supporting Evidence, counter Evidence, Confidence, Coverage, limitations, source Projection identity, and deterministic checksum.

## Exact managed footprint

- Neon database: 19,783,680 bytes (19.78 MB, 18.87 MiB).
- Serving/control relations: 11,993,088 bytes (11.99 MB, 11.44 MiB).
- Indexes: 1,114,112 bytes (1.11 MB, 1.06 MiB).
- Certified fallback: 1,075,396 bytes with checksum `9296a664d244482f37a4eef079335b219fc7e67e8311c25118ee44ab18e32ab3`.

Full-history Raw Artifacts, ZIPs, canonical databases, and Parquet were not uploaded.

## Consumer and health verification

The managed read port returned `AVAILABLE` for Dashboard, Markets, Scanner, Trade, Research, and Replay. Primary and backup profiles, their Replay snapshots, the primary Evidence summary, active exposure, corpus checksum, and record counts all verified. Health returned `HEALTHY`.

The APIs already select `MVP_SERVING_POSTGRES_URL` when `MVP_SERVING_MODE=serving_postgres`; that pooled variable remains intentionally unconfigured until MVP-7C. Serving-mode requests do not require D4, canonical PostgreSQL, the D3 object root, or Parquet.

## Commands

```powershell
npx tsx workers/data-platform/runMvpServingNeon.ts publish-and-certify
npx tsx workers/data-platform/verifyMvpServingNeon.ts
npx tsc --noEmit
npx tsx tests/data-platform/mvp-serving/runUnitSuite.ts
```

Environment values are intentionally omitted.

## Next boundary

MVP-7C must rotate the reader secret, create the pooled reader URL, configure Vercel with only runtime-safe variables, verify production headers/health, exercise the certified fallback, and confirm the direct publisher credential is absent from Vercel.
