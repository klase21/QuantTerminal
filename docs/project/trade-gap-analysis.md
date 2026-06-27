# Trade V2 Gap Analysis

Project Zeta - Trade V2 Sprint T3  
Status: Analysis only  
Implementation changes: none

## Executive Summary

The current Trade page is a functional live candidate and setup-tracking workspace, but it is not yet the approved Trade V2 execution workflow.

Its strongest existing assets are:

- live candidate selection;
- selected-symbol market data;
- an existing numeric entry / stop / target plan;
- local setup tracking and outcome memory;
- graceful `NO DATA` states for several feeds.

Its largest gaps are:

- it consumes only the inbound `symbol` and discards inherited exchange, timeframe, thesis, evidence, Replay validation, freshness, and source context;
- it automatically selects a market-mover candidate when no validated candidate was handed off;
- it leads with Scanner-owned candidate discovery rather than Trade Summary and Execution Readiness;
- it presents a market-mover numeric plan as a verified plan without receiving Replay validation;
- it lacks explicit execution readiness, position sizing based on user inputs, an execution checklist, Trade metadata, and canonical navigation actions;
- it locally assembles evidence and historical outcomes that belong primarily to Research and Replay.

T4 should restructure presentation around the approved hierarchy while preserving existing runtime behavior. It must not add intelligence, validation, APIs, polling, or synthetic execution values.

## 1. Current Trade Implementation

### Actual Implementation

The implementation is located at:

- `components/trade/TradePage.tsx`

The route is:

- `app/trade/page.tsx`

The route mounts `TradePage` inside `TerminalAppShell` and a React `Suspense` boundary. No alternate Trade page implementation was found.

### Current Section Order

The rendered order is:

```text
Active Trade Candidates
  -> Selected Execution Plan
  -> Why We Like This Trade
  -> Setup Memory
  -> Recent Outcomes
  -> Live Data Status
```

Relevant implementation locations:

- candidate discovery starts at `components/trade/TradePage.tsx:557`;
- selected execution plan starts at `components/trade/TradePage.tsx:640`;
- locally assembled trade evidence starts at `components/trade/TradePage.tsx:690`;
- setup memory starts at `components/trade/TradePage.tsx:707`;
- recent outcomes starts at `components/trade/TradePage.tsx:762`;
- live data status starts at `components/trade/TradePage.tsx:790`.

### Current User Flow

1. Trade loads live market-mover candidates.
2. A requested `symbol` is selected when present; otherwise the first available candidate or tracked setup is selected automatically.
3. The page opens live ticker, trade, liquidation, and orderbook feeds for the active context.
4. The selected candidate's market-mover numeric plan becomes the displayed execution plan.
5. The user may inspect Markets, track the setup in local storage, change its outcome status, or delete it.
6. Local setup outcomes are summarized after enough completed records exist.

This is candidate-first and discovery-led. The approved journey is inherited-context-first and readiness-led.

### Current Visual Hierarchy

- `Active Trade Candidates` is the first and widest section, so discovery dominates the page.
- `Selected Execution Plan` and `Why We Like This Trade` share the next row and have similar visual weight.
- `Setup Memory` and `Recent Outcomes` form the third row.
- `Live Data Status` is a compact footer strip.
- All major sections use the same base `Card` treatment, limiting surface hierarchy.

The page is dense and terminal-like, but it does not visually distinguish orientation, readiness, planning, risk, and metadata as separate decision levels.

### Current Interaction Model

The page supports:

- candidate selection;
- selected-symbol handoff to Markets;
- local setup tracking;
- local status changes: `Active`, `Won`, `Lost`, and `Expired`;
- local setup deletion;
- automatic live-data updates;
- automatic retention of recently seen candidates and active setup memory.

It does not support:

- explicit acceptance or rejection of inherited validation context;
- user-entered account or risk constraints;
- editable entry, exit, stop, or target planning;
- an execution checklist;
- a final readiness confirmation;
- canonical handoffs to Research, Replay, Scanner, or Dashboard.

### Existing APIs and Data Sources

