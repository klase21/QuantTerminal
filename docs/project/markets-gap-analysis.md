# Markets V2 Gap Analysis

Status: Project Beta Sprint M2  
Scope: analysis only  
Reviewed implementation: `components/markets/MarketsPage.tsx`  
Requested path note: `components/product/MarketsPage.tsx` does not exist in the current workspace.

## Executive Summary

The current Markets page is a single-symbol live terminal workspace. It is useful for inspecting BTCUSDT or another selected symbol through price, funding, open interest, chart, orderbook, trade flow, liquidations, and a compact structure read.

It is not yet the Markets V2 product defined in Sprint M1.

The M1 foundation says Markets should answer:

```text
Which live markets deserve attention?
```

The current implementation instead answers:

```text
What is happening inside this selected symbol right now?
```

That makes the page closer to a symbol-detail or live structure inspector than an opportunity discovery workspace. The strongest M3 path is not new intelligence infrastructure. It is hierarchy restructuring around existing usable sources: futures intelligence, sector rotation, market movers, exchange comparison, market-structure intelligence, deployable capital-flow artifacts, and existing live socket data.

## 1. Current Markets Implementation

### Current Section Order

Current rendered order:

1. Markets header / selected symbol context
2. Live Market State metric cards
3. Advanced Chart
4. Orderbook / Depth
5. Trade Flow
6. Selected Symbol Liquidations
7. Market Structure Insights

Current page route:

- `app/markets/page.tsx`
- wraps `components/markets/MarketsPage.tsx` in `TerminalAppShell` and `Suspense`.

### Current Data Sources

Directly used by `components/markets/MarketsPage.tsx`:

- `useSearchParams()` for selected symbol and optional signal context.
- `useMarketStore()` for ticker and orderbook state.
- `useMarketSocket()` for live market ticker data.
- `useOrderbookSocket(symbol)` for live orderbook state.
- `useKlineSocket(symbol, "1m")` for candles.
- `useTradeSocket(symbol)` for trade flow.
- `useDepthHeatmap(symbol)` for depth frames.
- Binance Futures 24h ticker direct fetch:
  - `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=...`
- Futures intelligence API:
  - `/api/market/futures-intelligence?symbol=...`
- Direct futures symbol context fallback:
  - `/api/market/futures-symbol-context?symbol=...`
- Replay CryptoHFTData liquidation endpoint:
  - `/api/replay/cryptohftdata?exchange=binance_futures&symbol=...&date=...&hour=...&datasets=liquidations`

Existing market APIs available but not used by the current Markets page:

- `/api/market/sector-rotation`
- `/api/market/exchange-comparison`
- `/api/market/movers`
- `/api/intelligence/market-structure`
- `/api/market-drivers`

Existing deployable artifacts available but not used by the current Markets page:

- `.data/artifacts/latest-market-drivers.json`
- `.data/artifacts/etf-latest.json`
- `.data/artifacts/funding-latest.json`
- `.data/artifacts/open-interest-latest.json`
- `.data/artifacts/liquidation-latest.json`
- `.data/artifacts/exchange-flow-latest.json`
- `.data/artifacts/treasury-latest.json`
- `.data/artifacts/exchange-reserve-latest.json`
- `.data/artifacts/exchange-reserve-delta-latest.json`
- `.data/artifacts/reserve-intelligence-latest.json`
- `.data/artifacts/coverage-index.json`

### Current User Flow

Current flow:

1. User lands on Markets with default `BTCUSDT`, or a symbol supplied by URL.
2. Page shows the selected symbol and source status.
3. User reads single-symbol metrics.
4. User inspects the chart and orderbook.
5. User inspects trade flow and selected-window liquidation history.
6. User reads a small market-structure insight row.
7. User may open the advanced chart modal.

The page does not currently start with ranked opportunities, filters, universe context, breadth, sector rotation, or cross-symbol comparison.

### Current Visual Hierarchy

Current visual hierarchy is widget-first:

1. Selected symbol identity
2. Metric card grid
3. Large chart and orderbook panels
4. Trade flow and liquidation tables
5. Compact structure row

The page uses a terminal visual language, but it does not use the Dashboard V2 reference hierarchy of first-read conclusion, ranked reasons, evidence, and lower analytics. It also does not yet distinguish Markets-specific priority layers:

- Market Context
- Ranked Opportunities
- Breadth / rotation / venue confirmation
- Detailed analytics

### Current Interaction Model

Current interactions:

- URL `symbol` parameter selects the active symbol.
- Optional URL signal context displays setup, direction, confidence, and reason.
- Advanced chart opens in a modal.
- Liquidation history has local date and hour controls inside `SelectedSymbolLiquidations`.
- Live sockets update ticker, orderbook, trades, candles, and depth.
- Futures and 24h range refresh every 30 seconds.

Missing interactions for Markets V2:

- universe selector;
- exchange selector;
- timeframe selector beyond fixed 1m chart;
- sort controls;
- filters for majors, alts, sectors, volume, funding, OI, liquidation, capital flow, or health;
- ranked opportunity row selection;
- handoff actions to Trade or Research from ranked rows;
- section-level data health controls.

## 2. M1 Alignment

| M1 Section | Status | Current Evidence | Gap |
|---|---:|---|---|
| Market Context | Partial | Shows selected symbol, source status, and optional signal context. | No universe, exchange, timeframe, filter state, breadth summary, or data health badge system. |
| Ranked Opportunities | Missing | No ranked symbol rows. | Existing `/api/market/movers` can support this, but the page does not consume it. |
| Market Breadth | Missing | No advancing/declining, majors vs alts, participation, or concentration view. | Existing sector rotation and market structure routes may provide seeds. |
| Sector Rotation | Missing | No sector/category ranking or leaders. | `/api/market/sector-rotation` exists but is unused. |
| Exchange Overview | Partial / Missing | Selected symbol uses Binance futures data; `/api/market/exchange-comparison` exists. | No venue comparison section, no cross-exchange participation summary. |
| ETF / Capital Flow | Missing | Capital-flow artifacts exist locally. | No ETF, reserve, treasury, exchange-flow, or reserve-intelligence section on Markets. |
| Market Movers | Missing | No price/volume/OI/funding mover list. | `/api/market/movers` exists and should likely drive M3 ranked opportunities. |
| Supporting Analytics | Present / Overloaded | Chart, orderbook, trade flow, liquidations, and structure insights exist. | These appear too early and currently lead the page instead of supporting ranked opportunities. |

### Alignment Read

Current Markets has strong raw live-symbol analytics, but weak discovery. The page is most aligned with the M1 `Supporting Analytics` layer and least aligned with the required first-read layers.

## 3. Dashboard Boundary Check

### Current Markets Elements That Belong On Dashboard

No current section fully belongs on Dashboard as a primary owner. The selected-symbol `Structure` label can resemble a Dashboard-style conclusion, but it is symbol-scoped and therefore acceptable on Markets if it is treated as evidence for selection rather than broad market direction.

Potential boundary risk:

- Optional signal context includes `Direction` and `Confidence`. If presented as a broad market conclusion, it would conflict with Dashboard. It should remain clearly tied to the selected signal or selected symbol.

### Missing From Markets That Dashboard Should Not Own

These should be added to Markets rather than Dashboard:

- ranked live opportunities;
- broad symbol ranking;
- market breadth;
- sector/category rotation;
- exchange overview;
- dense funding/OI/liquidation comparison;
- market mover tables;
- asset-scoped capital-flow comparison;
- symbol-level evidence health.

Dashboard should continue to own:

- broad Market Direction;
- Top Drivers;
- compact Evidence Preview;
- Prediction Markets;
- Tactical Alerts;
- high-level Data Health.

## 4. Design System Gap

### Typography

Current:

- Monospace-style terminal density is present through small uppercase labels and heavy weights.
- Section titles use a local `Card` component with `text-[10px]`, high tracking, and muted zinc.
- Metric values use large heavy text, but hierarchy is inconsistent between header, metrics, table rows, and structure badges.

Expected:

- Reuse Dashboard reference typography roles from the design token registry:
  - section title;
  - card title;
  - numeric value;
  - metadata label;
  - badge text;
  - analytics value.

Gap:

- Markets has local styling rather than token-aligned names or consistent role mapping.

### Color

Current:

- Mostly black/zinc surfaces with cyan, amber, emerald, and rose accents.
- Visual identity is terminal-like, but surface color roles are not mapped to Dashboard tokens.

Expected:

- Use the dark green / amber / cyan system from Dashboard V2:
  - amber owns structure and hierarchy;
  - cyan owns metadata and informational accents;
  - green/red/amber communicate state only.

Gap:

- Current Markets leans zinc/black and cyan without a clear surface-level system.

### Surface Levels

Current:

- Most sections use the same `Card` surface.
- Chart, orderbook, trade flow, and liquidation panels have similar visual weight.
- Supporting analytics visually compete with first-read content.

Expected:

