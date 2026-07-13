# D3 Phase 3 Enablement Report

> Historical note: this report records the earlier blocked enablement state. The additive D2 commit boundary was subsequently implemented; see `d3-phase-3-commit-enablement-report.md`. Durable targets remain absent and the real canary remains not run.

## Baseline

- Branch: `epic/d2-canonical-persistence`
- Baseline HEAD: `d1c8dcc77c38fca13d6e05588a442ddedfb5457c`
- Initial staged files: none
- Inherited work: nine modified tracked D4 files and 78 untracked D4 files; untouched by this enablement block
- Previous D3 Phase 3 artifacts: nine untracked documentation/preflight files

## Implemented

- deterministic classification of all 17 Dataset Registry entries;
- explicit source, derived, and control-plane boundaries;
- six active Binance USD-M perpetual instrument lifecycle records from official exchange metadata and current product focus selectors;
- deterministic blocked Manifest identity and checksum with cutoff `2026-07-12T00:00:00.000Z`;
- six verified-cutoff OHLCV canary partition descriptors, retained as blocked;
- durable filesystem `ObjectStoragePort` with path rejection, capacity inspection, streaming writes, SHA-256 verification, duplicate reuse, and conflict rejection;
- explicit durable D2/D3 target allowlists and certification-database rejection;
- production normalizers for OHLCV, Funding, Open Interest, and Liquidation;
- bounded D3 wrapper over the certified D2 public adapter;
- Binance Vision daily OHLCV partition and source-availability adapter;
- deterministic enablement tests and machine-readable readiness artifacts.

## Not Implemented or Executed

- no full historical partition inventory;
- no durable target configuration;
- no production D2 client connection;
- no AggTrade/Orderbook stream normalizer because the D2 stream identity rule currently resolves dataset ID as `stream-manifest`, not the D1 `agg-trade` or `orderbook` binding;
- no provider formats for prediction, ETF, reserve, macro, or research documents;
- no delisted/renamed instrument lifecycle inventory;
- no approved retry or retention policy values;
- no canary, provider download, database write, Canonical Fact, lineage, publication, or coverage write;
- no full launch, stop, status, resume, or reconciliation worker command.

## D2 Boundary Conflict

The D2 public adapter is reusable, but its only exported client factory is intentionally isolated-only. Building a parallel client in D3 would duplicate a protected D2 persistence boundary. The affected integration stopped fail-closed. An additive D2 public non-production client and latest-version read are required before correction-safe canary execution.

## Source Discovery

Official Binance Futures exchange metadata reported BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, and DOGEUSDT as active perpetual contracts with the activation timestamps stored in the inventory. Official Binance Vision returned HTTP 200 for each symbol's `2026-07-11` 5-minute OHLCV archive. `2026-07-12` archives returned 404 at discovery time, so the frozen exclusive cutoff is July 12.

## Validation

| Command | Result |
|---|---|
| `npx.cmd tsc --noEmit --pretty false --incremental false` | PASS |
| `npx.cmd tsx workers/data-platform-tests/runD1ContractSuite.ts` | PASS |
| `npx.cmd tsx workers/data-platform-tests/runD2Phase1Suite.ts` | PASS |
| `npx.cmd tsx tests/data-platform/persistence/postgres/runUnitSuite.ts` | PASS |
| `npx.cmd tsx workers/data-platform-tests/runD3Phase1Suite.ts` | PASS |
| `npx.cmd tsx tests/data-platform/population/postgres/runUnitSuite.ts` | PASS |
| `npx.cmd tsx tests/data-platform/population/postgres/runCertificationSuite.ts` | PASS; certification databases only |
| `npx.cmd tsx tests/data-platform/population/backfill/runEnablementSuite.ts` | PASS |
| Manifest schema/checksum/snapshot command | PASS after correcting a command-harness top-level-await error |
| Credential scan | PASS |
| Active-runtime import scan | PASS; no consumer imports |
| Package and lockfile review | PASS; unchanged |
| `git diff --check` | PASS with inherited line-ending warnings |

The enablement suite validates classification, exclusions, lifecycle identity, Manifest identity/checksum, scope-change identity, filesystem safety, atomic writes, interrupted-sidecar recovery, artifact checksum/reuse/conflict behavior, target safety, normalizer determinism, correction version construction, D2 call ordering, source rejection, and raw lineage binding.

## Required Configuration

Approved names and roles are:

```text
D2_CANONICAL_POSTGRES_URL -> quantterminal_d2_backfill -> qt_d2_canonical_writer
D3_POPULATION_POSTGRES_URL -> quantterminal_d3_backfill -> qt_d3_worker
D3_BACKFILL_OBJECT_ROOT -> absolute durable path outside the repository and temporary directories
```

PowerShell environment binding shape, with secrets supplied through the operator's secret manager rather than command history:

```powershell
$env:D3_BACKFILL_OBJECT_ROOT = 'D:\QuantTerminalData\raw-artifacts'
$env:D2_CANONICAL_POSTGRES_URL = '<secret-manager-reference-for-quantterminal_d2_backfill>'
$env:D3_POPULATION_POSTGRES_URL = '<secret-manager-reference-for-quantterminal_d3_backfill>'
npx.cmd tsx workers/data-platform/generateD3Phase3EnablementArtifacts.ts
npx.cmd tsx tests/data-platform/population/backfill/runEnablementSuite.ts
```

These are configuration and preflight commands, not launch commands. Full launch/status/stop/resume/reconciliation commands remain unavailable because the worker path cannot legally open the durable D2 target yet.

## Launch Readiness

The Manifest is immutable but `BLOCKED`, not executable. There are zero executable partitions, six enumerated blocked canary partitions, and an unknown full expected partition count. No safe full-backfill command exists yet. The next action is durable-target configuration plus the additive D2 public-boundary correction, followed by one real OHLCV canary.
