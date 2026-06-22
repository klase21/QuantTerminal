# Flow Replay Enrichment V1

## Purpose

Flow Replay Enrichment V1 adds historical funding and open-interest evidence
to the existing Flow Replay artifact without changing Replay UI, Replay
runtime, orderbook quality, or intelligence algorithms.

The target remains:

```text
BTCUSDT
binance_futures
2026-02-22
12 UTC
```

## Source Reuse

The enrichment reuses the existing Replay positioning chain:

1. Canonical funding and open-interest caches.
2. CryptoHFTData `mark_price` and `open_interest` datasets.
3. Binance historical funding and open-interest endpoints.

The Binance historical implementation is shared by:

- `/api/replay/binance-positioning`;
- the manual Flow Replay builder.

No browser-direct exchange request or duplicate endpoint implementation was
introduced.

The Replay current-context fallback is intentionally excluded from historical
artifact generation. A value observed today cannot represent the selected
historical window.

## Positioning Evidence Contract

Flow Replay V1 remains schema compatible. Two optional sections were added:

```text
fundingEvidence
openInterestEvidence
```

Each section contains:

- `availability`;
- `source`;
- exact selected-window coverage;
- point count;
- latest observed value;
- observation timestamp;
- quality;
- unavailable reason when applicable.

Older Flow Replay artifacts without these optional sections remain readable.

## Source Quality

Quality remains source-specific:

| State | Meaning |
| --- | --- |
| `verified` | A historical point exists inside the selected UTC window. |
| `degraded` | A factual value exists with a material coverage limitation. |
| `unavailable` | No prepared or provider point exists for the window. |
| `unknown` | Metadata is insufficient for a safe classification. |

Current values outside the selected historical window are not accepted as
verified or degraded historical evidence.

## Coverage States

Flow Replay now exposes a product-level coverage state:

| State | Required evidence |
| --- | --- |
| `MINIMAL` | Verified price evidence only |
| `PARTIAL` | Price plus orderbook-flow evidence |
| `ENRICHED` | Price, orderbook flow, funding, and open interest |
| `COMPREHENSIVE` | Enriched coverage plus liquidations and trades |

Degraded orderbook flow counts as flow evidence for `PARTIAL` and `ENRICHED`,
but it remains explicitly degraded. Coverage does not promote orderbook
quality.

## Builder Behavior

The manual builder:

```powershell
npx.cmd tsx workers/replay/buildFlowReplayEvidence.ts `
  --exchange binance_futures `
  --symbol BTCUSDT `
  --date 2026-02-22 `
  --hour 12 `
  --timeframe 1h
```

Behavior:

1. Read prepared canonical positioning caches.
2. Request only missing positioning sources from CryptoHFTData.
3. Use Binance historical endpoints for still-missing values.
4. Preserve explicit unavailable reasons.
5. Rebuild the compact Flow Replay artifact in the durable artifact store.

One missing provider does not fail the artifact build.

## Artifact Compatibility

The durable artifact remains:

```text
type: replay_intelligence
id: flow-replay:binance_futures:BTCUSDT:2026-02-22:12
```

No artifact type, id, registry schema, or store layout changed.

The new positioning fields live inside existing Flow Replay metadata and are
optional for backward compatibility.

## Audit

`npm run audit:flow-replay` now reports:

- price quality;
- orderbook quality;
- funding quality;
- open-interest quality;
- Flow Replay coverage state;
- artifact evidence-validity coverage;
- source values, timestamps, and point counts;
- unavailable and degraded reasons.

The audit remains read-only.

## Target Result

The rebuilt durable artifact reports:

| Evidence | Quality | Source | Coverage |
| --- | --- | --- | --- |
| Price | `verified` | Binance Vision | 1 exact 1h candle |
| Funding | `verified` | CryptoHFTData | 200 points |
| Open interest | `verified` | CryptoHFTData | 11 points |
| Orderbook flow | `degraded` | CryptoHFTData V2 diagnostic cache | 60 bounded update batches |
| Liquidations | `unavailable` | No prepared target cache | 0 events |
| Trades | `unavailable` | No prepared target cache | 0 events |

Latest observed positioning values:

- funding rate: `0.00002975` raw rate (`0.002975%`);
- open interest: `79680.209`.

Resulting Flow Replay coverage:

```text
ENRICHED
```

The artifact evidence-validity coverage remains `PARTIAL` because orderbook
flow is degraded and liquidation/trade evidence is unavailable.

## Limitations

- Binance historical funding occurs at settlement intervals and may not have a
  point inside every selected hour.
- Binance open-interest history has provider retention limits.
- CryptoHFTData availability depends on configured credentials and source-file
  coverage.
- Liquidation and trade evidence remain optional and are not enriched here.
- Degraded orderbook flow remains unsuitable for complete-book claims.

## Replay Learning Gate

Replay Learning remains out of scope.

Before Replay Learning begins:

1. Validate enriched coverage across multiple windows.
2. Define minimum positioning point coverage by evidence type.
3. Add liquidation/trade evidence where available.
4. Keep orderbook progression claims disabled until verified initialization
   exists.
