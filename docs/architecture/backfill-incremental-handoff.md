# Backfill to Incremental Handoff

Each approved Manifest freezes a per-dataset and per-instrument covered boundary. Incremental population may start either exactly after the final covered interval or at an explicitly governed overlap boundary. Overlap requires the same canonical identity, normalizer, checksum, and D2 idempotency rules as backfill.

The handoff record must retain Manifest ID/checksum, last classified partition, Fact watermark, final source event/interval identity, incremental start boundary, overlap policy, unresolved gap IDs, and creation time. A handoff is ineligible while required partitions are unclassified, D2 outcomes are unresolved, or gaps can hide work.

The current blocked Manifest freezes `2026-07-12T00:00:00.000Z` as a candidate handoff boundary based on verified 2026-07-11 Binance Vision OHLCV archives for six active focus instruments. It is not an eligible handoff: the full partition inventory, terminal outcomes, D2 Facts, and coverage decisions do not exist. Production scheduling remains disabled.
