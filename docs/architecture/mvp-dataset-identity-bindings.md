# MVP Dataset Identity Bindings

## Status

Version `1.0.0` governs the Working MVP compatibility boundary. It does not rewrite the historical D1 registry, immutable D3 snapshots, persisted source identities, or lineage.

The historical D1 registry remains the source of its original declarations. The MVP binding layer is the explicit join between those declarations and the source identities already persisted by certified D3 runners. Unknown tuples fail closed.

## Required Bindings

| Dataset | D2 target | Governed provider/source | Venue / market | Granularity | Normalizer |
|---|---|---|---|---|---|
| `ohlcv` | `OHLCV` | `binance-public-archive` / Binance Vision USD-M daily klines | `BINANCE` / `USD_M_FUTURES` | `5m` | `d3-phase3-normalizer-v1` |
| `funding` | `FUNDING` | `binance-vision` archive or `binance-official-rest-funding-rate` finalized tail | `BINANCE` / `USD_M_FUTURES` | `EVENT_8H` | `d3-phase3-normalizer-v1` |
| `open-interest` | `OPEN_INTEREST` | `binance-vision` USD-M daily metrics | `BINANCE` / `USD_M_FUTURES` | `5m` | `d3-phase3-normalizer-v1` |
| `agg-trade` | `STREAM_MANIFEST` | `binance-public-archive` USD-M daily aggTrades | `BINANCE` / `USD_M_FUTURES` | `tick` | `d3-phase3-segment-normalizer-v1` |

Supplemental bindings remain outside the certification slice: Coinalyze liquidation bars are experimental lower-bound evidence, and historical Order Book requires a certified snapshot boundary.

## Compatibility Rules

- Stable dataset IDs are `ohlcv`, `funding`, `open-interest`, `agg-trade`, `liquidation`, and `orderbook`.
- Accepted legacy spellings are enumerated in `mvpIdentityBindings.ts`; there is no fuzzy matching.
- Provider, venue, market type, canonical instrument, and granularity are validated as one tuple.
- The six canonical instruments are fixed to Binance USD-M perpetual identities.
- Original provider and dataset values remain in Raw, Candidate, Fact/Segment, and lineage records.
- Unknown aliases, providers, venues, markets, instruments, and granularities throw governed reason codes.

## Immutable History

The initial attempt to replace D1 primary-provider and OHLCV granularity declarations changed the generated D3 parent Manifest checksum and caused the OI snapshot guard to reject execution. That change was removed. The compatibility layer therefore aligns MVP reads without changing `bfm_ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24` or any full-history snapshot identity.

