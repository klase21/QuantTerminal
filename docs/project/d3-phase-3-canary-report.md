# D3 Phase 3 OHLCV Canary Report

## Status

`NOT RUN - D3 MIGRATION BLOCKED`

The integrated target preflight passed for `localhost:55432/quantterminal_backfill` with distinct D2 and D3 owners. The durable object root passed its path, write, and capacity checks with 667807363072 bytes free. Credentials remained redacted.

D2 migrations `001` through `004` applied and reran as checksum-verified skips. D3 migration `001_population_control_plane.sql` applied, creating the Population control plane and all 16 expected validated D3-to-D2 foreign keys. D3 migration `002_population_roles.sql` failed with `permission denied to create role`; it has no ledger entry and no role grants survived its transaction. Temporary database and shared-schema `CREATE` privileges were revoked.

The task stopped before provider access because the approved instructions prohibit Canary execution after a migration failure. No source request, archive download, filesystem artifact, D3 record, D2 fact, lineage, publication, Coverage, checkpoint, or terminal Unit was created.

## Measured Counts

| Measure | Count |
|---|---:|
| Jobs | 0 |
| Runs | 0 |
| Units | 0 |
| Source requests | 0 |
| Downloaded bytes | 0 |
| Raw Artifacts | 0 |
| D2 Raw Objects | 0 |
| Retrievals | 0 |
| Rows parsed | 0 |
| Candidates accepted | 0 |
| Candidates rejected | 0 |
| Validation outcomes | 0 |
| Canonical Facts created | 0 |
| Canonical Facts reused | 0 |
| Conflicts | 0 |
| Submission links | 0 |
| Lineage links | 0 |
| Publication decisions | 0 |
| Coverage records | 0 |
| Checkpoints | 0 |
| Retries | 0 |

## Source-To-Canonical Validation

Not run. Beginning, middle, and end rows do not exist because the real archive was not requested.

## Idempotency, Correction, And Recovery

- Real partition rerun: not run.
- Durable V1/V2 correction test: not run.
- Canary failure injection: not run.
- Unknown-write-outcome recovery: not run.
- Persisted Canary reconciliation: not run.

Fixture-level D2/D3 duplicate, correction authorization, and unknown-target behavior remain passing, but they are not real-data Canary evidence.

## Manifest Binding

- Manifest ID: `bfm_ed9bd2fc2a4385017a4ce546733c19a3007fe7af541ab4827eb857c530e35aae`
- Manifest checksum: `ed9bd2fc2a4385017a4ce546733c19a3007fe7af541ab4827eb857c530e35aae`
- Frozen cutoff: `2026-07-12T00:00:00.000Z`
- Executable partitions: `0`
- Blocked partitions: `6`
- Blocking boundary: `D3P3-B06`, incomplete D3 role migration and privilege certification

## Required Remediation

The temporary `CREATEROLE` attempt was executed and revoked, but the unchanged migration then failed on `REVOKE ALL ON ALL TABLES IN SCHEMA control FROM PUBLIC`. The D3 owner cannot administer privileges on D2-owned tables in the mixed-owner `control` schema. SQLSTATE was `42501`; the transaction left no ledger row or partial grants.

The next remediation is an additive administrator-only migration runner that executes the complete unchanged artifact and ledger insert atomically without storing administrator credentials in application configuration. Only after its rerun and role reconciliation pass may the real one-partition Canary begin.

## Final Enablement Certification - 2026-07-13

The earlier blocked result above remains the historical record. The bounded administrative runner subsequently applied unchanged migration `002_population_roles.sql`; ledger and role reconciliation passed before the first provider request.

### Real Source

- Provider: Binance Vision
- Venue: Binance USD-M Futures
- Instrument: `BTCUSDT`
- Dataset/resolution: OHLCV `5m`
- UTC partition: `2026-07-11`
- Source object: `BTCUSDT-5m-2026-07-11.zip`
- Downloaded bytes: `13010`
- SHA-256: `b817f60117a855d9d9b440ea26152f0318ba1654e3d69e2c481fd2f746343833`
- Durable Raw Object: `raw_b817f60117a855d9d9b440ea26152f0318ba1654e3d69e2c481fd2f746343833`