| Source | Access | Refresh / behavior | Current use |
| --- | --- | --- | --- |
| `/api/market/movers?focus=<symbol>` | `useMarketMovers` | REST every 60 seconds, 9-second timeout, one retry | candidates, scores, setup, numeric plan, confidence, freshness |
| Binance USD-M `!ticker@arr` | direct browser WebSocket fallback in `useMarketMovers` | rebuild throttled to 2.5 seconds | fallback candidate discovery |
| Binance USD-M `!ticker@arr` | shared WebSocket via `useMarketSocket` | live | selected-symbol ticker in market store |
| `/api/market/futures-intelligence?symbol=<symbol>` | direct fetch | immediately and every 30 seconds | funding and OI notional |
| Binance selected-symbol trade stream | shared WebSocket via `useTradeSocket` | live, last 40 trades | buy/sell flow summary |
| Binance all-market liquidation stream | shared WebSocket via `useLiquidationSocket` | live, last 40 events | liquidation pressure summary |
| Binance selected-symbol orderbook | shared WebSocket with 1.5-second REST fallback | live | top-ten bid/ask pressure |
| `qt.trade.setupMemory.v2` | browser local storage | user actions | manually tracked setups |
| `qt.activeSetups.v2` / legacy v1 | browser local storage | updated from candidate changes | active setup lifecycle and outcomes |
| `qt.tradingDatabase.v1` | browser local storage | best-effort writes | setup, outcome, and event history |

No Trade-specific backend, durable execution-plan artifact, Replay-result API, account data, order API, or broker/exchange execution API is used.

## 2. Alignment Review

| Approved section | Classification | Current mapping | Gap |
| --- | --- | --- | --- |
| Trade Summary | Partial | Selected symbol, setup label, direction, candidate confidence, current price, and 24-hour change appear inside `Selected Execution Plan`. | No page-level candidate summary; exchange and timeframe are absent; thesis, source, Replay result, freshness, and inherited health are not consumed. |
| Execution Readiness | Missing | `No Verified Trade Plan` appears when a numeric plan is absent; candidate action and plan quality appear as badges. | No readiness gate, blocking reasons, validation state, or ownership-aware resolution path. Numeric-plan presence is not equivalent to validation. |
| Execution Setup | Partial | Setup label, direction, action, candidate status, and numeric plan are available. Candidate fields also contain trigger and invalidation text. | Setup conditions, trigger, and invalidation are not organized as a distinct section. The plan originates in market-mover discovery, not inherited validation. |
| Entry Plan | Partial | Entry area is displayed from `numericPlan`. | Confirmation requirements, order approach, source timestamp, and explicit unavailable reasoning are absent. |
| Exit Plan | Partial | Stop / wrong area and two targets are displayed. | Stop, invalidation, target, partial-exit, and close conditions are compressed into metrics without a dedicated decision layer. |
| Risk Management | Partial | A `High`, `Medium`, or `Low` risk label is derived from chase risk. The candidate model contains risk and suggested-position fields. | No explicit user risk input, account context, fee/slippage context, trustworthy position sizing, or risk-limit decision. Existing builder sizing assumes account-risk percentages and must not be promoted as user-approved sizing. |
| Execution Checklist | Missing | Setup tracking and status buttons exist. | Tracking is not a readiness checklist. There is no validation, setup, entry, exit, risk, freshness, or user-confirmation checklist. |
| Trade Metadata | Partial | Live-data footer shows tactical alerts, funding, OI, and orderbook pressure. Local setup records include creation time. | No candidate ID, source reference, exchange, timeframe, inherited context reference, validation reference, observation time, plan version, or consolidated freshness state. |
| Navigation Actions | Partial | `Inspect Market` links to Markets. | Research, Replay, Scanner, and Dashboard handoffs are absent. The Markets link passes generated setup context but not the full inherited investigation contract. |

### Misplaced and Overloaded Current Sections

| Current section | Classification | Finding |
| --- | --- | --- |
| Active Trade Candidates | Misplaced / Overloaded | Performs Scanner-owned discovery, ranking, and candidate prioritization at the top of Trade. It may remain as a compact imported-candidate selector, but must not define Trade's primary purpose. |
| Selected Execution Plan | Overloaded | Combines summary, setup, entry, exit, risk, live market context, and the only navigation action. |
| Why We Like This Trade | Misplaced | Constructs evidence locally from market-mover score breakdown, trade flow, funding/OI, and liquidations. Research owns evidence organization; Trade may display inherited context but should not generate its own proof layer. |
| Setup Memory | Partial / Misplaced | Local plan tracking is execution-adjacent and reusable, but its outcome-management controls are not the approved Execution Checklist. |
| Recent Outcomes | Misplaced | Aggregates setup outcomes and win rate. Historical outcome validation belongs to Replay; this legacy section must not imply Replay validation. |
| Live Data Status | Partial | Useful operational context, but it should map to Trade Metadata and explicit freshness / health rather than sit as an unlabeled footer. |

## 3. Boundary Review

### Dashboard Boundary

No major Dashboard conclusion surface is duplicated. Current price and 24-hour change are acceptable execution context, provided they remain subordinate to Trade planning.

