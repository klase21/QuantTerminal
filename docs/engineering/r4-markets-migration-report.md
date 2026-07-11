# R4 V2.1 Markets React Migration Report

## Decision

`READY WITH EXPLICIT LIMITATIONS`

Markets V2 is implemented as an in-place sectional presentation migration. `components/markets/MarketsPage.tsx` remains the sole runtime controller. Browser validation is explicitly incomplete because the local Next development server did not progress beyond startup and no tested local port became reachable.

## Exact Files Changed

### New

- `lib/markets-presentation/contracts.ts`
- `lib/markets-presentation/adapters.ts`
- `components/markets-v2/MarketsV2View.tsx`
- `components/markets-v2/MarketsShell.tsx`
- `components/markets-v2/GlobalSummarySection.tsx`
- `components/markets-v2/SectorRotationSection.tsx`
- `components/markets-v2/CapitalFlowSection.tsx`
- `components/markets-v2/DerivativesIntelligenceSection.tsx`
- `components/markets-v2/MacroEtfSection.tsx`
- `components/markets-v2/PredictionBreadthSection.tsx`
- `components/markets-v2/MarketsHandoffs.tsx`
- `components/markets-v2/RepositoryAuditSection.tsx`
- `components/markets-v2/index.ts`
- `workers/component-tests/marketsAdapterTypeChecks.ts`
- `workers/component-tests/runMarketsV2SmokeTest.tsx`
- `docs/engineering/r4-markets-migration-report.md`

### Modified

- `components/markets/MarketsPage.tsx`
- `components/foundation-preview/ReactFoundationPreview.tsx`

No API, route wrapper, calculation engine, realtime hook, store, package, lockfile, global CSS, Repository, Dashboard, Replay, Research, Scanner, Trade, provider, scheduler, worker-runtime, or historical-backfill file changed.

## Models and Adapter Rules

The migration adds bounded models for:

- Markets summary and source readiness;
- unavailable canonical regime;
- sector rotation and sector items;
- ETF flow and reserve evidence;
- unsupported flow categories;
- derivatives metrics, venues, relationships, and qualified interpretations;
- unavailable Macro and Prediction Market context;
- market breadth counts, coverage, and heuristic classification;
- secondary mover context;
- Scanner handoff;
- unavailable Repository audit;
- symbol and liquidation-window selection;
- unsupported search, filter, tab, sort, and sector-selection capabilities.

Lifecycle, availability, freshness, coverage, confidence, provider quality, direction, regime, and signal strength remain separate concepts. Adapters perform no fetch, timer, subscription, persistence, ranking, provider normalization, fallback selection, context write, or Repository operation.

## Sections Migrated

The active presentation order is:

1. Global Market Summary
2. Sector Rotation
3. Capital Flow
4. Derivatives Intelligence
5. Macro and ETF
6. Prediction Markets and Market Breadth
7. Investigation Handoffs and secondary Movers
8. Repository Audit

The legacy presentation remains present but unreachable during the parity window. Existing chart, orderbook, depth, trade flow, bounded liquidation controls, and modal are rendered through controller-owned presentation slots.

## Runtime Preservation

- All five realtime hooks and their symbol arguments remain unchanged.
- All six immediate request paths remain in their existing effect and order.
- The shared request AbortController and cleanup remain unchanged.
- Binance ticker and futures polling remain at 30 seconds with 5-second request timeouts.
- Conditional futures fallback and aggregate-before-direct precedence remain unchanged.
- Liquidation exchange, symbol, date, hour, dataset parameters, request identity, 7-second timeout, ordering, cancellation, and cleanup remain unchanged.
- The only added runtime observation reports the existing liquidation date/hour to the presentation model.
- Symbol selection, URL intake, chart modal, Dashboard context intake, Scanner context creation, persistence owner, and navigation fallback remain unchanged.

## Evidence and Interpretation Boundaries

### Regime

Canonical regime is always `UNAVAILABLE`. Price, CVD, funding, color, and successful module count do not produce a regime.

### Source Readiness

Readiness reports how many existing Markets modules supplied usable payloads. It is explicitly not freshness, confidence, provider health, direction, or regime.

