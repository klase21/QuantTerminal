# Architecture Cleanup

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D24  
**Date:** 2026-06-29  
**Decision:** CLEANUP PARTIAL

## 1. Cleanup Summary

D24 resolves the architecture defects that were safe to correct without
introducing features, intelligence, API migrations, or protected historical
changes.

Completed cleanup:

- removed Dashboard Historical Analog request and rendering;
- excluded Historical Analog from Dashboard driver count, Top Drivers, and
  Dashboard-to-Markets evidence handoff;
- removed Dashboard `Signal Evidence` and `Execution Guidance` presentation and
  their local action, invalidation, trigger, and level calculations;
- converted Markets `Ranked Opportunities` into an unranked `Market Movers`
  exploration list and removed rank/score display;
- normalized absent and wrong-identity shared-context handoffs to
  `UNAVAILABLE` across Markets, Scanner, Research, Replay, and Trade;
- corrected the Dashboard integration audit to enforce ADR-001 Historical
  Analog removal and the approved conclusion-to-evidence ordering;
- removed four unreferenced legacy source files:
  - `app/api/macro/route (2).ts`;
  - `lib/macro/fetchYahoo.ts`;
  - `services/mockFeed.ts`;
  - `hooks/useRealtimeFeed.ts`.

No API response contract, ranking algorithm, fetch interval, websocket,
product-context payload, package file, or new intelligence was added.

## 2. Dashboard Ownership Cleanup

**Result: PASS**

Dashboard now owns only:

- product and system summary;
- overall market direction;
- high-level drivers and evidence preview;
- prediction-market and tactical summary context;
- navigation into Markets.

### Removed Ownership Conflicts

| Conflict | Cleanup |
| --- | --- |
| Historical Analog | Removed the Dashboard request, state, and rendered strip in accordance with `AGENTS.md` and ADR-001. |
| Research-style signal evidence | Removed the detailed `Signal Evidence` panel that interpreted mover evidence, invalidation, and action. |
| Trade execution guidance | Removed `Execution Guidance`, DO/AVOID actions, trigger levels, and local price-level parsing. |
| Historical driver leakage | Dashboard filters `historical_analog` from visible driver counts, Top Drivers, and shared-context evidence preview. |

The Market Driver API contract still permits a `historical_analog` category for
other consumers and backward compatibility. Dashboard no longer exposes or
hands that category downstream.

## 3. Markets and Scanner Ownership Cleanup

**Result: PASS**

Markets still consumes the existing Market Movers response for live
exploration, but it no longer presents rank numbers or scores and no longer
calls the section `Ranked Opportunities`. The section is now `Market Movers`
and explicitly assigns prioritization to Scanner.

Scanner remains the only page that presents `Priority Opportunities`, ranking,
and signal prioritization. No ranking formula, source order, API, or Scanner
behavior changed.

## 4. Production Mock and Pseudo Source Cleanup

### 4.1 Safely Removed

| File | Finding | Removal basis |
| --- | --- | --- |
| `app/api/macro/route (2).ts` | Duplicate non-route file generated randomized pseudo Macro prices and history. | Not route-addressable, unreferenced, and directly violated the no-fabrication rule. |
| `lib/macro/fetchYahoo.ts` | Unused Yahoo implementation, prohibited by current source governance. | No runtime imports; Yahoo is not an approved Macro fallback. |
| `services/mockFeed.ts` | Browser-side mock market feed. | Imported only by the unused `useRealtimeFeed` hook. |
| `hooks/useRealtimeFeed.ts` | Wrapper that activated the mock market feed. | No application or component consumers. |

The source registry audit improved from two watched findings to one. The Yahoo
finding is removed; the remaining watched finding is SaveTicker.

### 4.2 Remaining Production-Reachable Findings

The static audit continues to report eleven mock-backed API routes:

1. `/api/historical-intelligence/external-adapters/preview`
2. `/api/historical-intelligence/external-review/enqueue`
3. `/api/historical-intelligence/ingestion/mock-event`
4. `/api/historical-intelligence/market-memory`
5. `/api/historical-intelligence/persistence/decisions`
6. `/api/historical-intelligence/persistence/events`
7. `/api/historical-intelligence/persistence/memories`
8. `/api/historical-intelligence/persistence/outcomes`
9. `/api/historical-intelligence/persistence/playbooks`
10. `/api/historical-intelligence/persistence/replay-cases`
11. `/api/replay`

These routes were not removed because they belong to protected historical,
ingestion, review, or persistence systems and may support development or
external contracts not represented by the six frozen pages. Removing them
without route isolation, consumer inventory, and replacement persistence would
be unsafe.

Additional blockers:

- `/api/kr-retail` uses unregistered SaveTicker data.
- `MACRO_TICKER_FALLBACK` remains referenced by a dormant legacy Macro component
  chain. Those components are not mounted by the current app routes, but the
  chain should be quarantined or converted to explicit unavailable behavior
  before reuse.

## 5. Source Envelope Audit

Five routes currently emit canonical additive `_source` metadata:

