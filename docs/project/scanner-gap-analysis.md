# Scanner Gap Analysis

Status: analysis-only Sprint S3  
Scope: current Scanner implementation vs Scanner V2 foundation  
Runtime impact: none

## 1. Current Scanner Implementation

### Actual Implementation Files

Primary implementation:

- `components/scanner/ScannerPage.tsx`

Route entry:

- `app/scanner/page.tsx`

Related Scanner API and scoring:

- `app/api/scanner/opportunities/route.ts`
- `lib/scanner/opportunityScoring.ts`

Related hooks and data memory:

- `hooks/market-movers/useMarketMovers.ts`
- `hooks/market-movers/useActiveSetupMemory.ts`
- `hooks/system/useSafePolling.ts`

### Current Section Order

The current Scanner page renders:

1. Scanner Summary
2. Top Opportunities
3. Highest Confidence
4. Opportunity Categories
5. Tracked Opportunities
6. Market Breadth

### Current User Flow

Current flow:

```text
Open Scanner
  -> read summary metric cards
  -> inspect Top Opportunities table
  -> optionally inspect Highest Confidence
  -> inspect category buckets
  -> inspect tracked setup memory
  -> inspect Market Breadth
  -> open Markets or Trade from a row
```

The current page is useful as a live market-mover inspector, but it does not yet fully match the approved attention-triage journey:

```text
What deserves attention?
  -> why is it notable?
  -> how reliable is the evidence?
  -> where should I go next?
```

### Current Visual Hierarchy

Current hierarchy is functional but not Scanner V2 aligned:

- Scanner Summary appears before the highest-priority signal.
- Top Opportunities is prominent, but reads like a dense table.
- Highest Confidence competes with Top Opportunities rather than acting as supporting evidence.
- Opportunity Categories and Market Breadth partially duplicate Markets-style context.
- Tracked Opportunities is valuable but currently appears as a broad memory panel rather than a focused watchlist candidate section.

The page uses dark terminal styling and compact typography, but it does not yet fully reuse the Dashboard and Markets frozen design token hierarchy.

### Current Interaction Model

Current interactions:

- automatic market mover polling;
- Binance websocket fallback through `useMarketMovers`;
- fallback polling of `/api/scanner/opportunities`;
- local retained candidate memory;
- local active setup memory;
- row-level navigation to Markets;
- row-level navigation to Trade.

Missing or partial interactions:

- no explicit filters;
- no direct Research handoff;
- no direct Replay handoff;
- no selected signal detail state;
- no explicit evidence preview layer;
- no clear distinction between available, partial, stale, missing, and unavailable across all cards;
- no user-controlled sort or category filter.

### Existing APIs And Data Sources

Current reusable data sources:

- `/api/market/movers`
  - used by `useMarketMovers`;
  - backed by Binance USD-M 24h ticker endpoint;
  - has server fallback behavior;
  - has browser websocket fallback.

- `/api/scanner/opportunities`
  - aggregates market movers;
  - fetches narratives;
  - fetches sector rotation;
  - fetches futures intelligence;
  - applies `scoreOpportunity`.

- `/api/narratives?range=24h`
  - used inside Scanner opportunities API for narrative heat context.

- `/api/market/sector-rotation`
  - used inside Scanner opportunities API for sector rotation context.

- `/api/market/futures-intelligence`
  - used inside Scanner opportunities API for leverage risk context.

- `localStorage`
  - stores active setup memory.

- local trading database adapter
  - best-effort sync for setup, outcome, and detected event records.

## 2. Alignment Review

Approved Scanner V2 IA:

1. Scanner Header
2. Priority Opportunities
3. Signal Feed
4. Opportunity Filters
5. Watchlist Candidates
6. Supporting Context
7. Navigation Actions