Potential overlap:

- the broad `Live Data Status` strip resembles a market-status summary, but its current fields are execution-context inputs rather than a Dashboard conclusion.

### Markets Boundary

Markets owns live structure and exploration.

Current overlaps:

- Trade opens ticker, orderbook, trade-flow, funding, OI, and liquidation feeds directly;
- Trade interprets orderbook pressure and trade flow locally;
- Trade exposes an `Inspect Market` handoff, which is correctly owned.

Live inputs may support execution, but Trade should not become a substitute for broader Markets exploration. T4 should keep these inputs compact and source-labeled.

### Scanner Boundary

Scanner owns discovery, prioritization, ranking, and filtering.

Current violations:

- `Active Trade Candidates` is the first page section;
- Trade calls the market-mover discovery API and browser fallback directly;
- Trade ranks and retains candidates, then auto-selects the first available candidate;
- a direct entry without inherited context can therefore become an apparently actionable plan.

The current candidate list is useful legacy behavior, but it must be visually subordinate and described as imported/available candidate context rather than Trade-owned discovery.

### Research Boundary

Research owns thesis, evidence, narrative, source attribution, and confidence context.

Current violations:

- `Why We Like This Trade` locally assembles evidence;
- `scoreEvidence`, `evidenceLines`, and `reasonFromCandidate` turn discovery scores and live feeds into explanatory proof;
- the page ignores Research's inherited thesis and evidence parameters even though Research builds a context-rich Trade URL.

T4 must not create new evidence. Existing context may be displayed only as source-labeled inherited or tactical context.

### Replay Boundary

Replay owns historical validation and outcome analysis.

Current violations and gaps:

- Trade does not consume Replay validation or result context;
- Replay currently links to `/trade` without preserving context;
- `Recent Outcomes` calculates win rate and average outcome from local setup memory;
- `No Verified Trade Plan` uses verification language even though only numeric-plan completeness was checked.

Local outcomes must not be treated as Replay validation. Missing Replay context must remain explicit.

## 4. Design System Gap

### Typography

Status: Partial.

Strengths:

- compact uppercase labels;
- strong numeric emphasis;
- dense terminal-oriented type treatment;
- small metadata text.

Gaps:

- typography roles are encoded as repeated raw Tailwind combinations rather than mapped consistently to registry roles;
- candidate discovery receives stronger first-read emphasis than Trade Summary and readiness;
- section, card, badge, metric, and metadata hierarchy is inconsistent;
- some explanatory text is forced into uppercase, reducing readability.

### Spacing

Status: Partial.

Strengths:

- compact `gap-3`, `p-3`, and dense row treatments broadly match terminal density;
- responsive grids collapse without an obvious fixed-width page container.

Gaps:

- panel padding varies across `p-2`, `p-2.5`, `p-3`, and `p-5` without named role mapping;
- metadata, badges, candidate cards, and empty states use inconsistent internal rhythm;
- the first-read layer is consumed by a large candidate grid.

### Colors

Status: Partial.

Strengths:

- cyan, amber, emerald, and rose broadly match the shared accent vocabulary;
- missing data is generally muted rather than fabricated.

Gaps:

- surfaces are dominated by raw black and zinc rather than the approved dark green surface levels;
- raw color combinations are repeated locally;
- state colors sometimes communicate candidate lifecycle, confidence, action, and data quality without a clear canonical distinction.

### Surfaces

Status: Missing hierarchy.

- every major section uses the same `Card` base;
- there is no strongest Trade Summary/readiness surface;
- primary planning, secondary context, analytics, and metadata do not have distinct levels;
- discovery cards compete visually with the execution plan.

### Badges and Status

Status: Partial / non-canonical.

Canonical data states are not applied consistently. Current labels include:

- `LIVE`;
- `NO DATA`;
- `ACTIVE` / `AGING`;
- `NEW`, `STRENGTHENING`, `WEAKENING`, `INVALIDATED`, `COMPLETED`;
- `Watching`, `Waiting`, `Avoiding`;
- `High`, `Medium`, `Low`.

These labels represent different concepts, but their treatments are visually similar. Trade V2 needs to distinguish freshness, validation, lifecycle, action, and readiness without inventing new meanings.

### Density

Status: Partial pass.

The page has strong Bloomberg-style density, but it compresses unrelated responsibilities into a single workspace. Density is useful; ownership ambiguity is not.

### Responsive Behavior

Status: Partial.

Strengths:

