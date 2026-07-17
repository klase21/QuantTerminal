# MVP Live Local Adapter Bootstrap

## Boundary

`createLiveResumeEnvironmentFromProcessEnv` is the sole worker bootstrap for the bounded live-resume coordinator. The worker supplies the exact interval and certified planner identity; it never supplies individual adapters. The factory owns construction and disposal of integrated durable D2/D3, isolated D4, refresh-control, serving-publisher, and bounded object-storage clients.

The factory supports `INSPECT`, `PREFLIGHT`, `CERTIFICATION`, and `LIVE`. Inspection opens no connections. Preflight admits only verified local database and role identities and performs disposable transaction and object-store probes. Certification permits fixture or rollback work. Live construction remains behind the coordinator's explicit confirmation gate.

## Composition

The archive executors delegate to the existing bounded OHLCV, Open Interest, and AggTrades parsers and Segment builder. Funding delegates to the provider-native bounded REST parser. Every executor persists immutable Raw Artifact metadata, D3 Candidates, and attributable D2 canonical output. BTCUSDT OHLCV remains authoritative-reuse-only.

The downstream composition uses bounded D2 window reads, D4 Consistency and Evidence persistence, bounded Projection persistence, Replay materialization, and local serving candidate assembly. Inputs are explicit identities and checksums from the coordinator checkpoints. Candidate assembly exposes no activation operation and remains `WITHHELD` and `INTERNAL_ONLY`.

## Failure And Disposal

Database and role mismatches fail before writable ports are returned. Partial construction closes resources in reverse order. Preflight database writes are rolled back, the object probe is removed, and no target-day unit or payload is acquired. Diagnostics are restricted to stable classifications and sanitized SQLSTATE.

The durable D2/D3 topology is the certified integrated profile: `D2_CANONICAL_POSTGRES_URL` and `D3_POPULATION_POSTGRES_URL` resolve to `quantterminal_backfill` under distinct `qt_d2_backfill_owner` and `qt_d3_backfill_owner` roles. `D3_BACKFILL_OBJECT_ROOT` is the durable local object root. The isolated D2/D3 variables remain certification-only and cannot satisfy live durable preflight.

D4 remains on `D4_ISOLATED_POSTGRES_URL`; refresh and inactive candidate serving remain on their isolated targets. The authenticated no-write preflight passed this hybrid topology. No repository code reconstructs credentials, creates roles, changes grants, selects a substitute target, or exposes activation.