| Approved Section | Current Status | Notes |
| --- | --- | --- |
| Scanner Header | Partial | Scanner Summary exposes scanned, tradeable, high confidence, and active setups, but not as a scope, freshness, and health header. |
| Priority Opportunities | Partial | Top Opportunities exists and is useful, but is preceded by summary metrics and shows up to 10 dense rows rather than a clear top priority layer. |
| Signal Feed | Partial | Top Opportunities and retained candidates approximate a feed, but there is no distinct recent signal stream below priority opportunities. |
| Opportunity Filters | Missing | Opportunity Categories groups candidates, but does not provide filter controls or active filter state. |
| Watchlist Candidates | Partial | Tracked Opportunities approximates watchlist candidates, but it is derived from active setup memory and not framed as monitor-next candidates. |
| Supporting Context | Partial | Market Breadth and Opportunity Categories provide context, but they risk becoming Markets-style structure analytics. |
| Navigation Actions | Partial | Markets and Trade links exist. Research and Replay handoffs are missing. Navigation actions are row-level only, not a clear selected-signal handoff layer. |

## 3. Boundary Review

### Dashboard Boundary

Potential Dashboard-owned material:

- Scanner Summary can read like a broad status overview if it becomes the dominant first section.
- Market Breadth can drift toward Dashboard-style market condition summary if promoted too high.

Recommendation:

- Keep Dashboard conclusions out of Scanner.
- Scanner Header should show scan health and scope, not overall market direction.

### Markets Boundary

Potential Markets-owned material:

- Market Breadth.
- Opportunity Categories when used as market structure analysis rather than signal triage.
- Dense Top Opportunities rows with RR, grade, quality, and market inspection details.

Recommendation:

- Scanner should surface signal priority and route to Markets for dense live validation.
- Keep market structure detail compact and secondary.

### Research Boundary

Missing Research handoff:

- Signals with deeper evidence needs currently cannot route directly to Research.
- Narrative and historical context are used indirectly inside `/api/scanner/opportunities`, but Scanner does not expose a Research destination.

Recommendation:

- Add Research as a future handoff only, not a narrative panel inside Scanner.

### Replay Boundary

Missing Replay handoff:

- No route exists for historical validation from Scanner.
- Scanner currently does not attempt replay, which is correct.

Recommendation:

- Future S4 may reserve a Replay action slot when signal context supports it, but should not invoke Replay loading or validation.

### Trade Boundary

Potential Trade leakage:

- Top Opportunities rows include RR and direct `Open Trade`.
- `MarketMoverCandidate` contains entry, stop, take-profit, suggested position, and max loss fields, although Scanner currently displays only RR and trade link.

Recommendation:

- Keep Trade handoff explicit but avoid making Scanner an execution planner.
- S4 should avoid exposing entry, stop, take-profit, sizing, or execution plan details.

## 4. Design System Gap

### Typography

Current:

- compact uppercase typography exists;
- section titles use small cyan uppercase text;
- table rows use very small labels and values.

Gap:

- no formal Scanner hierarchy for top priority rank, signal title, evidence metadata, and supporting context;
- Top Opportunities lacks visually obvious rank markers for the first few signals;
- row density may slow the 5-second scan.

### Spacing

Current:

- dense grid spacing is consistent enough for a terminal page;
- page uses compact `gap-3`, `p-3`, and row padding.

Gap:

- first-read spacing does not privilege the top opportunity;
- Scanner Summary consumes first-read space before signal priority;
- supporting context is not clearly separated from signal triage.

### Colors

Current:

- black and zinc surfaces;
- cyan section labels;
- emerald, amber, and zinc state accents.

Gap:

- not yet aligned to the named token roles from the design-token registry;
- amber is underused for ranking and structural priority;
- missing, stale, and unavailable states are not consistently distinguished across all sections.

### Surfaces

Current:

- most cards use the same visual surface: `border-zinc-900 bg-zinc-950/80` or `bg-black/45`;
- sections feel nearly equal in priority.

Gap:

- Priority Opportunities does not yet receive the strongest Scanner surface;
- Supporting Context does not sufficiently recede;
- no clear Level 2, Level 3, and supporting analytics mapping.

### Badges

Current:

- status appears as raw text such as `AGING`, `WATCHLIST`, `Unavailable`, `NO DATA`, `FRESH`, `DEVELOPING`, `MATURE`, or `LATE`;
- `EmptyState` is explicit and useful.

