# ADR-005 Historical Intelligence Cache Foundation

## Status

Accepted

## Context

Historical intelligence workloads currently include data volumes that are not safe to process in request paths. The Replay orderbook investigation found approximately 4.19 million `CommonOrderbookEvent` rows for one BTCUSDT hour. Correct reconstruction requires replaying snapshots and updates in order, which exceeds the request runtime budget.

The existing local historical store also contains large JSON collections that are read and rewritten as whole arrays. This is useful for early ingestion work but is not an appropriate request-time query model.

## Decision

Historical intelligence will follow:

```text
Ingest
  -> Process
  -> Cache
  -> Render
```

Request paths consume cache entries only. A cache miss, expired entry, incompatible version, partial generation, or failed generation returns an explicit unavailable result. Request handlers must not trigger heavy historical recomputation automatically.

Phase 1 uses a generic file cache rooted at:

```text
.data/
  raw/
  processed/
  cache/
```

Cache entries are identified by:

- namespace
- dataset id
- arbitrary partition dimensions

This supports Replay, Historical Analog, Market Memory, Event Impact, and future datasets without adding dataset-specific storage infrastructure.

## Cache Entry Layout

```text
.data/cache/<namespace>/<dataset>/<partition...>/
  manifest.json
  payload-<unique-id>.json
```

Payloads are immutable. The manifest is written atomically after the payload, making the manifest the publication boundary for readers.

## Manifest Contract

Each manifest records:

- manifest version
- cache identity
- source and source class
- generated timestamp
- expiration timestamp
- schema version
- generation status
- metadata
- payload descriptor
- optional generation error

Generation states:

- pending
- generating
- complete
- partial
- failed

## Versioning

Manifest version and dataset schema version are independent.

- Manifest version changes when cache infrastructure metadata changes.
- Schema version changes when a dataset payload contract changes.
- Consumers declare the expected schema version.
- A mismatch returns `version_mismatch`; no implicit migration occurs in a request path.

Future migration tooling may read an older compatible schema and publish a new cache entry outside the request path.

## Failure Handling

Cache reads return explicit states:

- `missing`
- `corrupted`
- `expired`
- `version_mismatch`
- `partial`
- `generation_failed`
- `ready`

No state fabricates data. Expired and partial data are rejected by default. A specialized consumer may explicitly opt into partial data, but request paths should remain conservative.

## Ingestion Job Model

The generic ingestion job contract describes:

- source
- target cache identity
- dataset schema version
- dimensions
- time window
- options
- status
- progress
- attempts
- retryable failure metadata

It does not implement execution, scheduling, queues, or retries. Future schedulers and workers can consume the model without changing cache consumers.

## Data Strategy

Primary historical sources:

- Binance Vision
- Binance historical APIs

Secondary sources:

- funding history
- open interest history

Enrichment sources:

- CryptoHFTData
- prediction markets
- narrative systems

CryptoHFTData is enrichment, not the primary long-coverage source for Historical Analog.

## Future Phases

```text
Phase 1: File Cache
Phase 2: Scheduler / Polling
Phase 3: DuckDB Analytics Layer
Phase 4: SQLite Application Cache
Phase 5: Historical Intelligence Platform
```

These phases are documented only and are not implemented by this decision.

## Consequences

- Historical request paths remain responsive.
- Cache generation becomes an explicit background/offline responsibility.
- Dataset evolution is detectable through schema versions.
- File cache is a replaceable adapter rather than a permanent database decision.
- Existing historical stores and product routes remain unchanged until migrated deliberately.
