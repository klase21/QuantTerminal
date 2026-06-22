# ETHUSDT Research Coverage Expansion V1

## Scope

This operation expanded prepared Research intelligence for:

- symbol: `ETHUSDT`
- exchange: `binance_futures`
- timeframe: `1h`

It used the existing canonical market-data builder, intelligence production
orchestrator, verified event catalog, cache contracts, artifact publisher, and
Market Memory eligibility rules. No algorithms, schedulers, Replay systems, or
product UI were changed.

## OHLCV Support Verification

The existing canonical OHLCV builder supports:

- normalized uppercase symbols, including `ETHUSDT`;
- `binance_futures`;
- `1h` candles;
- the existing local Binance Vision JSON source.

The source file already contained ETHUSDT 1h history. The builder generated a
canonical cache with:

- records: 43,104
- first open time: 2021-01-01 00:00 UTC
- last open time: 2026-05-31 23:00 UTC
- source: `binance-vision`
- schema version: `1`

## Commands Executed

Canonical OHLCV:

```powershell
npx.cmd tsx workers/market-data/buildCanonicalOhlcvCache.ts --file C:\QuantTerminal\.data\historical\market_ohlcv.json --exchange binance_futures --symbol ETHUSDT --interval 1h
```

Historical Analog, Event Impact, Market Memory eligibility, and durable
artifact publication:

```powershell
npx.cmd tsx workers/intelligence-orchestrator/buildIntelligenceSuite.ts --durable --historical-file C:\QuantTerminal\.data\historical\market_ohlcv.json --symbol ETHUSDT --interval 1h --limit 25 --event-category macro --event-symbol ETHUSDT --event-exchange binance_futures
```

Validation:

```powershell
npm run test:intelligence
npx.cmd tsc --noEmit --pretty false --incremental false
npm run audit:research-coverage
```

## Generated Caches

### Canonical OHLCV

```text
.data/cache/market-data/ohlcv/
  exchange=binance_futures/
  interval=1h/
  symbol=ETHUSDT/
```

Status: complete.

### Historical Analog V2

```text
.data/cache/historical-intelligence/historical-analog-v2/
  interval=1h/
  symbol=ETHUSDT/
```

Generated results:

- candidate states: 42,383
- selected analogs: 25
- current state: `binance-vision:ETHUSDT:1h:1780268400000`
- source: `binance-vision`

### Event Impact

The verified seed catalog supports ETHUSDT for the existing `macro` category.
No new events or categories were introduced.

Generated caches:

```text
.data/cache/historical-intelligence/event-impact-event-v1/
  eventId=macro-fomc-statement-2024-01-31/exchange=binance_futures/symbol=ETHUSDT/
  eventId=macro-fomc-statement-2024-03-20/exchange=binance_futures/symbol=ETHUSDT/

.data/cache/historical-intelligence/event-impact-category-v1/
  category=macro/exchange=binance_futures/symbol=ETHUSDT/
```

Generated results:

- verified events: 2
- available outcome samples: 2
- source: `verified-event-seed-catalog+canonical-ohlcv`

## Generated Durable Artifacts

The existing production orchestrator published:

- `historical-analog:ETHUSDT:1h`
- `event-impact:macro:binance_futures:ETHUSDT`
- `market-memory:memory:event:macro:binance_futures:ETHUSDT`
- `market-memory:memory:regime:ETHUSDT:1h`

Market Memory was not forced. The existing deterministic builder and
eligibility rules produced two eligible memories from prepared Historical
Analog and Event Impact artifacts.

## Coverage Change

| Research dependency | Before | After |
| --- | --- | --- |
| Canonical OHLCV | Missing | Available, 43,104 records |
| Historical Analog V2 | Missing | Available, 25 analogs |
| Event Impact | Missing | Available, macro category with 2 samples |
| Durable Market Memory | Missing | Available, 2 artifacts |

The Research coverage audit now reports ETHUSDT Historical Analog, Event
Impact, and durable Market Memory as available.

## Blockers And Limitations

- The source OHLCV ends at 2026-05-31 23:00 UTC. Intelligence reflects that
  observation boundary until the canonical source is refreshed.
- Event Impact coverage is limited to the two verified macro events already in
  the seed catalog.
- No funding or open-interest enrichment was added.
- The selected ETH analog set contains no cases inside CryptoHFTData coverage
  beginning 2025-07-01. Replay orderbook coverage therefore remains blocked.
- No Replay Learning artifacts were generated.
- SOLUSDT coverage was intentionally not changed.
