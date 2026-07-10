# Component Mapping

**Status:** Canonical traceability model  
**Owner:** Design System Governance  
**Purpose:** Preserve one contract from design intent through QA

## Traceability Chain

```text
Design System contract
  -> Product Blueprint
  -> Design component and variant
  -> Frontend component contract
  -> QA acceptance evidence
```

Each link references the preceding artifact. A visual frame without a Design
System and blueprint reference is exploratory, not implementation-ready.

## Mapping Record

Every reusable component mapping includes:

- canonical component name and owner;
- Design System source;
- blueprint consumers;
- information object;
- design component and supported variants;
- frontend ownership and public contract;
- required states;
- accessibility requirements;
- responsive and density behavior;
- QA acceptance cases;
- version and status.

## Core Mapping Matrix

| Design System component | Blueprint consumers | Design responsibility | Frontend responsibility | QA focus |
| --- | --- | --- | --- | --- |
| Evidence Card | PDGM-101-106, PDGM-108 | Fact hierarchy, source, timestamp, limitations, contradiction, drilldown | Preserve explicit inputs/events and source lineage | Ready/partial/stale/unavailable/experimental, keyboard, source transparency |
| Metric Card | PDGM-101, 104-106 | One factual metric and comparison basis | Stable numeric rendering and explicit context | Units, timestamps, missing values, layout stability |
| Counter Evidence Card | PDGM-103, 106, 108, 111 | Contradiction relationship and limitation prominence | Keep counter-evidence distinct from reasoning | Visibility, reading order, links, state handling |
| Reasoning Card | PDGM-101, 103, 106, 111 | Interpretation boundary and evidence references | Render approved reasoning only; no local inference | Evidence linkage, limitations, unavailable reasoning |
| Search Box | PDGM-107, 109 | Search scope, result hierarchy, unsupported states | Bounded query and semantic events | Keyboard flow, empty/error, context routing |
| Filter Bar | PDGM-102-106 | Active filter visibility and reset behavior | Explicit filter state without hidden data mutation | Result impact, clear/reset, warnings remain visible |
| Status Panel | All blueprints | Plain-language state, reason, impact, action | Map canonical states without fabricated fallback | All canonical states, announcements, retry behavior |
| Primary Navigation | PDGM-107 | Stable destinations and active context | Route without ownership drift | Keyboard, deep links, context preservation, return paths |
| Replay Timeline | PDGM-102 | Sequence, chart priority, optional evidence | Bounded loading and graceful optional-data failure | Responsiveness, partial data, pagination, focus |
| Research Section | PDGM-103 | Thesis support, conflict, sources, depth | Preserve manual-load historical boundaries | Source visibility, counter-evidence, deep navigation |
| Markets Grid | PDGM-105 | Live comparison and visual hierarchy | Responsive bounded updates | Real-time readability, stale/offline, dense layout |
| Scanner Panel | PDGM-104 | Ranking, freshness, evidence, risk handoff | Preserve candidate identity and source-backed confidence | No fabricated confidence, filters, aging/expired states |
| Trade Workspace | PDGM-106 | Thesis, evidence, risk, scenarios, notes | Preserve selected candidate and human authority | Selection stability, risk visibility, no forced action |

## Token Mapping

Design variables or styles map to semantic Design System token roles. Frontend
tokens map to the same semantic names. QA verifies meaning and usage rather than
tool-specific identifiers or raw values.

## State Mapping

Design and frontend use the same canonical states: Loading, Empty, Ready, Error,
Partial, Offline, and Refreshing, plus applicable data states such as `NO DATA`,
`UNAVAILABLE`, `STALE`, `EXPIRED`, and `EXPERIMENTAL`.

No layer may rename a state in a way that changes its meaning.

## Change Control

- Design-only visual refinement updates the design artifact and QA reference.
- Contract changes update Design System documentation before consumers.
- Blueprint hierarchy changes require Product review.
- Public frontend contract changes require migration guidance.
- QA updates acceptance evidence only after the upstream change is approved.

## Mapping Gate

A component is ready for handoff only when every mapping field is complete,
component ownership is unique, and required variants do not duplicate an
existing canonical component.

