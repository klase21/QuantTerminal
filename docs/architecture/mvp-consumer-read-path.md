# MVP Consumer Read Path

## Boundary

The MVP page path is `Consumer Projection -> MvpConsumerProjectionFacade -> /api/mvp/projections -> page mapping`. The facade is server-only, verifies each immutable Projection checksum, requires `GENERATED` lifecycle state, and derives effective exposure from the append-only cutover ledger. It never regenerates a Projection or reads mutable operational progress.

Queries are bounded by view. Dashboard reads one aggregate window, Scanner reads one ranking, Research reads one Evidence projection, and Replay accepts one instrument and at most one UTC day. Classified failures are returned as `ROLLBACK_ACTIVE`, `PROJECTION_MISSING`, `PROJECTION_WITHHELD`, `PROJECTION_INVALID`, or `READ_ERROR`; errors are not cached as valid data.

## Time and Source Semantics

Event Time, Knowledge Time, Projection identity, checksum, limitations, Coverage, Confidence, and lineage references survive the facade unchanged. Live Binance quotes remain a labeled overlay with their own observed time and freshness. They never update governed Evidence or replace the Projection reference value.

## Consumer Mapping

- Dashboard: Dashboard state, instrument summaries, Coverage, lineage, annotations.
- Markets: six instrument summaries, Coverage, lineage.
- Scanner: one comparable ranking, Research Evidence, Coverage.
- Trade: candidate context, instrument summary, Evidence, Coverage.
- Replay: one bounded timeline, annotations, Coverage, lineage.
- Research: one structured Evidence view, annotations, Coverage, lineage.

