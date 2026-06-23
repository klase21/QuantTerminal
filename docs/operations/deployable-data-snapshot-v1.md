# Deployable Data Snapshot V1

## Purpose

Deployable Data Snapshot V1 exports small, normalized intelligence payloads
that can be committed to Git and served from Vercel.

The snapshot layer does not commit or expose raw source data. It consumes
existing prepared caches, durable intelligence artifacts, and the existing
Market Driver Engine.

## Git Policy

The repository continues to ignore all runtime data under `.data/` except:

```text
.data/artifacts/*.json
```

Forbidden deployable content includes:

- parquet or compressed parquet;
- zip archives;
- raw trades;
- raw orderbook events;
- Binance Vision source downloads;
- source-adapter response dumps.

Only the normalized JSON files produced by the builder are allowed.

## Contract

Every deployable snapshot contains:

```ts
{
  schemaVersion: 2
  snapshotId: string
  metadata: {
    artifactType: string
    scope: object
    timeframe: string | null
    partitionKey: string
    source: string
    generatedAt: string
    observedAt: string | null
    sourceHash: string
    recordCount: number
    payloadSizeBytes: number
    freshness: "current" | "stale" | "missing"
    coverage: "full" | "partial" | "unavailable"
    storageClass: "deployable_snapshot"
    reason?: string
  }
  data: unknown
}
```

Freshness is based on the latest real observation:

- `current`: observed within 48 hours;
- `stale`: a real observation exists but is older than 48 hours;
- `missing`: no valid observation exists.

No missing value is replaced with synthetic data.

## Generated Artifacts

The manual builder writes:

- `latest-market-drivers.json`;
- `etf-latest.json`;
- `funding-latest.json`;
- `open-interest-latest.json`;
- `liquidation-latest.json`;
- `exchange-flow-latest.json`;
- `treasury-latest.json`;
- `coverage-index.json`.

The builder also writes `artifact-index.json`, a payload-free discovery index
for partition, hash, size, freshness, and record-count metadata.

Funding and Open Interest use evidence already normalized by the Market Driver
Engine. ETF, Exchange Flow, and Treasury use durable artifact payloads.
Liquidation uses prepared Liquidation Intelligence cache entries. Canonical
OHLCV is represented in the coverage index only; candle payloads are not copied
into deployable artifacts.

## Coverage Index

`coverage-index.json` records deployable evidence coverage for:

- Dashboard;
- Markets;
- Research;
- Replay;
- Historical Intelligence.

Coverage types:

- OHLCV;
- funding;
- open interest;
- liquidation;
- ETF;
- exchange flow;
- treasury;
- market drivers.

An entry identifies the normalized artifact file when one exists. OHLCV entries
reference canonical cache availability without embedding the source dataset.

## Commands

Generate snapshots:

```powershell
npm run build:deployable-snapshots
```

Audit snapshots:

```powershell
npm run audit:deployable-snapshots
```

The audit is read-only and validates:

- expected artifact count;
- JSON contract validity;
- per-file and total size;
- freshness summary;
- coverage summary;
- absence of raw dataset files.

## Failure Handling

- Missing prepared evidence produces an empty normalized snapshot marked
  `missing` and `unavailable`.
- Stale evidence remains factual but is explicitly marked `stale`.
- Invalid durable artifacts are excluded by existing registry validation.
- A failed live Funding/OI source does not fabricate values.

## Limitations

- Snapshot generation remains manual.
- Vercel consumption is not wired into UI routes in this sprint.
- The 48-hour freshness window is a deployment policy, not predictive logic.
- Exchange Flow and Treasury remain unavailable until real durable artifacts
  are published.

## Initial Validation

The standardized June 23, 2026 build produced nine JSON files totaling 23,114
bytes:

- five current snapshots, including the wrapped coverage artifact;
- one stale Liquidation snapshot;
- two missing/unavailable snapshots;
- one artifact discovery index.

The coverage index contains 22 surface/type entries:

- 15 full;
- 3 partial;
- 4 unavailable.

No raw dataset files were found in the deployable directory.
