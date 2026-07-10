# Scanner V2 Component Extraction

**Status:** Canonical extraction candidate list  
**Sprint:** F5  
**Source:** [QuantTerminal Scanner V2](https://www.figma.com/design/3roqtZ5Mt8QRgpvICV7Anf)

## Extraction Rule

Scanner reuses Dashboard, Markets, Replay, and Research components before
introducing Scanner-owned compositions. Components preserve candidate
identity, source state, evidence, risk, freshness, and coverage. Empty states
never contain sample opportunities.

## Shared Canonical Components

| Component | Owner | Priority | Target screens | Dependencies |
| --- | --- | ---: | --- | --- |
| Global Navigation | Presentation | P0 | All screens | Navigation and context contracts |
| Context Toolbar | Presentation | P0 | Scanner, Markets, Replay, Research | Search and filters |
| Status Badge | Design System | P0 | All screens | Canonical state model |
| Confidence Badge | Evidence | P0 | Dashboard, Scanner, Replay, Research, Trade | Source-backed method |
| Freshness Badge | Evidence | P0 | Scanner, Markets, Replay, Research | Source timestamp |
| Evidence Card | Evidence | P0 | All evidence screens | Fact, source, state, Repository link |
| Risk Card | Evidence / Presentation | P0 | Scanner, Research, Trade | Conflict, gaps, alternatives, warning |
| Repository Link | Repository / Presentation | P0 | Scanner, Replay, Research | Candidate/evidence identity |
| Timeline | Presentation | P1 | Scanner, Replay, Research | Ordered source-backed lifecycle |
| Empty / Unavailable State | Design System | P0 | All screens | State, reason, next safe action |
| Filter Control | Design System | P0 | Scanner, Markets, Replay, Research | Accessible filtering |
| Cross-Navigation Action | Presentation | P0 | All screens | Shared product context |

## Scanner-Owned Compositions

| Component | Owner | Priority | Target reuse | Dependencies |
| --- | --- | ---: | --- | --- |
| Priority Queue | Scanner | P0 | Scanner only | Deterministic candidate records |
| Priority Queue Row | Scanner | P0 | Scanner, alerts | Identity, basis, confidence, freshness, coverage |
| Priority Badge | Scanner / Evidence | P0 | Scanner, alerts | Documented score method |
| Opportunity Card | Scanner | P0 | Scanner, Dashboard preview | Candidate identity and evidence state |
| Evidence Category Grid | Evidence | P0 | Scanner, Research | Canonical evidence categories |
| Missing Data Panel | Evidence | P0 | Scanner, Research, Replay | Coverage and unavailable reasons |
| Investigation Path | Scanner / Presentation | P0 | Scanner, alerts | Owner-specific destinations |
| Investigation Status Panel | Scanner | P1 | Scanner, enterprise monitoring | Candidate lifecycle |
| Investigation Timeline | Scanner / Presentation | P1 | Scanner, enterprise workflows | Source-backed state transitions |
| Handoff Panel | Presentation | P1 | Scanner, Markets, Research | Preserved identity and evidence references |

## Key Component Contracts

### Priority Queue Row

Required inputs:

- candidate ID;
- source-backed headline or setup;
- priority score and basis;
- confidence and method;
- freshness;
- coverage;
- verified evidence count;
- investigation status;
- Repository availability.

The row cannot render a numeric rank when the basis is unavailable.

### Opportunity Card

Required inputs:

- deterministic identity;
- source-backed headline and summary;
- direction when supplied;
- evidence and counter-evidence references;
- confidence and freshness;
- risk level;
- coverage;
- suggested investigation step;
- Replay, Research, and Repository routes.

Missing setup, direction, reason, confidence, or risk remains unavailable.

### Risk Card

Required inputs:

- counter-evidence;
- alternative explanations;
- missing information;
- coverage gaps;
- low-confidence warnings;
- invalidation evidence when source-backed.

Risk remains visible even when all content is unavailable.

### Investigation Path

Required behavior:

- route live verification to Markets;
- route history to Replay;
- route evidence review to Research;
- route fact audit to Repository;
- expose Trade as optional user-led planning only;
- preserve candidate identity and uncertainty.

## Ownership Boundaries

- Scanner owns discovery and priority.
- Markets owns live verification.
- Replay owns historical validation.
- Research owns deep evidence review.
- Trade owns planning.
- Repository owns durable candidate/evidence records.

## Extraction Order

1. Status, confidence, freshness, risk, and unavailable primitives.
2. Toolbar, filters, Repository Link, and navigation.
3. Priority Badge and Priority Queue Row.
4. Priority Queue and Opportunity Card.
5. Evidence Category Grid, Risk Card, and Missing Data Panel.
6. Investigation Path and Handoff Panel.
7. Investigation Timeline after lifecycle contracts are approved.

## Acceptance Criteria

- Priority always exposes its evidence basis.
- Missing direction, reason, confidence, freshness, and risk remain unavailable.
- Trade is never the primary action.
- Counter-evidence and missing data remain visible.
- Repository audit remains reachable.
- Components align with Dashboard, Markets, Replay, and Research states.
- Components remain keyboard accessible and do not rely on color alone.