- candidate and planning grids use `md`, `lg`, `xl`, and `2xl` breakpoints;
- plan metrics collapse to one column at narrow widths;
- no fixed desktop-only width was found in the primary layout.

Gaps:

- mobile order begins with candidate discovery instead of candidate summary and readiness;
- dense candidate badges and truncated reasons may hide important context;
- there is no certified tablet/mobile treatment for the approved nine-section sequence;
- paired execution/evidence and memory/outcome layouts do not map to the approved responsive wireframe.

## 5. Data Dependency Review

### Reusable Existing APIs and Feeds

T4 may reuse without changing contracts:

- `/api/market/movers` for the existing candidate and numeric-plan payload;
- `/api/market/futures-intelligence` for funding and OI context;
- existing market ticker, selected-symbol trade, liquidation, and orderbook streams;
- the existing market store;
- existing local setup and active-setup memory;
- existing investigation-context utilities for context-preserving links where already compatible.

### Reusable Execution Data

Existing candidate data includes:

- symbol and direction;
- setup and action;
- numeric entry range;
- stop loss;
- two targets;
- trigger and invalidation text;
- plan quality and risk/reward text;
- freshness, confidence, grade, and quality reason;
- current price and selected live market context.

These are existing discovery-layer outputs. T4 may present them but must identify their source and must not relabel them as Replay validation or user-approved execution readiness.

### Reusable Trade Context

- requested symbol from the URL;
- selected candidate and retained candidate memory;
- source candidate timestamp through `marketMovers.updatedAt`;
- locally tracked setup creation time and status;
- current selected-symbol live data.

### Missing Data

- inherited exchange and timeframe in Trade state;
- inherited thesis and evidence summary;
- Replay result and validation result;
- selected Replay case/window and evidence quality;
- consolidated freshness and source health;
- immutable upstream context references;
- explicit user account/allocation input;
- explicit user risk limit;
- fee and slippage inputs;
- user-approved execution constraints;
- durable execution plan artifact;
- final execution-checklist state.

### Stale or Weak Data Risks

- retained candidates remain available for five minutes and can display as `AGING`;
- active setup memory can persist for eight hours and weakens only after 90 minutes without updates;
- local saved setups have no backend synchronization or authoritative source health;
- ticker, trade, orderbook, and liquidation displays lack a consolidated last-observed timestamp;
- the global liquidation stream is not filtered to the selected symbol before Trade calculates liquidation pressure;
- the market store orderbook is not keyed by symbol, so a symbol switch may briefly expose prior-symbol depth until new data arrives;
- Replay context is absent, so historical validation freshness cannot be assessed.

### APIs and Data That Must Not Be Invented

T4 must not create:

- a Trade readiness API;
- a Replay validation API or local validation substitute;
- an evidence-generation API;
- a position-sizing API;
- account, balance, margin, fee, leverage, or order APIs;
- synthetic fills, slippage, risk limits, or execution outcomes;
- new candidate ranking or plan-generation logic;
- a durable trade artifact contract.

If required data is unavailable, T4 should display `MISSING`, `STALE`, `DEGRADED`, `UNAVAILABLE`, or `NOT READY` with an explicit reason.

## 6. Implementation Risk

### Duplicate Fetches and Streams

Risk: Medium.

- `useMarketMovers` opens a direct all-market ticker WebSocket for fallback discovery.
- `useMarketSocket` opens the same all-market ticker stream through the shared WebSocket manager.
- These are independent subscriptions and duplicate broad ticker traffic.
- Candidate changes also restart selected-symbol trade/orderbook subscriptions and the futures-intelligence polling effect.

No clear continuous request loop was found. `useSafePolling` has an in-flight guard, and the direct futures effect cleans up its timer. T4 must not alter this runtime behavior.

### Hydration Risk

Risk: Low to Medium.

- `useSearchParams` is correctly wrapped by route-level `Suspense`.
- local storage is loaded after mount.
- render helpers use `Date.now()` and locale formatting, but relevant data generally arrives after client effects.
- Future restructuring could increase hydration risk if volatile timestamps are moved into server-rendered navigation or initial markup.

T4 should preserve the current client boundary and avoid render-time URL or timestamp generation.

### Execution-State Complexity

Risk: High.

There are three overlapping state systems:

- transient retained candidates;
- automatic active-setup memory;
- manually saved setup memory.

They use different lifecycle and outcome vocabularies. Auto-selection can switch from requested context to the first available candidate when the requested symbol is missing. T4 should not merge or redefine these state machines.

### Request-Loop Risk

Risk: Medium.

