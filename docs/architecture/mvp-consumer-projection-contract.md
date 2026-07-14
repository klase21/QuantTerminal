# MVP Consumer Projection Contract

## Boundary

A Consumer Projection is an immutable, consumer-specific derivative of governed Canonical Facts, Canonical Stream Segments, Consistency Results, Core Evidence Packets, and Coverage decisions. It is not source publication, an Evidence Packet, page HTML, or a page-owned calculation.

The MVP runtime defines nine projection kinds:

| Kind | Consumer | Bounded subject |
| --- | --- | --- |
| `DashboardMarketStateProjection` | Dashboard | six-instrument daily window |
| `InstrumentMarketSummaryProjection` | Markets | instrument/day |
| `ReplayTimelineProjection` | Replay | instrument/day |
| `ResearchEvidenceProjection` | Research | Evidence Packet/instrument/day |
| `ScannerCandidateProjection` | Scanner | comparable six-instrument daily ranking |
| `TradeDecisionContextProjection` | Trade | instrument/day context, never an instruction |
| `CoverageDataStatusProjection` | Shared | dataset/instrument/day |
| `SourceLineageSummaryProjection` | Shared | instrument/day |
| `EventAnnotationProjection` | Shared | instrument/day governed annotations |

## Identity And Time

`projectionId` identifies kind and subject. `projectionVersionIdentity` additionally binds Event-Time range, Knowledge-Time cutoff, dependency digest, generator/version, and schema version. Worker identity, local paths, execution time, and generated prose are excluded. Exact inputs therefore reuse the same version; changed input truth or generator version produces a different version.

Each version retains structured payload, completeness, limitations, lifecycle, exposure, checksum, and bounded dependencies. Numerical market values retain Canonical Fact or Segment-derived Evidence dependencies. Conclusions retain Evidence Packet and Consistency Result dependencies.

## Consumer Semantics

Missing enrichment is classified, never zero-filled. Funding remains a provider-native event. Replay stores bounded OHLCV/OI summaries, a native Funding marker, AggTrades aggregates, Evidence markers, and limitation markers; it never embeds raw AggTrade history. Scanner rank means investigation priority under comparable Coverage, not expected profit. Trade projections emit context and observable invalidation conditions, never BUY, SELL, LONG, SHORT, orders, sizing, or entry/exit instructions.

## Read Port

The read-only port supports exact version lookup, latest generated ready version, bounded range/kind/subject queries, exposure filtering, dependency inspection, and checksum verification. Pages and APIs do not call this port until MVP-4. Page size is fail-closed to `1..100`.
