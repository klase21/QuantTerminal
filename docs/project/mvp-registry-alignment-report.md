# MVP-0A Registry Alignment Report

## Result

The MVP compatibility boundary is governed by `mvpIdentityBindings.ts` version `1.0.0`. It aligns persisted D2/D3 identities without altering historical registry declarations or immutable execution snapshots.

## Drift Found

- D1 named OHLCV at `ONE_MINUTE` with API primary while certified D3 persisted `5m` Binance Vision archive data.
- Funding persisted both archive and finalized REST-tail source identities not represented as one D1 primary.
- Open Interest persisted `binance-vision` while D1 named the API provider.
- AggTrades full-volume truth is a `STREAM_MANIFEST`, not per-event D2 Facts.
- Legacy routes/caches use spellings including `market`, `open_interest`, `agg_trade`, and upper-case forms.
- Five minutes appeared as `5m`, `PT5M`, `FIVE_MINUTE`, and `FIVE_MINUTES`.

## Decision

An explicit, fail-closed compatibility map governs the MVP tuple: dataset, provider, venue, market type, canonical instrument, granularity, timestamp semantic, target kind, and normalizer. Persisted identities and lineage remain unchanged.

Changing the core D1 declarations was rejected during implementation because it regenerated the D3 Manifest identity and invalidated the immutable OI snapshot guard. The historical declarations were restored before population.

## Publication Boundary

The repository has no governed `ELIGIBLE` D2 publication state and no approved certifier worker. MVP eligibility is therefore evaluated independently. All certification cells are `ELIGIBLE`; their repository publication decisions remain `PENDING`, and no Consumer Projection was created.

