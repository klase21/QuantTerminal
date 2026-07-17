# MVP Fresh Core Direct Load

## Boundary

The MVP-8B direct loader builds a corpus only in a newly isolated PostgreSQL cluster and object root. D2 and D3 share the Fresh Core database so committed foreign keys remain physical. D4, Refresh, and Serving remain separate databases.

The loader does not construct the live-resume coordinator, read an authoritative recovery record, or accept an execution-generation identity from an earlier build. Source bytes are acquired from the certified bounded providers and receive fresh Retrieval, Raw Object, Candidate, Canonical, and downstream lineage.

## Ordering

1. Bootstrap committed migrations and governance definitions.
2. Seed BTCUSDT OHLCV through the bounded OHLCV adapter.
3. Execute SOLUSDT Open Interest as the first non-seed slot.
4. Execute the remaining slots sequentially with independent leases.
5. Validate dataset and common watermarks from logical-slot completeness.
6. Persist bounded Coverage, Consistency, Evidence, Projection, and Replay results.
7. Assemble a withheld, internal-only Serving candidate.

## Fresh Serving Genesis

A zero-state Serving database has no active exposure to inherit. The publisher-only genesis operation atomically creates an empty withheld source corpus and the withheld candidate, preserving manifest linkage without creating an exposure. It exposes no activation operation and rejects a database that already has an active exposure.

## Safety

- Existing database URLs and execution identities are not loader inputs.
- BTCUSDT OHLCV is acquired only when the adapter is explicitly constructed for a fresh authority seed.
- Immutable conflicts fail closed.
- A slot failure releases its lease and prevents downstream progression.
- The candidate remains `WITHHELD` and `INTERNAL_ONLY`.
