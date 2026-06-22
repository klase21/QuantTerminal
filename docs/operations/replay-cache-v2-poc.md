# Replay Cache Schema V2 Proof of Concept

## Target

```text
symbol: BTCUSDT
exchange: binance_futures
date: 2026-02-22
hour: 12 UTC
```

This is the only coordinate accepted by the proof-of-concept builder.

## Scope

The proof of concept:

- downloads the exact CryptoHFTData orderbook source for the target;
- processes CommonOrderbookEvent rows outside request paths;
- writes a separate `replay/orderbook-replay` schema V2 cache;
- leaves the existing V1 cache unchanged;
- emits one-minute checkpoints;
- stores minute-compacted normalized update batches;
- writes a quality report;
- independently self-replays the stored payload when initialization exists.

It does not connect V2 to Replay UI, Replay APIs, or Replay loaders.

## Build Command

```powershell
npx.cmd tsx workers/replay/buildReplayOrderbookCacheV2.ts `
  --symbol BTCUSDT `
  --exchange binance_futures `
  --date 2026-02-22 `
  --hour 12
```

The API key is read from the process environment or `.env.local` and is never
stored in the cache.

## Cache Structure

The POC uses:

```text
namespace: replay
dataset: orderbook-replay
schemaVersion: 2
```

The payload contains:

- metadata and source provenance;
- verified initial snapshot when present;
- one-minute checkpoints;
- minute-compacted normalized update batches;
- terminal top-of-book summary;
- builder quality report.

The manifest is `complete` only for valid quality. Degraded or invalid
diagnostic payloads use `partial`.

## Initialization Policy

A provider `snapshot` event sequence is required for verified initialization.

Update-only accumulation may produce a plausible terminal state and diagnostic
checkpoints, but it is never promoted to valid initialization.

No V1 terminal snapshot is used as a synthetic V2 starting state.

## Self-Replay Validation

The validator:

1. Loads the persisted initial snapshot.
2. Applies normalized update batches in order.
3. Compares reproduced checkpoint summaries.
4. Compares the reproduced terminal summary.
5. Validates positive best bid and ask.
6. Validates `bestAsk > bestBid`.

When no verified initial snapshot exists, self-replay fails explicitly rather
than starting from an empty book.

## Audit

Run:

```powershell
npm run audit:replay-cache-v2
```

The audit is read-only and independently checks:

- cache readability;
- manifest state;
- initialization source;
- checkpoint and batch counts;
- row and event counts;
- first and last timestamps;
- terminal spread;
- self-replay result;
- stored quality consistency;
- Replay Learning safety.

## Replay Learning Safety

Only an independently valid V2 cache is safe for progression-based Replay
Learning evidence.

A degraded cache may retain factual static diagnostics, but must not support
claims about orderbook progression, liquidity evolution, or causal sequence.

## Known Limitations

- The POC keeps the decompressed parquet in memory during offline generation.
- Update compaction preserves the last update for each side/price within each
  minute. It targets minute checkpoint progression, not tick-by-tick playback.
- Checkpoints retain top-50 levels per side.
- The POC does not fetch a preceding-hour snapshot.
- Provider sequence semantics are checked conservatively and may require
  exchange-specific refinement.
- No runtime consumer reads the V2 cache.

## Build Result

Execution date: 2026-06-22.

The exact target generated a readable partial V2 cache:

- quality status: `degraded`;
- initialization method: `unverified_updates`;
- source rows: 3,921,890;
- in-window update rows: 3,921,823;
- compacted normalized updates: 368,165;
- provider snapshot rows: 0;
- one-minute checkpoints: 60;
- normalized update batches: 60;
- checkpoint coverage: 100%;
- first in-window event: 2026-02-22T12:00:00.004Z;
- last in-window event: 2026-02-22T12:59:59.842Z;
- terminal best bid: 67,892.3;
- terminal best ask: 67,892.4;
- terminal spread: approximately 0.1.

Sixty-seven source rows fell outside the exact selected UTC hour and were
discarded. No malformed in-window row was reported.

Self-replay did not run because no verified initial snapshot exists. The
terminal state is plausible but remains update-only reconstruction.

The cache is not safe for progression-based Replay Learning evidence.

## Recommended Next Sprint

If the target is degraded because no snapshot exists, inspect a preceding
source window for a complete snapshot and prove update continuity into the
target hour.

If the target is valid, implement a read-only V2 seek reader and expand the
audit before any Replay runtime integration.
