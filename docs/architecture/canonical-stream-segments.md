# Canonical Stream Segments

## Purpose

Canonical Stream Segments are the immutable D2 representation for provider-native, high-volume event streams that are not safe to persist as one PostgreSQL row per event. PostgreSQL remains the control plane. Event truth remains in checksum-addressed columnar objects.

The object boundaries are distinct:

```text
Raw provider archive
!= Canonical Stream Segment
!= PostgreSQL Segment Manifest
!= Derived analytical rollup
```

## AggTrades Contract

One Binance Vision daily AggTrades archive produces one Parquet Segment under normal conditions. The Segment retains string-safe aggregate and underlying trade IDs, decimal-safe price and quantity values, UTC Event Time, provider timestamp, buyer-maker semantics, canonical instrument identity, provider identity, and source row ordinal.

The logical Segment identity is derived from dataset, provider, venue, market, canonical instrument, provider symbol, partition window, and event-order policy. Source bytes, content checksum, schema version, normalizer version, execution time, worker, local path, and database IDs do not participate in the stable identity. Changed source content, schema, normalizer, or Segment checksum produces a distinct immutable version.

The Segment manifest records the exact source Raw Artifact ID and checksum, Segment object key and checksum, byte and event counts, ID and Event-Time bounds, schema and normalizer versions, format and compression, validation state, publication state, and governed lineage.

## Persistence

The existing D2 Canonical Commit transaction persists one `STREAM_MANIFEST` Fact and one Raw-to-Manifest lineage edge per Segment. An additive D2 migration extends `canonical.stream_manifests` with the Segment-v2 metadata. Existing row-model AggTrade Facts and legacy Stream manifests remain unchanged and queryable.

D3 persists one Segment Candidate, submission, authoritative outcome, bounded Coverage decision, and checkpoint per partition. It does not persist per-event Candidates, outcomes, lineage, publication, or Coverage arrays for Segment execution.

## Immutability And Recovery

Segment objects are written to a temporary file, flushed, checksummed, and published under a content-addressed key. Partial files never become authoritative. Duplicate identity and checksum reuses the existing object and manifest. An incompatible checksum for the same identity/version is a conflict and cannot overwrite history.

Unknown D2 outcomes are reconciled by deterministic identity and checksum before retry. D3 completes a Segment Unit only after its authoritative outcome, one bounded Coverage decision, and canonical checkpoint are durable in one fenced D3 transaction.

## Read Boundary

The read boundary first locates bounded Segment manifests by governed dimensions and time range. Object reads verify the Segment checksum, select explicit columns, and page by a hard limit. Event Time and provider aggregate-trade-ID filters are supported without converting IDs to JavaScript numbers. Missing, unpublished, or corrupt Segments remain explicit unavailable states.

Consumer integration, rollups, CVD, imbalance, and recommendations are outside this phase.
