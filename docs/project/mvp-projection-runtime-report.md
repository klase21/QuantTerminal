# MVP-3 Consumer Projection Runtime Report

## Result

MVP-3 generated 868 immutable projections from the real bounded corpus, 420 Consistency Results, and 84 Core Evidence Packets. All versions are `GENERATED` and `READY_FOR_CUTOVER`; none are `CONSUMER_VISIBLE`. D2 source publication remains `PENDING`, and page/API consumers are unchanged.

Projection corpus ID: `mvp-projection-corpus:3f33e07c45a8814ac531ee707e8744654d3ae8dfcc84e44fcbc1e792a92824ab`.

## Persisted Counts

| Kind | Full corpus | 2026-07-11 certification slice |
| --- | ---: | ---: |
| CoverageDataStatusProjection | 336 | 24 |
| DashboardMarketStateProjection | 14 | 1 |
| EventAnnotationProjection | 84 | 6 |
| InstrumentMarketSummaryProjection | 84 | 6 |
| ReplayTimelineProjection | 84 | 6 |
| ResearchEvidenceProjection | 84 | 6 |
| ScannerCandidateProjection | 14 | 1 |
| SourceLineageSummaryProjection | 84 | 6 |
| TradeDecisionContextProjection | 84 | 6 |
| **Total** | **868** | **62** |

## Persistence And Recompute

D4 migrations 010 and 011 add immutable projection definitions, versions, bounded dependency links, conflicts, builder/read roles, and read-only schema access. The final generation and exact recomputation reused all 868 versions, retained the corpus checksum, and produced zero conflicts. The read port verified a persisted latest BTCUSDT summary and all dependency checksums.

## Boundedness And Limitations

Replay carries bounded daily lanes and source references, not individual AggTrades or multi-year payloads. Liquidation event history remains source-blocked, historical Order Book remains optional/limited, and governed news is unavailable unless an internal verified annotation exists. These limitations are structured projection states. MVP-4 remains responsible for page/API cutover and may not reinterpret `READY_FOR_CUTOVER` as source publication.
