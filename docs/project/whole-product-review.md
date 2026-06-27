# Whole Product Architecture Review

Project Omega+ - Sprint X1  
Status: System-wide architecture review  
Scope: Frozen Dashboard, Markets, Scanner, Research, Replay, and Trade  
Runtime changes: none  
Final decision: PRODUCT REQUIRES ARCHITECTURE REVIEW

## Executive Summary

QuantTerminal now has a coherent six-stage product model:

```text
Dashboard
  -> Markets
  -> Scanner
  -> Research
  -> Replay
  -> Trade
```

The page-level ownership model is clear:

- Dashboard owns the market conclusion.
- Markets owns live exploration and structure.
- Scanner owns attention triage and prioritization.
- Research owns thesis and evidence evaluation.
- Replay owns historical validation.
- Trade owns execution planning.

All six pages have frozen reference states. Each page has an approved hierarchy, ownership boundary, accepted limitations, and future-change policy.

The product is not yet ready for broad API expansion because the integrated runtime and governance layer still contain material contract conflicts:

1. Dashboard Historical Analog is present in the frozen Dashboard state and runtime, while `AGENTS.md` and ADR-001 explicitly state that Historical Analog was removed from Dashboard and must not be restored.
2. The O4 context contract is implemented unevenly. Research and Replay use the shared investigation context, while Markets, Scanner, and Trade consume or emit narrower ad hoc parameter sets.
3. Replay-to-Trade does not pass the validation result, and Trade consumes only the inbound symbol.
4. Shared market data is fetched, streamed, stored, formatted, and interpreted independently across pages.
5. Markets and Scanner retain overlapping opportunity ownership and terminology.

The product architecture is coherent in intent but not yet coherent enough in transport and governance to safely expand APIs without further architecture review.

## 1. Architecture Review

### Decision Pipeline

| Stage | Canonical question | Ownership | Review |
| --- | --- | --- | --- |
| Dashboard | What is happening right now? | Conclusion, direction, drivers, evidence preview, health | PASS WITH GOVERNANCE CONFLICT |
| Markets | Which live markets deserve attention? | Live exploration, breadth, rotation, venues, movers, structure | PASS WITH LIMITATIONS |
| Scanner | What deserves my attention right now? | Prioritization, ranking, filtering, signal visibility | PASS WITH LIMITATIONS |
| Research | Why should I believe this market thesis? | Thesis, evidence, conflict, narrative, source attribution | PASS WITH LIMITATIONS |
| Replay | Did this thesis work in comparable historical conditions? | Historical validation, outcomes, failure modes, metadata | PASS WITH LIMITATIONS |
| Trade | How should this validated opportunity be executed? | Readiness, setup, entries, exits, risk, checklist | PASS WITH LIMITATIONS |

### Ownership

The intended ownership chain is coherent and progressively narrows the user's decision:

```text
market conclusion
  -> live exploration
  -> attention triage
  -> evidence evaluation
  -> historical validation
  -> execution planning
```

The strongest ownership boundaries are:

- Dashboard versus Research: preview versus evidence evaluation.
- Research versus Replay: evidence versus validation.
- Replay versus Trade: validation versus execution.

The weakest ownership boundary remains Markets versus Scanner:

- Markets owns `Ranked Opportunities` and `Market Movers`.
- Scanner owns `Priority Opportunities`, ranking, and opportunity discovery.
- The documented distinction is exploration versus prioritization, but both pages consume the same market-mover domain and use overlapping opportunity language.

### Dependencies

The dependency direction generally follows the product flow:

- Dashboard summarizes existing intelligence.
- Markets and Scanner consume live market and opportunity data.
- Research consumes evidence and investigation context.
- Replay consumes selected historical context and source data.
- Trade consumes a selected candidate and existing execution fields.

However, runtime dependencies do not form a single directed pipeline. Pages independently fetch shared data and reconstruct local views rather than consuming a common page-to-page state or artifact contract.

### Information Flow

Information depth progresses correctly at the page-design level:

- Dashboard compresses.
- Markets expands live structure.
- Scanner ranks attention.
- Research organizes evidence.
- Replay validates historical behavior.
- Trade organizes execution.

Transport continuity is incomplete. Context is often rebuilt from query parameters, source payloads, page-local state, or local storage instead of being passed as a durable immutable handoff.

### User Flow

The intended user flow is understandable and each page provides a meaningful next decision. Global navigation prevents terminal dead ends.

Continuity limitations remain:

- global navigation order is `Dashboard -> Markets -> Scanner -> Trade -> Intelligence -> Research -> Replay`, which differs from the canonical decision pipeline;
- section-level handoffs are strongest in Scanner and Research;
- Markets handoffs remain shallow;
- Replay-to-Trade is a static route transition;
- Trade return paths exist but do not preserve the complete inherited context.

