# Markets V2 Improvement Backlog

**Status:** Post-design implementation backlog  
**Sprint:** F4  
**Rule:** This backlog does not authorize provider, API, runtime, socket, or
Repository changes by itself.

## Critical

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Align implementation hierarchy to Markets V2 | Establish global summary -> sectors -> flow -> derivatives -> external context -> breadth -> handoffs. | PDGM-105, component extraction | Current live behavior remains functional. |
| Remove duplicate Market Movers presentation | Preserve one mover/breadth route and Scanner ownership. | Market Breadth Ledger | No duplicated symbols or competing prioritization panels. |
| Prevent neutral fallback from missing inputs | Preserve evidence integrity. | Global Market Summary contract | Missing funding, flow, breadth, or macro remains unavailable. |
| Standardize evidence metadata | Expose source, timestamp, confidence, freshness, coverage, and raw link. | Evidence Card, Repository Link | No source-ambiguous market module. |
| Preserve socket responsiveness | Keep Markets real-time first. | Existing websocket/store contracts | No heavy historical work or blocking module. |
| Preserve bounded liquidation access | Keep historical detail safe. | Replay handoff contract | No unbounded history or request-time reconstruction. |

## High

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Implement Global Market Summary | Provide five-second market orientation. | Multi-source readiness contract | Direction, risk, breadth, confidence, freshness, coverage, and provenance visible. |
| Implement accessible Sector Heatmap | Improve sector scanning. | Source-backed rotation data | Text labels and unavailable states work without color. |
| Consolidate Capital Flow modules | Separate ETF, stablecoin, reserves, dominance, correlation, and volatility. | Typed evidence contracts | No cross-module inferred narrative. |
| Build Derivatives Intelligence Cluster | Keep OI, funding, liquidation, price, and venue state coherent. | Existing Futures and market data | Each datum retains source and freshness. |
| Elevate Scanner context handoff | Route selected attention with evidence. | Shared product context | Sector, symbol, timeframe, and source state preserved. |
| Add supporting/counter-evidence ledger | Prevent one-sided global summaries. | Research evidence model | Missing counter-evidence remains `REQUIRED`. |

## Medium

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Macro Calendar module | Add time-qualified macro context. | Approved source contract | No inferred macro regime. |
| Prediction Market module | Add external probability evidence. | Approved source envelope | Probability never becomes platform prediction. |
| Stablecoin Flow module | Add source-backed liquidity context. | Governed provider | Missing flows remain unavailable. |
| Saved market views | Support repeatable monitoring. | Workspace model | Saved view does not save stale conclusions. |
| Market evidence drawer | Inspect sources without leaving context. | Evidence and Repository contracts | Reads remain responsive and bounded. |
| Responsive Markets mode | Support laptop and tablet monitoring. | Responsive system | Global summary and sector state remain first. |

## Low

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Multi-monitor layouts | Improve professional workflows. | Workspace model | Canonical single-screen hierarchy remains available. |
| Custom sector groups | Support specialized monitoring. | Sector registry | Custom groups never alter source facts. |
| Collaborative watchlists | Share market context. | Identity and collaboration | Annotations remain separate from evidence. |

## Future

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Cross-market plugins | Expand to equities, macro, RWA, and additional chains. | Plugin and source governance | New domains use existing evidence contracts. |
| AI-assisted attention routing | Suggest investigation destinations. | AI and reasoning governance | Suggestions cite evidence and do not generate signals. |
| Enterprise risk workspace | Aggregate reviewed market risks. | Permissions, audit, collaboration | Facts, review status, and human notes remain distinct. |
| Advanced correlation network | Visualize source-backed relationships. | Bounded correlation datasets | No inferred edge or synthetic coefficient. |

## Recommended Sequence

```text
Canonical states
  -> Global Market Summary
  -> Sector Rotation
  -> Capital Flow
  -> Derivatives Intelligence
  -> Evidence / Repository audit
  -> Scanner and Research handoffs
  -> Macro and Prediction modules
  -> Workspace productivity
```

## Out of Scope

- New providers or APIs;
- socket or store rewrites;
- fabricated market direction, risk regime, or sector returns;
- generated confidence;
- automatic trade or signal generation;
- unbounded historical processing;
- exact Repository scans in live request paths;
- conversion of Markets into a ticker board or Scanner replacement.