- selected-symbol changes alter the market-movers URL;
- the candidate feed can rebuild every 2.5 seconds under WebSocket fallback;
- candidate rebuilds write setup memory and the local trading database;
- active-symbol changes restart futures polling and symbol-specific streams.

No loop is currently proven, but moving selection or state updates into new effects would create a substantial regression risk. T4 should make no fetch, effect, polling, socket, or selection changes.

### Data-Correctness Risk

Risk: High.

- all-market liquidations are aggregated as if they support the selected candidate;
- a global, non-symbol-keyed orderbook store can briefly retain prior-symbol data;
- `No Verified Trade Plan` overstates what numeric-plan completeness proves;
- market-mover plan sizing is based on fixed account-risk assumptions rather than explicit user inputs;
- Trade ignores inherited Replay validation and Research evidence.

These issues should be documented during T4 and not silently normalized through presentation.

### Scope-Creep Risk

Risk: High.

The approved IA exposes missing product contracts, especially readiness, validation handoff, user risk input, and checklist state. Implementing those contracts in T4 would exceed a hierarchy-only sprint. Missing states are preferable to new systems.

### Design-Drift Risk

Risk: Medium.

Copying Dashboard's hero or Scanner's opportunity grid would violate Trade's sequential planning identity. T4 should reuse shared tokens, not page layouts.

## 7. Recommendation for T4

### T4 Scope

T4 should be limited to:

- `components/trade/TradePage.tsx`;
- hierarchy restructuring;
- shared QuantTerminal design-token reuse;
- existing APIs, sockets, hooks, stores, and local persistence;
- explicit unavailable states for unsupported context.

It should not modify Dashboard, Markets, Scanner, Research, Replay, APIs, package files, scoring, candidate selection, polling, sockets, or execution calculations.

### Recommended Presentation Mapping

1. **Trade Summary**
   - Promote the selected candidate identity, symbol, setup, direction, current price, and available source timestamp.
   - Show exchange, timeframe, thesis, and validation as unavailable when they are not currently consumed.
   - Do not imply a validated handoff.

2. **Execution Readiness**
   - Present only existing plan availability, source freshness, and known blockers.
   - Explicitly state that Replay validation is unavailable when no inherited result exists.
   - Do not create a readiness score or validation calculation.

3. **Execution Setup**
   - Reuse existing setup, action, trigger, invalidation, quality, and lifecycle fields.
   - Attribute them to the market-mover candidate source.

4. **Entry Plan**
   - Reuse the existing numeric entry range and action text.
   - Preserve `NO DATA` when no numeric plan exists.

5. **Exit Plan**
   - Separate existing stop/invalidation and target values from Entry Plan.
   - Do not calculate new exits.

6. **Risk Management**
   - Reuse the existing risk label only as candidate-source context.
   - Do not surface or calculate position sizing as user-approved sizing without explicit user/account inputs.
   - Show sizing as unavailable when those inputs do not exist.

7. **Execution Checklist**
   - Do not invent checklist completion logic.
   - Show existing plan/data availability and explicit unsupported items as incomplete or unavailable.
   - Keep local setup tracking behavior unchanged and subordinate.

8. **Trade Metadata**
   - Reframe the existing live-data footer and setup timestamps as metadata.
   - Include only existing source, observed time, local-storage, and selected-symbol facts.

9. **Navigation Actions**
   - Preserve `Inspect Market`.
   - Add only route-level handoffs using existing navigation/context utilities where possible: Research for evidence, Replay for validation, Markets for live context, Scanner for candidates, Dashboard for monitoring.
   - Do not create new API-backed handoff payloads.

### Legacy Section Treatment

- Demote `Active Trade Candidates` to a compact candidate selector within or below Trade Summary; do not present it as Trade-owned discovery.
- Demote `Why We Like This Trade` to source-labeled inherited/tactical context, or mark it for a later boundary correction. Do not expand it.
- Keep `Setup Memory` as a subordinate local planning utility.
- Keep `Recent Outcomes` visually secondary and explicitly separate from Replay validation.

### T4 Acceptance Guardrails

- Approved nine-section order is visible.
- Selected candidate remains stable under existing behavior.
- Existing live data and local setup tracking remain functional.
- No new requests, effects, sockets, timers, APIs, scores, evidence, validation, or sizing logic are added.
- Missing Replay, Research, risk, and metadata inputs remain explicit.
- No upstream frozen page is modified.

## 8. Validation

- `docs/project/trade-gap-analysis.md` exists.
- Runtime code changes in Sprint T3: none.
- Dashboard, Markets, Scanner, Research, and Replay runtime changes in Sprint T3: none.
- Package changes in Sprint T3: none.
- Build required: no.

