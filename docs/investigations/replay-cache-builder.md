# Replay Orderbook Cache Builder

## Purpose

Replay orderbook is the first consumer of the Historical Intelligence Platform cache foundation.

The flow is:

```text
CryptoHFTData file
  -> manual builder
  -> CommonOrderbookEvent replay
  -> cache manifest and payload
  -> Replay cache read
```

Replay request paths do not download or reconstruct orderbook events.

## Cache Identity

```text
namespace: replay
dataset: orderbook-snapshot
partition:
  exchange
  symbol
  date
  hour
```

Schema version:

```text
1
```

Example cache path:

```text
.data/cache/replay/orderbook-snapshot/
  date=2026-06-16/
  exchange=binance_futures/
  hour=20/
  symbol=BTCUSDT/
    manifest.json
    payload-<id>.json
```

Partition directory ordering is deterministic and controlled by the generic cache utility.

## Payload

The payload stores only replay-ready state:

- exchange
- symbol
- selected window
- latest event timestamp
- best bid
- best ask
- spread
- imbalance percentage
- top-20 bid liquidity
- top-20 ask liquidity
- top-20 bids
- top-20 asks

Raw orderbook events are not stored in the cache.

## Generation

The builder accepts either a parquet file or a `.parquet.zst` file:

```powershell
npx.cmd tsx workers/replay/buildReplayOrderbookCache.ts `
  --file C:\data\BTCUSDT_orderbook.parquet.zst `
  --exchange binance_futures `
  --symbol BTCUSDT `
  --date 2026-06-16 `
  --hour 20
```

Generation is manual. There is no scheduler, queue, cron job, or request-triggered rebuild.

The builder:

1. Writes a `generating` manifest.
2. Reads parquet metadata.
3. Validates the CommonOrderbookEvent columns.
4. Processes parquet row groups in original order.
5. Replays snapshot and update semantics.
6. Produces the final top-20 orderbook snapshot and metrics.
7. Publishes the immutable payload through an atomic manifest write.

If generation fails, the builder writes a failed manifest with an explicit error.

## CommonOrderbookEvent Semantics

- Consecutive `snapshot` rows build a complete snapshot.
- The first snapshot row after updates clears the previous book.
- `update` rows mutate the current book.
- `quantity = 0` removes the price level.
- Bid and ask maps persist across parquet row groups.

## Replay Consumption

Replay calls:

```text
GET /api/replay/orderbook-cache
```

The route:

1. Builds the generic cache identity.
2. Reads the cache manifest.
3. Validates manifest and schema versions.
4. Rejects missing, corrupt, expired, partial, failed, or incompatible entries.
5. Returns the cached snapshot in the existing Replay book shape.

The route never downloads CryptoHFTData and never reconstructs orderbook events.

## Failure Behavior

- Missing: `Replay cache not generated.`
- Corrupted: `Replay orderbook cache is corrupted.`
- Expired: `Replay orderbook cache has expired.`
- Version mismatch: `Replay orderbook cache schema is incompatible.`
- Partial: `Replay orderbook cache generation is incomplete.`
- Failed: the stored generation failure reason is returned.

All cache availability failures return a normal response with an empty orderbook and diagnostics. Replay remains responsive.

## Diagnostics

The cache response exposes:

- cache status
- generated timestamp
- source
- schema version

The manifest metadata also records:

- source file
- total rows
- processed rows
- snapshot rows
- update rows
- final bid level count
- final ask level count

## Limitations

- `.zst` input is decompressed in the manual builder process.
- Parquet rows are processed one row group at a time, but the decompressed parquet file remains in builder memory.
- Only the final snapshot for the selected hour is cached.
- Cache files are local and are not distributed between deployments.
- Cache generation must currently be run manually on a machine with the source file.

## Future Scheduler Integration

A future scheduler can create the existing generic ingestion job model and invoke the same builder. It should publish to the same cache identity and schema contract, so Replay consumers do not need to change.
