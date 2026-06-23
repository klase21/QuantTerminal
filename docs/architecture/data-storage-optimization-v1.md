# Data Storage Optimization and Artifact Standardization V1

## Objective

Artifact Standardization V1 defines a portable boundary between intelligence
production and storage. The same normalized artifact can be committed as a
small Vercel snapshot today and moved to Postgres or object storage later
without changing its identity, partition, or validity semantics.

This layer changes metadata and storage discipline only. It introduces no data
source, intelligence calculation, scoring rule, or UI behavior.

## Storage Classes

| Storage class | Purpose | Git/Vercel policy |
| --- | --- | --- |
| `deployable_snapshot` | Compact latest intelligence for application reads | Allowed under `.data/artifacts/*.json` |
| `durable_artifact` | Prepared intelligence history and evidence | Runtime store; future DB/object storage |
| `raw_source` | Provider downloads and source-native files | Never allowed under `.data/artifacts` |
| `temporary_cache` | Rebuildable working state | Never committed |

Deployable validation rejects `raw_source` and `temporary_cache` metadata.

## Standard Metadata Contract

Every deployable payload contains:

```ts
{
  schemaVersion
  artifactType
  scope
  timeframe
  partitionKey
  generatedAt
  sourceHash
  recordCount
  payloadSizeBytes
  freshness
  coverage
  storageClass
}
```

`scope` carries explicit symbols, assets, and exchange when applicable.
`sourceHash` is a SHA-256 digest of the normalized source identifier and
payload. It supports change detection and future object-store ETags without
including credentials or raw provider responses.

`payloadSizeBytes` is the actual UTF-8 byte size of the formatted artifact
file. It is calculated before the artifact index is written.

## Raw and Summary Separation

The storage flow is:

```text
Raw provider data
  -> local raw/cache storage
  -> normalization and intelligence production
  -> compact deployable artifact
  -> artifact index
  -> application consumer
```

Raw Binance Vision downloads, parquet files, trades, and orderbook events are
never copied into deployable snapshots. Canonical OHLCV is represented by
coverage metadata rather than embedded candle history.

## Partition Strategy

Partition keys are portable forward-slash paths:

```text
market-driver/multi/1d/latest
etf/multi/1d/latest
funding/multi/1h/latest
open-interest/multi/1h/latest
liquidation/multi/1h/latest
exchange-flow/multi/1d/latest
treasury/multi/1d/latest
coverage/global/latest
```

The current Vercel files aggregate a small BTC/ETH universe. The contract also
supports future single-subject partitions:

```text
market-driver/BTCUSDT/1d/latest
etf/BTC/1d/latest
funding/BTCUSDT/1h/latest
open-interest/BTCUSDT/1h/latest
liquidation/BTCUSDT/1h/latest
```

Moving from multi-subject files to single-subject objects does not require a
metadata redesign.

## Artifact Index

`.data/artifacts/artifact-index.json` is the discovery surface.

Each entry includes:

- artifact type;
- partition key;
- relative path;
- generated time;
- freshness;
- payload size;
- record count;
- source hash.

The index contains no artifact payloads. Consumers can select the exact file
they need without listing directories or loading unrelated intelligence.

## Size Limits

- Warning threshold: 128 KiB per artifact.
- Hard failure threshold: 512 KiB per artifact.

The audit reports every file size. Deployable artifacts over the warning
threshold remain visible as operational warnings. Artifacts over the hard
threshold fail validation and must be partitioned.

## Dashboard Consumption Rule

Dashboard must not:

- scan raw caches;
- enumerate durable artifact history;
- read all artifact payloads;
- rebuild intelligence.

Dashboard should read a known latest partition or use the compact artifact
index to resolve one exact path. This preserves the conclusion-first response
budget.

## Migration Path

### Supabase/Postgres

Store artifact-index fields as indexed columns:

- `artifact_type`;
- `partition_key`;
- `generated_at`;
- `freshness`;
- `source_hash`.

Payloads may remain JSONB while small. `partitionKey` should have a unique
latest-record constraint per generation.

### S3/R2

Use `partitionKey` as the object key prefix and `sourceHash` as change/ETag
metadata. The artifact index can become a compact manifest object or database
table.

### Hybrid

Postgres stores searchable index metadata. S3/R2 stores payload JSON. The
existing `path`, hash, size, and record-count fields map directly to that
model.

## Operational Boundaries

- Git remains suitable only for the small latest snapshot set.
- Durable history belongs outside the deployable directory.
- Raw data remains local or in provider/object storage.
- Database migration is justified by artifact count and query requirements,
  not by the current payload volume.
