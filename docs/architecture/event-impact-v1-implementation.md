# Event Impact V1 Implementation

## Purpose

Event Impact V1 answers:

> What usually happened after this verified event type?

It consumes only:

- the Verified Event Catalog;
- canonical 1h OHLCV cache records.

It does not infer events, classify news, generate explanations, implement Market Memory, or fabricate missing outcomes.

## Contracts

Versioned contracts live in:

```text
core/event-impact/eventImpactTypes.ts
```

Each event observation records:

- event id;
- category;
- verified event timestamp;
- symbol;
- exchange;
- source;
- 1h, 4h, 24h, and 7d outcomes.

Each horizon has:

- `return`;
- `available`.

An unavailable horizon retains `return: null`. Missing coverage is never converted to zero.

## Calculation Model

For each verified event and compatible catalog market scope:

1. Read canonical 1h OHLCV for the exact exchange and symbol.
2. Select the last completed candle ending before the verified event timestamp as the baseline.
3. Select the first candle completing each exact horizon.
4. Calculate:

```text
(target close - baseline close) / baseline close * 100
```

The calculation does not interpolate prices, substitute symbols, or use a benchmark.

Canonical cache readers validate source payloads and schema versions before Event Impact receives records.

## Aggregation Model

For each horizon, aggregation uses only observations where `available` is true.

Metrics:

- sample count;
- arithmetic average return;
- median return;
- win rate using returns greater than zero;
- best case;
- worst case.

Ties and ordering are deterministic because verified events, market coordinates, and candle records use stable identities and timestamps.

## Reader

`CanonicalEventImpactReader` supports:

- lookup by verified event id;
- lookup by canonical event category;
- optional exact symbol filter;
- optional exact exchange filter.

The reader:

- retrieves explicit records from the Verified Event Catalog;
- deduplicates canonical cache reads by exchange and symbol;
- reads only canonical 1h OHLCV caches;
- calculates fixed outcomes;
- returns explicit unavailable results when catalog or market coverage is missing.

There is no AI search, vector search, event inference, external download, or raw provider parsing.

## API

```text
GET /api/event-impact?eventId=<EVENT_ID>
GET /api/event-impact?category=<CATEGORY>
```

Optional filters:

```text
symbol=<SYMBOL>
exchange=<EXCHANGE>
```

Exactly one of `eventId` or `category` is required.

The response includes:

- event summaries;
- per-event market outcomes;
- horizon statistics;
- sample count;
- event-catalog source;
- canonical market-data sources;
- generation timestamp derived from the canonical cache manifest.

## Research Integration

Research exposes Event Impact as a manual-load section.

The request uses Shared Investigation Context:

- selected event id when available;
- otherwise the initial verified `macro` category;
- active symbol;
- active exchange.

Only valid outcomes render metrics. Missing catalog or OHLCV coverage renders a compact unavailable reason. Event Impact does not block narratives, Historical Analog, Replay, or other Research sections.

No confidence value is displayed.

## Cache Migration

Event Impact consumption has moved to the cache-backed architecture documented in:

```text
docs/architecture/event-impact-cache-foundation.md
```

The calculation model below remains builder logic. The API no longer reads OHLCV or calculates outcomes.

## Limitations

- The Verified Event Catalog seed currently contains only two official FOMC statement events.
- Canonical OHLCV coverage determines which event, symbol, and exchange observations are usable.
- The manual builder reads and deterministically evaluates the existing canonical file cache before publication.
- The builder currently loads a complete symbol/interval payload; broader event catalogs may require builder-side analytical storage later.
- Event comparability is category-only in V1. It does not yet account for surprise magnitude, pre-event regime, confounders, or subtype compatibility.
- Returns measure observed post-event movement. They do not assert causality.
- Replay validation and Event Impact outcome windows remain separate workflows.

## Future Market Memory Compatibility

Future Market Memory may consume:

- stable verified event ids;
- category;
- exact event observations;
- aggregate outcome statistics;
- source provenance.

Market Memory must cite these Event Impact results as evidence. It must not mutate event records or reinterpret unavailable horizons as observations.
