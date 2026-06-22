# Replay Orderbook Backfill V1

## Purpose

Replay Orderbook Backfill V1 prepares existing Replay-compatible Historical
Analog windows for cache-only orderbook consumption.

The flow is:

```text
CryptoHFTData orderbook file
  -> temporary streamed download
  -> existing CommonOrderbookEvent builder
  -> existing replay/orderbook-snapshot cache
  -> read-only coverage audit
```

No Replay request path, API route, UI, rendering code, cache contract, or
orderbook reconstruction algorithm is changed.

## Manual Backfill Utility

The utility accepts one exact Replay window:

```powershell
npx.cmd tsx workers/replay/backfillReplayOrderbookCache.ts `
  --symbol BTCUSDT `
  --exchange binance_futures `
  --date 2026-02-22 `
  --hour 12
```

Inputs:

- `symbol`
- `exchange`
- `date` in `YYYY-MM-DD`
- UTC `hour` from 0 through 23

The utility reads `CRYPTOHFTDATA_API_KEY` from the process environment or
`.env.local`, downloads the exact existing provider path, streams it to a
temporary file, invokes `buildReplayOrderbookCache()`, and removes the
temporary file afterward.

The provider file format remains:

```text
{exchange}/{date}/{HH}/{symbol}_orderbook.parquet.zst
```

The API key is never printed.

## Initial Backfill Targets

Run these independently so one failed provider window does not invalidate
another:

```powershell
npx.cmd tsx workers/replay/backfillReplayOrderbookCache.ts --symbol BTCUSDT --exchange binance_futures --date 2026-02-22 --hour 12
npx.cmd tsx workers/replay/backfillReplayOrderbookCache.ts --symbol BTCUSDT --exchange binance_futures --date 2025-07-20 --hour 17
npx.cmd tsx workers/replay/backfillReplayOrderbookCache.ts --symbol BTCUSDT --exchange binance_futures --date 2026-04-05 --hour 12
```

The utility does not retry and does not silently substitute another window.

### Sprint 25 Execution Result

Execution date: 2026-06-22.

| Target | Result | Rows processed |
| --- | --- | ---: |
| BTCUSDT 2026-02-22 12 UTC | Cached | 3,921,890 |
| BTCUSDT 2025-07-20 17 UTC | Cached | 4,038,569 |
| BTCUSDT 2026-04-05 12 UTC | Unavailable: provider HTTP 404 | 0 |

The unavailable target remains uncached. No alternate date, symbol, exchange,
or source was substituted.

## Cache Output

Successful builds use the existing cache identity and schema:

```text
namespace: replay
dataset: orderbook-snapshot
schema version: 1
partition:
  exchange
  symbol
  date
  hour
```

Only the final Replay-ready snapshot is persisted. Raw CommonOrderbookEvent
rows are not stored in the cache.

## Coverage Audit

Run:

```powershell
npm run audit:orderbook-coverage
```

The audit is read-only and reports:

- total Replay-compatible cases;
- cases with valid orderbook cache;
- coverage percentage;
- cached case coordinates;
- missing case coordinates and reasons.

It derives compatible cases from Replay Coverage Audit V1 and validates the
existing local orderbook cache for every compatible window.

## Failure Behavior

- Provider HTTP failure: the target fails explicitly.
- Missing API key: no request is made.
- Invalid parquet or schema: the existing builder writes a failed manifest.
- Reconstruction failure: the existing builder writes a failed manifest.
- Temporary downloads are removed in all outcomes.
- Other target windows and existing caches remain unchanged.

## Limitations

- Backfill is manual and sequential.
- CryptoHFTData source availability is verified only when a backfill is run.
- Large orderbook files require substantial memory during decompression.
- Both successful initial files contained update rows and reported zero
  `snapshot` rows. Their caches reflect the existing builder behavior and
  should not be interpreted as independently verified full-depth initialization.
- Cache files remain local to the current runtime.
- This utility does not generate Replay Learning artifacts.