### Architecture Governance Conflict

Current governing sources disagree about Dashboard Historical Analog:

- `AGENTS.md` states that Dashboard Historical Analog was intentionally removed, must not be restored, and belongs in Replay or Research.
- `docs/decisions/ADR-001-dashboard-historical-analog.md` records the removal decision.
- `docs/project/dashboard-v2-state.md` freezes Historical Analog as part of the approved Dashboard hierarchy.
- `components/product/DashboardV1.tsx` requests `/api/historical-analog` and renders Historical Analog context.

This is a direct conflict between repository architecture rules, an ADR, a frozen page state, and runtime behavior. The integrated architecture cannot treat all four as authoritative simultaneously.

## 2. Cross-Page Contract Review

### Contract Matrix

| Transition | Expected contract | Current implementation | Status | Remaining gap |
| --- | --- | --- | --- | --- |
| Dashboard -> Markets | Symbol, market conclusion context, driver/evidence intent | Mostly global navigation and tactical links; Markets reads selected signal-style params | PARTIAL | No uniform immutable Dashboard-to-Markets payload |
| Markets -> Scanner | Symbol set, selected symbol, structure and mover context | Mostly global navigation; both pages independently load market movers | PARTIAL | Exploration-to-triage contract is not explicit in runtime |
| Scanner -> Research | Symbol, setup, direction, reason, confidence, source | Scanner builds query parameters; Research reads the shared investigation contract with fallbacks | PARTIAL | Ad hoc Scanner params do not fully match `InvestigationContext` |
| Research -> Replay | Thesis, evidence context, selected case/window, source, freshness | Research uses `buildInvestigationHref`; Replay uses `readInvestigationContext` | STRONGEST | Replay readiness still depends on loaded case/source coverage |
| Replay -> Trade | Replay result, validation result, outcome, quality, symbol/window | Replay links to `/trade`; Trade reads only `symbol` | MISSING | O4 Replay-to-Trade result contract is not executed |
| Trade -> upstream pages | Candidate, blocker, source context, intended return task | Markets preserves selected candidate context; other links are route-level | PARTIAL | Return handoffs do not preserve the complete execution blocker/context |

### Shared Context

The shared investigation context supports:

- symbol;
- exchange;
- timeframe;
- investigation timestamp and type;
- source;
- selected historical case;
- selected replay window;
- selected event;
- thesis.

Current adoption is uneven:

- Research and Replay parse the full investigation context.
- Primary Navigation preserves context only for Dashboard, Research, Historical Intelligence, and Replay.
- Markets parses symbol plus signal-oriented fields such as setup, direction, confidence, and reason.
- Scanner emits ad hoc query parameters for Markets, Research, Replay, and Trade.
- Trade reads only `symbol` and does not consume exchange, timeframe, thesis, evidence, Replay result, or source references.

### Upstream and Downstream Contracts

Contract intent is well-defined in O4, but runtime implementation is partial:

- upstream ownership is usually clear;
- downstream pages usually avoid recomputing the full upstream workflow;
- missing context degrades explicitly in Replay and Trade;
- immutable context references and result payloads are not consistently passed;
- page-local fallbacks can replace an absent inherited candidate or source context.

### Navigation Contracts

Navigation has stable routes and avoids volatile render-time timestamps. Destination intent is usually understandable.

Remaining gaps:

- CTA verbs vary across pages;
- global navigation order does not match the canonical decision sequence;
- Markets has fewer explicit outward handoffs;
- Replay-to-Trade lacks context;
- direct Scanner-to-Replay and Scanner-to-Trade routes can bypass evidence or validation readiness.

### Ownership Boundaries

Boundary enforcement is strongest where missing data is explicitly unavailable:

- Research does not claim Replay validation.
- Replay does not create Trade execution plans.
- Trade marks Replay validation and user sizing inputs unavailable.

Remaining ownership ambiguities:

- Markets and Scanner share opportunity discovery vocabulary and market-mover data.
- Trade retains a subordinate market-mover candidate fallback.
- Dashboard's frozen Historical Analog strip conflicts with the repository rule assigning historical workflows to Research and Replay.

## 3. Data Flow Review

### Shared Data Dependencies

