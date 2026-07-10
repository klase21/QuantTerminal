# Trade V2 Component Extraction

**Status:** Canonical extraction candidate list  
**Sprint:** F6  
**Source:** [QuantTerminal Trade V2 - Decision Workspace](https://www.figma.com/design/eKQoLz9L6wNaxtUq2x2EbT)

## Extraction Rule

Trade reuses canonical evidence, navigation, state, and investigation components before adding Trade-owned compositions. Components preserve candidate identity, evidence references, source state, uncertainty, and human decision authority. No component may own order execution.

## Shared Canonical Components

| Component | Owner | Priority | Used by | Dependencies |
| --- | --- | ---: | --- | --- |
| Global Navigation | Presentation | P0 | All screens | Navigation and context contracts |
| Context Toolbar | Presentation | P0 | Markets, Scanner, Replay, Research, Trade | Search, filters, active context |
| Status Badge | Design System | P0 | All screens | Canonical state model |
| Confidence Badge | Evidence | P0 | Dashboard, Replay, Research, Scanner, Trade | Source-backed method |
| Evidence Card | Evidence | P0 | All evidence workflows | Fact, source, timestamp, state, limitation |
| Counter Evidence Card | Evidence | P0 | Research, Scanner, Trade | Contradiction and evidence relation |
| Reasoning Card | Reasoning Presentation | P0 | Replay, Research, Trade | Evidence references and approval state |
| Risk Card | Evidence / Presentation | P0 | Scanner, Research, Trade | Known/unknown risk, gaps, alternatives |
| Repository Link | Repository Presentation | P0 | All evidence workflows | Auditable identity and destination |
| Search | Navigation/Search | P0 | All primary screens | Entity and availability semantics |
| Filter | Filter System | P0 | Markets, Scanner, Replay, Research, Trade | Visible scope and reset behavior |
| Navigation Item | Presentation | P0 | Global shell and cross-navigation | Active state and accessible name |

## Trade-Owned Compositions

| Component | Owner | Priority | Future reuse | Dependencies |
| --- | --- | ---: | --- | --- |
| Decision Card | Trade | P0 | Committees, portfolio review, future decision packets | Selected candidate and evidence state |
| Decision Readiness Panel | Trade | P0 | Scanner handoff, enterprise review | Candidate, evidence, validation, user constraints |
| Scenario Card | Trade | P0 | Research, post-mortem, portfolio review | Labeled assumptions, conditions, invalidation |
| Risk Ledger | Trade / Evidence | P0 | Research, enterprise review | Known/unknown risks and data gaps |
| Checklist Row | Trade / Design System | P0 | Review workflows, operations | User state; no execution side effect |
| Planning Checklist | Trade | P0 | Committee and post-decision workflows | Preparation, monitoring, review stages |
| Execution Boundary Notice | Trade / Governance | P0 | Trade only | Human decision authority |
| Decision Packet | Trade / Workspace | P1 | Research, enterprise, collaboration | Versioned user notes and source references |
| Post-Decision Review | Trade / Replay | P1 | Replay, Research | Outcome context and Repository lineage |

## Key Component Contracts

### Decision Card

Required inputs:

- stable candidate identity;
- decision question;
- confidence and method when source-backed;
- freshness and coverage;
- outstanding unknowns;
- origin and return path.

No candidate renders `NO SELECTED DECISION`. The component never constructs a direction or recommendation.

### Evidence Card

Required inputs:

- observed fact or explicit unavailable state;
- source and observed time;
- freshness, coverage, availability, and provider tier;
- evidence identity and Repository route;
- limitation.

### Scenario Card

Required inputs:

- scenario label;
- explicit assumptions;
- confirmation conditions;
- invalidation conditions;
- evidence references;
- optional probability only when supplied by an approved method.

A scenario is not a forecast and cannot be promoted to a recommendation.

### Risk Card and Risk Ledger

Required inputs:

- known risks;
- unknown risks;
- data gaps;
- macro, liquidity, and execution risk;
- confidence-reduction factors;
- source and review state where applicable.

Missing risk is not low risk.

### Planning Checklist

Required behavior:

- distinguish preparation, confirmation, invalidation, monitoring, and review;
- keep completion user-owned;
- preserve evidence references;
- expose unresolved items;
- never submit, route, size, or simulate an order as a side effect.

## Figma Local Components

| Component | Figma role |
| --- | --- |
| Status Badge | Four semantic variants: Available, Partial, Unavailable, Risk |
| Navigation Item | Default and active variants |
| Evidence Card | Text properties for title, fact, source, metadata, and limitation |
| Scenario Card | Text properties for title, summary, conditions, and invalidation |
| Checklist Row | Text properties for checklist label and state |
| Decision Card | Decision, summary, metadata, and unknowns |
| Reasoning Card | Interpretation, evidence references, and limitations |
| Risk Card | Known/unknown risks, data gaps, and confidence reduction |

## Extraction Order

1. Status, confidence, freshness, and unavailable primitives.
2. Navigation, Context Toolbar, Repository Link, Search, and Filter.
3. Evidence Card, Counter Evidence Card, Reasoning Card, and Risk Card.
4. Decision Card and Decision Readiness Panel.
5. Scenario Card and Risk Ledger.
6. Checklist Row and Planning Checklist.
7. Decision Packet and Post-Decision Review after persistence and collaboration contracts exist.

## Acceptance Criteria

- Evidence always precedes reasoning.
- Counter Evidence remains visible.
- Missing confidence, freshness, coverage, risk, and conditions remain unavailable.
- Scenario probabilities are never fabricated.
- No component introduces order entry or autonomous execution.
- Context and Repository lineage survive composition.
- Components remain keyboard accessible and do not rely on color alone.

