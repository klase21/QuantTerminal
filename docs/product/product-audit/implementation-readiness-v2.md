# Implementation Readiness V2

**Status:** Canonical F5.5 readiness review  
**Owner:** Product / Engineering  
**Ratings:** READY, PARTIAL, BLOCKED

## Readiness Matrix

| Area | Rating | Ready evidence | Remaining requirement |
| --- | --- | --- | --- |
| Dashboard V2 | PARTIAL | Canonical review, IA, blueprint, component extraction, visual baseline | React V2 mapping; preserve lightweight/no-historical boundary; responsive and accessibility QA |
| Replay V2 | PARTIAL | Canonical investigation model, bounded repository path, evidence timeline contract | V2 React composition; protect request budget; interactive and graceful-degradation QA |
| Research V2 | PARTIAL | Canonical evidence workspace, mandatory counter-evidence, Repository handoff | V2 React composition; keep historical loading manual; reasoning approval states |
| Markets V2 | PARTIAL | Canonical global intelligence hierarchy and module contracts | V2 React composition; source-backed contracts for unavailable modules; responsive density QA |
| Scanner V2 | PARTIAL | Canonical prioritization model, risk layer, investigation paths | Remove unsupported fallback/derived labels; wire Repository availability; V2 React composition |
| Design System | PARTIAL | Canonical tokens, components, states, interactions, responsive and accessibility rules | Implement shared component library and verify variants |
| React readiness | PARTIAL | Existing pages, shared context runtime, APIs, and component extraction maps | Trade design, component implementation sequence, bidirectional context completion |
| Storybook readiness | BLOCKED | Component contracts and state model provide inputs | No Storybook configuration or equivalent isolated component catalog was found |
| QA readiness | PARTIAL | Acceptance rules, state contracts, blueprint criteria, no-fabrication policy | Visual regression, interaction, keyboard, responsive, and accessibility suites |

## Gate Interpretation

`PARTIAL` does not mean the product architecture is uncertain. It means design intent is certified while implementation evidence is incomplete. No V2 screen should be labeled production-complete solely because its Figma and review pack are approved.

## React Implementation Order

1. Shared state primitives, metadata badges, Repository Link, and unavailable states.
2. Global navigation, Context Toolbar, Search, Filter, and return trail.
3. Evidence Card, Counter Evidence Card, Reasoning Card, Metric Card, and Risk Card.
4. Dashboard and Markets orientation surfaces.
5. Scanner prioritization and handoffs.
6. Replay and Research investigation compositions, preserving protected runtime rules.
7. Trade Decision Workspace after F6 certification.
8. Responsive, accessibility, visual regression, and journey QA.

## Protected Implementation Rules

- Do not restore Historical Analog to Dashboard.
- Do not introduce historical-heavy processing into Markets.
- Do not auto-load heavy Research history.
- Do not reconstruct full Replay orderbook in request handlers.
- Do not fabricate candidates, confidence, evidence, timestamps, or explanations.
- Do not make Trade an order-entry or signal-generation surface.

## Decision

The five screen designs are **READY for Trade design** and **PARTIAL for React realization**. Storybook or an equivalent isolated component environment is the only rated blocker, and it blocks component-system certification rather than Trade product design.