| Data domain | Current consumers | Duplication finding |
| --- | --- | --- |
| Market movers | Dashboard, Markets, Scanner, Trade | Independently fetched or derived across four pages; Scanner also calls an opportunities API that depends on market movers |
| Futures intelligence | Dashboard, Markets, Trade | Independently fetched with page-specific refresh behavior and formatting |
| Futures symbol context | Markets, Replay | Separate selected-symbol requests |
| Market ticker stream | Markets, Trade, market-mover fallback | Shared manager reduces some duplication, but direct market-mover fallback can create an additional broad ticker stream |
| Orderbook | Markets, Trade | Shared global store is not symbol-keyed; page-specific subscriptions update one shared book |
| Trade flow | Markets, Trade | Separate selected-symbol subscriptions and local buy/sell aggregation |
| Narratives and macro | Dashboard, Research, Scanner opportunities backend | Separate page polling and backend aggregation paths |
| Historical Analog | Dashboard and Research; Replay consumes selected cases | Dashboard consumption conflicts with ADR-001 and repository rules |
| Prediction markets | Dashboard, Research | Separate endpoints and presentation contracts |
| ETF / reserve / capital flow | Dashboard, Markets, Research as available | Coverage and artifact adoption differ by page |

### Duplicated Fetches

Documented duplication includes:

- Scanner directly uses `useMarketMovers` while `/api/scanner/opportunities` also depends on market movers.
- Dashboard, Markets, and Trade independently request futures intelligence.
- Dashboard and Markets independently request market movers, sector rotation, ETF flow, and reserve intelligence.
- Dashboard and Research independently request narrative and macro context.
- Markets and Trade each subscribe to live market, orderbook, and trade-flow data.
- Trade's candidate fallback can maintain a broad ticker stream in addition to the shared market ticker stream.

### Duplicated State

State is distributed across:

- URL/search parameters;
- `InvestigationContext`;
- page-local React state;
- the shared market store;
- Dashboard local cache;
- Trade local setup memory;
- active setup memory;
- local trading database records;
- Replay page-local loaded datasets;
- Research page-local manually loaded evidence.

There is no single cross-page execution or investigation state that spans the full Dashboard-to-Trade flow.

### Duplicated Terminology

Known terminology duplication remains:

- Ranked Opportunity versus Priority Opportunity.
- Opportunity versus Signal.
- Confidence versus Health.
- Verified versus Current.
- Live versus Current.
- `NO DATA` versus Missing versus Unavailable.
- source lifecycle labels versus canonical data-health badges.

The canonical dictionary exists, but runtime labels are not fully normalized.

### Duplicated Calculations

Page-local calculations include:

- direction and confidence formatting;
- risk/reward text parsing;
- funding and OI formatting;
- trade-flow buy/sell pressure;
- orderbook bid/ask pressure;
- local setup win rate and outcomes;
- historical win-rate displays;
- availability and freshness classifications.

Some duplication reflects legitimate page-specific presentation. Other duplication means the same market fact can be independently interpreted without a shared normalized observation contract.

### Data Flow Assessment

The product has reusable APIs, artifact contracts, data-health systems, and shared stores, but page runtime still behaves as a collection of coordinated consumers rather than one integrated data pipeline.

The no-synthetic-data rule and explicit unavailable states reduce correctness risk. They do not remove duplication, context loss, or source-of-truth ambiguity.

## 4. UX Continuity

### Design Language

Result: PASS WITH KNOWN LIMITATIONS.

Shared identity is recognizable across all frozen pages:

- dark terminal surfaces;
- monospace, uppercase hierarchy;
- amber structural accents;
- cyan informational accents;
- compact professional density;
- bordered low-radius panels;
- explicit missing and unavailable states.

Dashboard remains the most fully tokenized reference. Markets is denser, Scanner is triage-oriented, Research is evidence-oriented, Replay is validation-oriented, and Trade is execution-oriented without feeling like separate products.

### Information Hierarchy

Result: PASS.

Each frozen page has a documented and implemented first-read hierarchy. The six page hierarchies support the intended progression from conclusion to execution.

The Dashboard Historical Analog governance conflict remains separate from visual hierarchy quality.

### Navigation

Result: PASS WITH KNOWN LIMITATIONS.

- Every frozen page is globally reachable.
- Scanner, Research, Replay, and Trade expose explicit handoff actions.
- Context preservation is inconsistent.
- Global navigation order does not mirror the canonical workflow.

### Badge Vocabulary

Result: PASS WITH KNOWN LIMITATIONS.

Canonical vocabulary exists:

- CURRENT;
- VERIFIED;
- PARTIAL;
- DEGRADED;
- STALE;
- MISSING;
- LOADING;
- UNAVAILABLE.

Legacy and provisional labels remain across frozen pages, including `NO DATA`, `UNKNOWN`, `LIVE`, lifecycle labels, and source-specific states.

### CTA Vocabulary

Result: PASS WITH KNOWN LIMITATIONS.

Intent families are documented, but runtime wording varies between `Inspect`, `Open`, `View`, `Validate`, and `Prepare`. The destinations are generally understandable even when the verbs are not normalized.

### Page Transitions

Result: PARTIAL.