### Sector Rotation

Rank, score, direction, numeric metrics, coverage, and source metadata are preserved from the existing route. `INFLOW`, `OUTFLOW`, and other direction values are labeled `MODEL CLASSIFICATION` and explicitly distinguished from factual fund flow.

### Capital Flow

ETF value, unit, source date, timestamp, availability, freshness, and provenance remain together. Reserve balance and reserve deltas are presented separately as balance evidence and balance-change evidence. Current balance and observation count are never substituted as flow. Stablecoin, exchange, and on-chain flows render unavailable.

### Derivatives

OI and Funding retain existing source precedence. Missing funding and unavailable liquidations remain null and render unavailable rather than zero. Venue rows require at least one supplied factual metric. Local pressure, trend, and selected-symbol structure labels are marked `LOCAL HEURISTIC`; market-structure API classifications are marked `SOURCE MODEL`.

### Macro, Prediction, Breadth, and Repository

- Macro is unavailable because Markets has no active Macro request.
- Prediction Markets is unavailable because Markets has no active prediction request.
- Breadth preserves supplied universe, advancer, decliner, coverage, and missing-constituent counts. `BROAD BID`, `BROAD OFFER`, and `MIXED` remain qualified heuristics with their numeric basis.
- Repository Audit and `RepositoryLink` remain unavailable because no query, record identity, or valid destination exists.

### Market Movers

Mover data appears once as `Secondary Discovery Context`. Existing symbol selection is preserved. Scanner remains the primary prioritization owner, and Movers do not become a priority queue or Trade recommendation.

## Preview Strategy

The development-only foundation preview contains deterministic synthetic Markets fixtures. It performs no external requests or Repository writes and makes no current market claims. Fixtures cover factual summary inputs, unavailable regime, source readiness, qualified sector output, partial coverage, ETF flow, reserve balance without flow substitution, fallback provenance, unavailable funding and liquidations, unavailable Macro and Prediction Markets, breadth basis, missing constituents, secondary Movers, unavailable Repository, long labels, and narrow composition.

## Validation Results