Gap:

- approved badge vocabulary is not consistently applied:
  - CURRENT
  - VERIFIED
  - PARTIAL
  - DEGRADED
  - STALE
  - LOADING
  - MISSING
  - UNAVAILABLE
- evidence health is not uniformly visible.

### Density

Current:

- Bloomberg-style density is present;
- Top Opportunities rows carry many fields.

Gap:

- the first-read layer is too table-like;
- density appears before prioritization;
- the top signal does not stand apart enough for a 5-second scan.

### Responsive Behavior

Current:

- rows use responsive grid classes;
- cards stack on smaller screens.

Gap:

- no certification against the approved mobile wireframe;
- Top Opportunities may be verbose on mobile;
- filters are absent, so mobile filter behavior is undefined.

## 5. Data Dependency Review

### Reusable Existing APIs

Reusable for S4:

- `/api/market/movers`
- `/api/scanner/opportunities`
- `/api/narratives?range=24h`
- `/api/market/sector-rotation`
- `/api/market/futures-intelligence`

Reusable client hooks:

- `useMarketMovers`
- `useSafePolling`
- `useActiveSetupMemory`

Reusable existing intelligence:

- market mover candidates;
- candidate score and confidence;
- candidate grade;
- freshness and action;
- quality state and quality reason;
- market mover summary;
- active setup lifecycle;
- active setup outcome;
- narrative heat context through the existing Scanner API;
- sector rotation context through the existing Scanner API;
- futures leverage risk context through the existing Scanner API.

### Missing Data Or Missing Presentation

Missing or not directly surfaced:

- explicit evidence source quality per opportunity;
- consistent Scanner-level freshness state;
- Research handoff metadata;
- Replay handoff metadata;
- active filter state;
- selected signal state;
- watchlist candidate distinction separate from active setup memory;
- ETF, treasury, reserve intelligence, exchange flow, and liquidation evidence as first-class Scanner evidence.

### Stale Or Weak Data Risks

Potential weak points:

- `/api/market/movers` depends on external Binance availability, with fallback response and browser websocket fallback.
- `/api/scanner/opportunities` fetches several internal APIs and silently treats failed fetches as `null`.
- `historicalAvailable` is currently hardcoded false inside Scanner opportunity context.
- active setup memory is localStorage-based and process/browser local.
- displayed `NO DATA` and unavailable states exist, but are not standardized.

### APIs That Must Not Be Invented In S4

S4 should not invent:

- a new Scanner ranking API;
- a new signal confidence API;
- a new ETF or treasury Scanner endpoint;
- a new Replay validation API;
- a new Research narrative API;
- a new Trade execution API;
- synthetic historical support;
- fallback rankings not backed by existing data.

## 6. Implementation Risk

### Request Loops

Observed risk:

- `useSafePolling` dependencies include the `options` object fields individually, which is better than depending on the object identity.
- `useMarketMovers` has both polling and websocket fallback.
- Scanner also polls `/api/scanner/opportunities` separately.

Risk:

- S4 could accidentally add duplicate polling or create a request loop if hierarchy work changes hooks, URLs, or state dependencies.

Mitigation:

- Do not modify fetch hooks, polling intervals, URLs, or websocket logic in S4.
- Reuse already-loaded data.

### Duplicate Fetches

Observed:

- Client fetches `/api/market/movers` through `useMarketMovers`.
- Client also fetches `/api/scanner/opportunities`.
- `/api/scanner/opportunities` itself fetches `/api/market/movers`.

Risk:

- The current design already duplicates market mover data paths.
- S4 hierarchy work should not add another fetch path.

Mitigation:

- Treat duplicate fetch consolidation as a later data architecture sprint, not S4.

### Hydration Risk

Observed:

- ScannerPage is client-only.
- No `useSearchParams` usage found in ScannerPage.
- No router mutation found in ScannerPage.

Risk:

- Adding URL-driven filters in S4 could introduce search-param churn if not carefully scoped.

