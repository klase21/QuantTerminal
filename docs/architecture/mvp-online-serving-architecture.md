# MVP Online Serving Architecture

Certification date: 2026-07-15
Status: local serving foundation certified; Neon publication deferred to MVP-7B.

## Decision

QuantTerminal uses a derived PostgreSQL serving plane. It is reproducible from the governed local truth plane but is not authoritative for Facts, Segments, Results, Evidence, lineage, or Projection supersession.

```text
LOCAL / BACKGROUND TRUTH PLANE
D2 Facts + D3 Segments + D4 Evidence/Projections
                  |
                  | explicit bounded publisher
                  v
ONLINE SERVING PLANE
immutable corpus + Projections + Evidence summaries
+ 84 materialized Replay snapshots + demo profiles
                  |
                  +--> pooled read-only PostgreSQL --> MVP APIs
                  +--> checksum-gated certified snapshot fallback
```

Request-time serving never opens canonical tables, Segment manifests, Parquet, Raw Artifacts, or population checkpoints. Farside retrieval, Evidence generation, and Replay materialization remain background publication concerns.

## Runtime dependency change

| Path | Prior runtime dependencies | `serving_postgres` dependencies | Missing-state behavior |
|---|---|---|---|
| `/api/mvp/projections` | D4 URL, Projection/dependency/exposure tables, compiled corpus checksum | reader URL, active serving corpus/exposure, immutable serving Projections | classified serving error; optional verified snapshot only by policy |
| `/api/mvp/replay-sequence` | all Projection dependencies plus canonical PostgreSQL, object root, Segment manifest, Parquet | reader URL and one immutable `serving_replay_sequence` row | `REPLAY_SNAPSHOT_MISSING` or checksum failure; no request-time reconstruction |
| `/api/health/mvp-serving` | none | selected serving mode and its integrity metadata | HTTP 503 when the serving gate is unhealthy |

### Failure matrix

| Missing or invalid dependency | HTTP | Internal state | Page impact | Snapshot allowed |
|---|---:|---|---|---|
| serving database/connectivity | 503 | `SERVING_CORPUS_UNAVAILABLE` | governed sections unavailable | only when explicit outage policy permits |
| expected corpus ID | 503 | `SERVING_CORPUS_UNAVAILABLE` | all governed reads fail closed | no |
| expected serving checksum | 503 | `SERVING_CORPUS_CHECKSUM_MISMATCH` | all governed reads fail closed | no |
| active exposure | 503 | `SERVING_CORPUS_UNAVAILABLE` | all governed reads unavailable | no |
| required Projection | 404 | `SERVING_PROJECTION_MISSING` | bounded section/request unavailable | no non-default substitution |
| Evidence summary | 503 | `SERVING_EVIDENCE_SUMMARY_MISSING` | Evidence detail unavailable | only exact bundled profile summary |
| Replay snapshot | 503 | `REPLAY_SNAPSHOT_MISSING` | Replay-only failure | exact primary/backup bundle only |
| Replay checksum | 503 | `REPLAY_SNAPSHOT_CHECKSUM_MISMATCH` | Replay fails closed | no |
| fallback bundle | 503 | `CERTIFIED_SNAPSHOT_CHECKSUM_MISMATCH` | fallback rejected | no |
| primary/backup profile | 503 | `SERVING_DEMO_PROFILE_MISSING` | default route gate unhealthy | no |
| D4 URL in serving process | no effect | not read | none | not applicable |
| canonical URL/object root/Parquet in serving process | no effect | not read | none | not applicable |

## Serving schema

PostgreSQL 16 migrations live in `lib/data-platform/mvp-serving/migrations` and create:

- `serving.serving_corpus`
- `serving.serving_projection`
- `serving.serving_evidence_summary`
- `serving.serving_replay_sequence`
- `serving.serving_demo_profile`
- `serving.serving_exposure`
- `serving.serving_release_inventory`
- `serving.serving_publication_event`
- `serving_control.migration_ledger`

Content tables are append-only through immutable update/delete triggers. Corpus activation and all record insertion occur in one serializable transaction. Migration checksums reject applied-file drift.

## Publication workflow

Local MVP-7A commands use only `MVP_SERVING_ISOLATED_POSTGRES_URL` and the exact database `quantterminal_mvp_serving_isolated`:

```powershell
npx tsx workers/data-platform/runMvpServing.ts migrate
npx tsx workers/data-platform/runMvpServing.ts publish
npx tsx workers/data-platform/runMvpServing.ts verify
npx tsx workers/data-platform/runMvpServing.ts status
npx tsx workers/data-platform/runMvpServing.ts checksum
npx tsx workers/data-platform/runMvpServing.ts reset --confirm-isolated
```

