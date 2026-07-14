# QuantTerminal MVP Page Data Requirements

Status: product and data contract
Machine-readable source: `docs/project/mvp-page-data-matrix.json`

## Shared Rules

- Every primary value has Event Time, Knowledge Time where governed, source status, projection version, and enough lineage to locate its Canonical input.
- A chart declares its exact available interval and marks every gap. Partial data is not styled as a complete window.
- Scanner compares only instruments with the same mandatory dataset window and status.
- Confidence is a component availability result before it is a number. Missing mandatory components yield `CONFIDENCE UNAVAILABLE`.
- Liquidation bars are `EXPERIMENTAL` and `LOWER_BOUND`; they never become complete observed-event history.
- Cross-page links carry durable instrument, time/window, candidate, Evidence, and projection identities when available.
- Legacy values may appear during migration only with their legacy/source status. They do not satisfy the MVP gate for a projection-required feature.

## Dashboard

Primary contract: `DashboardMarketStateProjection`, supported by `InstrumentMarketSummaryProjection`, `CoverageDataStatusProjection`, and `SourceLineageSummaryProjection`.

The direction and driver result requires aligned current OHLCV, OI, and Funding plus at least seven complete days of the common 90-day window. AggTrades is required for trading-intensity comparison but is an enhancement to the core derivatives conclusion. Liquidation is optional supplemental evidence and must disclose its lower-bound scope.

The page is insufficient when it has no classified direction/status, when driver facts do not carry source references, or when a blank loading boundary hides the state.

## Replay

Primary contract: `ReplayTimelineProjection` plus `EventAnnotationProjection`.

An approved Replay window requires synchronized Event Time for OHLCV, OI, Funding, and AggTrades. Playback uses only the intersection of available mandatory lanes. A missing optional liquidation or order-book lane does not block price playback, but the lane remains visible with its exact status.

Historical order book is either a certified snapshot-plus-update corpus or explicitly `LOWER_BOUND` update flow. Request handlers read prepared caches only. They never reconstruct millions of events synchronously.

## Research

Primary contract: `ResearchEvidenceProjection`, backed by versioned Consistency Results and an Evidence Packet.

The projection separates verified facts, interpretation, counter-evidence, source limitations, lineage, and recompute/version metadata. A conclusion requires every mandatory fact defined by its Evidence profile. A Confidence value requires all mandatory Confidence components, sample size, Coverage status, and rule version.

Historical Analog, Event Impact, and Market Memory stay manual-load and cache-first. They are demo-quality enhancements until their contracts and verified event sample are sufficient.

## Markets

Primary contract: `InstrumentMarketSummaryProjection` for the six governed instruments.

Each row requires latest price/change, OI, Funding, market-state classification, Coverage, and latest Evidence status. Realtime chart/depth/trade panels may continue using protected realtime infrastructure; their values must remain distinguishable from canonical historical projections.

Sector, capital-flow, macro, ETF, prediction, and reserve sections remain source-native enhancements. Their failure cannot erase the core instrument table.

## Scanner

Primary contract: `ScannerCandidateProjection`.

A candidate requires a durable ID, covered common comparison window, observable reason codes, supporting fact references, Evidence/Confidence availability, and projection version. Ranking excludes any instrument whose mandatory OHLCV/OI/Funding window is not comparable. Exclusion is visible with a Coverage reason.

The selected candidate persists across Scanner, Markets, Replay, Research, and Trade navigation by durable ID. The current legacy opportunity score does not satisfy this gate.

## Trade

Primary contract: `TradeDecisionContextProjection`.

The page requires the selected Scanner candidate, current market context, supporting facts, counter-evidence, risk factors, observable invalidation conditions, related Evidence, and explicit data status. It may withhold a planning conclusion when inputs are missing. It may not invent an entry, stop, target, Confidence, or invalidation price.

Local tracked setups remain planning-only. Real order execution is outside the MVP.

## Minimum Multi-Dataset Overlap

| Analysis | Mandatory inputs | Minimum aligned history | Optional enhancement | Failure behavior |
|---|---|---|---|---|
| Current market direction | OHLCV, OI, latest Funding | 7 complete days ending at a common 5m boundary | AggTrades 24h/14d baseline | No direction conclusion; show missing inputs |
| Derivatives overheating | OHLCV, OI, Funding | 7 days of 5m OHLCV/OI and all finalized Funding events | AggTrades, liquidation bars | Liquidation limitation is explicit; missing core input suppresses result |
| Scanner ranking | OHLCV, OI, Funding, Coverage | Identical common window across ranked instruments | AggTrades intensity | Exclude insufficient instruments; never normalize missing to zero |
| Replay event | OHLCV, OI, Funding, AggTrades | Exact selected event window | Liquidation, order-book, annotations | Render common mandatory interval; classify optional lanes |
| Research Evidence | Profile-specific canonical facts plus counter-evidence check | Exact profile window | Event annotations, liquidation, order flow | No conclusion/Confidence if mandatory facts are unavailable |
| Trade context | Current market state, candidate, Evidence status | Current projection plus its governed comparison window | Liquidation/order book | Planning context unavailable or partial with reasons |

“Complete” means the expected provider intervals are present or every absence is explicitly classified. It is not a percentage guessed at consumption time.

## Required Consumer Projections

| Projection | Consumers | Inputs | Update/cache behavior | No-data and stale behavior |
|---|---|---|---|---|
| DashboardMarketStateProjection | Dashboard | current market state, Consistency Results, Evidence | update on canonical change or every 5m; retain last governed version | explicit unavailable/stale direction and drivers |
| InstrumentMarketSummaryProjection | Markets, Dashboard, Trade | OHLCV, OI, Funding, realtime state, latest Evidence | per-instrument current cache, 5m refresh | per-field status; no row disappearance |
| ScannerCandidateProjection | Scanner, Trade | instrument summaries, Coverage, rules, Evidence | recompute on summary/rule change or every 5m | no comparable candidates with reasons |
| TradeDecisionContextProjection | Trade | selected candidate, current summary, Evidence, counter-evidence | candidate-version keyed cache | planning context partial/unavailable; no invented levels |
| ReplayTimelineProjection | Replay | canonical facts/segments and optional event lanes | immutable event-window cache | lane-specific classified status and common interval |
| ResearchEvidenceProjection | Research | Consistency Results, Evidence Packet, event metadata | Evidence-version keyed immutable output | no conclusion or Confidence when mandatory components fail |
| CoverageDataStatusProjection | all pages | Coverage, gaps, stale policy, source tier | update on population/status change | always returns a classified status |
| SourceLineageSummaryProjection | all drill-downs | Artifact, Canonical, Result, Evidence refs | immutable by referenced versions | explicit lineage unavailable status |
| EventAnnotationProjection | Replay, Research | Verified Event Catalog and source evidence | immutable by catalog version | no annotation; never infer an event |

Every projection carries Event Time, Knowledge Time, projection schema/version, source versions, and deterministic identity. The existing six registry entries remain proposed and must be aligned to these explicit contracts during the projection sprint.
