# Replay Gap Analysis

Project Epsilon - Replay V2 Sprint P3  
Status: Analysis only  
Runtime behavior: unchanged  
Decision: Prepare P4 hierarchy restructure with existing data only

## 1. Current Replay Implementation

### Actual Implementation File

The requested file does not currently exist:

- `components/replay/ReplayPage.tsx`

The active Replay route is:

- `app/replay/page.tsx`
- `components/replay/ReplayV1Page.tsx`

`app/replay/page.tsx` wraps `ReplayV1Page` in `TerminalAppShell` and `Suspense`.

### Current Section Order

The current Replay page is organized as a market replay workspace:

1. Advanced Market Replay header
2. Replay controls
   - exchange
   - symbol
   - date
   - hour UTC
   - load replay
   - replay duration
   - data source
3. Replay ready / provider error state
4. Price Replay Chart
5. Market Snapshot
6. Orderbook Snapshot
7. Event Timeline
8. Open Interest
9. Funding
10. Liquidations
11. Top Liquidations
12. What Happened
13. If You Traded It

### Current User Flow

The current flow is:

```text
Select market window
  -> Load Replay
  -> Inspect price chart
  -> Inspect snapshot metrics
  -> Optionally load orderbook
  -> Optionally load trades
  -> Review OI, funding, liquidations
  -> Read lightweight "What Happened"
```

This supports manual replay inspection, but it does not yet begin from an inherited thesis or validation result.

### Current Visual Hierarchy

The current visual hierarchy is chart-first:

- Price Replay Chart is the largest and most visually dominant section.
- Market Snapshot and Orderbook Snapshot sit beside the chart.
- OI, funding, liquidations, and top liquidations are analytics panels.
- "What Happened" is secondary and appears near the bottom.
- Validation, comparable cases, failure modes, and evidence quality are not first-read layers.

### Current Interaction Model

The current interaction model is manual and source-aware:

- User selects `exchange`, `symbol`, `date`, and `hour`.
- User clicks `Load Replay`.
- Chart data loads first.
- Positioning and liquidation data load in background.
- Trades are manually loaded.
- Orderbook cache is manually loaded.
- Abort controllers and load identifiers are used to avoid stale updates.
- Missing data is represented with explicit unavailable or no-data states.

### Existing APIs and Data Sources

Current Replay uses existing data paths:

| Source | Usage | Notes |
| --- | --- | --- |
| URL investigation context | Initial symbol, exchange, timeframe, selected replay window, thesis metadata | Read via `readInvestigationContext`; Replay inherits context when present. |
| Binance klines | Price chart | Client fetches Binance spot/futures klines for 1m candles. |
| `/api/replay/cryptohftdata` | CryptoHFTData replay datasets | Supports trades, liquidations, open interest, mark price, ticker, and orderbook where available. |
| `/api/replay/binance-positioning` | Historical OI/funding fallback | Used when CryptoHFTData positioning rows are unavailable. |
| `/api/market/futures-symbol-context` | Current positioning fallback | Used as last fallback for OI/funding. |
| `/api/replay/orderbook-cache` | Cached orderbook snapshot | Manual load only; does not perform expensive reconstruction in request handlers. |
| Durable replay/orderbook cache | Orderbook snapshot evidence | Cache can be missing, corrupted, partial, expired, or ready. |
| Flow Replay artifacts | Available architecture/data layer | Not currently consumed by `ReplayV1Page`. |

## 2. Alignment Review

Target hierarchy:

```text
Replay Summary
  -> Validation Status
  -> Comparable Historical Cases
  -> Outcome Analysis
  -> Failure Patterns
  -> Evidence Quality
  -> Replay Metadata
  -> Navigation Actions
```

| Target Section | Status | Finding |
| --- | --- | --- |
| Replay Summary | Partial | The page shows symbol, exchange, date, hour, replay duration, data source, and thesis title when investigation context includes one. It does not yet present a thesis-first summary or selected historical case as the dominant orientation layer. |
| Validation Status | Missing | There is no explicit validation state answering whether the inherited thesis was validated, partially validated, degraded, missing, or unavailable. Existing source states could support this, but they are not organized as validation. |
| Comparable Historical Cases | Missing | The current page does not list comparable historical cases or selected analog context. It can inherit a selected replay window, but it does not present comparable cases. |
| Outcome Analysis | Partial | Price change, OI change, funding ending state, liquidation count, and "If You Traded It" provide fragments of outcome analysis. The section is not framed as thesis validation and does not compare support versus contradiction. |
| Failure Patterns | Missing | No dedicated section identifies repeated adverse outcomes, invalidation behavior, or failure modes. |
| Evidence Quality | Partial | Source labels, unavailable reasons, orderbook cache states, chart reasons, and no-data states exist. They are distributed across panels rather than consolidated into a trust/readiness layer. |
| Replay Metadata | Partial | Replay duration, data source, selected date/hour, source diagnostics, and cache metadata exist indirectly. They are not consolidated into a Replay Metadata section. |
| Navigation Actions | Missing | The current page has no explicit Research, Trade, Markets, or Scanner handoff section. |

