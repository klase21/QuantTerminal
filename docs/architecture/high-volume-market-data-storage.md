# High-Volume Market Data Storage

## Decision

High-volume provider-native streams use immutable columnar objects with PostgreSQL manifests. Row-per-event PostgreSQL persistence remains suitable only for bounded certification evidence and lower-volume typed Facts.

AggTrades use Apache Parquet with explicit schema and Snappy compression. IDs and decimals are stored as strings to avoid unsafe integer conversion and floating-point truth loss. Writer row groups are capped at 100,000 events and the source archive is parsed incrementally, bounding event memory.

## Storage Layout

```text
raw/<checksum>.zip
canonical-segments/agg-trades/<prefix>/<checksum>.parquet
```

The Raw ZIP and canonical Parquet Segment have independent identities and checksums. PostgreSQL stores the Segment manifest, exact Raw linkage, validation summary, publication state, and bounded Coverage state. It does not duplicate all events.

## Capacity Policy

Launch estimates use measured real-Segment bytes per event applied to the conservative frozen event count, measured source archive bytes, bounded PostgreSQL metadata, remaining dataset growth, and an explicit safety margin. Estimates and measured values remain separately labelled. Full launch fails closed when capacity or uncertainty is not bounded.

The legacy XRPUSDT row-model Canary remains immutable certification evidence. It is excluded from Segment completion and Segment capacity calculations.
