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
- Intelligence artifacts are the canonical future producer-consumer boundary. Producers publish versioned conclusions with confidence, provenance, freshness, and evidence; consumers discover and read them through registry interfaces rather than implementation modules.
- Evidence Validity V1 separates `observedAt` from `generatedAt`. Producers publish explicit freshness and coverage states; legacy artifacts are adapted conservatively as `UNKNOWN` rather than treating generation time as observation freshness.
- Investigation Thesis V1 extends Shared Investigation Context with a versioned active research question. Dashboard establishes the thesis, URL handoffs preserve it through Research, Historical Intelligence, and Replay, and artifacts may carry it as optional compatibility metadata.
- Contradiction Engine V1 classifies existing prepared positive and negative outcomes into explicit supporting and contradicting evidence. It adds no reasoning, recommendations, confidence, or historical computation, and legacy artifacts remain compatible without contradiction metadata.