| Check | Status | Result |
|---|---|---|
| Git inspection | PASS | Final changes are confined to the approved R4 scope. |
| TypeScript | PASS | `npx.cmd tsc --noEmit --pretty false --incremental false` completed successfully. |
| Markets adapter type checks | PASS | Closed-vocabulary negative assertions compiled successfully. |
| Markets V2 smoke tests | PASS | All model, rendering, fail-closed, interaction, and parity assertions passed. |
| Existing R0 smoke tests | PASS | Existing React foundation suite passed. |
| Existing R1 Dashboard smoke tests | PASS | Existing Dashboard suite passed. |
| Existing R2 Replay smoke tests | PASS | Existing Replay suite passed. |
| Existing R3 Research smoke tests | PASS | Existing Research suite passed. |
| Six immediate request-path parity | PASS | All six original request expressions remain present. |
| Shared AbortController parity | PASS | Shared controller, active guard, abort, and cleanup remain present. |
| Binance ticker 30-second polling parity | PASS | Existing `setInterval(loadTicker24h, 30000)` remains. |
| Binance ticker timeout parity | PASS | Existing 5-second timeout remains. |
| Futures 30-second polling parity | PASS | Existing `setInterval(loadFutures, 30000)` remains. |
| Futures timeout parity | PASS | Existing 5-second timeout remains. |
| Futures fallback condition and precedence parity | PASS | Existing missing-field condition and aggregate-before-direct nullish precedence remain. |
| Realtime-hook protected inspection | PASS | All five hook calls and symbol/timeframe arguments remain. |
| Orderbook protected inspection | PASS | No orderbook hook, store, transport, normalization, buffering, or cleanup file changed. |
| Liquidation request-parameter parity | PASS | Exchange, symbol, date, hour, and liquidation dataset remain unchanged. |
| Liquidation timeout and cancellation parity | PASS | Request identity, 7-second timeout, AbortController, and cleanup remain. |
| Symbol-selection parity | PASS | Existing `setSymbol` ownership is connected to the single secondary Movers region. |
| Advanced-chart modal parity | PASS | Existing open/close state and component remain controller-owned. |
| Dashboard-context intake parity | PASS | Existing product-context read and validation remain unchanged. |
| Scanner-context handoff parity | PASS | Existing context construction, write owner, contextId navigation, and fallback remain. |
| No new search/filter/tab/sort behavior | PASS | Contracts close unsupported capabilities; no controls were added. |
| Regime fail-closed rule | PASS | Static render and adapter assertions show `UNAVAILABLE` and null value. |
| Readiness-not-freshness rule | PASS | Separate typed model with explicit basis. |
| Missing-not-zero rule | PASS | Missing funding, liquidation, venue, range, and unsupported flow values remain null/unavailable. |
| Sector-model qualification | PASS | Source rank/score preserved; direction visibly marked model classification. |
| ETF and reserve separation | PASS | Distinct models and sections; reserve balance is never flow. |
| Capital-flow contract gate | PASS | Unsupported flow categories fail closed. |
| OI/Funding fallback parity | PASS | Existing runtime precedence unchanged. |
| Derivatives heuristic qualification | PASS | Local and source-model classifications are visibly distinct. |
| Macro unavailable boundary | PASS | No request added; explicit unavailable state renders. |
| Prediction unavailable boundary | PASS | No request added; explicit unavailable state renders. |
| Breadth basis and coverage | PASS | Counts, missing constituents, partial coverage, and heuristic basis verified. |
| Heatmap no-fabrication rule | PASS | Existing depth display uses supplied numeric values only; missing depth renders unavailable. |
| Market Movers ownership consolidation | PASS | Static render contains one secondary context region and no priority queue. |
| Repository unavailable boundary | PASS | No link renders without identity and destination. |
| Desktop responsive smoke | NOT RUN | Local Next server remained in startup and the route was unreachable. |
| Tablet responsive smoke | NOT RUN | Local Next server remained in startup and the route was unreachable. |
| 393px mobile smoke | NOT RUN | Local Next server remained in startup and the route was unreachable. |
| Keyboard and focus smoke | NOT RUN | Browser route was unreachable; static semantics are not claimed as keyboard validation. |
| Modal focus smoke | NOT RUN | Browser route was unreachable. |
| Browser console | NOT RUN | Browser route was unreachable. |
| Formal WCAG audit | NOT RUN | Not performed. |
| Cross-browser audit | NOT RUN | Not performed. |
| Prohibited-behavior scan | PASS | New adapter/components contain no fetch, timers, subscriptions, persistence, provider normalization, Repository write, or unsupported request. |
| Protected-system diff inspection | PASS | Protected routes, APIs, engines, hooks, stores, and product pages have no diff. |
| Package and lockfile inspection | PASS | `package.json` and `package-lock.json` are unchanged. |
| Production build | NOT APPLICABLE | Prohibited by `AGENTS.md`; TypeScript validation was used. |

## Unresolved Limitations

- Browser responsive, keyboard, modal-focus, and console checks remain unexecuted.
- No canonical market-regime contract exists.
- Macro and Prediction Markets have no active Markets runtime inputs.
- Repository audit and record-level traceability are unavailable.
- Stablecoin, exchange, and on-chain flow contracts are unavailable.
- Sector and breadth labels remain qualified model or local heuristic outputs.
- The controller remains large and realtime rerender cost was not optimized during this presentation-only migration.
- Legacy local presentation remains unreachable but retained for the parity window.

## Protected Systems Confirmation

Markets APIs, sector rotation, futures calculations, ETF/Macro/prediction/mover routes, Repository, Coverage, Projection, Dashboard, Replay, Research, Scanner, Trade, navigation, realtime and orderbook hooks, stores, providers, scheduler, workers, historical backfill, package files, lockfile, global CSS, and Figma assets remain unchanged.

## R5 Readiness

`READY WITH EXPLICIT LIMITATIONS`

The presentation migration is bounded and protected runtime behavior is preserved. R5 may begin after accepting the browser-validation limitation or completing those checks in an environment where the local Next server reaches a ready state.
