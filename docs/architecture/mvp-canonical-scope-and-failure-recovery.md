# MVP canonical scope and failure recovery

Status: authenticated rollback-only certification complete. Live resume was not executed.

## Incident

The failed unit is BTCUSDT AggTrades. Its durable lineage contains one verified day-scoped Raw Object and one `STREAM_MANIFEST` Candidate. Dataset, instrument, provider snapshot, source contract, and UTC interval agree. The Raw Object records provider-native venue `binance-usdm-futures`; the canonical segment uses canonical venue `BINANCE`. The former validator compared those values as if they belonged to the same namespace and emitted `RAW_OBJECT_SCOPE_MISMATCH`.

The producer scope is not wrong. No Raw Object was reclassified or reacquired.

## Dataset-aware scope contract

Raw Object scope validation now requires:

- exact dataset identity;
- exact canonical instrument after identifier normalization;
- exact provider snapshot identity;
- exact source-contract identity;
- a verified immutable Raw Object;
- Candidate or segment time contained by the Raw Object interval.

Provider-native provider and venue labels are not compared with canonical provider or venue labels. Provider authority is established by the immutable provider snapshot.

Funding and Open Interest use point observations contained in a day-scoped Raw Object. AggTrades uses an exact interval because the bounded source contract creates one daily Segment per Raw Object. A non-contained interval, cross-instrument scope, provider-snapshot mismatch, dataset mismatch, or source-contract mismatch fails closed.

## Failure transaction

A Canonical Commit exception is caught before any downstream stage. D3 atomically:

1. verifies the current lease and fence;
2. appends a sanitized `STAGE_FAILURE` event;
3. persists a Candidate-boundary resume checkpoint;
4. transitions the unit to `RETRYABLE`;
5. clears the active lease reference;
6. releases the Population lease with reason `FAILED`.

Exact failure-event replay returns `DUPLICATE`; immutable mismatch returns `CONFLICT`. Canonical retry reuses the deterministic D2 identity and returns `DUPLICATE` rather than creating another Fact.

## Certification

The authenticated rollback suite used the retained target-window shapes:

- one day Raw Object to three DOGEUSDT Funding Candidates;
- one day Raw Object to 288 SOLUSDT Open Interest Candidates;
- one day Raw Object to one BTCUSDT AggTrades Segment;
- one day Raw Object to the retained two-Candidate ETHUSDT Open Interest partial.

It ran twice. Contained scopes passed; future and cross-instrument scopes failed closed. The BTC Segment was committed twice per pass inside D2 rollback transactions: `SUCCESS` followed by `DUPLICATE`. BTC and SOL canonical failures each produced a failure event/checkpoint and released the lease inside D3 rollback transactions. No downstream stage ran. Post-rollback readback matched the original durable unit, lease, event, and checkpoint state exactly, with zero retained rows or artifacts.
