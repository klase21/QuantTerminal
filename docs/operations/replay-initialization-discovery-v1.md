# Replay Initialization Discovery V1

## Purpose

Replay Initialization Discovery V1 determines whether the degraded Replay
Cache V2 proof of concept can be initialized from an adjacent CryptoHFTData
provider window.

The discovery is limited to:

```text
BTCUSDT
binance_futures
2026-02-22
12 UTC
```

It does not generate or modify V1/V2 orderbook caches and does not connect
anything to Replay runtime.

## Discovery Command

```powershell
npx.cmd tsx workers/replay/discoverReplayInitialization.ts `
  --symbol BTCUSDT `
  --exchange binance_futures `
  --date 2026-02-22 `
  --hour 12 `
  --lookback-hours 3
```

The worker inspects:

1. the target 12 UTC source window;
2. 11 UTC;
3. 10 UTC;
4. 09 UTC.

It stops after the first preceding window containing a usable snapshot.

Only these exact provider files may be downloaded. Temporary source files are
removed after inspection.

## Snapshot Qualification

A snapshot candidate must:

- consist of provider rows labeled `snapshot`;
- contain at least one positive bid level;
- contain at least one positive ask level;
- retain source timestamp and sequence identifier when available.

An update-only reconstructed book is not a snapshot candidate.

## Continuity Verification

The worker records:

- first and last timestamps;
- first and last update identifiers;
- first `prev_final_update_id`;
- within-window sequence gaps;
- cross-window boundary identifiers;
- post-snapshot sequence gaps.

A target is `initializable` only when:

1. a usable snapshot candidate exists;
2. updates after that snapshot are continuous;
3. every later inspected window is internally continuous;
4. every boundary through 12 UTC is continuous.

Missing identifiers result in `unknown`, not assumed continuity.

## Status Values

- `initializable`: usable snapshot and continuity into target are verified.
- `not_initializable`: sources exist but no usable snapshot or a known gap
  prevents initialization.
- `source_missing`: all inspected source files are unavailable.
- `unknown`: snapshot exists but continuity cannot be proven.

## Persisted Discovery

The result is stored as a diagnostic report under:

```text
namespace: replay
dataset: orderbook-initialization-discovery
partition:
  exchange
  symbol
  date
  hour
```

This is not an orderbook cache and is never consumed by Replay runtime.

## Read-Only Audit

Run:

```powershell
npm run audit:replay-initialization
```

The audit reads only the latest persisted discovery result. It performs no
provider request and verifies that:

- a selected candidate exists in the candidate list;
- the candidate is usable;
- an `initializable` result includes continuous provenance.

## Risks And Limitations

- Snapshot completeness is inferred from provider event semantics and both
  sides being present; full exchange depth cannot be independently proven.
- Binance update identifiers require provider-consistent
  `prev_final_update_id` semantics.
- A source file may contain boundary rows outside its nominal hour; exact UTC
  filtering is applied.
- The discovery does not retain raw provider data.
- The discovery does not rebuild V2 even when a valid candidate is found.
- No alternative provider or synthetic initialization is used.

## Recommended Next Sprint

If `initializable`, rebuild the same target V2 cache using the selected
provider snapshot and verified continuous updates, then require independent
self-replay success.

If no snapshot is found, investigate provider snapshot delivery semantics or
an alternate verified initialization source. Do not broaden backfill or mark
the current update-only cache valid.

## Discovery Result

Execution date: 2026-06-22.

| Window | Source | Rows | Snapshots | Updates | Internal continuity |
| --- | --- | ---: | ---: | ---: | --- |
| 12 UTC | available | 3,921,890 | 0 | 3,921,823 | continuous |
| 11 UTC | available | 2,865,779 | 0 | 2,865,693 | continuous |
| 10 UTC | available | 2,809,722 | 0 | 2,809,667 | continuous |
| 09 UTC | available | 2,654,553 | 0 | 2,654,334 | continuous |

No snapshot candidate was found. No candidate was selected.

Cross-window update identifiers did not bridge exactly:

- 09 UTC to 10 UTC: gap;
- 10 UTC to 11 UTC: gap;
- 11 UTC to 12 UTC: gap.

Final status:

```text
initializationStatus: not_initializable
continuityStatus: gap
```

The current V2 cache cannot be rebuilt as valid from these three preceding
hours. Extending update-only lookback would not establish a trustworthy
initial state without a provider snapshot or another verified source.
