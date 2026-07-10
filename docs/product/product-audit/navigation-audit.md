# Navigation Audit

**Status:** Canonical F5.5 product audit  
**Owner:** Product / Design  
**Scope:** Dashboard V2, Markets V2, Scanner V2, Replay V2, and Research V2  
**Sources:** MASTER documents, Information Architecture, PDGM-101/102/103/104/105/107, Design System, approved V2 review packs, and current shared-context contracts

## Decision

**PASS WITH MINOR ACTIONS.** The five screens form one investigation system. Primary navigation prevents orphan screens, and cross-navigation follows page ownership. The remaining issue is implementation completeness: the canonical design permits more lateral and reverse handoffs than the current directional shared-context helpers implement.

## Audited Journey

```text
Markets -> Dashboard -> Replay -> Research -> Scanner
```

| Screen | Entry points | Expected exit points | Primary user action | Back / return contract |
| --- | --- | --- | --- | --- |
| Markets | Global nav, Dashboard, search, saved context | Dashboard, Scanner, Replay, Research, Trade, Repository | Identify market, sector, flow, or risk context | Return to originating summary while retaining market scope |
| Dashboard | Global nav, Markets, alert, saved workspace | Markets, Replay, Research, Scanner, optional Trade | Orient within five seconds and choose the owning workflow | Return to prior market or alert context |
| Replay | Dashboard, Markets, Scanner, Research, deep link | Research, Dashboard, Trade, Repository | Reconstruct a bounded event sequence | Return to source evidence, candidate, or thesis |
| Research | Dashboard, Markets, Scanner, Replay, search | Replay, Scanner, Dashboard, optional Trade, Repository | Investigate support, conflict, sources, and gaps | Return to originating evidence or replay window |
| Scanner | Markets, Dashboard, alert, search | Markets, Replay, Research, Repository, optional Trade | Prioritize evidence-backed investigations | Return to market context or queue state |

## Navigation Findings

| Check | Result | Evidence / action |
| --- | --- | --- |
| Stable primary navigation | PASS | All five screens remain first-class destinations under the canonical global shell. |
| Entry and exit points | PASS | Every screen has at least one orientation entry, one deeper investigation exit, and Repository reachability. |
| Dead ends | PASS AT DESIGN LEVEL | Repository is the deepest audit destination; Replay and Research expose return or onward paths. |
| Circular navigation | PASS WITH CONTROL | Investigation loops are intentional. A visible origin trail must prevent users from cycling without knowing the active context. |
| Navigation depth | PASS | Orientation to raw audit remains within summary -> evidence -> Replay/Research -> Repository. |
| Ownership-aware routing | PASS | Links transfer work to the screen that owns the next question instead of embedding that workflow locally. |
| Reverse handoffs | PARTIAL | Canonical routes exist, but current product-context helpers cover only a directional subset. |
| Deep links | PARTIAL | Symbol and bounded time context exist; a common evidence/candidate/thesis return contract is not yet universal. |

## Implemented Context Spine

The current shared-context implementation provides:

```text
Dashboard -> Markets -> Scanner -> Research -> Replay -> Trade -> Dashboard
```

It also defines Dashboard -> Scanner and Markets -> Research envelopes. The requested cross-product journeys additionally need consistent handling for Markets -> Dashboard, Dashboard -> Replay, Replay -> Research, Research -> Scanner, and Replay -> Dashboard. These are implementation actions, not reasons to merge page ownership.

## Context Contract

Every cross-screen action should preserve, when source-backed and relevant:

- context ID and origin screen;
- symbol, exchange, timeframe, UTC date/hour;
- evidence, candidate, thesis, or replay-window identity;
- source, freshness, availability, coverage, and provider tier;
- active filters and a safe return destination.

Irrelevant or expired context must be dropped explicitly. A destination may not reconstruct missing context from labels, prose, or price movement.

## Required Minor Actions

1. Define one bidirectional navigation envelope over the existing shared product context rather than adding page-specific query conventions.
2. Add a visible origin/return trail for deep workflows.
3. Preserve active filters only when their semantics exist on the destination.
4. Standardize unavailable-context copy and recovery actions.
5. Validate keyboard focus after cross-navigation and browser Back behavior during implementation QA.

## Certification

No orphan screen or architectural dead end was found. Navigation is certified for Trade design, subject to the minor implementation actions above.
