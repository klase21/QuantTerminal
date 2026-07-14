# D3 Phase 3 Liquidation Canary Report

Generated: 2026-07-14T09:18:15.814Z

## Status

`NOT_RUN`

No approved historical observed-event source exists in the current D3 provider registry. Running a Canary against an unapproved third-party source or against the nonexistent Binance Vision USD-M archive would violate the governed source boundary.

## Preconditions

| Precondition | Result |
| --- | --- |
| Approved historical observed-event source | FAIL |
| Exact six-instrument availability | UNKNOWN |
| Source completeness classification | No complete source selected |
| Provider-native field retention | FAIL in current typed contract |
| Deterministic identity policy | BLOCKED because inspected sources lack event IDs |
| Storage model | Deferred; Fact model is provisional |

## Discovery Probe Is Not a Canary

One CryptoHFTData BTCUSDT hourly object was retrieved for source discovery. It contained 101 real observed force-order rows in 4,383 compressed bytes and had SHA-256 `922b2a714201166a09e2d5aa6990ac45a0fbb647b008f9f564e44b340d9fe7b4`.

The object was not persisted in the approved Artifact root and did not enter the D3/D2 pipeline. It therefore provides no Canary persistence, lineage, publication, Coverage, checkpoint, or idempotency evidence.

## Persisted Counts

- Liquidation Raw Artifacts: 0
- D2 Raw Objects: 0
- D3 Retrievals: 0
- Liquidation Candidates: 0
- Canonical Liquidation Facts: 0
- Lineage links: 0
- Publication decisions: 0
- Coverage decisions: 0
- Checkpoints: 0
- Terminal Units: 0
- Conflicts: 0
- Retries: 0

## Rerun

`NOT_RUN`

There is no authoritative Canary partition to rerun. Idempotency is not claimed.

## Capacity

The discovery sample measured 43.396 compressed bytes per event. PostgreSQL relation/index growth, memory peak, canonical bytes per event, and full-history event count are `UNKNOWN` because no approved Canary ran and no complete provider inventory exists.

## Blocker

`D3P3-LIQ-B01`: select and explicitly approve a historical observed-event source. A CryptoHFTData approval would need to accept and expose the provider's lower-bound completeness limitation rather than presenting the data as a complete exchange liquidation history.