## 3. Boundary Review

### Correct Replay Ownership Already Present

The current implementation is aligned with Replay ownership in these areas:

- It focuses on historical replay evidence rather than Dashboard conclusions.
- It does not generate new market opportunities.
- It does not create Research narratives.
- It does not modify Historical Analog algorithms.
- It keeps orderbook loading manual and non-blocking.
- It uses explicit unavailable states instead of fabricating missing rows.

### Boundary Gaps

| Boundary | Finding | Classification |
| --- | --- | --- |
| Research boundary | Replay can display inherited thesis metadata, but does not yet show Research evidence context or return-to-Research handoff. | Future P4 hierarchy gap |
| Trade boundary | "If You Traded It" shows hold-return style values. It does not create entries, exits, sizing, or execution plans, but the label is execution-adjacent. | Needs careful language review in P4 |
| Markets boundary | Replay uses symbol/exchange controls, which is acceptable for replay scope. It should not expand into live market exploration. | Acceptable |
| Scanner boundary | No Scanner-like opportunity ranking is present. | Pass |
| Dashboard boundary | No Dashboard-style market conclusion is generated. | Pass |

Replay V2 should preserve the current boundary discipline: validate inherited context, show source-backed outcomes, and avoid execution planning.

## 4. Design System Gap

Replay currently uses the terminal visual language, but it is not yet aligned to the frozen page design system as a validation-first surface.

| Area | Current | Expected | Gap |
| --- | --- | --- | --- |
| Typography | Dense monospace labels and values are used throughout. | Role-based typography from the token registry. | Partial alignment; section hierarchy is not token-governed. |
| Colors | Dark terminal surfaces with cyan/teal accents and zinc borders. | Shared amber/cyan/green status system with token roles. | Partial alignment; teal is common, amber hierarchy is less visible. |
| Surfaces | Most sections use similar bordered zinc panels. | Distinct surface roles: summary, validation, cases, outcome, quality, metadata. | Sections are visually flat relative to approved IA. |
| Badges/status | Uses `NO DATA`, ready/unavailable/error text, source labels. | Canonical state vocabulary: CURRENT, VERIFIED, PARTIAL, DEGRADED, STALE, MISSING, LOADING, UNAVAILABLE. | Needs future normalization; no behavior change required in P4 unless visual-only. |
| Density | High density is preserved. | Replay should optimize for reconstruction and validation without hiding readiness. | Dense analytics are present, but first-read validation is missing. |
| Responsive behavior | Uses responsive grids and overflow for timeline. | Mobile/tablet should preserve Replay Summary -> Validation -> Cases -> Outcome. | Likely functional, but approved order is not implemented. |

Design-system reuse in P4 should focus on applying existing page-level patterns without copying Dashboard, Markets, Scanner, or Research layouts.

## 5. Data Dependency Review

### Reusable Existing APIs

- `/api/replay/cryptohftdata`
- `/api/replay/binance-positioning`
- `/api/replay/orderbook-cache`
- `/api/market/futures-symbol-context`
- Binance kline endpoints currently used by the client chart path
- Historical-intelligence replay APIs:
  - `/api/historical-intelligence/replay-learning-summary`
  - `/api/historical-intelligence/replay-decision-journal`
  - `/api/historical-intelligence/replay-explanation`

P4 should not add new endpoints unless explicitly approved.

### Reusable Historical Datasets and Replay Sources

- CryptoHFTData trades
- CryptoHFTData liquidations
- CryptoHFTData open interest
- CryptoHFTData mark price
- CryptoHFTData ticker
- Replay orderbook cache
- Binance historical OI/funding fallback
- Flow Replay evidence artifacts and contracts
- Investigation context selected replay window

### Missing Data for Replay V2 IA