- Level 1: Market Context / page first-read.
- Level 2: Ranked Opportunities.
- Level 3: breadth, rotation, exchange overview, capital flow, movers.
- Level 4: supporting analytics.

Gap:

- Surface levels do not express Markets priority.

### Spacing

Current:

- Dense and workable, using `gap-3`, `p-3`, compact rows.
- Some large minimum heights make chart/orderbook dominate early.

Expected:

- Dense but ordered spacing:
  - opportunities before analytics;
  - comparable rows before isolated panels;
  - lower analytics compacted below first-read layers.

Gap:

- Spacing supports a terminal, but not M1 hierarchy.

### Badges / Status

Current:

- Uses text states such as `NO DATA`, `LOADING`, `INSUFFICIENT DATA`.
- Inline statuses exist, but badge meanings are not standardized.

Expected:

- Use approved state language:
  - CURRENT;
  - VERIFIED;
  - PARTIAL;
  - DEGRADED;
  - STALE;
  - LOADING;
  - MISSING;
  - UNAVAILABLE.

Gap:

- Data health is implicit in text and source labels, not a consistent badge/status system.

### Density

Current:

- High density, live terminal feel.
- Density is concentrated in single-symbol analytics.

Expected:

- Markets should use density for comparison and discovery.

Gap:

- The page is dense but not comparative enough.

### Responsive Behavior

Current:

- Uses responsive grids such as `md:grid-cols-3`, `2xl:grid-cols-6`, `xl:grid-cols-*`.
- Likely stacks on mobile, but chart/orderbook/table-heavy content may dominate the first mobile viewport.

Expected:

- Mobile should preserve:
  - Market Context;
  - Ranked Opportunities;
  - Evidence health;
  - analytics below.

Gap:

- Current responsive order preserves component order, but that order is not yet the M1 order.

## 5. Data Dependency Gap

### Existing Usable Data

Current page directly uses:

- Binance ticker stream through market store;
- live orderbook through market store;
- kline socket candles;
- trade socket flow;
- depth heatmap;
- Binance Futures funding and OI;
- Binance Futures 24h range;
- Replay CryptoHFTData liquidation history for selected windows.

Existing project sources that appear usable for Markets V2:

- `/api/market/movers` for ranked opportunities and market movers;
- `/api/market/sector-rotation` for sector/category rotation and breadth seeds;
- `/api/market/exchange-comparison` for venue comparison;
- `/api/intelligence/market-structure` for derived market structure;
- deployable artifacts for ETF, funding, OI, liquidation, exchange flow, treasury, exchange reserve, reserve delta, reserve intelligence, market drivers, and coverage index.

### Missing Data

Missing in current Markets UI:

- ranked opportunity rows;
- breadth summary;
- sector rotation rows;
- exchange overview rows;
- ETF/capital-flow evidence;
- market movers list;
- symbol-level data health;
- row-level handoff metadata to Trade or Research.

### Stale / Weak Data

Potential weak points:

- Liquidation history is selected-window based and defaults to a prior UTC hour/date, not necessarily current live liquidation coverage.
- OI trend uses in-session previous state captured after page load, so initial state is `NO DATA` until a refresh establishes comparison.
- Direct external Binance fetches can be blocked or timeout depending on runtime environment.
- Capital-flow artifacts exist but require health/freshness checks before display.
- Some deployable artifacts are relatively large for page-level direct loading and should be consumed through existing summary/index patterns rather than raw full scans.

### Data That Should Not Be Invented

Do not fabricate:

- market breadth;
- sector leaders;
- exchange confirmation;
- ETF, treasury, reserve, or exchange-flow support;
- liquidation spikes;
- OI deltas;
- funding shifts;
- health/freshness states;
- ranked opportunity reasons.

Unavailable data should remain explicit:

```text
UNAVAILABLE
Reason: source missing, stale, blocked, or unsupported
```

## 6. Implementation Risk

### Large Refactor Risk

Risk: high if M3 tries to rewrite the page and data model at once.

Mitigation:

- Keep existing single-symbol analytics.
- Move it below first-read layers.
- Add hierarchy wrappers and consume existing market APIs incrementally.

### API Dependency Risk

Risk: medium.

The current page uses direct external fetches and dynamic APIs. New M3 integrations should prefer existing internal APIs and deployable snapshots where available. External routes may timeout, be blocked, or produce partial source states.

### Request Loop Risk

Risk: medium.

The current page has multiple live sockets, two 30-second polling effects, direct futures fallback, and selected-window liquidation loading. M3 must avoid adding new polling loops without a clear dependency model.

