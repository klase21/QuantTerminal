# Investigation Memory

## 2026-06 Replay Orderbook

- CryptoHFTData orderbook download and parquet/zstd decoding were verified.
- The data uses `CommonOrderbookEvent` snapshot and update semantics.
- A BTCUSDT one-hour file contained approximately 4.19 million rows.
- Correct reconstruction requires ordered snapshot/update replay.
- Materializing and reconstructing the complete book inside an HTTP request exceeded memory/runtime budgets.
- Tail-only reconstruction was rejected because it can produce incorrect state without the preceding snapshot.
- Current safe behavior is an explicit unavailable result when full reconstruction exceeds the request budget.
- Future resolution requires background processing and a precomputed cache snapshot.

## 2026-06 Local Historical Storage

- Existing local historical JSON files reached roughly 160-260 MB.
- Several store operations read and rewrite entire arrays.
- These files remain useful ingestion artifacts but should not become request-time analytics stores.