- `/api/etf-flow`;
- `/api/macro`;
- `/api/market/exchange-comparison`;
- `/api/market/sector-rotation`;
- `/api/research/prediction-markets`.

No source envelope was added in D24.

### Migration Priority

| Priority | APIs | Rationale and prerequisite |
| --- | --- | --- |
| P0 | `/api/market-drivers` | Dashboard conclusion critical path. Register a canonical derived source and define constituent health before migration. |
| P0 | `/api/market/movers`, `/api/scanner/opportunities` | Shared by Markets, Scanner, Dashboard, and Trade. Preserve ranking and bare-array compatibility. |
| P1 | `/api/market/futures-intelligence`, `/api/market/futures-symbol-context` | Shared Markets/Replay/Trade positioning context; requires trusted provider timestamps and partial-branch mapping. |
| P1 | `/api/dashboard/reserve-intelligence` | Dashboard evidence path with retained-history and delta freshness semantics. |
| P1 | `/api/intelligence/market-structure` | Derived structure must not appear healthier than Sector Rotation and positioning inputs. |
| P2 | `/api/narratives`, `/api/news`, `/api/prediction-markets` | Multi-provider timestamp and partial-coverage rules need normalization. |
| P2 | `/api/research/historical-analogs`, `/api/event-impact`, `/api/research/market-memory` | Manual-load evidence paths; migrate only after mock/persistence isolation. |
| Protected | `/api/replay/*` | Requires a dedicated Replay metadata sprint; must preserve cache identity, optional datasets, and non-blocking orderbook behavior. |

`source-envelope-rollout-status.md` still records the original two pilots and
must be refreshed before another rollout.

## 6. Terminology Cleanup

**Result: PASS FOR SHARED-CONTEXT FAILURES**

The context destination pages now use:

- `LOADING` while loading a supplied context ID;
- `CURRENT`, `STALE`, or `PARTIAL` only when validated context supports that
  state;
- `UNAVAILABLE` for direct entry without context, storage/load failure,
  expiration, invalid lifecycle state, and wrong source/destination identity;
- `UNKNOWN` only when an available source timestamp or freshness state cannot
  be determined.

No new status term was introduced. Domain-specific `MISSING` and `NO DATA`
states remain where a user has not requested an optional Replay dataset or
where an empty observation is materially different from invalid shared
context. A future vocabulary sprint may normalize those broader domain states;
D24 does not reinterpret them.

## 7. Architecture Consistency

| Check | Result | Notes |
| --- | --- | --- |
| Duplicated ownership | PASS WITH LIMITATIONS | Dashboard/Research/Trade and Markets/Scanner presentation conflicts were removed. Legacy components outside the six-page path remain. |
| Duplicated calculations | PASS FOR CLEANED PATHS | Dashboard action, trigger, invalidation, and execution-level calculations were removed. Existing duplicate market fetch/formatting paths remain an infrastructure concern. |
| Duplicated conclusions | PASS | Dashboard remains the sole market-conclusion page. |
| Duplicated evidence generation | PASS | Research remains the evidence-generation page; Dashboard retains high-level evidence preview only. |
| Validation ownership | PASS | Replay owns validation display state; Trade reads it without inference. |
| Execution ownership | PASS | Trade owns execution presentation and local setup tracking. |

Remaining duplicated fetches, websocket subscriptions, and page-local state are
documented architecture debt. Consolidating them would be runtime
infrastructure work, not safe cleanup within D24.

## 8. Remaining Blockers

1. Eleven mock-backed historical/review/persistence API routes require explicit
   production isolation or replacement contracts.
2. SaveTicker remains unregistered in `/api/kr-retail`.
3. Critical source envelopes remain absent from Market Drivers, Market Movers,
   Scanner Opportunities, Futures Intelligence, Reserve Intelligence, Market
   Structure, Replay, and Trade dependencies.
4. The source-envelope rollout control document is stale.
5. Shared context remains session-scoped and revision-1 snapshot based.
6. Dormant legacy Macro components still reference fallback constants and must
   not be reactivated as production data.

## 9. Decision

**CLEANUP PARTIAL**

The objective six-page ownership conflicts and safely removable pseudo/mock
sources are resolved. Cleanup cannot be marked complete while protected
mock-backed routes, an unregistered source, critical envelope gaps, and stale
rollout governance remain.

## 10. D25 Recommendation

**Recommended D25: Production Mock Route Isolation**

D25 should inventory consumers and classify each of the eleven mock-backed API
routes as development-only, test-only, replaceable persistence, or required
production behavior. It should then gate or remove only routes with a proven
safe migration path.

D25 must not add providers, fabricate replacement data, modify Replay request-
path reconstruction, or combine source-envelope rollout with route isolation.
After isolation, a separate sprint can update rollout governance and begin the
P0 envelope migrations.

## 11. Validation Summary

- TypeScript: PASS.
- Dashboard integration audit: PASS.
- Intelligence smoke test: PASS.
- Production build: PASS.
- Shared Product Context audit: PASS, 30/30 checks.
- Source Registry Usage audit: REPORT_ONLY; 32/32 registered sources matched,
  1 watched finding, 11 production mock findings.
- Package changes: none.
