# Markets V2 Acceptance Review

Status: Project Beta Sprint M5  
Scope: acceptance audit only  
Reviewed implementation: `components/markets/MarketsPage.tsx`

## Executive Summary

Markets V2 is accepted as ready for freeze with minor known limitations.

The current implementation satisfies the approved Markets purpose: live opportunity discovery and verification. It no longer leads with single-symbol analytics. It now leads with Market Context and Ranked Opportunities, then moves through breadth, sector rotation, venue confirmation, capital flow, movers, and finally selected-symbol supporting analytics.

Final decision:

```text
READY FOR FREEZE
```

## 1. Constitution Review

Status: PASS

### Page Purpose

Markets now answers:

```text
Which live markets deserve attention?
```

Evidence:

- `Ranked Opportunities` appears before chart, orderbook, trade flow, and liquidation analytics.
- The page presents market context, opportunity rows, breadth, sector rotation, exchange overview, capital flow, and movers before supporting analytics.
- Selected-symbol verification remains available but no longer defines the page.

### Primary User

Status: PASS

The implementation serves the approved primary user:

```text
Active crypto researcher or trader validating live market structure.
```

Evidence:

- Opportunity rows are ranked and comparable.
- Existing live structure tools remain available for verification.
- Venue, breadth, sector, and capital-flow context support expert scanning.

### Decision Flow

Status: PASS

Approved decision flow:

1. Identify the active market universe.
2. Review ranked opportunities.
3. Check breadth and sector participation.
4. Check venue confirmation.
5. Check capital-flow support.
6. Inspect market movers.
7. Validate selected symbol with deeper analytics.

The implementation follows this flow.

### Markets Boundaries

Status: PASS

Markets does not become Dashboard, Scanner, Trade, Research, or Replay.

Boundary checks:

- No Dashboard-level broad Market Direction hero was added.
- No Trade execution plan, sizing, stop-loss, or target workflow was added.
- No Historical Analog, Market Memory, Event Impact, or Replay timeline workflow was added.
- No Scanner lifecycle workflow was added.
- Existing selected-symbol analytics remain verification tools, not primary page ownership.

## 2. Information Architecture Review

Status: PASS

Approved hierarchy:

```text
Market Context
-> Ranked Opportunities
-> Market Breadth
-> Sector Rotation
-> Exchange Overview
-> ETF / Capital Flow
-> Market Movers
-> Supporting Analytics
```

Implementation review:

| Section | Status | Notes |
| --- | --- | --- |
| Market Context | PASS | Shows universe, exchange, focus symbol, source health, and selected signal context when available. |
| Ranked Opportunities | PASS | Uses existing market movers data and appears before analytics. |
| Market Breadth | PASS | Uses existing sector rotation asset coverage to show breadth state, advancers, decliners, and coverage. |
| Sector Rotation | PASS | Uses existing sector rotation rows and leader symbols. |
| Exchange Overview | PASS | Uses existing exchange comparison API for Binance / Bybit venue confirmation. |
| ETF / Capital Flow | PASS WITH LIMITATION | Uses ETF flow and Reserve Intelligence; broader capital-flow artifacts are not yet integrated. |
| Market Movers | PASS | Uses existing market movers scan and displays movement diagnostics. |
| Supporting Analytics | PASS | Preserves chart, orderbook, trade flow, funding, OI, liquidation history, and structure insights below first-read sections. |

## 3. Design System Review

Status: PASS

### Typography

PASS

Markets uses compact uppercase terminal typography consistent with the Dashboard Design System:

- section titles are compact and high-weight;
- ranks are visually obvious;
- metadata is secondary;
- analytics do not use hero-scale type.

### Spacing

PASS

Spacing follows the dense terminal rules:

- first-read sections are tightly grouped;
- rows remain compact;
- supporting analytics are dense and lower priority;
- no marketing-style spacing was introduced.

### Surfaces

PASS

Surface hierarchy is clear:

- Market Context is visually strongest for Markets but does not become a Dashboard hero.
- Ranked Opportunities is a primary discovery section.
- Breadth, rotation, exchange, capital flow, and movers read as secondary support.
- Supporting Analytics uses the quietest surface.

### Badges

PASS

Badges use explicit text labels and color. The Sprint M4 fix removed the only unsupported aggregate `CURRENT` claim from Supporting Analytics.

### Colors

PASS

The page preserves QuantTerminal identity:

- dark green-black canvas;
- amber structural accents;
- cyan metadata;
- green / red / amber state colors;
- no pastel or generic SaaS styling.

### Density

PASS

Markets is appropriately denser than Dashboard and uses density for comparison, rows, and verification rather than for decorative widgets.

### Consistency With Dashboard Language

PASS

Markets reuses the Dashboard design language without copying Dashboard layout or ownership. It follows:

```text
Context / Opportunities / Evidence / Analytics
```

as the Markets-specific form of the broader QuantTerminal hierarchy.

## 4. Implementation Review

Status: PASS

### Existing APIs Reused

PASS

Markets uses existing APIs:

- `/api/market/movers`
- `/api/market/sector-rotation`
- `/api/market/exchange-comparison`
- `/api/intelligence/market-structure`
- `/api/etf-flow`
- `/api/dashboard/reserve-intelligence`
- existing futures, ticker, socket, chart, orderbook, trade, and liquidation paths

No new API endpoints were introduced.

### No Synthetic Intelligence

PASS

No synthetic metrics or fabricated evidence were introduced. Missing or unavailable evidence is surfaced as `NO DATA` or `UNAVAILABLE` with reasons where available.

### No Invented Scores

PASS

Rank and score values come from existing market movers and sector rotation outputs. Markets does not introduce a new ranking formula.

### No Dashboard Modifications

PASS

No Dashboard files were modified for Sprint M5.

### No Unnecessary Fetches

PASS WITH LIMITATION

The M3 discovery integrations use a single symbol-scoped effect with abort handling. Pre-existing 30-second ticker and futures refreshes remain unchanged.

Known limitation:

- Discovery APIs reload when the selected symbol changes. This is expected because exchange comparison, market movers focus, and reserve intelligence are symbol-scoped.

### No Request Loops

PASS

No URL sync, router writes, render-time timestamp generation, or dependency churn was found in the M5 inspection. Existing polling is limited to the pre-existing 30-second ticker and futures refreshes.

## 5. UX Review

Status: PASS

### First-Read Clarity

PASS

The first read now communicates:

- what universe is being viewed;
- what symbol is focused;
- whether source health is usable;
- which opportunities deserve attention.

### Information Hierarchy

PASS

The hierarchy is correct:

- opportunities before analytics;
- breadth and rotation before venue and capital-flow support;
- selected-symbol analytics last.

### Readability

PASS

Rows and cards are dense but readable. Important values and states are visible. Missing/unavailable states do not look identical to valid data.

### Workflow Consistency

PASS

The workflow now matches the Markets role:

```text
Discover
-> Compare
-> Confirm
-> Verify selected symbol
```

The page no longer behaves primarily as a single-symbol inspector.

## 6. Known Limitations

These are accepted limitations and were not fixed in Sprint M5.

### Incomplete Capital Flow

Markets currently consumes ETF Flow and Reserve Intelligence. It does not yet directly expose Treasury, Exchange Flow, Reserve Delta, or the full deployable capital-flow artifact set.

Impact:

- ETF / Capital Flow is directionally useful but incomplete.

Disposition:

- Accept for freeze.
- Defer to a scoped post-freeze capital-flow integration sprint.

### Dependency On Market Movers Endpoint

Ranked Opportunities depends on `/api/market/movers`.

Impact:

- If the endpoint is unavailable, Markets loses its primary discovery answer and degrades to an explicit unavailable state.

Disposition:

- Accept for freeze.
- Do not invent fallback rankings.

### Non-Interactive Filters

Market Context displays universe, exchange, and focus state, but filters are not yet fully interactive.

Impact:

- Users can understand context but cannot fully manipulate the opportunity universe from the first-read layer.

Disposition:

- Accept for freeze.
- Defer to a dedicated Markets filter sprint.

### Dense Supporting Analytics

Supporting Analytics still contains chart, orderbook, trade flow, liquidation history, and structure insights from Markets V1.

Impact:

- Appropriate for expert verification, but should remain secondary.

Disposition:

- Accept for freeze.
- Only revisit if responsive certification finds clipping or scan issues.

### Existing Polling Remains

Ticker and futures intelligence still refresh every 30 seconds.

Impact:

- This preserves existing behavior but should be monitored if future Markets work adds additional polling.

Disposition:

- Accept for freeze.
- Future data additions should prefer cached/deployable snapshots or existing request paths.

## 7. Acceptance Decision

Decision:

```text
READY FOR FREEZE
```

Justification:

- Constitution review: PASS
- Information Architecture review: PASS
- Design System review: PASS
- Implementation review: PASS
- UX review: PASS
- Known limitations are documented and non-blocking.
- Validation passed.

Markets V2 should become the accepted Markets baseline. Future changes should require a documented sprint and must preserve:

- opportunity discovery ownership;
- approved hierarchy;
- real-data-only behavior;
- Dashboard boundary;
- no synthetic ranking or evidence;
- supporting analytics below first-read content.

## Validation

Required validation for Sprint M5:

- `npx.cmd tsc --noEmit --pretty false --incremental false`
- `npm run audit:dashboard-integration`
- `npm run test:intelligence`

Validation results are recorded in the Sprint M5 output.
