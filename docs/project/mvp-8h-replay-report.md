# MVP-8H Durable Replay Report

## Result

Six deterministic Replay payloads were reconstructed from read-only MVP-8E Core and D4 inputs, matched against the exact symbol-bound MVP-8E checksums, and persisted in a new isolated Replay source database.

## Certification

- Required symbols: six
- Durable Replay rows: six
- Checksum matches: six
- Reader successes: six
- Sample counts per symbol: 288 OHLCV, 288 Open Interest, three Funding, 48 AggTrades flow buckets
- Duplicate identities: zero
- Candidate manifests: zero
- Active exposures: zero

The Replay source corpus is immutable, `WITHHELD`, and `INTERNAL_ONLY`. It is not a Serving candidate and cannot be selected by the active-corpus reader. The internal Replay read port verifies the complete payload and snapshot checksum without exposure.

Core, D4, Refresh, failed candidate, Production, Neon, and Vercel were not modified.