| Missing Item | Impact |
| --- | --- |
| Explicit validation result contract for page display | Validation Status cannot be shown as a first-class section without deriving from existing states or a future contract. |
| Comparable historical case list in current page | Comparable Historical Cases section cannot be fully populated from current Replay UI data alone. |
| Consolidated outcome distribution | Outcome Analysis is limited to the selected hour and currently available rows. |
| Failure pattern evidence | Failure Patterns section will likely need unavailable/partial state until historical case outcomes are available. |
| Evidence quality rollup | Source quality exists in fragments but needs presentation-level consolidation. |
| Replay-to-Trade handoff payload | Navigation Actions can be visual/contextual, but execution handoff remains future work. |

### Stale or Weak Data Considerations

- CryptoHFTData coverage starts at the configured coverage start date.
- Orderbook cache can be missing, partial, degraded, corrupted, or expired.
- Full orderbook reconstruction must not run in request handlers.
- Funding/OI may fall back to Binance historical or current futures context.
- Liquidations and trades may be unavailable for selected windows.
- Flow Replay artifacts may exist but are not currently loaded by the page.

### APIs and Data That Must Not Be Invented

P4 must not invent:

- synthetic validation scores;
- synthetic confidence scores;
- generated thesis text;
- generated narratives;
- new opportunity ranking;
- complete orderbook replay claims;
- trade setup, entry, exit, sizing, stop, or target logic.

## 6. Implementation Risk

| Risk | Finding | P4 Mitigation |
| --- | --- | --- |
| Duplicate fetches | Current load model uses multiple staged requests plus manual dataset loads. | Preserve existing load functions and dependencies; do not add new fetch paths. |
| Hydration risk | `useSearchParams` is inside a Suspense-wrapped page route. | Keep route boundary intact; do not alter router/search-param logic. |
| Replay performance | CryptoHFTData and orderbook datasets can be heavy. | Keep orderbook manual and cache-first; do not re-enable expensive reconstruction. |
| Request loops | Current fetches are action-driven, not polling-driven. | Avoid effects that auto-load on render or URL changes. |
| Scope creep | Comparable cases, failure patterns, and validation can invite new intelligence. | Use unavailable/partial states where existing data does not support the section. |
| Design drift | Current chart-first layout conflicts with approved validation-first hierarchy. | Restructure presentation only, using approved token roles. |
| Boundary drift | "If You Traded It" could be mistaken for Trade ownership. | Keep as observed replay outcome or move under Outcome Analysis with non-execution language. |
| Mock-data risk | Legacy `mockReplayData` exists in core historical paths. | Do not use mock data for Replay V2 implementation. |

## 7. Recommendation for P4

P4 should be a presentation hierarchy restructure only.

### P4 Scope

Modify only the active Replay implementation surface:

- `components/replay/ReplayV1Page.tsx`

Only use existing data, existing APIs, and existing investigation context.

### Recommended P4 Plan

1. Identify `ReplayV1Page` as the active implementation and keep `app/replay/page.tsx` unchanged unless a route boundary defect is found.
2. Reorder presentation into the approved hierarchy:
   - Replay Summary
   - Validation Status
   - Comparable Historical Cases
   - Outcome Analysis
   - Failure Patterns
   - Evidence Quality
   - Replay Metadata
   - Navigation Actions
3. Preserve existing load behavior:
   - no auto-loading changes;
   - no new polling;
   - no new request paths;
   - no router/search-param changes.
4. Map existing data into the new sections:
   - controls and inherited thesis -> Replay Summary;
   - loaded/missing/degraded source states -> Validation Status and Evidence Quality;
   - price chart, event timeline, OI, funding, liquidations, top liquidations -> Outcome Analysis;
   - unavailable failure-pattern state until existing historical data supports it;
   - date/hour/source/cache diagnostics -> Replay Metadata.
5. Add navigation actions only as context-preserving handoff presentation if existing routing/context supports it.
6. Keep orderbook manual and explicitly degraded/unavailable when cache/source quality is insufficient.
7. Do not implement new Replay Learning, Historical Analog changes, Market Memory changes, or Trade execution logic.

### P4 Acceptance Guardrails

P4 should pass only if:

- no Dashboard, Markets, Scanner, or Research files change;
- no API routes change;
- no scoring or intelligence generation is introduced;
- no mock data is introduced;
- Replay remains responsive before full evidence is available;
- unavailable states remain explicit;
- the page answers first:

```text
What thesis/window is being validated?
Can Replay validate it?
What evidence quality supports that answer?
```

## Validation

- `docs/project/replay-gap-analysis.md` exists.
- Runtime code changes: none.
- Dashboard, Markets, Scanner, Research runtime changes: none.
- Package changes: none.
- Build required: no.