Mitigation:

- S4 should avoid URL state and router changes.
- Filters, if visually represented, should use existing local state only if explicitly allowed.

### Performance Risk

Observed:

- Browser websocket fallback rebuilds market movers from Binance ticker stream.
- Active setup memory writes localStorage and syncs local trading database best-effort.
- Console debug effect runs on candidate count changes.

Risk:

- Heavy rendering of many dense rows can affect low-end devices.
- Adding more computed sections could increase render cost.

Mitigation:

- Keep S4 to hierarchy and presentation.
- Cap visible rows in first-read sections.

### Scope Creep

High-risk temptations:

- add new filters with URL persistence;
- add Research and Replay APIs;
- add new confidence formulas;
- expose Trade execution details;
- integrate ETF, treasury, reserve, and liquidation evidence in the same sprint.

Mitigation:

- S4 should not add new intelligence or new APIs.

### Design Drift

Observed:

- Current Scanner uses terminal styling but not the full token hierarchy.
- Page can feel like a Markets subpage because of breadth and categories.

Risk:

- S4 could copy Dashboard hero or Markets layout too closely.

Mitigation:

- Apply the shared design language to Scanner's distinct attention-triage workflow.

## 7. Recommendation For S4

S4 should be limited to hierarchy restructuring and design-system alignment using existing data.

### S4 Scope

Recommended S4 hierarchy:

1. Scanner Header
2. Priority Opportunities
3. Signal Feed
4. Opportunity Filters
5. Watchlist Candidates
6. Supporting Context
7. Navigation Actions

### Concrete S4 Plan

1. Reframe `Scanner Summary` as `Scanner Header`.
   - Show scan scope, freshness, and source health.
   - Do not make summary metrics the dominant first read.

2. Promote `Top Opportunities` into `Priority Opportunities`.
   - Show the top three opportunities as the first decision layer.
   - Preserve existing candidate ordering and data.
   - Do not change scoring.

3. Convert remaining opportunity rows into `Signal Feed`.
   - Use current `scannerCandidates`.
   - Keep rows compact.
   - Do not add new fetches.

4. Reframe `Opportunity Categories` as lightweight filter/readiness area.
   - If interactive filters are not in scope, present as non-interactive category context.
   - Do not invent filtering data.

5. Reframe `Tracked Opportunities` as `Watchlist Candidates`.
   - Preserve `useActiveSetupMemory`.
   - Avoid execution-plan language.

6. Move `Market Breadth` into `Supporting Context`.
   - Keep it below signal priority.
   - Prevent it from reading like Markets ownership.

7. Keep navigation actions limited to existing safe routes.
   - Markets and Trade links already exist.
   - Research and Replay links should be added only if they can preserve context without new APIs or runtime behavior risk.
   - If not ready, document them as unavailable actions rather than implementing new behavior.

### S4 Non-Goals

S4 must not:

- modify Dashboard;
- modify Markets;
- add new APIs;
- add new intelligence;
- change market mover scoring;
- change Scanner scoring;
- change polling behavior;
- change websocket behavior;
- add URL/search-param state;
- add Trade execution fields;
- add Research narratives;
- add Replay validation.

### S4 Validation

Recommended validation:

- TypeScript validation;
- Dashboard integration audit to verify no Dashboard regression;
- intelligence smoke test;
- manual review that Scanner first-read answers `What deserves my attention right now?`;
- no runtime changes outside Scanner page unless explicitly approved.

## 8. Summary

Scanner already has useful live opportunity ingredients:

- market movers;
- fallback opportunities;
- active setup memory;
- category grouping;
- market breadth context;
- Markets and Trade handoffs.

The main gap is product hierarchy:

- summary metrics currently lead before priority opportunities;
- top signals are table rows, not a first-read attention layer;
- filters are missing;
- evidence health is inconsistent;
- Research and Replay handoffs are absent;
- supporting context risks drifting into Markets ownership.

The recommended S4 implementation should preserve the existing data and behavior while restructuring the presentation into the approved Scanner V2 attention-triage workflow.