### First Execution

| Object | Measured count |
|---|---:|
| Jobs / Runs / Units | 1 / 1 / 1 |
| Raw Artifacts / D2 Raw Objects | 1 / 1 |
| Retrievals | 1 |
| Rows parsed / accepted / rejected | 288 / 288 / 0 |
| Candidates / validation outcomes | 288 / 288 |
| Canonical Facts created | 288 |
| Conflicts | 0 |
| Submission links / D2 outcomes | 288 / 288 |
| Lineage edges | 288 |
| Initial PENDING publication decisions | 288 |
| Coverage eligibility decisions | 1 |
| Checkpoints | 3 |
| Retries | 0 |

Job, Run, Unit, and lineage-cycle reconciliation all returned consistent. The Unit reached its governed terminal state only after the canonical checkpoint and Coverage decision existed.

### Source-To-Canonical Samples

| Position | Open time | OHLCV | Volume | Result |
|---|---|---|---|---|
| Beginning | `2026-07-11T00:00:00.000Z` | `64129.50 / 64137.10 / 64045.40 / 64066.00` | `613.635` | Exact match, Fact version 1, lineage 1 |
| Middle | `2026-07-11T12:00:00.000Z` | `64176.10 / 64200.00 / 64176.00 / 64181.70` | `92.540` | Exact match, Fact version 1, lineage 1 |
| End | `2026-07-11T23:55:00.000Z` | `63861.20 / 63872.10 / 63776.00 / 63783.00` | `663.689` | Exact match, Fact version 1, lineage 1 |

All samples retained UTC 5-minute boundaries, provider/dataset identity, deterministic Candidate identity, canonical record identity/version, and the Raw Artifact lineage reference. Decimal strings matched exactly; no row was silently coerced.

### Exact Rerun

The source was requested again and produced the same checksum. Raw Object registration returned `DUPLICATE`; all 288 Candidates, Canonical Facts, and submission references returned duplicate outcomes. Every persisted count remained unchanged: 1 Raw Object, 288 Facts, 288 lineage edges, 1 Job, 1 Run, 1 Unit, 1 Retrieval, 288 Candidates, 288 submissions/outcomes, 1 Coverage decision, and 3 checkpoints. No conflict or duplicate authoritative object was created.

### Manifest Result

- Manifest ID: `bfm_ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24`
- Manifest checksum: `ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24`
- Approval: `APPROVED_WITH_BLOCKERS`
- Enumerated OHLCV partitions: 6 executable, 0 blocked
- Remaining blockers: non-OHLCV provider/domain work and explicitly deferred D3 Phase V certification

### Validation After Final Enablement

- TypeScript (`npx tsc --noEmit --incremental false`): PASS
- D1 contract regression: PASS
- D2 Phase 1: PASS
- D2 Phase 2 unit: PASS
- D2 durable boundary and integrated migration rerun: PASS
- D3 Phase 1: PASS
- D3 Phase 2 unit: PASS
- D3 Phase 3 enablement: PASS
- D3-to-D2 commit boundary: PASS
- Integrated topology: PASS
- Administrative migration apply/inspect and ordinary rerun: PASS
- Essential live role denial probes: PASS (`42501`)
- Live FK and ownership reconciliation: PASS
- Filesystem immutable Artifact suite: PASS
- Real canary and exact rerun: PASS
- Persisted count and source-to-Canonical reconciliation: PASS
- Manifest source/file parity: PASS
- `git diff --check`: PASS (line-ending warnings only)
- Package, lockfile, environment-file, protected consumer, and D4 scope review: PASS, unchanged by this task

The exhaustive crash matrix, unknown-write timing permutations, full role graph, large-scale performance, Gap Repair, final Coverage certification, and non-OHLCV providers remain deferred to D3 Phase V as instructed.
