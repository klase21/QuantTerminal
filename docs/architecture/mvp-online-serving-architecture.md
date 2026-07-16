# MVP Online Serving Architecture

Certification date: 2026-07-16
Status: MVP-7D Production serving active and post-cutover certified.

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

## Managed publication and MVP-7C

MVP-7B published the identical certified corpus to Neon PostgreSQL 16. The direct configured credential is accepted only by the managed bootstrap boundary. It creates or rotates independent `mvp_serving_publisher` and `mvp_serving_reader` credentials in memory, applies migrations as the publisher, publishes atomically, and certifies reads and mutation denial as the reader. Connection values and generated passwords are never included in output or deterministic identity.

Runtime selection prefers `MVP_SERVING_POSTGRES_URL` when explicitly configured and otherwise retains the local isolated reader for development. The MVP-7C Git-backed Vercel Preview verifies the pooled reader through successful corpus/checksum/count/Replay reads in `SERVING_POSTGRES` mode. Vercel receives no publisher, D2/D3/D4, object-root, or population credentials.

The deployed topology is intentionally split: requests enter through the Seoul edge (`icn1`), while Node functions execute in Singapore (`sin1`) alongside Neon PostgreSQL in Singapore. This is classified `APPROVED_EDGE_FUNCTION_REGION_SEPARATION`; no function-region change is required by MVP-7C.

The isolated `CERTIFIED_SNAPSHOT` drill used a temporary Git branch pointer at the same committed source SHA and a branch-only `MVP_SERVING_MODE` override. Deployment `dpl_22JtotjbMQsEgrQWMXyGXJ4EKUEf` served the immutable 59-Projection bundle, both Evidence summaries, both Replay snapshots, and both demo profiles with checksum `9296a664d244482f37a4eef079335b219fc7e67e8311c25118ee44ab18e32ab3`. All six default routes returned HTTP 200; primary and backup Replay each returned 288 price, 288 OI, three discrete Funding, and 48 flow samples; unsupported Replay failed closed. The override and temporary local/remote branches were removed after certification without changing the primary Preview or Production.

Replay correctly exposes 10 eligible Projections: the governed Replay view set plus both eligible supplemental contexts, Macro and Bitcoin ETF Flow. The prior expectation of 9 omitted the ETF Projection and is superseded; no serving row or checksum changed.

The first request observed immediately after the isolated deployment reached READY took 3297.6 ms and is recorded as `FIRST_OBSERVED_INVOCATION`. It includes Vercel CLI/project lookup overhead and is not asserted to be a guaranteed platform cold start. The absence of a provably isolated infrastructure cold-start measurement remains a measurement limitation, not a functional Production blocker.

Measured Neon size is 19,783,680 bytes total, with 11,993,088 bytes of serving/control relations and 1,114,112 bytes of indexes.

Rollback is an append-only serving exposure decision to the prior certified corpus or an explicitly configured certified snapshot. It does not delete versions, change D2 publication, or invoke local truth.

## MVP-7D Production cutover

On 2026-07-15, Vercel rebuilt certified Preview deployment `dpl_9KTDZtLyDA9Cz24ZNHMtEHS9w5Bs` for Production through the existing-deployment redeploy boundary. The resulting Production deployment is `dpl_9aBTrz4w29fg7EL94vuvwhAdARRX`, built from runtime source `9017dcf4e50e8caeddbd146070c800480e3a06d1`. No dirty local source was packaged.

The public application domain is `https://quantterminalai.vercel.app`. Vercel also assigned the project and branch aliases through its normal Production mechanism; those platform aliases remain subject to Vercel authentication policy. Requests enter through Seoul (`icn1`), while Functions and Neon execute in Singapore (`sin1` / AWS Singapore), preserving `APPROVED_EDGE_FUNCTION_REGION_SEPARATION`.

Production health certifies `SERVING_POSTGRES`, the pooled read-only serving role, corpus `mvp-serving-corpus:129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949`, checksum `129fb3614df294abb3b7d0a66b3a3ee0036d560c6e0c45cc52a7ba60d8b48949`, 870 Projections, 84 Evidence summaries, 84 Replay snapshots, two demo profiles, three release-inventory records, and one active exposure. Request-time canonical databases, Segment manifests, Parquet, Raw Artifacts, and publisher credentials remain absent.

The prior READY Production deployment `dpl_Bmkcfuk9FAZT7VQ9thzi3yr7nonR` remains the platform rollback target. Rollback was not required. A Production rollback changes the active Vercel deployment only; it does not mutate Neon or canonical truth.

## MVP-8A refresh and release foundation

Production remains in explicit pinned-corpus mode. MVP-8A adds a backward-compatible, opt-in release-channel resolver but does not change runtime defaults or Vercel variables. A channel release must carry a checksummed manifest linked to its predecessor and must verify corpus checksum, schema, counts, and exposure before reads are admitted. Candidate manifests are local and inactive; Preview and Production channel records are prohibited in MVP-8A.

Incremental operational state belongs to the separate local `quantterminal_mvp_refresh_isolated` control plane. It has no Neon or canonical write authority. See `docs/architecture/mvp-refresh-and-release-channel.md` for window, watermark, fencing, and scheduler contracts.

The MVP-8A continuation certified root/Node-child inheritance and the same-factory local connection without URL reconstruction or credential override. The isolated refresh schema now has checksummed migration, relation, constraint, lease, fencing, checkpoint, crash-recovery, and capacity evidence. This certification did not change the Production serving plane, Neon corpus, Vercel configuration, or pinned-corpus behavior.

MVP-8A.1 adds an isolated bounded Funding adapter over Binance official REST. It preserves exact provider timestamps and rates, stores exact-byte SHA-256 provenance, uses existing Candidate and canonical Funding contracts, and persists fenced checkpoints and per-instrument watermarks. The compatibility Funding runner and its operational progress file remain untouched. The primary day was not yet finalized during certification, so Production and the serving corpus remain unchanged.