The conceptual transitions are coherent. Context continuity is strongest from Research to Replay and weakest from Replay to Trade.

## 5. Implementation Readiness

| Area | Readiness | Finding |
| --- | --- | --- |
| API expansion | NOT READY | Frozen ownership provides domain boundaries, but the Dashboard/ADR conflict and incomplete handoff contracts would make broad expansion encode contradictory architecture. |
| Richer context handoffs | READY WITH KNOWN GAPS | `InvestigationContext` and O4 define a foundation, but adoption and result payloads are incomplete across Markets, Scanner, Replay, and Trade. |
| Execution of O4 contracts | PARTIAL | Research-to-Replay is substantially implemented; Replay-to-Trade and full Trade input consumption are not. |
| Shared data services | PARTIAL | Reusable APIs and stores exist, but duplicated page fetches, streams, formatting, and local state remain. |
| Automation Phase 2 | READY WITH KNOWN LIMITATIONS | Automation Phase 1 provides orchestration, QA, screenshot, state, runner, and review-package foundations, but system contracts are not stable enough for autonomous API-expansion work. |

The system has enough page governance to define API ownership. It does not yet have enough contract consistency to expand APIs safely across the whole product.

## 6. Known System Limitations

This section summarizes accepted and observed limitations only.

### Governance

- Dashboard Historical Analog is simultaneously prohibited by `AGENTS.md` and ADR-001 and frozen as approved in Dashboard V2.
- Phase 1 documentation predates the frozen Replay and Trade reference implementations.
- Freeze documents use slightly different status and policy formats.

### Ownership and Contracts

- Markets and Scanner retain overlapping opportunity ownership and terminology.
- Cross-page context preservation is uneven.
- Replay-to-Trade validation context is not passed.
- Trade consumes only a subset of the O4 input contract.
- Markets outward handoffs remain shallow.
- Direct Scanner-to-Replay and Scanner-to-Trade paths may lack evidence or validation readiness.

### Data and State

- Shared APIs are fetched independently by multiple pages.
- Scanner retains duplicate market-mover data paths.
- Broad ticker streams can be duplicated.
- Market state is split between URL context, local page state, shared stores, artifacts, caches, and browser local storage.
- Trade setup memory is local-only.
- Replay datasets remain page-local and source-coverage dependent.
- Research historical evidence remains manual-load dependent.
- Orderbook state is not consistently symbol-keyed across live consumers.
- Trade liquidation context uses a market-wide feed.

### Data Coverage and Runtime

- Replay comparable cases and failure patterns depend on loaded or inherited data.
- Replay orderbook remains manual/cache-based and may be degraded.
- Full request-path orderbook reconstruction remains prohibited by ADR-002.
- Capital-flow coverage differs across Dashboard, Markets, and Research.
- Prediction-market and narrative coverage can be unavailable.
- Existing polling and websocket dependencies remain page-specific.

### Language and UX

- Badge vocabulary is not fully normalized.
- CTA vocabulary is not fully normalized.
- Global navigation order differs from the canonical decision pipeline.
- Dashboard is more fully tokenized than other frozen pages.
- Some page-specific lifecycle and availability labels remain.
- Several page-level responsive certifications remain pending or limited.

### Trade and Execution

- Replay validation may be unavailable in Trade.
- User sizing inputs may be unavailable.
- No automatic execution exists.
- Trade uses existing market-mover execution fields only.
- Execution checklist completeness depends on inherited context.
- No durable cross-page execution plan exists.

### Automation

- Automation remains human-review oriented.
- External Planner, Developer Agent, Review, Telegram approval, and auto-merge integrations are not complete.
- JSON persistence remains the State Store baseline.

## 7. Final Decision

Decision: **PRODUCT REQUIRES ARCHITECTURE REVIEW**

Justification:

- the six-page ownership model is coherent;
- all six pages are frozen reference implementations;
- product language, navigation intent, and O4 ownership contracts are documented;
- explicit unavailable states protect against fabricated completeness;
- however, current repository governance contains a direct Dashboard/ADR contradiction;
- O4 handoff execution remains incomplete at the Replay-to-Trade boundary;
- shared data and state are duplicated across page runtimes;
- Markets and Scanner retain unresolved opportunity ownership overlap;
- broad API expansion would risk making these inconsistencies permanent.

The decision does not reject the frozen page architecture. It records that integrated contract and governance consistency must be reviewed before the product is declared ready for broad API expansion.

## 8. Validation

- `docs/project/whole-product-review.md` exists.
- Runtime code changes in X1: none.
- Dashboard, Markets, Scanner, Research, Replay, and Trade runtime changes in X1: none.
- API changes in X1: none.
- Package changes in X1: none.
- Build required: no.

