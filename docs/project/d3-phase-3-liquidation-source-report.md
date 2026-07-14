# D3 Phase 3 Liquidation Historical Source Report

Generated: 2026-07-14T09:18:15.814Z

## Decision

No approved provider-native historical observed-event source is currently available for the governed Binance USD-M Futures liquidation scope. Historical Canary execution is blocked and no full-history inventory was created.

The repository's legacy assumption that Binance Vision publishes USD-M `liquidationSnapshot` archives is false for the inspected source. Binance's official USD-M force-order WebSocket is live-only and intentionally emits only the latest liquidation order per symbol within each 1000 ms interval. CryptoHFTData exposes real historical force-order observations, but it is not approved by the D3 registry for Liquidation and its own documentation classifies exchange broadcasts as potentially sampled or throttled.

## Governed Scope

- Venue: Binance USD-M Futures
- Instruments: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT
- Required truth: provider-native observed liquidation or force-order events
- Frozen cutoff: 2026-07-12T00:00:00.000Z

## Candidate Sources

| Candidate | Repository status | Verified evidence | Classification | Decision |
| --- | --- | --- | --- | --- |
| Binance Vision USD-M `daily/liquidationSnapshot` | Legacy code treats it as primary | The USD-M S3 prefix is empty. Direct probes for all six governed symbols returned HTTP 404. | `UNSUPPORTED` | Reject |
| Binance Vision COIN-M `daily/liquidationSnapshot` | Not governed for this scope | A BTCUSD_PERP archive exists, but it is COIN-M and cannot stand in for USD-M instruments. | `UNSUPPORTED` for governed scope | Reject |
| Binance USD-M force-order WebSocket | Approved live provider | Official documentation says only the latest order per symbol in each 1000 ms interval is pushed. It is not a historical inventory. | `LIVE_ONLY_STREAM` | Reject for historical Canary |
| Binance public historical REST | No approved all-market historical adapter | No official public all-market historical liquidation endpoint was identified. User-data force-order history is account-specific. | `UNSUPPORTED` | Reject |
| CryptoHFTData Binance Futures Liquidations | Provider is approved only for Order Book in the current registry | Real hourly Parquet/Zstd observed-event data was verified. History is documented from 2025-06-28; broadcasts may be sampled/throttled and totals are a lower bound. | `THIRD_PARTY_OBSERVED_EVENTS` | Requires explicit provider approval and scope policy |
| Coinalyze internal visible-data feed | Experimental, non-canonical, BTC-only mapping | Five-minute long/short liquidation-volume aggregates omit provider event identity and execution truth. | `UNSUPPORTED` for observed events | Reject |

## Provider Evidence

The Binance Vision USD-M list request for `data/futures/um/daily/liquidationSnapshot/` returned no common prefixes or objects. Object probes for 2026-07-11 returned 404 for BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, and DOGEUSDT. Additional BTCUSDT probes for 2020-01-01, 2021-05-19, and 2024-06-15 also returned 404.

A COIN-M BTCUSD_PERP archive was inspected only to understand the source format. It contained columns for time, side, order type, time in force, original quantity, order price, average price, order status, last fill quantity, and accumulated fill quantity. It contained no provider event or order ID and included exact duplicate physical rows. The temporary inspection file was removed and was not persisted through D3.

Official references:

- Binance public data repository: https://github.com/binance/binance-public-data
- Binance USD-M force-order stream: https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/ws-streams/market#all-market-liquidation-order-streams
- CryptoHFTData liquidation dataset: https://www.cryptohftdata.com/datasets/binance-liquidation-data
- CryptoHFTData liquidation REST documentation: https://www.cryptohftdata.com/docs/rest-liquidations

## CryptoHFTData Discovery Probe

A bounded, read-only discovery probe retrieved one documented BTCUSDT hourly object for 2025-08-01 20:00 UTC. This was not a D3 Canary: it did not create a Raw Artifact, Retrieval, Candidate, Canonical Fact, lineage edge, Coverage decision, checkpoint, or Unit.

- Compressed bytes: 4,383
- Decompressed bytes: 10,854
- SHA-256: `922b2a714201166a09e2d5aa6990ac45a0fbb647b008f9f564e44b340d9fe7b4`
- Rows: 101
- Measured compressed bytes/event: 43.396
- Columns: received time, event time, symbol, side, order type, time in force, quantity, order price, average price, order status, last filled quantity, filled quantity, trade time
- Provider event/order ID: absent

The probe confirms that a real historical observed-event feed exists, but not that it is complete, approved, or available across the required six-instrument range.

## Field Semantics

For Binance-compatible force-order payloads, `side` is the liquidation order side: BUY represents a short-position liquidation and SELL represents a long-position liquidation. Order price and average execution price are distinct. Original quantity, last filled quantity, and accumulated filled quantity are distinct. Event time and trade/update time are distinct; CryptoHFTData additionally supplies a receive timestamp.

No inspected historical source supplied a provider event ID. A future identity contract therefore must bind the immutable source object and row ordinal or an approved full event tuple. It must preserve string-safe timestamps and IDs and lossless decimal strings. Source duplicates must be classified explicitly rather than silently collapsed.

## Contract Gap

The existing D3 Liquidation Candidate and D2 Liquidation Fact retain only symbol, side, one price, one quantity, event time, and optional provider record ID. They cannot retain the full force-order truth listed above. Once a source is approved, an additive typed contract and migration will be required before a real Canary.

## Storage Model

Final storage-model selection is deferred until source approval and inventory measurement. The verified 101-event hourly probe suggests a Canonical Fact model is provisionally appropriate and far below AggTrades density, but it is not sufficient to estimate complete history. A Segment model is not justified by current evidence and remains available if the approved inventory proves materially larger.

## Exact Next Step

Approve or reject CryptoHFTData as the governed historical Liquidation source, including its lower-bound completeness limitation, redistribution terms, six-instrument availability, and deterministic identity policy. If approved, add the missing typed force-order fields through an additive D2/D3 contract, then run one exact-partition Canary and rerun.

