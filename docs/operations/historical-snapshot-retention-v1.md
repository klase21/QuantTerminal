# Historical Snapshot Retention V1

## Purpose

Historical Snapshot Retention persists normalized deployable intelligence
snapshots over time so delta engines can compare multiple real observations.
This is required because the Exchange Reserve Delta Engine cannot compute a
change from a single observation.

## Retention Model

The first retained dataset is Binance Exchange Reserve snapshots.

Runtime path:

```text
.data/artifacts/history/exchange-reserve/<YYYY-MM-DD>/<observed-at>.json
```

Each file stores a historical snapshot envelope:

- schema version
- dataset id
- snapshot id
- observed timestamp
- generated timestamp
- retained timestamp
- source deployable artifact path
- normalized deployable snapshot payload

Historical files are append-only by observation timestamp. If the same
observation is retained again, the existing file is left untouched.

## Lookup Model

The resolver supports:

- latest snapshot
- previous snapshot
- oldest snapshot
- ordered snapshot list

The previous snapshot is the newest observation strictly older than the latest
observation. It is not fabricated from the current file.

## Delta Prerequisites

Exchange Reserve Delta requires at least two distinct retained observation
times. With one observation, the delta remains unavailable and reports:

```text
Previous reserve snapshot unavailable.
```

This is the correct state until a later reserve build retains another real
snapshot.

## Storage Implications

Only compact normalized deployable snapshots are retained. Raw CMC responses,
raw reserve wallet downloads, parquet, zip, and other source files remain
forbidden under `.data/artifacts`.

The top-level deployable artifact index continues to index current deployable
snapshots only. Historical retention has its own audit because history is not a
current product-surface artifact.

## Integration

Exchange Reserve Snapshot builds retain the latest deployable reserve snapshot
after publishing durable artifacts and regenerating deployable snapshots.

Exchange Reserve Delta reads:

1. durable exchange reserve snapshot artifacts
2. retained historical exchange reserve snapshots

It then resolves current and previous asset aggregates from real observations
only.

## Current Limitation

At initial rollout, only one retained observation may exist. Retention health is
`insufficient_history` until at least two real observation times are present.
