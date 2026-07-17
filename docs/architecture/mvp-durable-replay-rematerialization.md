# Durable Replay Rematerialization

MVP-8H reconstructs `ReplaySequenceModel` values only from the immutable MVP-8E Core rows, D4 `ReplayTimelineProjection` rows, and checksum-verified AggTrades Parquet segments. Source PostgreSQL sessions set `default_transaction_read_only`; no Core, D4, Refresh, or failed-candidate write port is constructed.

The durable target uses the existing Serving schema without a candidate manifest or exposure. `MvpDurableReplayStore` creates one immutable `WITHHELD / INTERNAL_ONLY` Replay source corpus and writes six verified `serving_replay_sequence` rows through the existing Replay serializer. `PostgresMvpDurableReplayReadPort` supports explicit internal readback by Replay source corpus ID without treating the source as active.

Persistence is permitted only after every reconstructed model checksum equals its symbol-bound MVP-8E checksum. Exact repeat returns `DUPLICATE`; mismatched corpus or row content fails closed. No publication event, candidate manifest, or exposure is created.
