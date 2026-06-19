# Architecture Memory

## 2026-06

- Historical computation must not run automatically in request paths.
- File cache is the Phase 1 persistence adapter for precomputed historical intelligence.
- Cache identity is generic: namespace, dataset id, and arbitrary partitions.
- Cache publication uses immutable payload files plus an atomically replaced manifest.
- Manifest version and dataset schema version are separate compatibility boundaries.
- Cache misses and invalid entries return explicit unavailable states; they do not trigger recomputation.
- Ingestion jobs are modeled independently from schedulers, queues, workers, and storage engines.
- Binance Vision and Binance historical APIs are the intended primary long-coverage sources. CryptoHFTData is an enrichment source.
- Replay orderbook became the first cache-backed consumer. Manual generation replays CommonOrderbookEvent data outside request paths and publishes only a final replay-ready snapshot.
- Historical Analog V2 became the second cache-backed consumer. It publishes reusable market-state/outcome datasets and deterministic analog results; Dashboard and Research routes only read validated cache entries.
- Canonical market-data cache contracts now separate source parsing from Historical Analog, Replay, Market Memory, and Event Impact consumers. Binance Vision/API data is primary; CryptoHFTData remains enrichment.
