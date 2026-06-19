# Project Memory

## 2026-06

- Dashboard Historical Analog was removed to keep the primary dashboard responsive. Historical workflows belong in Replay and Research.
- Replay evolved into the primary historical market investigation workspace.
- QuantTerminal adopted a cache-first historical intelligence direction: ingest, process, cache, then render.
- Historical Intelligence Platform phases were established: file cache, scheduler/polling, DuckDB analytics, SQLite application cache, then broader historical intelligence workflows.
- Replay orderbook cache generation and cache-only consumption established the first end-to-end ingest, process, cache, render implementation.
- Historical Analog V2 established reusable feature states, exact forward outcomes, deterministic similarity search, and cache-only API consumption without restoring historical work to Dashboard.
- Raw Market Data Cache V1 established canonical OHLCV, funding, open-interest, liquidation, and orderbook-summary contracts plus shared cache readers and a real Binance Vision OHLCV builder.
- The Intelligence Artifact Registry established a common model and discovery/read boundary for Historical Analog, Replay Intelligence, Dashboard Evidence, and future intelligence systems.
