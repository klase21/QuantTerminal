# Replay Certification

Project Epsilon - Replay V2 Sprint P5  
Status: Certification  
Scope: Replay V2 implementation review  
Implementation inspected: `components/replay/ReplayV1Page.tsx`  
Decision: CERTIFIED WITH LIMITATIONS

## 1. Hierarchy Certification

Result: PASS

Approved order:

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

Implementation review:

| Section | Status | Finding |
| --- | --- | --- |
| Replay Summary | PASS | First section orients around the inherited thesis or selected replay window, symbol, exchange, timeframe, and manual replay controls. |
| Validation Status | PASS | Validation readiness appears before analytics and uses existing replay data availability only. No synthetic validation score is introduced. |
| Comparable Historical Cases | PASS WITH LIMITATIONS | Section exists and displays selected historical case context when inherited. If no case is supplied, it shows an explicit unavailable state. |
| Outcome Analysis | PASS | Existing chart, market snapshot, orderbook snapshot, event timeline, OI, funding, liquidations, top liquidations, and observed outcome panels are grouped under Outcome Analysis. |
| Failure Patterns | PASS WITH LIMITATIONS | Section exists and correctly reports unavailable state because no comparable failure-pattern dataset is loaded by the current page. |
| Evidence Quality | PASS | Source availability for chart/price, OI, funding, liquidations, trades, and orderbook is consolidated with explicit status labels and reasons. |
| Replay Metadata | PASS | Replay window, investigation source/type, event context, cache status/schema, downloaded sets, and unavailable sets are shown. |
| Navigation Actions | PASS WITH LIMITATIONS | Compact handoff links exist for Research, Trade, Markets, and Scanner. They are not yet rich context-preserving handoff payloads. |

Hierarchy decision: PASS.

## 2. Design System Certification

Result: PASS WITH LIMITATIONS

Review:

- Typography remains dense, uppercase, monospace-oriented, and consistent with terminal surfaces.
- Spacing uses compact section, card, row, and panel rhythm.
- Colors preserve the dark green/black terminal base with amber and cyan hierarchy accents.
- Surfaces are differentiated by priority:
  - summary and validation use higher-priority dark green surfaces;
  - outcome preserves dense replay panels;
  - evidence quality and metadata recede into lower-priority surfaces.
- Badges/status rows use canonical labels such as `CURRENT`, `PARTIAL`, `DEGRADED`, `MISSING`, `LOADING`, and `UNAVAILABLE`.
- Visual hierarchy is now validation-first instead of chart-first.
- The page remains visually consistent with the frozen Dashboard, Markets, Scanner, and Research language without copying their layouts.

Limitations:

- Design tokens are applied as local Tailwind classes rather than centralized token constants.
- Some legacy nested panels inside Outcome Analysis retain older zinc/black styling.
- The legacy label `NO DATA` remains in metric cells, which is allowed by AGENTS.md and the language audit but should later be normalized where possible.

Design system decision: PASS WITH LIMITATIONS.

## 3. Product Language Certification

Result: PASS WITH LIMITATIONS

Replay correctly uses:

- validation;
- comparable historical case;
- outcome;
- failure pattern;
- evidence quality;
- metadata;
- historical context;
- replay window;
- unavailable/degraded evidence states.

Replay does not introduce:

- opportunity ranking;
- signal generation;
- trade setup;
- entry/exit/sizing logic;
- generated thesis;
- generated evidence;
- generated narrative;
- invented confidence or validation score.

Language limitation:

- The preserved existing section label `If You Traded It` remains execution-adjacent. It currently displays observed hold-return coverage only and does not create a trade setup, entry, exit, sizing, stop, or recommendation. This is accepted for P5 because P4 explicitly preserved existing replay functionality, but it should be reviewed in a future language-normalization sprint.

Product language decision: PASS WITH LIMITATIONS.

## 4. Boundary Certification

Result: PASS

Replay owns only:

- historical validation;
- comparable cases;
- outcome analysis;
- failure modes;
- replay metadata;
- validation context;
- source availability;
- replay evidence quality.

Boundary review:

| Boundary | Result | Finding |
| --- | --- | --- |
| Dashboard conclusions | PASS | Replay does not create market direction, top drivers, or dashboard conclusions. |
| Markets exploration | PASS | Replay allows symbol/window selection for replay scope but does not become live market exploration. |
| Scanner prioritization | PASS | Replay does not rank opportunities or generate priority signals. |
| Research evidence generation | PASS | Replay displays inherited thesis context when present but does not create evidence or narratives. |
| Trade execution | PASS | Replay includes a compact Trade handoff and observed replay-return coverage but no execution plan. |

Boundary decision: PASS.

## 5. Implementation Certification

Result: PASS

Implementation review:

| Requirement | Result | Finding |
| --- | --- | --- |
| Existing APIs reused | PASS | Replay continues to use existing replay APIs, Binance klines, Binance positioning fallback, current futures fallback, and orderbook cache. |
| No new fetch paths | PASS | P4 did not add new API requests or data sources. |
| No synthetic validation scores | PASS | Validation readiness is a display-only availability state, not a score. |
| No historical matching logic added | PASS | Comparable cases are displayed only when inherited; no matching algorithm was added. |
| No generated narratives | PASS | The page displays inherited thesis text or explicit missing-context text only. |
| No scoring changes | PASS | No existing scoring or calculations were changed. |
| No polling changes | PASS | Existing action-driven loading remains intact. |
| No router/search-param changes | PASS | Existing `useSearchParams` and investigation-context handling remain unchanged. |
| No API contract changes | PASS | No API route or package changes were made. |

Implementation decision: PASS.

## 6. Known Limitations

Documented only; not fixed in this sprint.

- Comparable cases are display-only and unavailable when no selected historical case is inherited.
- Validation Status depends on existing replay data availability; there is no new validation engine.
- Failure Patterns remains unavailable when no comparable failure-pattern dataset is loaded.
- Orderbook remains manual/cache-based and must not block Replay.
- Orderbook status may be partial or degraded; Replay does not claim complete deterministic orderbook replay.
- Navigation handoffs are compact links, not rich immutable handoff payloads.
- The `If You Traded It` section is preserved from existing Replay functionality and should be revisited in future language normalization.
- Existing replay data availability depends on CryptoHFTData coverage, Binance fallback availability, cache state, and selected window support.
- Flow Replay artifacts exist elsewhere in the architecture but are not consumed by this page in P5.
- `NO DATA` remains an allowed legacy unavailable metric label pending future badge/language normalization.

## 7. Certification Decision

Decision: CERTIFIED WITH LIMITATIONS

Justification:

- Replay V2 now follows the approved validation-first hierarchy.
- The implementation preserves existing replay functionality and source-backed unavailable states.
- No new intelligence, scoring, historical matching, generated narrative, or validation engine was introduced.
- The page respects Replay boundaries and keeps orderbook manual/cache-based.
- Remaining issues are accepted limitations around data availability, compact handoffs, language normalization, and future validation-engine scope.

Replay is ready to proceed to acceptance review, with the limitations above carried forward unchanged.

## 8. Validation

Required validation for P5:

- `npx.cmd tsc --noEmit --pretty false --incremental false`
- `npm run audit:dashboard-integration`
- `npm run test:intelligence`

Validation results are recorded in the sprint output.
