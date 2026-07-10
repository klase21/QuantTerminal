# Replay V2 Component Extraction

**Status:** Canonical extraction candidate list  
**Sprint:** F2  
**Source:** [QuantTerminal Replay V2](https://www.figma.com/design/f4KfiCv9c2TnrpwO0gKKvW)

## Extraction Rule

Replay reuses Dashboard V2 primitives before introducing Replay-owned
compositions. Extracted components preserve source, timestamp, confidence,
freshness, availability, and context handoff. They never manufacture data to
fill empty states.

## Shared Components

| Component | Owner | Reuse priority | Target screens | Dependencies |
| --- | --- | ---: | --- | --- |
| Global Navigation | Presentation | P0 | All product screens | Navigation blueprint, context preservation |
| Context Toolbar | Presentation | P0 | Replay, Research, Markets, Trade | Search, filters, UTC controls, saved views |
| Status Badge | Design System | P0 | All screens | Canonical state model |
| Confidence Badge | Evidence | P0 | Dashboard, Replay, Research, Scanner, Trade | Source-backed confidence only |
| Freshness Badge | Evidence | P0 | Dashboard, Replay, Research, Markets | Provider timestamp and freshness policy |
| Evidence Card | Evidence | P0 | All evidence-driven screens | Source, availability, limitations, repository link |
| Evidence Availability Row | Evidence | P0 | Replay, Research, Markets | Dataset registry and state model |
| Metric Card | Presentation | P0 | Dashboard, Replay, Markets, Trade | Real value or explicit unavailable state |
| Empty / Unavailable State | Design System | P0 | All screens | State, reason, next safe action |
| Repository Link | Repository / Presentation | P0 | Replay, Research, Evidence Cards | Preserved fact identity and context |
| Cross-Navigation Action | Presentation | P0 | All screens | Shared product context |
| Research Handoff Card | Research / Presentation | P1 | Dashboard, Replay, Markets, Scanner | Open question and preserved evidence |
| Filter Control | Design System | P1 | Replay, Research, Markets, Scanner | Keyboard and accessibility behavior |
| Panel Header | Design System | P1 | All dense screens | Section ID, title, description, status |

## Replay-Owned Compositions

| Component | Owner | Reuse priority | Future reuse | Dependencies |
| --- | --- | ---: | --- | --- |
| Replay Summary | Replay | P0 | Historical investigations, incident review | Bounded window, evidence readiness |
| Bounded Replay Chart | Replay | P0 | Research event studies | Market candles, selected event, overlay states |
| Evidence Timeline | Replay | P0 | Research, incident workflows, future reasoning | Chronological source-backed events |
| Timeline Event | Replay / Evidence | P0 | Research timelines | Timestamp, source, confidence, freshness, repository reference |
| Reasoning Block | Reasoning / Presentation | P0 | Dashboard, Research, Trade | Supporting and counter-evidence references |
| Market Structure Cluster | Replay | P1 | Markets, Research | Price, OI, funding, liquidation, orderbook |
| Historical Context Handoff | Replay / Research | P1 | Dashboard, Trade | Source-backed comparable identity |
| Repository Audit Panel | Repository / Presentation | P1 | Research, Evidence, enterprise audit | Coverage and provider metadata |
| Manual Heavy Dataset Control | Replay | P0 | Repository viewer, Research | Pagination, cancellation, bounded access |
| Orderbook Unavailable Panel | Replay | P0 | Replay only | ADR-002 runtime-budget rule |

## Component Contracts

### Evidence Timeline Event

Required inputs:

- event type;
- source-backed timestamp;
- source identifier;
- availability;
- confidence when source-backed;
- freshness;
- repository record reference when available.

Required states: loading, empty, ready, partial, unavailable, stale, and error.

### Reasoning Block

Required inputs:

- claim or explicit unavailable state;
- supporting evidence references;
- counter-evidence references;
- confidence and freshness when source-backed;
- limitations.

The block must render `UNAVAILABLE` when cited evidence is absent.

### Manual Heavy Dataset Control

Required behavior:

- user initiated;
- bounded by symbol, UTC day, and hour;
- paginated or truncated for event streams;
- cancellable;
- non-blocking;
- no exact-scan fallback;
- explicit timeout and unavailable states.

## Ownership Boundaries

- Replay owns sequence and bounded reconstruction.
- Evidence owns factual state and readiness.
- Reasoning owns interpretation and citations.
- Research owns deeper thesis work.
- Repository owns raw historical facts and identities.
- Trade owns execution planning.
- Presentation owns layout and interaction, not market claims.

## Extraction Order

1. Status, confidence, freshness, and unavailable primitives.
2. Panel Header, Context Toolbar, and Cross-Navigation Action.
3. Evidence Card and Evidence Availability Row.
4. Replay Summary and Bounded Replay Chart.
5. Timeline Event and Evidence Timeline.
6. Reasoning Block and Research Handoff Card.
7. Market Structure Cluster and Repository Audit Panel.
8. Manual Heavy Dataset Control and orderbook-specific state.

## Acceptance Criteria

- No component duplicates Dashboard V2 ownership.
- All states use canonical terminology.
- Text reflow does not resize fixed tool surfaces unexpectedly.
- Dataset components expose source and availability.
- Heavy-data controls remain manual and bounded.
- Components are keyboard accessible and do not rely on color alone.
- Empty states never display fabricated metrics, events, or confidence.

