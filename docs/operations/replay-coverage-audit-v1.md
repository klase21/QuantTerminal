# Replay Coverage Audit V1

## Purpose

Replay Coverage Audit V1 reports whether cached Historical Analog cases can
enter a usable Replay workflow. It is deterministic and read-only.

Run:

```powershell
npm run audit:replay-coverage
```

The audit does not download source files, generate Replay caches, reconstruct
orderbooks, publish artifacts, or change scheduler state.

## Methodology

The audit reads:

1. Historical Analog V2 caches for `BTCUSDT` and `ETHUSDT`.
2. The SOLUSDT Historical Analog cache only when it exists and contains cases.
3. Replay orderbook cache manifests and payloads for every compatible case.
4. Active durable `replay_learning` artifacts for the audited symbols.

All targets use:

- exchange: `binance_futures`
- timeframe: `1h`

## Coverage Definitions

### Total Analog Cases

Every case in the valid Historical Analog V2 cache for the symbol.

### Replay-Compatible Case

A case whose UTC date is on or after the documented CryptoHFTData coverage
start:

```text
2025-07-01
```

This is a source-window compatibility check. It does not contact the provider
and therefore does not prove that a specific remote file currently exists.

### Replay Source Availability

`available` means the case is inside the documented CryptoHFTData coverage
window. `outside_retention` means the case predates that window.

No network request or source download is performed.

### Orderbook Availability

Orderbook availability requires a valid, non-expired local cache at:

```text
replay/orderbook-snapshot
  exchange
  symbol
  date
  hour
```

Missing, expired, corrupt, incomplete, failed, or schema-incompatible entries
are reported explicitly. The audit never triggers cache generation.

### Replay Learning Availability

Replay Learning is available only when an active durable `replay_learning`
artifact matches the symbol, exchange, date, and UTC hour of the analog case.

## Output

Per symbol, the report includes:

- total analog cases;
- Replay-compatible cases and percentage;
- source-compatible case count;
- orderbook cache count;
- Replay Learning count;
- earliest and latest compatible dates;
- a case-by-case availability record.

The priority matrix is:

- P0: Replay-compatible cases without orderbook cache.
- P1: Replay-compatible cases without Replay Learning artifacts.
- P2: analog cases outside the source retention window.

Recommended backfill targets are deterministic P0 coordinates sorted by
similarity descending, then timestamp ascending.

## Current Coverage

Audit date: 2026-06-22.

| Symbol | Analog cases | Replay-compatible | Compatible % | Orderbook cache | Replay Learning |
| --- | ---: | ---: | ---: | ---: | ---: |
| BTCUSDT | 25 | 6 | 24% | 0 | 0 |
| ETHUSDT | 25 | 0 | 0% | 0 | 0 |

BTCUSDT compatible coverage runs from 2025-07-20 through 2026-04-05.
ETHUSDT has no compatible case because its latest selected analog is before
2025-07-01.

SOLUSDT was not included because no valid Historical Analog cache exists.

### P0 Backfill Targets

The six current BTCUSDT windows that are source-compatible but lack orderbook
cache are:

| Date | UTC hour | Similarity |
| --- | ---: | ---: |
| 2026-02-22 | 12 | 94.2713 |
| 2025-07-20 | 17 | 92.7355 |
| 2026-04-05 | 12 | 92.7304 |
| 2026-03-08 | 11 | 92.3368 |
| 2026-03-29 | 17 | 92.2906 |
| 2025-09-15 | 07 | 92.2148 |

The audit lists these in recommended backfill order. It does not build them.

Run the command after cache or artifact production to refresh these results.

## Limitations

- Provider file existence is not verified because this audit is intentionally
  offline and read-only.
- Binance kline availability is not used as a proxy for CryptoHFTData
  microstructure availability.
- A compatible case can still lack liquidations, trades, OI, or funding.
- Orderbook coverage measures only prepared cache availability, not raw source
  availability.
- Archived and expired Replay Learning artifacts do not count as available.
- The audit reports gaps but does not generate any missing evidence.