The publisher verifies the certified source corpus, verifies all eligible Projection checksums, inventories all three supplemental versions, excludes the superseded conflicted Macro version, materializes 84 Replay windows, builds 84 Evidence summaries and two demo profiles, calculates a deterministic release digest, and atomically activates the corpus. An exact rerun records `DUPLICATE` and creates no duplicate authoritative row.

The local database and roles are an administrator bootstrap prerequisite. Create the two `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION` roles with environment-supplied passwords, create `quantterminal_mvp_serving_isolated` owned by the publisher, and grant the reader CONNECT only before applying migrations. Never place passwords in SQL files, command history, or reports.

## Replay materialization

Each `serving_replay_sequence` row retains the source Projection identity/checksum/dependency digest, exact UTC window, Knowledge Time, 288 OHLCV points, 288 OI points, three provider-native Funding events, 48 deterministic 30-minute AggTrades buckets, sequence summary, limitations, model checksum, and snapshot checksum.

Publication may read certified canonical storage and Parquet. Online serving may not. OI is not forward-filled, Funding is not interpolated, and raw AggTrades are not placed in the browser payload.

## Serving modes

`MVP_SERVING_MODE` is explicit:

- `serving_postgres`: local isolated reader for MVP-7A; pooled reader in MVP-7B/7C.
- `certified_snapshot`: explicit immutable fallback, labeled `CERTIFIED_SNAPSHOT`.
- `local_truth`: explicit local development/publication verification only.

Production fails closed when the mode is missing. It never silently falls back to local truth.

Additional contract variables:

- `MVP_SERVING_ISOLATED_POSTGRES_URL`: MVP-7A local database only.
- `MVP_SERVING_POSTGRES_URL`: reserved pooled read-only Neon/Vercel connection.
- `MVP_SERVING_PUBLISHER_POSTGRES_URL`: reserved direct publisher connection.
- `MVP_SERVING_EXPECTED_CORPUS_ID`
- `MVP_SERVING_EXPECTED_CHECKSUM`
- `MVP_SERVING_FALLBACK_POLICY=certified_snapshot_on_unavailable` when explicitly approved.

No connection string is logged or included in deterministic identity.

## Certified snapshot

The server-only bundle contains active corpus/exposure metadata, 59 default-route Projections, the eligible Macro and ETF Projections, primary and backup demo profiles, their two Evidence summaries, and their two Replay snapshots. It excludes full history, canonical Facts, Raw Artifacts, Parquet, credentials, local paths, and the other 82 Replay snapshots.

The bundle is accepted only when its canonical bundle checksum, contained Projection checksums, Replay snapshot checksums, expected corpus ID, and expected serving checksum verify. Non-default missing requests fail closed. Snapshot responses are never labeled live.

## Roles

`mvp_serving_publisher` owns migrations/publication but has no D2/D3/D4 permissions. `mvp_serving_reader` has CONNECT plus serving-schema USAGE/SELECT only, uses read-only transactions, and cannot INSERT, UPDATE, DELETE, run DDL, create roles, or read D4 truth.

## Measured local footprint

- PostgreSQL database: 20,175,895 bytes (20.18 MB, 19.24 MiB).
- serving/control relations: 12,009,472 bytes (12.01 MB, 11.45 MiB).
- indexes: 1,114,112 bytes (1.11 MB, 1.06 MiB).
- JSONB Projection payload: 1,006,428 bytes.
- JSONB Replay payload: 4,977,238 bytes.
- JSONB Evidence fields: 194,290 bytes.
- certified snapshot bundle: 1,075,396 bytes (1.08 MB, 1.03 MiB).

The initial managed allocation remains 5 GB or the provider minimum. Planning growth is 0.12 GB/month expected and 0.15 GB/month high (1.44/1.80 GB annually). This is independent of the 428-993 GB full-history storage forecasts.

## MVP-7B and MVP-7C

MVP-7B should apply the same checksummed migrations to Neon PostgreSQL 16 using the direct publisher role, publish the identical corpus, verify counts/checksums/roles, and record the managed relation sizes. MVP-7C should configure Vercel with only the pooled reader URL, explicit mode, expected corpus ID/checksum, and approved fallback policy. Vercel must never receive publisher, D2/D3/D4, object-root, or population credentials.

Rollback is an append-only serving exposure decision to the prior certified corpus or an explicitly configured certified snapshot. It does not delete versions, change D2 publication, or invoke local truth.
