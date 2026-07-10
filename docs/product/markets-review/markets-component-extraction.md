# Markets V2 Component Extraction

**Status:** Canonical extraction candidate list  
**Sprint:** F4  
**Source:** [QuantTerminal Markets V2](https://www.figma.com/design/ASFD05NgMGYhyvC8ZFjvgb)

## Extraction Rule

Markets reuses Dashboard, Replay, and Research components before introducing
Markets-owned compositions. Shared components retain source, timestamp,
freshness, coverage, availability, and context. Empty states never contain
illustrative market values.

## Shared Canonical Components

| Component | Owner | Priority | Target screens | Dependencies |
| --- | --- | ---: | --- | --- |
| Global Navigation | Presentation | P0 | All screens | Navigation and context contracts |
| Context Toolbar | Presentation | P0 | Markets, Replay, Research, Trade | Search, symbol, timeframe, source filters |
| Status Badge | Design System | P0 | All screens | Canonical state model |
| Confidence Badge | Evidence | P0 | Dashboard, Markets, Replay, Research | Source-backed confidence only |
| Freshness Badge | Evidence | P0 | Dashboard, Markets, Replay, Research | Source timestamp and policy |
| Evidence Card | Evidence | P0 | All evidence screens | Fact, source, state, limitation, Repository link |
| Metric Card | Presentation | P0 | Dashboard, Markets, Replay, Trade | Real value or explicit unavailable state |
| Heatmap | Visualization | P0 | Markets, Scanner | Accessible labels and unavailable behavior |
| Repository Link | Repository / Presentation | P0 | Evidence-driven screens | Fact identity and context |
| Empty / Unavailable State | Design System | P0 | All screens | State, reason, next safe action |
| Cross-Navigation Action | Presentation | P0 | All screens | Shared product context |
| Filter Control | Design System | P1 | Markets, Replay, Research, Scanner | Accessible filtering |
| Panel Header | Design System | P1 | Dense screens | Section label, description, state |

## Markets-Owned Compositions

| Component | Owner | Priority | Future reuse | Dependencies |
| --- | --- | ---: | --- | --- |
| Global Market Summary | Markets | P0 | Dashboard context input | Multi-source evidence readiness |
| Sector Card | Markets | P0 | Scanner, Research | Sector identity, performance basis, source state |
| Sector Rotation Heatmap | Markets | P0 | Scanner | Source-backed relative performance |
| Sector Participation Panel | Markets | P0 | Scanner | Mapped universe and breadth |
| Capital Flow Module | Markets / Evidence | P0 | Dashboard, Research | Typed flow evidence contract |
| Derivatives Intelligence Cluster | Markets | P0 | Replay, Research | Price, OI, funding, liquidation, venue state |
| Macro Calendar Panel | Markets | P1 | Dashboard, Research | Approved events and timestamps |
| Prediction Market Panel | Evidence | P1 | Dashboard, Research | Probability, liquidity, timestamp, limitation |
| Market Breadth Ledger | Markets | P0 | Dashboard, Scanner | Universe, movers, participation, concentration |
| Investigation Route Card | Presentation | P0 | Dashboard, Markets, Research | Preserved context and page ownership |
| Market Evidence Ledger | Evidence | P0 | Markets, Research | Support, conflict, confidence, freshness, coverage |
| Repository Audit Panel | Repository / Presentation | P1 | Markets, Replay, Research | Live state, historical coverage, raw records |

## Key Component Contracts

### Global Market Summary

Required inputs:

- observed direction or unavailable state;
- risk regime or unavailable state;
- breadth;
- supporting and counter-evidence references;
- confidence;
- freshness;
- coverage;
- provenance.

Missing inputs cannot default the summary to neutral.

### Sector Card

Required inputs:

- sector identity;
- comparison window;
- performance measure;
- source identity;
- timestamp;
- freshness;
- availability;
- Repository link when available.

Color intensity is disabled if performance is unavailable.

### Capital Flow Module

Required inputs:

- flow category;
- observed value and unit;
- observation timestamp;
- source;
- freshness;
- coverage;
- limitation.

One flow module never supplies a global capital-direction conclusion alone.

### Derivatives Intelligence Cluster

Required inputs:

- selected symbol and exchange;
- price state;
- OI;
- funding;
- liquidation state;
- venue comparison;
- supporting and counter-evidence;
- source metadata.

Historical liquidation detail remains bounded and routes to Replay.

## Ownership Boundaries

- Markets owns live global monitoring and selected-symbol verification.
- Scanner owns prioritization.
- Replay owns historical reconstruction.
- Research owns explanation and knowledge organization.
- Trade owns execution planning.
- Evidence owns factual state and readiness.
- Repository owns durable records and coverage.

## Extraction Order

1. Status, confidence, freshness, and unavailable primitives.
2. Toolbar, filters, navigation, and Repository Link.
3. Evidence Card, Metric Card, Panel Header, and Heatmap.
4. Sector Card and Sector Rotation Heatmap.
5. Global Market Summary and Market Breadth Ledger.
6. Capital Flow Module and Derivatives Intelligence Cluster.
7. Macro Calendar and Prediction Market panels after source contracts exist.
8. Investigation Route Card, Evidence Ledger, and Repository Audit Panel.

## Acceptance Criteria

- Components align with Dashboard, Replay, and Research state language.
- No component fabricates market direction, performance, flow, confidence, or
  timestamps.
- Heatmaps remain understandable without color.
- Source and freshness remain visible.
- Historical paths remain bounded.
- Cross-navigation preserves market context.
- Fixed tool surfaces tolerate text reflow without overlap.