Mitigation:

- No URL synchronization in M3.
- No render-time timestamp parameters.
- No new setInterval unless explicitly required.
- Prefer one initial load for ranked opportunities and health, then preserve existing live hooks.

### Hydration Risk

Risk: low to medium.

The route correctly wraps the client component using `Suspense` for `useSearchParams`. Avoid generating volatile timestamps or hrefs during render.

### Visual Drift Risk

Risk: medium.

Markets currently has its own local terminal styling. M3 should reuse Dashboard design tokens and surface levels, but must not make Markets look like Dashboard's broad-conclusion hero.

### Scope Creep Risk

Risk: high.

Markets can easily absorb Scanner, Trade, Research, and Dashboard responsibilities. M3 should stay limited to:

- page hierarchy restructuring;
- existing API/data consumption;
- token reuse;
- no new intelligence generation;
- no trade execution planning.

## 7. Recommended M3 Plan

M3 should be an implementation sprint limited to page hierarchy and token-aligned presentation.

### M3 Objective

Transform Markets from a single-symbol analytics page into an opportunity discovery page while preserving existing live structure tools as supporting analytics.

### M3 Scope

Allowed:

- restructure Markets page section order;
- introduce Markets V2 section shells;
- reuse Dashboard design token roles;
- consume existing internal APIs where required;
- preserve current single-symbol analytics below first-read layers;
- add compact unavailable states for missing sections.

Forbidden:

- Dashboard modifications;
- new APIs unless explicitly required;
- new intelligence calculations;
- synthetic data;
- historical-heavy workflows;
- Trade execution plans;
- router/search-param churn;
- new polling loops without review.

### Recommended M3 Section Order

1. Market Context
   - Show exchange, universe, timeframe, active symbol if present, source health.
   - Keep this smaller than Dashboard's Market Direction hero.

2. Ranked Opportunities
   - Use `/api/market/movers` if stable.
   - Show ranked symbol rows with reason tags, state, health, and next action.
   - This is the M3 priority section.

3. Market Breadth
   - Use `/api/market/sector-rotation` or `/api/intelligence/market-structure` if available.
   - If not available, show `UNAVAILABLE` with explicit reason.

4. Sector Rotation
   - Use existing sector registry and sector rotation API.
   - Show sector, direction, leaders, health.

5. Exchange Overview
   - Use `/api/market/exchange-comparison` for selected symbol or focus symbol.
   - Keep venue comparison compact.

6. ETF / Capital Flow
   - Use deployable snapshots or existing artifact index.
   - Show only summary cards with freshness/coverage.
   - Do not full-scan raw datasets.

7. Market Movers
   - Reuse `/api/market/movers`.
   - Show price/volume movers first; OI/funding/liquidation movers only when real evidence exists.

8. Supporting Analytics
   - Move current chart, orderbook, trade flow, liquidations, and market structure insights here.
   - Preserve current behavior.

### M3 Implementation Steps

1. Add local Markets section wrappers using Dashboard token concepts.
2. Move current single-symbol analytics into `Supporting Analytics`.
3. Add `Market Context` with active universe and data health placeholders based on real available state.
4. Add `Ranked Opportunities` using existing `/api/market/movers`.
5. Add compact unavailable states for sections not yet wired.
6. Add sector rotation if `/api/market/sector-rotation` can be consumed without new infrastructure.
7. Add exchange overview if `/api/market/exchange-comparison` can be consumed without new infrastructure.
8. Keep all current socket behavior untouched.
9. Avoid Dashboard changes entirely.

### M3 Acceptance Criteria

M3 passes if:

- the first read answers `Which live markets deserve attention?`;
- ranked opportunities appear before chart/orderbook/trade-flow analytics;
- current single-symbol analytics still work;
- Dashboard remains untouched;
- no synthetic data is introduced;
- no new historical-heavy processing appears on Markets;
- missing sections use explicit unavailable states;
- request count remains bounded and explainable.

## Validation

Validation performed for Sprint M2:

- Confirmed the requested `components/product/MarketsPage.tsx` path does not exist.
- Inspected actual route and implementation:
  - `app/markets/page.tsx`
  - `components/markets/MarketsPage.tsx`
- Inspected referenced API routes and relevant available market routes.
- Inspected deployable artifact inventory under `.data/artifacts`.
- Created this analysis document only.

No build was run.  
No TypeScript validation was run because this was an analysis-only documentation sprint.  
No runtime files were intentionally modified.  
No Dashboard files were modified.
