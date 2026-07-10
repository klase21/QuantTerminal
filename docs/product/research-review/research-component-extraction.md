# Research V2 Component Extraction

**Status:** Canonical extraction candidate list  
**Sprint:** F3  
**Source:** [QuantTerminal Research V2](https://www.figma.com/design/ZvTOzSSHrO6bskGdON7cU7)

## Extraction Rule

Research reuses Dashboard and Replay components before adding Research-owned
compositions. Shared components preserve source identity, timestamps,
freshness, availability, limitations, and context. Empty components never use
placeholder evidence.

## Shared Canonical Components

| Component | Owner | Priority | Target screens | Dependencies |
| --- | --- | ---: | --- | --- |
| Global Navigation | Presentation | P0 | All product screens | Navigation blueprint, context preservation |
| Context Toolbar | Presentation | P0 | Research, Replay, Markets, Trade | Search, symbol context, filters |
| Status Badge | Design System | P0 | All screens | Canonical state model |
| Confidence Badge | Evidence | P0 | Dashboard, Replay, Research, Scanner, Trade | Source-backed confidence only |
| Freshness Badge | Evidence | P0 | Dashboard, Replay, Research, Markets | Source timestamp and freshness policy |
| Evidence Card | Evidence | P0 | All evidence-driven screens | Source, availability, limitations, Repository link |
| Reasoning Card | Reasoning / Presentation | P0 | Dashboard, Replay, Research, Trade | Supporting evidence and assumptions |
| Counter Evidence Card | Evidence / Presentation | P0 | Research, Replay, Trade | Conflict, gaps, quality concerns |
| Research Card | Research / Presentation | P1 | Dashboard, Research, Replay | Question, sources, status, handoff |
| Repository Link | Repository / Presentation | P0 | Evidence, Replay, Research | Fact identity and preserved context |
| Empty / Unavailable State | Design System | P0 | All screens | State, reason, next safe action |
| Cross-Navigation Action | Presentation | P0 | All screens | Shared product context |
| Filter Control | Design System | P1 | Research, Replay, Markets, Scanner | Accessible filtering |
| Panel Header | Design System | P1 | Dense product screens | Section label, description, status |

## Research-Owned Compositions

| Component | Owner | Priority | Target reuse | Dependencies |
| --- | --- | ---: | --- | --- |
| Research Summary | Research | P0 | Research only | Question, evidence readiness, source quality |
| Evidence Category Card | Evidence | P0 | Research, Markets | Category, state, reason, source count |
| Evidence Readiness Panel | Evidence | P0 | Research, Dashboard | Canonical/partial/experimental/missing states |
| Primary Source Ledger | Research / Evidence | P0 | Research, enterprise audit | Source metadata contract |
| Source Ledger Row | Evidence | P0 | Research, Repository viewer | Source, category, timestamp, confidence, freshness, state, link |
| Assumption Row | Reasoning | P0 | Research, Trade | Explicit assumption identity and status |
| Missing Information Row | Evidence | P0 | Research, Replay | Evidence category and unresolved reason |
| Research Relationship Graph | Research | P1 | Research, future knowledge views | Typed source-backed relationships |
| Related Research Panel | Research | P1 | Research, Dashboard preview | Evidence overlap and lineage |
| Research Trail | Research / Workspace | P1 | Research, enterprise workflows | Saved context, notes, evidence references |
| Repository Audit Panel | Repository / Presentation | P1 | Research, Replay, Evidence | Projection and raw-record metadata |

## Key Component Contracts

### Primary Source Ledger Row

Required inputs:

- source identity;
- evidence category;
- provider timestamp;
- confidence when source-backed;
- freshness;
- availability;
- limitation or unavailable reason;
- Repository record reference when available.

Retrieval time must never substitute for provider observation time.

### Counter Evidence Card

Required inputs:

- alternative interpretations;
- conflicting dataset references;
- missing information;
- data quality concerns;
- review status.

The card remains visible even when all content is unavailable. Empty conflict
does not become a positive thesis signal.

### Reasoning Card

Required inputs:

- claim or unavailable state;
- supporting evidence references;
- assumptions;
- counter-evidence references;
- confidence and freshness when source-backed;
- limitations.

The card cannot render a conclusion without evidence references.

### Research Relationship Graph

Required inputs:

- typed nodes;
- typed relationships;
- source identities;
- availability state;
- Repository lineage when available.

The graph must not infer relationships to make the visualization complete.

## Ownership Boundaries

- Research owns questions, investigation paths, and knowledge organization.
- Evidence owns source-backed facts and readiness.
- Reasoning owns interpretation and explicit assumptions.
- Repository owns historical facts and identities.
- Replay owns bounded historical reconstruction.
- Trade owns execution planning.
- Presentation owns layout and interaction, not market claims.

## Extraction Order

1. Status, confidence, freshness, and unavailable primitives.
2. Evidence Card, Reasoning Card, and Counter Evidence Card.
3. Panel Header, Context Toolbar, filters, and cross-navigation.
4. Evidence Category Card and Evidence Readiness Panel.
5. Source Ledger Row and Primary Source Ledger.
6. Research Summary and Related Research Panel.
7. Missing Information Row and Assumption Row.
8. Repository Audit Panel.
9. Research Trail and relationship graph after data contracts exist.

## Acceptance Criteria

- Components align with Dashboard and Replay state language.
- Counter-evidence remains visible at all screen sizes.
- No component invents evidence, confidence, timestamps, or relationships.
- Source metadata remains readable and reachable.
- Historical components remain manual-load where required.
- Components are keyboard accessible and do not rely on color alone.
- Fixed tool dimensions tolerate text reflow without overlap.

