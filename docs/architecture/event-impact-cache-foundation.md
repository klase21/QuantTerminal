# Event Impact Cache Foundation

## Purpose

Event Impact now follows the QuantTerminal historical intelligence constitution:

```text
Verified Event Catalog
  + Canonical OHLCV
  -> Manual Builder
  -> Versioned Event Impact Cache
  -> Cache Reader
  -> API
  -> Research
```

Historical outcome calculation and aggregation do not run in Event Impact request paths.

## Migration from Event Impact V1

The first Event Impact V1 reader performed this work during an API request:

```text
Read verified events
  -> read canonical OHLCV
  -> calculate four outcome windows
  -> aggregate statistics
  -> return response
```

The migrated API performs:

```text
Resolve public cache coordinates
  -> validate cache
  -> return prepared payload
```

The calculation and aggregation functions remain deterministic builder utilities. They are no longer imported by the API reader.

## Cache Schema

Schema version:

```text
1
```

Namespace:

```text
historical-intelligence
```

Datasets:

```text
event-impact-category-v1
event-impact-event-v1
```

Category cache partition:

```text
category
exchange
symbol
```

Event cache partition:

```text
eventId
exchange
symbol
```

Each payload contains:

- event id for event-specific caches;
- category;
- symbol;
- exchange;
- source metadata;
- generated timestamp;
- prepared API-compatible Event Impact result.

Prepared results contain:

- verified event summaries;
- per-event 1h, 4h, 24h, and 7d outcomes;
- average return;
- median return;
- win rate;
- best case;
- worst case;
- sample count;
- event-catalog and canonical market-data provenance.

## Builder Flow

The manual builder is:

```text
workers/event-impact/buildEventImpactCache.ts
```

Example:

```powershell
npx.cmd tsx workers/event-impact/buildEventImpactCache.ts `
  --category macro `
  --symbol BTCUSDT `
  --exchange binance_futures
```

The builder:

1. Validates category, symbol, and exchange.
2. Reads matching explicit events from the Verified Event Catalog.
3. Reads the exact canonical 1h OHLCV cache.
4. Calculates deterministic 1h, 4h, 24h, and 7d outcomes.
5. Aggregates category statistics.
6. Publishes one category cache.
7. Publishes one event cache for each event with usable outcomes.
8. Publishes manifest failure state if generation fails.

There is no scheduler, automation, external download, database, or request-triggered build.

## Cache Reader Flow

`CachedEventImpactReader` supports:

- read by event id;
- read by category;
- exact symbol and exchange coordinates;
- deterministic catalog-based default coordinates when optional coordinates are absent.

The reader:

1. Resolves a cache identity.
2. Uses the shared cache-first reader.
3. Validates manifest status and schema version.
4. Rejects missing, corrupted, expired, partial, failed, or incompatible cache entries.
5. Validates the Event Impact payload.
6. Returns the prepared result unchanged.

The reader does not:

- read canonical OHLCV;
- calculate event outcomes;
- aggregate statistics;
- rebuild or backfill caches;
- substitute another symbol or exchange after coordinates are resolved.

## API Flow

The existing API remains:

```text
GET /api/event-impact?eventId=<EVENT_ID>
GET /api/event-impact?category=<CATEGORY>
```

Optional:

```text
symbol=<SYMBOL>
exchange=<EXCHANGE>
```

The API delegates to the cache reader only. A cache miss returns:

```text
Event Impact cache not generated.
```

It never falls back to request-time computation.

## Research Compatibility

Research keeps the same manual-load workflow and response contract.

When cache exists:

- Event Impact metrics render as before.
- Source, event count, and generation time remain visible.

When cache is absent or invalid:

- Research shows the cache reader reason.
- Historical Analog, narratives, prediction markets, Replay access, and information flow remain usable.

No Research layout or loading workflow changed during this migration.

## Freshness and Failure Handling

The shared cache foundation validates:

- generation status;
- expiration;
- schema compatibility;
- payload availability.

The Event Impact reader additionally validates the payload contract.

Failure states remain distinct:

- cache not generated;
- cache corrupted;
- cache expired;
- schema incompatible;
- generation incomplete;
- generation failed;
- payload invalid.

No unavailable state triggers computation.

## Limitations

- Generation is manual.
- Current catalog coverage is limited to the verified seed events.
- Each builder run targets one category, symbol, and exchange.
- A category API request without explicit coordinates uses deterministic catalog coordinates, which must already have a generated cache.
- There is no cache inventory, scheduler, artifact publication, Event Impact V2 functionality, or Market Memory integration.
