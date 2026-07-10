# Dashboard Component Extraction

**Status:** Canonical extraction proposal  
**Sprint:** F1 Dashboard V2  
**Owner:** Design System Governance

## Purpose

Dashboard V2 establishes reusable compositions for Replay, Research, Markets,
Scanner, and Trade. Extracted items extend existing Design System contracts;
they do not create a parallel component library.

## Reuse Priorities

- P0: required for the Dashboard baseline and immediate child screens.
- P1: reusable in the first product-realization sequence.
- P2: useful after core screen patterns stabilize.

## Component Inventory

| Component / composition | Canonical owner | Priority | Target screens | Dependencies |
| --- | --- | ---: | --- | --- |
| Product Navigation Rail | Navigation | P0 | All screens | PDGM-107, Navigation Item, iconography, focus states |
| Context Toolbar | Navigation / Workspace | P0 | All screens | Toolbar, Search Box, Filter Bar, context preservation |
| Screen Status Header | State System | P0 | All screens | Status Panel, Badge, freshness and availability states |
| Market Direction Panel | Dashboard | P0 | Dashboard; compact variant in Trade / Markets | Dashboard Panel, Metric Card, Status Panel, evidence references |
| Evidence Readiness Summary | Evidence System | P0 | Dashboard, Replay, Research, Trade | Status Panel, provider tier, coverage, limitations |
| Evidence Card | Evidence System | P0 | All analytical screens | PDGM-108, Source Metadata, Repository Link |
| Evidence Band | Evidence System | P0 | Dashboard, Research, Trade, Replay | Evidence Card, responsive grid, progressive disclosure |
| Reasoning Card | Reasoning Presentation | P0 | Dashboard, Research, Trade | Evidence references, limitations, review state |
| Source Metadata Row | Evidence / Repository | P0 | Evidence Card, Replay, Research, Repository | source, timestamp, freshness, availability, provider tier |
| Repository Link | Repository Presentation | P0 | Dashboard, Replay, Research, Trade | record identity, context-preserving navigation |
| Canonical State Badge | State System | P0 | All screens | color independence, icon, state label |
| Unavailable State Panel | State System | P0 | All screens | reason, impact, safe next action |
| Tactical Alert Row | Alerts / Dashboard | P1 | Dashboard, Markets, Scanner, Trade | evidence reference, freshness, severity, route target |
| Trend Change Risk Panel | Risk Presentation | P1 | Dashboard, Trade, Markets | evidence inputs, limitation state, human authority |
| Opportunity and Risk Split | Dashboard composition | P1 | Dashboard, Trade, Scanner | Tactical Alert Row, Risk Panel, responsive stacking |
| Supporting Intelligence Tile | Product Visualization | P1 | Dashboard, Markets, Research | Metric Card, Evidence Card, source state |
| Prediction Market Evidence Card | Evidence System | P1 | Dashboard, Markets, Research | approved source, probability timestamp, limitation |
| Research Preview Card | Research | P1 | Dashboard, Replay, Trade | source-backed research identity, summary, route |
| Historical Context Handoff | Navigation / Replay | P1 | Dashboard, Trade, Research | Replay deep link, Research deep link, no embedded processing |
| Bounded Comparison Table | Data Display | P1 | Dashboard, Markets, Scanner, Research | sorting, filtering, source metadata, responsive alternative |
| Attention Map | Visualization | P1 | Dashboard, Markets, Scanner | explicit area/color legend, accessible alternative |
| Density Control | Product / IA | P1 | All screens | PDGM-110, saved preference, accessible target |
| Focus Mode | Workspace | P2 | Dashboard, Replay, Research, Markets | panel priority, return state, keyboard support |
| Research / Repository Footer | Navigation composition | P2 | Dashboard, Replay, Research | context links, provenance summary, return path |

## Extraction Rules

1. A Dashboard composition becomes reusable only when another blueprint shares
   the same information object and behavior.
2. Variants express density, state, or semantic role; they do not encode a
   screen-specific fork.
3. Facts, evidence, reasoning, and user preference remain separate inputs.
4. Every data component supports Loading, Empty, Ready, Error, Partial,
   Offline, and Refreshing, plus applicable availability states.
5. No extracted component fetches providers, computes reasoning, or persists
   facts.
6. Heavy evidence remains bounded and fails locally.
7. Cards are not nested inside cards.

## Target-Screen Inheritance

| Target screen | Inherits from Dashboard V2 | Screen-owned extension |
| --- | --- | --- |
| Replay | Navigation, toolbar, state header, evidence cards, provenance | Timeline, bounded historical datasets, replay controls |
| Research | Navigation, evidence band, reasoning/counter-evidence, provenance | Thesis hierarchy, source investigation, long-form sections |
| Markets | Navigation, context toolbar, metric/evidence cards, comparison | Live market grid, sector/flow exploration |
| Scanner | Navigation, toolbar, badges, evidence and risk rows | Opportunity ranking, filters, aging/expiry |
| Trade | Navigation, context, evidence, reasoning, risk | Candidate thesis, scenario analysis, execution notes |

## Design-to-Code Contract

Each extracted component must include:

- owner and contract version;
- inputs, outputs, events, and non-ownership;
- Figma variant and state names;
- frontend public contract;
- responsive and density behavior;
- accessibility annotations;
- QA cases and blueprint consumers.

## Decision

The P0 component set is sufficient to establish the parent visual language.
P1 components may be extracted during Dashboard V2 implementation. P2 remains
deferred until core screen behavior stabilizes.

