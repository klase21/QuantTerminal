# Full Historical Backfill

## Authoritative Path

Full historical population must execute outside request handlers through the certified D3 control plane:

```text
Historical source
  -> immutable raw object in durable object storage
  -> retrieval attempt
  -> typed candidate
  -> versioned D1 normalizer
  -> certified D2 Canonical Commit port
  -> lineage and PENDING publication decision
  -> coverage, watermark, and gap records
```

Legacy Repository, SQLite, local cache, and local filesystem backfills are source evidence for planning only. They are not canonical population and cannot be imported or counted without a separately approved migration path that preserves exact raw bytes, checksums, source identity, normalization bindings, and D2 lineage.

## Launch Gate

No canary or full run may start until one frozen Backfill Manifest resolves every required dataset, provider, instrument lifecycle, availability boundary, partition strategy, D1 normalizer, D2 target, durable object-storage prefix, policy version, retry policy, and cutoff. Unknown requiredness, missing raw storage, fixture-only ports, or an isolated certification database offered as a durable target blocks launch.

Every expected partition must terminate as populated, confirmed empty, unsupported, unavailable for period, an explicit gap, an access/cost blocker, or retry exhausted. Zero records, missing source, unsupported capability, and pre-activation time remain distinct.

## Current Enablement State

The 2026-07-13 enablement block now provides deterministic classification, a six-symbol active lifecycle inventory, durable filesystem raw-artifact semantics, four typed production normalizers, durable-target safety rules, a D3 wrapper over the D2 public commit adapter, and a non-executable immutable Manifest snapshot.

- durable storage is configured outside the repository and passed path/capacity safety inspection;
- OHLCV, Funding, Open Interest, and Liquidation normalizers exist; other required formats remain blocked;
- the D3-to-D2 wrapper now uses an additive D2 durable-target factory and exact latest-version query for correction-safe planning;
- the prior separate D2/D3 durable targets authenticate, but committed foreign keys require the shared physical database `quantterminal_backfill`; the integrated profile is implemented and user bootstrap remains pending;
- retry and retention policies remain unresolved;
- six current focus instruments are governed, but delisted/renamed history and broader Replay scope remain unresolved;
- several required-looking datasets use an unresolved `governed-external` provider in `VALIDATING` state.

The local `.data/historical-backfill.sqlite` corpus is approximately 3.15 GB and contains useful legacy data, but it does not satisfy the raw-artifact, D1, D2, or lineage boundary and remains untouched.
