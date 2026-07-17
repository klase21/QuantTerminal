# Replay Deterministic Checksum Recovery

The expected mapping is recovered by joining the failed candidate's immutable Replay member ID to the D4 `ReplayTimelineProjection` version ID. This binds each symbol to one prior model checksum and one source Projection checksum. The common-watermark event supplies the immutable watermark identity and checksum.

The committed Replay builder orders Core rows by UTC timestamp and summarizes AggTrades into 48 deterministic half-hour buckets. Canonical checksum input excludes filesystem paths, process timestamps, random IDs, and database sequences. Each model contains 288 OHLCV samples, 288 Open Interest samples, three Funding observations, and 48 flow buckets.

The rematerialization contract rejects an unordered checksum set, a missing symbol, duplicate binding, source-count mismatch, invalid Parquet checksum, Projection mismatch, or any reconstructed checksum difference. Readback is revalidated with the existing Serving Replay checksum verifier.
