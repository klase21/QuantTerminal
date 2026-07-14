# D3 Phase 3 Liquidation Historical Source Report

Generated: 2026-07-14T09:35:09.149Z

## Decision

No approved provider-native historical observed-event source is currently available for the governed Binance USD-M Futures liquidation scope. Historical Canary execution is blocked and no full-history inventory was created.

Separately, the repository contains a previously implemented and verified Coinalyze Internal Web provider for five-minute aggregated long/short liquidation-volume bars. It is experimental, non-canonical, explicitly mapping-gated, and suitable as supplemental evidence. It is not equivalent to complete individual forced-order history and currently belongs to the legacy Historical Backfill Repository rather than the D2/D3 Population path.

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
| Coinalyze Internal Web | Implemented in the legacy Historical Backfill Repository; production-approved there as experimental supplemental evidence; absent from the D3 provider registry | Five-minute long/short liquidation-volume bars, explicit BTCUSDT mapping, no individual event identity, execution price, or independently verified notional | `EXPERIMENTAL_AGGREGATED_LIQUIDATION_BARS` | Retain as supplemental evidence; migrate separately into D3 |

## Corrected Source Taxonomy

### Complete Canonical Observed Liquidation Events

`BLOCKED`

No selected source supplies an approved, complete provider-native USD-M individual liquidation-event history for the six governed instruments.

### Coinalyze Internal Aggregated Liquidation Bars

`AVAILABLE_IN_LEGACY_REPOSITORY_WITH_LIMITATIONS`

The implementation exists in `lib/historical-backfill/liquidationSources.ts` and `lib/historical-backfill/liquidationBackfill.ts`. The source is registered as `coinalyze-internal-web` in the legacy source registry with `providerTier: EXPERIMENTAL`, `canonical: false`, `verified: false`, and confidence `0.65`.

The provider uses the publicly rendered chart datafeed discovered from the rendered page request flow:

```text
POST https://coinalyze.net/chart/getTheBars/
```

No HAR file or request key is checked into the repository. The design records preserve the HAR-derived endpoint and mapping while requiring the dynamic `REQ_KEY` to be supplied ephemerally. Cookies and browser sessions are rejected, and the key is not logged, persisted, or included in record checksums.

The only verified mapping is:

```text
BTCUSDT market             -> BTCUSDT_PERP.A
BTCUSDT long liquidation  -> BTCUSDT_PERP_LQS.A
BTCUSDT short liquidation -> BTCUSDT_PERP_LQB.A
```

There is no suffix inference or generic symbol transformation. Unmapped symbols return `COINALYZE_MAPPING_MISSING` without making an Internal Web request.

## Prior Coinalyze Execution Evidence

The checked-in B6R records document a real `2026-07-01` BTCUSDT execution:

- Endpoint result: HTTP 200
- Resolution: five minutes
- Source bars: 288
- Non-empty bars: 221
- Mapped long/short records: 298
- First execution: 298 experimental records written
- Exact rerun: 298 duplicates, zero writes
- Persisted repository identity mismatches: 0
- Persisted duplicate domain identities: 0

The temporary out-of-repository response artifact was removed after validation. These results certify legacy Repository idempotency for aggregated bars; they are not a D3 Canary and do not certify Raw Artifact lineage or D2 Canonical persistence.

## Aggregated-Bar Semantics

Coinalyze `barData` is keyed by provider epoch seconds. Each five-minute bucket may contain a mapped long series and short series. The parser drops zero-valued rows and stores the provider-visible volume as `quantity`. `price` and `notional` remain `null`; neither is reconstructed. LONG and SHORT describe the provider's aggregate liquidation series, not individual force-order sides or position-level executions.

Deterministic legacy identity uses source ID, symbol, observed time, side, and provider-visible quantity. Provider identity keeps experimental aggregates separate from canonical records.

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

## D2/D3 Compatibility

The Coinalyze implementation is not currently compatible with the certified D2/D3 path:

- It writes `HISTORICAL_LIQUIDATION` records through `PersistenceRepository.saveHistoricalLiquidationRecord()`.
- The recorded 2026-07-01 evidence is in `.data/historical-backfill.sqlite`, not `quantterminal_backfill`.
- It stores no durable Raw Artifact or page payload.
- It creates no D3 Retrieval, Candidate, Unit, checkpoint, or Coverage decision.
- It does not commit through the D2 Canonical Commit boundary or create D2 lineage/publication state.
- `coinalyze-internal-web` is absent from the D3 provider registry.
- The D3 Liquidation Fact is an individual BUY/SELL event contract with mandatory price and quantity; it cannot truthfully represent five-minute LONG/SHORT aggregate bars with null price and notional.

Migration therefore requires an explicit additive aggregate-bar dataset or target kind, provider registration scoped to supplemental evidence, Raw Artifact and Retrieval lineage, a typed five-minute aggregate Candidate/Fact contract, bounded Coverage, and preservation of mapping and ephemeral-key gates. It must not insert Coinalyze bars into the canonical individual-event identity space.

The separate individual-event contract gap also remains: the current D3 Liquidation Candidate and D2 Liquidation Fact cannot retain all verified force-order fields.

## Storage Model

Final storage-model selection is deferred until source approval and inventory measurement. The verified 101-event hourly probe suggests a Canonical Fact model is provisionally appropriate and far below AggTrades density, but it is not sufficient to estimate complete history. A Segment model is not justified by current evidence and remains available if the approved inventory proves materially larger.

## Exact Next Step

Run a bounded **D3 Coinalyze Aggregated Liquidation Migration and Canary** sprint. Add a distinct experimental aggregate-bar contract and D3 provider binding, preserve the BTC-only explicit mapping and ephemeral request-key boundary, persist the response through Raw Artifact lineage, and rerun the verified 2026-07-01 partition through D3. Keep `COMPLETE_CANONICAL_OBSERVED_LIQUIDATION_EVENTS` blocked as a separate source-approval problem.
